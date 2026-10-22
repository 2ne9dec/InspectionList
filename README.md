# InspectionList

Журнал осмотра ВЛ. Обходчики заводят листки осмотра по линиям и отмечают на них дефекты по опорам, мастер потом пишет заключение и отмечает устранение. Есть выгрузка в Excel.

Работает в браузере и как Android-приложение на планшетах (Capacitor). На планшете можно работать без сети, данные досылаются на сервер, когда связь появится.

Используется в Гомельских, Жлобинских, Мозырских и Речицких ЭС. Только внутри сети предприятия, наружу сервер не публикуется.

## Как устроено

Бэкенд: Node.js + Express, база Firebird 3. Фронт: React 18 + TypeScript, собирается Vite. Express отдаёт и API, и собранный фронт из `dist/`, всё на одном порту.

У каждого филиала свой сервер и своя база (`db/gomel.fdb`, `db/zhlobin.fdb`, `db/mozyr.fdb`, `db/rechitsa.fdb`). Когда-то была одна общая база, потом её разделили по филиалам.

Схема примерно такая:

```
браузер / планшет  --HTTP, JSON, Bearer JWT-->  Express (server/index.js)  --node-firebird-->  Firebird
```

Что используется:

- фронт: React 18, TypeScript, Redux Toolkit + RTK Query, SCSS modules, Dexie (IndexedDB), ExcelJS
- Android: Capacitor 8
- сервер: Express 4, jsonwebtoken, bcryptjs, express-rate-limit, node-firebird, dotenv

Зависимости фронта в `package.json` / `yarn.lock`, сервера в `server/package.json` / `server/package-lock.json`.

## Авторизация

Логин через `POST /login`, сервер проверяет пароль по таблице `USERS` и отдаёт JWT-токен на 8 часов (срок меняется в `JWT_EXPIRES`). В токене лежат id пользователя, филиал, роль и списки разрешённых линий/напряжений. Фронт хранит токен в sessionStorage и шлёт в `Authorization: Bearer ...`. Если сервер ответил 401, фронт выкидывает на страницу логина. После 8 часов надо войти заново.

Пароли в базе хранятся в bcrypt. В старой версии хранили в SHA-256, у кого-то такие ещё могут остаться. Когда такой пользователь входит, сервер сам пересохраняет его пароль в bcrypt.

На `/login` стоит лимит 5 попыток за 15 минут.

Офлайн-вход на планшете. Если сервер не ответил за 3 секунды, фронт проверяет пароль локально (`src/features/Auth/model/loginThunk.ts`, по одной учётке на филиал, в сборку попадает только свой филиал по `VITE_FILIAL_ID`). Токена в офлайне нет, всё созданное копится в локальной очереди и уходит на сервер после нормального входа.

Роли: `director`, `engineer`, `master`, `viewer`. Для engineer предусмотрены ограничения по напряжениям (`USER_ALLOWED_VOLTAGES`), для master по линиям (`USER_ALLOWED_LINES`).

Порядок middleware в `server/index.js`:

1. фильтр по IP, если задан `BIND_HOST`
2. `express.json`, лимит тела 1 МБ
3. заголовки безопасности (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, CSP) и CORS
4. статика из `dist/`
5. `authMiddleware`: разбирает JWT, заполняет `req.userId`, `req.filialId`, `req.role`
6. `tenancyMiddleware`: считает, какие линии доступны филиалу
7. проверка авторизации (`requireAuth`)
8. роуты
9. SPA fallback: неизвестный GET отдаёт `index.html`
10. обработчик ошибок

Для локальной разработки есть режим `VITE_ENABLE_MOCK_AUTH=true`: сервер берёт пользователя из заголовков `X-User-Id` / `X-Filial-Id` / `X-Role` без токена. С `NODE_ENV=production` сервер с этим флагом не запустится.

## Разделение по филиалам

У каждого филиала своя база. Кроме того, в `server/lib/tenancy.js` при старте строится карта «филиал -> id линий» по `LINES.FILIAL_ID` и `FILIAL_VOLTAGE_FILTER`, и роуты фильтруют данные через `canAccessLine` / `lineWhereClause`. Карта строится один раз при старте, после правки справочника линий сервер надо перезапустить.

## API

Всё JSON.

Пользователи, `server/routes/auth.js`:

| метод | путь | что делает |
|---|---|---|
| POST | `/login` | вход, выдаёт токен |
| GET | `/users` | список пользователей |
| GET | `/users/me` | текущий пользователь |
| POST | `/users` | создать пользователя |
| PATCH | `/users/:id` | изменить пользователя |
| DELETE | `/users/:id` | удалить пользователя |
| POST | `/users/:id/resetPassword` | задать новый пароль пользователю |
| POST | `/changePassword` | сменить свой пароль |

Листки, `server/routes/sheets.js`:

| метод | путь | что делает |
|---|---|---|
| GET | `/inspectionSheets` | список листков с фильтрами и пагинацией |
| GET | `/inspectionSheets/:id` | один листок |
| POST | `/inspectionSheets` | создать листок |
| POST | `/inspectionSheets/:id/clone` | копия листка на другую дату |
| PATCH | `/inspectionSheets/:id` | изменить листок |
| DELETE | `/inspectionSheets/:id` | удалить листок |
| POST | `/inspectionSheets/merge` | объединить несколько листков в один |

Дефекты, `server/routes/defects.js`:

