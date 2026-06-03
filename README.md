# InspectionList — Листки осмотра ЛЭП

Веб-приложение для управления инспекцией воздушных линий электропередачи: листки осмотра, учёт дефектов, экспорт в Excel и Word.

---

## Быстрый старт

```bash
yarn install
yarn start          # фронтенд :3000 + json-server :8443 одновременно
```

**Тестовые учётные записи**

| Логин   | Пароль     |
| ------- | ---------- |
| `admin` | `admin123` |
| `user1` | `user123`  |

---

## Страницы

| Маршрут      | Страница                                    |
| ------------ | ------------------------------------------- |
| `/login`     | Авторизация                                 |
| `/sheets`    | Список листков осмотра                      |
| `/sheet/:id` | Детальная страница листка: дефекты, экспорт |
| `*`          | 404                                         |

---

## Архитектура

Feature-Sliced Design (FSD):

```
src/
├── app/        # провайдеры: Router, Redux store, ThemeProvider, глобальные стили
├── pages/      # LoginPage, SheetsListPage, SheetDetailPage, NotFoundPage
├── widgets/    # Navbar, DefectTable
├── features/   # AddDefect, DefectSidebar, FixDefect, CopyDefect, ExportExcel, ExportWord, Auth
├── entities/   # InspectionSheet, DefectRecord, InspectionLine, User
└── shared/     # ui-kit, хуки, api, стили, константы
```

### Entities

| Entity            | Описание                                                           |
| ----------------- | ------------------------------------------------------------------ |
| `InspectionSheet` | Листки осмотра                                                     |
| `DefectRecord`    | Записи дефектов (привязаны к опоре или Пролётыу)                   |
| `InspectionLine`  | Справочники: филиал, напряжение, линия, элемент, тип дефекта, фаза |
| `User`            | Пользователи                                                       |

### Ключи местоположения

Дефекты группируются по строковому ключу:

- `о:253` — опора №253
- `п:250-300` — Пролёты 250–300

Поля "Опора" и "Пролёты" взаимоисключающие: заполнение одного блокирует другое.

---

## Сервер данных (json-server)

```
json-server/
├── index.js
├── lib/
│   ├── auth.js           # middleware X-User-Id / X-Filial-Id / X-Is-Admin
│   ├── tenancy.js        # фильтрация по филиалу
│   ├── globalStore.js    # users, tasks (глобальные коллекции)
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

**Хранение данных:**

- `seed/` — статические справочники (только чтение)
- `store/data/<collection>/<voltage>/<line>_<lineId>.json` — динамические данные, атомарная запись

---

## Стек

| Категория | Технологии                             |
| --------- | -------------------------------------- |
| Фронтенд  | React 18, TypeScript, Vite 4           |
| Стейт     | Redux Toolkit, RTK Query               |
| Стили     | SCSS Modules, CSS-переменные           |
| Экспорт   | ExcelJS, docx, JSZip                   |
| Сервер    | Node.js + Express, multer              |
| Качество  | ESLint (TS + React), TypeScript strict |

---

## Переменные окружения

| Переменная     | Описание        | По умолчанию            |
| -------------- | --------------- | ----------------------- |
| `VITE_API_URL` | URL json-server | `http://localhost:8443` |

---

## Скрипты

| Команда          | Действие                       |
| ---------------- | ------------------------------ |
| `yarn start`     | Фронтенд + сервер одновременно |
| `yarn build`     | Продакшн-сборка                |
| `yarn lint:ts`   | Линтинг TypeScript             |
| `yarn lint:scss` | Линтинг SCSS                   |
