# InspectionList — Журнал осмотра ЛЭП

Веб + Android-приложение для учёта дефектов воздушных линий электропередачи: листки осмотра, журнал дефектов, заключения мастера, экспорт в Excel и Word.

---

## Быстрый старт

```bash
yarn install
yarn start          # фронтенд :3000 + json-server :8443 одновременно
```

**Учётные записи**

| Логин      | Пароль     | Филиал          |
|------------|------------|-----------------|
| `admin`    | `admin`    | Все филиалы     |
| `gomel`    | `gomel`    | Гомельские ЭС   |
| `zhlobin`  | `zhlobin`  | Жлобинские ЭС   |
| `mozyr`    | `mozyr`    | Мозырские ЭС    |
| `rechitsa` | `rechitsa` | Речицкие ЭС     |

---

## Синхронизация (PocketBase + Docker)

Приложение работает **офлайн-first**: данные хранятся локально в IndexedDB (Dexie) и синхронизируются с PocketBase при наличии сети.

### Запуск сервера

```bash
docker compose up -d
```

PocketBase доступен на `http://localhost:8090`, админ-панель — `http://localhost:8090/_/`.

### Первый запуск

1. Открыть `http://localhost:8090/_/` → создать суперпользователя
2. Импортировать схему: **Collections → Import** → выбрать `pocketbase/pb_schema.json`
3. Для обеих коллекций (`sheets`, `defect_records`): ⚙ → API Rules → очистить все правила → Save

### Настройка IP на планшете

Узнать IP ноутбука: `ipconfig` → IPv4-адрес Wi-Fi адаптера.

В приложении на планшете нажать **⚙** рядом с кнопкой «Синхронизировать» → ввести `http://192.168.X.X:8090` → Сохранить. Пересборка APK не нужна.

### Схема синхронизации

- **Изменение на устройстве** → пуш в PocketBase через 2 сек (debounce)
- **Real-time SSE** → при изменении на сервере все устройства получают пул мгновенно
- **Fallback** — опрос каждые 30 сек если SSE недоступен
- **Офлайн** — изменения пишутся в локальную очередь (syncQueue), отправляются при восстановлении сети
- **Удаление** синхронизируется в обе стороны

### Переменные окружения (`.env.production.local`)

| Переменная     | Описание                          | Пример                        |
|----------------|-----------------------------------|-------------------------------|
| `VITE_PB_URL`  | URL PocketBase (для APK-сборки)   | `http://192.168.1.50:8090`    |
| `VITE_API_URL` | URL json-server (авторизация)     | `http://192.168.1.50:8443`    |

---

## Страницы

| Маршрут      | Страница                                                  |
|--------------|-----------------------------------------------------------|
| `/login`     | Авторизация                                               |
| `/sheets`    | Список листков осмотра (создание, клонирование, архив)    |
| `/sheet/:id` | Детальная страница листка: добавление/просмотр дефектов, экспорт Excel/Word |
| `/journal`   | Журнал дефектов: фильтрация, заключение мастера, отметка устранения |
| `*`          | 404                                                       |

---

## Стек

| Категория      | Технологии                                          |
|----------------|-----------------------------------------------------|
| Фронтенд       | React 18, TypeScript strict, Vite 4                 |
| Мобильный      | Capacitor 8 (Android)                               |
| Стейт          | Redux Toolkit, RTK Query                            |
| Локальная БД   | Dexie 4 (IndexedDB, офлайн-режим)                   |
| Синхронизация  | PocketBase 0.39 (Docker), SDK v0.27                 |
| Стили          | SCSS Modules, CSS-переменные, тёмная/светлая тема   |
| Экспорт        | ExcelJS, docx, JSZip                                |
| Сервер (auth)  | Node.js + Express (json-server)                     |
| Качество       | ESLint (TS + React), TypeScript strict              |

---

## Архитектура — Feature-Sliced Design (FSD)

```
src/
├── app/        # провайдеры: Router, Redux store, ThemeProvider, глобальные стили
├── pages/      # LoginPage, SheetsListPage, SheetDetailPage, JournalPage, NotFoundPage
├── widgets/    # Navbar, GlobalDefectSearch, SheetsList, DefectTable
├── features/   # AddDefect, DefectSidebar, DefectTimeline, CreateSheet
│               # ExportToExcel, ExportToWord, ThemeSwitcher, SyncToServer
├── entities/   # InspectionSheet, DefectRecord, InspectionLine, User
└── shared/     # ui-kit, хуки, lib, api, стили, константы
```

### Shared UI-kit (`src/shared/ui/`)

| Компонент      | Описание                                          |
|----------------|---------------------------------------------------|
| `Button`       | Кнопка: primary / secondary / ghost / danger      |
| `Modal`        | Модальное окно с portal                           |
| `SelectMenu`   | Кастомный дропдаун (заменяет нативный `<select>`) |
| `Dropdown`     | Базовый дропдаун с portal и позиционированием     |
| `Input`        | Текстовый инпут                                   |

### Ключевые сущности

| Entity            | Описание                                                            |
|-------------------|---------------------------------------------------------------------|
| `InspectionSheet` | Листок осмотра (привязан к линии, филиалу)                          |
| `DefectRecord`    | Дефект (опора или пролёт, элемент, тип, фаза, степень тяжести)      |
| `InspectionLine`  | Справочники: филиал, напряжение, линия, элемент, тип дефекта, фаза  |
| `User`            | Пользователи                                                        |

### Хранение данных

```
shared/lib/db/localDb.ts       — схема Dexie (sheets, defectRecords, syncQueue, referenceCache)
shared/lib/sync/syncService.ts — push/pull логика, очередь мутаций
shared/lib/sync/useSyncService.ts — хук: SSE подписки, интервал, online-событие
shared/lib/pocketbase/pbClient.ts — клиент PocketBase, runtime смена URL
```

---

## Журнал дефектов

- При входе без фильтров — показывается заглушка с общим счётчиком дефектов
- Таблица открывается при выборе **линии** или вводе **элемента/дефекта** в поиск
- Поддерживается выбор нескольких строк → массовое заключение мастера

---

## Скрипты

| Команда          | Действие                                       |
|------------------|------------------------------------------------|
| `yarn start`     | Фронтенд + сервер одновременно                 |
| `yarn build`     | Продакшн-сборка (в `dist/`)                    |
| `yarn deploy`    | Сборка + синхронизация Capacitor Android       |
| `yarn lint:ts`   | Линтинг TypeScript                             |
| `yarn lint:scss` | Линтинг SCSS                                   |