| метод | путь | что делает |
|---|---|---|
| GET | `/defectRecords` | список дефектов |
| GET | `/defectCounts`, `/defectTrends`, `/poleDefectStatus` | счётчики и статистика |
| POST | `/defectRecords` | добавить дефект |
| PATCH | `/defectRecords/:id` | изменить дефект (заключение, устранение и т. д.) |
| DELETE | `/defectRecords/:id` | удалить дефект |
| DELETE | `/defectRecordsBySheet/:sheetId` | удалить все дефекты листка |

Справочники, `server/routes/reference.js`:

| метод | путь | что делает |
|---|---|---|
| GET | `/filials`, `/voltages`, `/lines`, `/filialVoltageFilter` | справочники филиала |
| GET | `/elements`, `/defectTypes`, `/phases`, `/phaseElementIds` | общие справочники |
| PATCH | `/lines/:id` | изменить паспорт линии |

Синхронизация, `server/routes/sync.js`:

| метод | путь | что делает |
|---|---|---|
| POST | `/sync/batch` | принять пачку изменений с планшета |
| GET | `/sync/pull` | отдать все данные филиала |

SQL везде параметризованный (`?`). Имена колонок в динамических UPDATE берутся только из захардкоженных списков.

## Где лежат данные

На сервере Firebird, готовые базы лежат в `db/`. Основное:

- справочники: `FILIALS`, `VOLTAGES`, `LINES`, `ELEMENTS`, `DEFECT_TYPES`, `PHASES`, `PHASE_ELEMENT_IDS`, `FILIAL_VOLTAGE_FILTER`
- `USERS`: логин, хэш пароля, ФИО, роль, филиал; плюс `USER_ALLOWED_LINES` и `USER_ALLOWED_VOLTAGES`
- `INSPECTION_SHEETS`: листки (одна линия на одну дату, уникальный индекс)
- `DEFECT_RECORDS`: дефекты, заключения мастера, устранение

Из персональных данных только ФИО сотрудников: кто создал листок, кто нашёл и устранил дефект, мастер, отображаемое имя пользователя.

К базе сервер подключается под `FB_USER` / `FB_PASSWORD` из `server/.env`.

На клиенте (браузер / WebView):

- sessionStorage: `defect_tracker_token` (JWT), `defect_tracker_user` (профиль)
- localStorage: `api_server_url` (адрес сервера, задаётся на планшете вручную), `pending_sheets_v1` и `pending_defects_v1` (офлайн-очередь), `defect_tracker_inspector` (последнее введённое ФИО), `theme`
- IndexedDB `InspectionListDB`: кэш листков, дефектов, справочников

## Настройки

`server/.env`:

```
PORT=8443            # у нас на серверах 80
BIND_HOST=           # пусто = 0.0.0.0
FB_HOST=127.0.0.1
FB_PORT=3050
FB_DATABASE=         # полный путь к .fdb, обязательно
FB_USER=
FB_PASSWORD=         # обязательно, без него сервер не стартует
JWT_SECRET=          # в production обязательно, от 32 символов
JWT_EXPIRES=8h
BCRYPT_ROUNDS=12
NODE_ENV=production  # включает проверки конфига
```

Секрет можно сгенерить так:

```
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Фронт (`.env`, `.env.production.local`), это всё уезжает в бандл, секретов туда не класть:

- `VITE_API_URL`: адрес API; в dev на него проксирует Vite
- `VITE_FILIAL_ID`: филиал сборки (1 Гомель, 2 Жлобин, 3 Мозырь, 4 Речица)

## Установка

Нужно: Node.js 18+, Yarn, Firebird 3.0+. Для APK ещё Android Studio и JDK 17.

База:

1. скопировать готовую базу своего филиала из `db/` на сервер Firebird
2. прописать путь к ней и учётные данные в `server/.env`

Сервер:

```bash
cd server
npm ci
# заполнить server/.env
cd ..
yarn install
yarn build
node server/index.js
```

На серверах крутится через pm2: `pm2 start server/index.js --name inspectionlist`.

APK:

```bash
# в .env выставить VITE_FILIAL_ID и VITE_API_URL
yarn deploy      # build + cap sync
```

Дальше собрать в Android Studio из папки `android/`. Адрес сервера на планшете меняется без пересборки, шестерёнка рядом с кнопкой «Синхронизировать».

## Разработка

```bash
yarn install
cd server && npm install && cd ..
yarn start
```

`yarn start` поднимает Vite на :3000 и сервер, API проксируется на `VITE_API_URL`.

Ещё команды:

- `yarn build`: tsc + сборка в `dist/`
- `yarn start:prod`: vite preview + сервер
- `yarn deploy`: сборка + cap sync
- `yarn lint:ts`, `yarn lint:scss`
- `yarn check:all`: типы и линтеры

## Структура

```
src/          фронт, раскладка по Feature-Sliced Design
  app/        роутер (RequireAuth), store, тема
  pages/      Login, SheetsList, SheetDetail, Journal, NotFound
  widgets/    Navbar, SheetsList, DefectTable, GlobalDefectSearch
  features/   Auth, AddDefect, CopyDefect, FixDefect, CreateSheet, ExportToExcel, SyncToServer ...
  entities/   InspectionSheet, DefectRecord, InspectionLine, User
  shared/     rtkApi, localDb, офлайн-очередь, ui-kit, стили
server/
  index.js    вход, middleware
  lib/        auth.js, tenancy.js, fbDb.js, config.js
  routes/     auth, sheets, defects, reference, sync
  seed/       справочники по филиалам
db/           .fdb
android/      проект Capacitor
```

Страницы: `/login`, `/sheets` (список листков), `/sheet/:id` (листок с дефектами), `/journal` (журнал, заключения мастера), остальное 404. Страницы кроме `/login` закрыты `RequireAuth` на фронте.
