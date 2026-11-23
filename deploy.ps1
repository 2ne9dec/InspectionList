<#
.SYNOPSIS
  Сборка и подготовка папок server + dist (+ db) к переносу на сервер.

.DESCRIPTION
  По умолчанию создаёт ZIP-архив с папками server и dist.
  Папку db нужно копировать только осознанно: иначе можно затереть
  листки осмотра и пользователей, созданные на сервере после снятия копии.

  Что НЕ копируется из server:
    - server/.env       (на сервере свои пути к БД и секреты)
    - server/node_modules (на сервере уже установлены зависимости)
    - server/uploads    (фотографии/файлы пользователей)

.EXAMPLE
  .\deploy.ps1
  Собрать dist и создать ZIP с server + dist.

.EXAMPLE
  .\deploy.ps1 -Target "\\server\share\InspectionList"
  Скопировать server и dist прямо в папку на сервере (robocopy).

.EXAMPLE
  .\deploy.ps1 -IncludeDb
  Дополнительно применить миграцию к локальной db и включить её в архив.
  Использовать только если db предварительно снята с сервера и сервер остановлен.

.EXAMPLE
  .\deploy.ps1 -Target "D:\InspectionList" -IncludeDb
  Скопировать все три папки. Перед заменой db будет создана резервная копия.
#>

param(
  [string]$Target,
  [switch]$IncludeDb,
  [switch]$SkipBuild,
  [switch]$SkipMigrate,
  [switch]$Yes
)

