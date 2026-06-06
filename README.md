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

| Категория  | Технологии                                          |
|------------|-----------------------------------------------------|
| Фронтенд   | React 18, TypeScript strict, Vite 4                 |
| Мобильный  | Capacitor 8 (Android)                               |
| Стейт      | Redux Toolkit, RTK Query                            |
| Локальная БД | Dexie 4 (IndexedDB, офлайн-режим)                 |
| Стили      | SCSS Modules, CSS-переменные, тёмная/светлая тема   |
| Экспорт    | ExcelJS, docx, JSZip                                |
| Сервер     | Node.js + Express (json-server-like)                |
| Качество   | ESLint (TS + React), TypeScript strict              |

---

## Архитектура — Feature-Sliced Design (FSD)

```
src/
├── app/        # провайдеры: Router, Redux store, ThemeProvider, глобальные стили
├── pages/      # LoginPage, SheetsListPage, SheetDetailPage, JournalPage, NotFoundPage
├── widgets/    # Navbar, GlobalDefectSearch, SheetsList, DefectTable
├── features/   # AddDefect, DefectSidebar, DefectTimeline, CreateSheet
│               # ExportToExcel, ExportToWord, ThemeSwitcher
│               # MasterConclusion (в составе JournalPage)
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

Приложение работает **офлайн-first**: данные хранятся в IndexedDB (Dexie).  
Синхронизация с сервером — по кнопке «Синхронизировать» в навбаре.

- `shared/lib/db/localDb.ts` — схема Dexie (`sheets`, `defectRecords`)
- `entities/*/api/` — RTK Query эндпоинты поверх `baseQuery`, работающего через localDb

---

## Журнал дефектов

- При входе без фильтров — показывается заглушка с общим счётчиком дефектов
- Таблица открывается при выборе **линии** или вводе **элемента/дефекта** в поиск
- Это исключает случайную загрузку тысяч записей без контекста
- Поддерживается выбор нескольких строк → массовое заключение мастера

---

## Сервер данных

```
json-server/
├── index.js
├── lib/
│   ├── auth.js           # middleware X-User-Id / X-Filial-Id / X-Is-Admin
│   ├── tenancy.js        # фильтрация по филиалу
│   ├── globalStore.js    # users (глобальные коллекции)
│   ├── lineStore.js      # inspectionSheets, defectRecords (per-line файлы)
│   ├── pathResolver.js
│   ├── helpers.js
│   ├── idCounters.js
│   └── migrations.js
└── routes/
    ├── reference.js      # /filials /voltages /lines /elements /defectTypes /phases
    ├── auth.js           # POST /login, /users, /changePassword
    ├── sheets.js         # /inspectionSheets + /clone
    └── defects.js        # /defectRecords + /defectCounts
```

**Хранение данных на сервере:**
- `seed/` — статические справочники (только чтение)
- `store/data/<collection>/<voltage>/<line>_<lineId>.json` — динамика, атомарная запись

---

## Переменные окружения

| Переменная     | Описание        | По умолчанию            |
|----------------|-----------------|-------------------------|
| `VITE_API_URL` | URL json-server | `http://localhost:8443` |

---

## Скрипты

| Команда          | Действие                                       |
|------------------|------------------------------------------------|
| `yarn start`     | Фронтенд + сервер одновременно                 |
| `yarn build`     | Продакшн-сборка (в `dist/`)                    |
| `yarn deploy`    | Сборка + синхронизация Capacitor Android       |
| `yarn lint:ts`   | Линтинг TypeScript                             |
| `yarn lint:scss` | Линтинг SCSS                                   |