$ErrorActionPreference = 'Stop'
try {
  [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
  $OutputEncoding = [System.Text.Encoding]::UTF8
} catch { }
$root = $PSScriptRoot

function Invoke-Robocopy {
  param(
    [Parameter(Mandatory)][string]$Source,
    [Parameter(Mandatory)][string]$Destination,
    [string[]]$FileFilter = @(),
    [string[]]$ExtraArgs = @()
  )

  # Порядок robocopy: source destination [файлы] [параметры]
  $roboArgs = @($Source, $Destination) + $FileFilter +
    @('/E', '/R:1', '/W:1', '/NFL', '/NDL', '/NJH', '/NJS', '/NP') + $ExtraArgs
  & robocopy @roboArgs | Out-Host
  $code = $LASTEXITCODE
  # Коды 0–7 — успех, 8+ — ошибка
  if ($code -ge 8) { throw "robocopy завершился с ошибкой (код $code): $Source -> $Destination" }
}

function Invoke-Yarn {
  param([string[]]$Arguments)
  & yarn @Arguments
  if ($LASTEXITCODE -ne 0) { throw "Команда yarn $($Arguments -join ' ') завершилась с ошибкой" }
}

Write-Host ''
Write-Host '=== InspectionList: подготовка развёртывания ===' -ForegroundColor Cyan
Write-Host "Проект: $root"

if (-not $SkipBuild) {
  Write-Host ''
  Write-Host '[1/3] Сборка frontend (vite build)...' -ForegroundColor Yellow
  Invoke-Yarn @('build')
} else {
  Write-Host ''
  Write-Host '[1/3] Сборка пропущена (-SkipBuild)' -ForegroundColor DarkGray
}

if ($IncludeDb) {
  Write-Host ''
  Write-Host '[2/3] Папка db будет включена.' -ForegroundColor Yellow
  Write-Host 'ВАЖНО: копируйте db только если:' -ForegroundColor Yellow
  Write-Host '  - сервер остановлен;' -ForegroundColor Yellow
  Write-Host '  - локальная db снята с сервера уже после всех последних изменений;' -ForegroundColor Yellow
  Write-Host '  - в период между снятием копии и заливкой никто не работал в приложении.' -ForegroundColor Yellow
  if (-not $Yes) {
    $answer = Read-Host 'Продолжить с папкой db? Введите yes'
    if ($answer -ne 'yes') { throw 'Развёртывание отменено пользователем.' }
  }

  if (-not $SkipMigrate) {
    Write-Host ''
    Write-Host '[2/3] Миграция локальной db...' -ForegroundColor Yellow
    Invoke-Yarn @('db:migrate')
  }
} else {
  Write-Host ''
  Write-Host '[2/3] Папка db НЕ включается (рекомендуемый режим).' -ForegroundColor Green
  Write-Host 'На сервере миграция применится автоматически при запуске server/index.js.' -ForegroundColor DarkGray
  Write-Host 'Либо вручную: node server/scripts/apply-schema.js' -ForegroundColor DarkGray
}

if ($Target) {
  # ── Копирование прямо в папку сервера ─────────────────────────────────────
  Write-Host ''
  Write-Host "[3/3] Копирование в $Target ..." -ForegroundColor Yellow

  if (-not (Test-Path $Target)) {
    throw "Папка назначения не найдена: $Target. Создайте её или проверьте доступ к сети."
  }

  $serverTarget = Join-Path $Target 'server'
  $distTarget   = Join-Path $Target 'dist'

  if (-not (Test-Path (Join-Path $serverTarget '.env'))) {
    Write-Warning "На сервере нет $serverTarget\.env — скрипт его намеренно не копирует. Создайте .env вручную."
  }

  Write-Host '  server...' -ForegroundColor Cyan
  Invoke-Robocopy -Source (Join-Path $root 'server') -Destination $serverTarget `
    -ExtraArgs @('/XD', 'node_modules', 'uploads', '/XF', '.env', '*.log')

  # dist можно зеркалить: это полностью генерируемая папка
  Write-Host '  dist...' -ForegroundColor Cyan
  & robocopy (Join-Path $root 'dist') $distTarget /MIR /R:1 /W:1 /NFL /NDL /NJH /NJS /NP | Out-Host
  if ($LASTEXITCODE -ge 8) { throw 'robocopy dist завершился с ошибкой' }

  if ($IncludeDb) {
    $dbSource = Join-Path $root 'db'
    $dbTarget = Join-Path $Target 'db'

    $backup = Join-Path $Target ("db_backup_" + (Get-Date -Format 'yyyy-MM-dd_HH-mm-ss'))
    if (Test-Path (Join-Path $dbTarget '*.fdb')) {
      Write-Host "  резервная копия db -> $backup" -ForegroundColor Cyan
      New-Item -ItemType Directory -Path $backup -Force | Out-Null
      & robocopy $dbTarget $backup *.fdb /E /R:1 /W:1 /NFL /NDL /NJH /NJS /NP | Out-Host
      if ($LASTEXITCODE -ge 8) { throw 'Не удалось создать резервную копию db' }
    }

    Write-Host '  db...' -ForegroundColor Cyan
    Invoke-Robocopy -Source $dbSource -Destination $dbTarget -FileFilter @('*.fdb')
  }

  Write-Host ''
  Write-Host 'Готово. Осталось перезапустить backend на сервере.' -ForegroundColor Green
  if (-not $IncludeDb) {
    Write-Host 'При старте server/index.js сам добавит поле CUSTOM_NAME и справочник «Линейная арматура».' -ForegroundColor Green
  }
} else {
  # ── Создание ZIP-архива ───────────────────────────────────────────────────
  Write-Host ''
  Write-Host '[3/3] Создание ZIP-архива...' -ForegroundColor Yellow

  $stamp   = Get-Date -Format 'yyyy-MM-dd_HH-mm-ss'
  $stage   = Join-Path $env:TEMP "InspectionList_deploy_$stamp"
  $outDir  = Join-Path $root 'deploy'
  $zipPath = Join-Path $outDir "InspectionList_$stamp.zip"

  New-Item -ItemType Directory -Path $stage  -Force | Out-Null
  New-Item -ItemType Directory -Path $outDir -Force | Out-Null

  try {
    Write-Host '  server...' -ForegroundColor Cyan
    Invoke-Robocopy -Source (Join-Path $root 'server') -Destination (Join-Path $stage 'server') `
      -ExtraArgs @('/XD', 'node_modules', 'uploads', '/XF', '.env', '*.log')

    Write-Host '  dist...' -ForegroundColor Cyan
    Invoke-Robocopy -Source (Join-Path $root 'dist') -Destination (Join-Path $stage 'dist')

    if ($IncludeDb) {
      Write-Host '  db...' -ForegroundColor Cyan
      Invoke-Robocopy -Source (Join-Path $root 'db') -Destination (Join-Path $stage 'db') `
        -FileFilter @('*.fdb')
    }

    if (Test-Path $zipPath) { Remove-Item $zipPath -Force }
    Compress-Archive -Path (Join-Path $stage '*') -DestinationPath $zipPath -CompressionLevel Optimal

    Write-Host ''
    Write-Host "Архив готов: $zipPath" -ForegroundColor Green
    Write-Host ''
    Write-Host 'Содержимое: server + dist' -NoNewline
    if ($IncludeDb) { Write-Host ' + db' } else { Write-Host ' (без db — рекомендуется)' }
    Write-Host ''
    Write-Host 'Как переносить:' -ForegroundColor Cyan
    Write-Host '  1. Распакуйте архив на сервере поверх папок server и dist.'
    Write-Host '  2. server\.env, server\node_modules и server\uploads не входят в архив — они останутся как есть.'
    if ($IncludeDb) {
      Write-Host '  3. Папка db заменит серверную. Убедитесь, что сервер был остановлен!' -ForegroundColor Yellow
    }
    Write-Host '  3. Перезапустите backend: node server/index.js (или службу/PM2).'
  } finally {
    Remove-Item $stage -Recurse -Force -ErrorAction SilentlyContinue
  }
}

Write-Host ''
