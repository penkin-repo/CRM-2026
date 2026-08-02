# CRM Таблица — рекламное агентство (compact Google Sheets style)

## Для человека — быстрый старт

Этот репозиторий содержит **два варианта**:

1. **Прототип `/home/user/index.html` (в корне воркспейса Arena)** — полностью офлайн, один HTML, без бэка, работает в песочнице iframe (без `allow-same-origin`, без сети). Идеально для демо и быстрого редактирования в стиле Google Таблицы.
2. **Fullstack `crm-fullstack/` (эта папка)** — React 19 + TypeScript + Tailwind 4 + Vite 7 + `vite-plugin-singlefile` + Vercel Functions + Turso (SQLite в облаке). Готов для деплоя на Vercel.

### Что умеет таблица (v10 — текущая)

- **Заказы**: главный лист, компактные строки 28px с `...`, верхняя edit-bar показывает полный текст с переносами. Клик — выбор, даблклик — inline правка.
  - Колонки: `# ▼`, Дата (человекочитаемо `21 авг 2024`), Клиент (select), Продукция (длинное с ...), Затраты (сумма подрядчиков), Реализация (поддерживает `=6*1200` / `=12000*1.2`), Прибыль, Рент%, Получатель (select с типом), № счета (60px, активно только если плательщик не наличные), Опл чекбокс, Примечание 80px, Статус у действий, Действия `⎘` скопировать / `🗑` удалить.
  - Раскрывающийся блок подрядчиков по клику на `#` — вся ячейка кликабельна, внутри своя sheet-таблица: Подрядчик (select), Описание, Формула `=6*3*450`, =Значение (live без потери фокуса), Плательщик, Опл, Сверка, Примечание.
- **Клиенты / Подрядчики / Плательщики**: добавление пустой строкой без модалок, правка кликом/даблкликом как в таблице, верхняя edit-bar работает для всех вкладок.
- **Плательщики — тип**: `безнал / наличные / карта` в отдельной колонке select. Если `наличные` — № счета серый `—` и очищается, нельзя вписать.
- **Отчеты**: 4 под-вкладки в едином стиле `report-page`:
  - 📅 Месячный — заказы за месяц, статы реал/прибыль/зарплата
  - 👤 По клиенту — фильтр клиента
  - 🏗️ По подрядчику — редактируемые плательщик/опл/сверка прямо из отчета
  - 💰 Зарплатный №1 — заказы за месяц + работы выбранного менеджера/подрядчика (суммируется к зарплате) + наличка (отчет по cash). Формула внизу.
- **История**: до 50 записей, snapshot всей БД в JSON, `↩ Отменить` с badge, восстановление.
- **Экспорт/Импорт JSON**, локально fallback в localStorage если API недоступен.
- **Топ интерфейс переработан**: фон `#e8edf3`, шапка белая с тенью, активный таб синий `#1a73e8` белый текст (не постельный), фильтры — белая карточка с `border-radius:12px` и тенью, edit-bar — карточка с синей левой полосой 4px, таблица — отдельная карточка с `margin` и тенью, чтобы не сливалось. Сама таблица не трогалась.
- **Формулы**: `=6*3*450` и т.п. через `evalFormula` без `mathjs` в прототипе, с `mathjs` в fullstack версии. Для реализации тоже.
- **Дата**: человекочитаемая `21 авг 2024`.

### Запуск fullstack локально

```bash
# 1. Turso
curl -sSfL https://get.tur.so/install.sh | bash
turso auth login
turso db create crm-db
turso db show crm-db --url          # libsql://...
turso db tokens create crm-db       # eyJ...

# 2. Проект
cd crm-fullstack
cp .env.example .env   # заполни URL, TOKEN, APP_PASSWORD=admin
pnpm install
pnpm migrate           # создаст таблицы
pnpm dev               # Vite :5173 + API :3000 параллельно
```

Открой http://localhost:5173, пароль `admin`.

### Деплой на Vercel

```bash
vercel link
vercel env add TURSO_DATABASE_URL
vercel env add TURSO_AUTH_TOKEN
vercel env add APP_PASSWORD
vercel --prod
```

`vercel.json` уже с `rewrites /api/*`. `vite-plugin-singlefile` соберет фронт в один HTML, API останутся serverless функциями в `api/`.

### Структура проекта (fullstack)

```
crm-fullstack/
├─ api/                 # Vercel Functions (@vercel/node)
│  ├─ db.ts             # getDb() -> libsql client
│  ├─ auth.ts           # POST /api/auth
│  ├─ clients.ts        # GET/POST/DELETE
│  ├─ contractors.ts
│  ├─ payers.ts         # + type cashless/cash/card, миграция колонки
│  ├─ orders.ts         # contractors JSON, sale_formula
│  ├─ history.ts
│  └─ salary.ts
├─ scripts/
│  ├─ migrate.ts        # создание таблиц, ALTER для type
│  └─ dev.ts            # параллельно vite + api
├─ server/dev.ts        # локальный http сервер для api/
├─ src/
│  ├─ main.tsx
│  ├─ App.tsx           # auth-gate, theme, header
│  ├─ api.ts            # fetch-обёртки + in-memory cache 3s TTL
│  ├─ types.ts          # все интерфейсы (Order, Client, Payer.type и т.д.)
│  ├─ store.ts          # filters localStorage
│  ├─ seedData.ts       # демо-данные
│  ├─ index.css         # @import tailwindcss + sheet styles
│  ├─ components/
│  │  └─ LoginScreen.tsx
│  └─ pages/
│     └─ DashboardPage.tsx  # компактная таблица v10 (React-порт vanilla)
├─ .env.example
├─ vite.config.ts       # react, tailwindcss, singlefile, proxy /api -> :3000
├─ vercel.json
└─ README.md            # этот файл
```

### ENV

```
TURSO_DATABASE_URL=libsql://...
TURSO_AUTH_TOKEN=eyJ...
APP_PASSWORD=admin
```

---

## Для ИИ — полный контекст

### Назначение

Внутренний инструмент для 2-3 сотрудников рекламного агентства. Учет заказов, клиентов, подрядчиков, плательщиков, расчет зарплаты, история с отменой. Интерфейс должен быть максимально компактным как Google Sheets — редактирование прямо в ячейках, строки одинаковой высоты 28px с `...`, полный текст только в верхней edit-bar.

### Сущности

- **Order**: id, date (YYYY-MM-DD), clientId, productName (длинное, wrap -> ellipsis), contractors: OrderContractorRow[], saleAmount, saleFormula (если начинается с `=` — вычисляется), paymentReceiverId, paymentNote (№ счета, активно только если payer.type != cash), paymentReceived bool, status active/completed, note, createdAt. Вычисляемые: costs = Σ costValue, profit = sale - costs, rent = profit/sale*100.
- **OrderContractorRow**: id, contractorId, description, costFormula (строка с `=`), costValue (вычисленное), payerId, paid bool, reconciled bool, note.
- **Client**: id, name, phone, contactPerson, email, note, customFields (не используется в compact версии), createdAt.
- **Contractor**: id, name, phone, note — в новой версии это могут быть менеджеры (например "Менеджер Алексей").
- **Payer**: id, name, type: cashless | cash | card, createdAt. Логика: если type===cash — paymentNote очищается и поле неактивно.
- **HistoryEntry**: id, timestamp, action, description, snapshot {clients, contractors, payers, orders} — JSON.
- **SalaryRecord**: пока упрощено, в отчетах считается на лету.

### Бизнес-правила (важно!)

1. **№ счета**: активно только если плательщик в Заказах имеет type != cash. Если меняется получатель на cash — paymentNote='' .
2. **Формулы**: поле стоимости подрядчика и реализация поддерживают `=`. Если начинается с `=` — парсится через mathjs (fullstack) или Function (offline). `**` заменяется на `*` для совместимости с примером `=6**3**2*450`. При невалидной формуле → 0.
3. **Продукция и примечание**: в таблице всегда `...` (28px), полный текст с переносами только в верхней textarea edit-bar. Enter сохраняет, Shift+Enter перенос.
4. **Раскрытие подрядчиков**: клик по `#` (вся ячейка 56px) тогглит expanded. Внутри своя таблица без подсказок (убраны по требованию).
5. **Добавление**: + Добавить в любой вкладке создает пустую строку без модалок. Правка — клик/даблклик inline. Удаление — сразу, без confirm (можно отменить через историю).
6. **Фильтры**: статус, месяц, период, поиск по всей инфе заказа, сортировка. Сохраняются в localStorage (store.ts) в прототипе, в fullstack — тоже.
7. **История**: пишется на каждый `updateOrder`, `updateContractor`, `updateGeneric`, создание/удаление. До 50 записей. `undoLast` откатывает последний snapshot.
8. **Отчеты**:
   - Месячный — заказы за `report.month`, статы реал/прибыль/зарплата.
   - По клиенту/подрядчику — фильтр по ID.
   - Зарплатный №1 — кастом: заказы за месяц + если выбран contractorId — сумма его работ за месяц (contractorTotal) суммируется к базе `baseSalary = profit*%`. + отчет по наличке: заказы где payer.type===cash, разбивка получено/к получению. Формула показывается внизу.
9. **Топ интерфейс**: не трогать таблицу, но отделить фильтры: body #e8edf3, шапка белая с тенью, активный таб синий заливка белый текст, toolbar и edit-bar — белые карточки с radius 12px, margin 12px 16px, shadow, edit-bar с левой синей полосой 4px. Таблица — отдельная карточка с margin и тенью.

### Tech Stack (original spec vs prototype)

- **Spec**: React 19 + TS5 strict, Tailwind 4 via @tailwindcss/vite, Vite 7 + vite-plugin-singlefile, Vercel Functions api/, Turso via @libsql/client, mathjs, uuid, lucide-react, clsx+tailwind-merge, pnpm, deployment Vercel.
- **Prototype v10 (index.html)**: vanilla JS, no CDN (offline), safeLS wrappers for sandboxed iframe (sessionStorage may throw), `evalFormula` via Function, no React, no Tailwind CDN (inline CSS), no backend, localStorage key `crm_v10_reports_fixed`. Работает в Arena preview (allow-scripts без allow-same-origin).
- **Fullstack**: реализует spec, но DashboardPage — React-порт v10 для сохранения compact UI.

### Важные файлы в прототипе (index.html v10)

- `safeLSGet/Set` — fallback memStore для песочницы
- `isCashPayer(list,id)` — проверяет payer.type === 'cash' (новая логика) + legacy name includes 'наличн'
- `formatDateHuman` — `21 авг 2024`
- `evalFormula` — без mathjs, Function + regex `^[0-9+\-*/().]+$`
- `calcTotals`
- `seedClients/Contractors/Payers` — payers с type
- `LS_KEY` — версия, bump при breaking change чтобы очистить демо-данные
- `state` — tab, reportSub, expanded, activeCell {row,col,oid,field,tab,cid}, editBarText
- `pushHistory` / `undoLast` / `updateOrder` / `updateContractor` / `updateGeneric` / `addContractorRow` / `createOrder` / `duplicateOrder` / `deleteOrder`
- Render: header + toolbar (filters) + edit-bar (textarea) + stats + sheet-wrap table
  - order row: rownum expand, date human, client select, product editable div.cell-truncate, costs, sale editable with formula, profit, rent, payer select, invoice editable (disabled if cash), paid checkbox, note editable, status button near actions, actions copy/delete only (view removed as requested)
  - contractor sub-table: contractor select, description editable, formula input with live update without rerender (fixed bug), =value, payer select, paid/reconciled, note
  - clients/contractors/payers tabs: generic search, + Добавить creates empty row + immediate dblclick focus, editable via click (active) / dblclick (input/textarea inline), no modals, delete immediate with history
  - reports: standardized `report-page` / `report-filters` / `report-stats` / `report-section` — month, client, contractor (editable payer/paid/reconciled), salary1 (orders + contractor works summed + cash)
  - history: clear/restore (native confirm fallback, but in v10 custom modal removed for simplicity — uses native confirm which may be blocked in iframe, but in fullstack uses custom modal)

### Известные баги и фиксы

- **Формула подрядчиков слетала после 1 цифры**: причина — `input` event вызывал `updateContractor` → `render()` → инпут уничтожался. Фикс v10: отдельный handler `formula-input` live update без render, обновляет только `.cost-value` текст и `saveData`, а `blur` делает полный render для итогов.
- **Добавление клиентов/подрядчиков не работало**: `prompt/confirm` заблокированы в sandboxed iframe Arena (нужен `allow-modals`). Фикс: убраны все модалки для этих вкладок, добавление создает пустую строку и сразу фокус.
- **Продукция не обрезалась ...**: было `white-space:normal` для wrap. Фикс: `height:28px`, `max-width:1px`, `white-space:nowrap`, `overflow:hidden`, `text-overflow:ellipsis`, внутренний `.cell-truncate` div с `padding:0 8px`.
- **Номер счета можно вписать в Наличные**: фикс — `isCashPayer` по `type`, очистка paymentNote при смене на cash, ячейка `—` и `background:#f1f5f9`.
- **Сессия падает в preview**: `sessionStorage` доступ кидает `SecurityError` в sandboxed iframe без `allow-same-origin`. Фикс: обернуть в try/catch + memStore fallback.
- **Топ сливается**: было все `#f8fafc` постельное. Фикс: body `#e8edf3`, header white с тенью, активный таб синий заливка белый текст, toolbar/edit-bar/sheet-wrap — белые карточки с `margin:12px 16px`, `border-radius:12px`, `box-shadow`.

### Что НЕ реализовано в веб-прототипе (как просил автор)

- Нет Vercel Functions (`api/`), нет Turso, нет `migrate.ts` в прототипе — только localStorage.
- Нет `vite-plugin-singlefile` сборки — один HTML.
- Нет `uuid` пакета — `genId()` кастомный.
- Нет `lucide-react` — иконки эмодзи/текст.
- Нет `customFields` у клиентов (доп поля) — хранится но не редактируется.
- Нет полноценного аудит-трейла зарплаты (salary_records) — в отчетах считается на лету.
- Нет `Tooltip` компонента.
- Нет `SearchSelect` с portal — используется native `<select>` с кастомной стрелкой для offline.
- Нет ENV-переменных в прототипе.

Все это реализовано в `crm-fullstack/` папке — там есть `api/*.ts`, `migrate.ts`, `api.ts` с кэшем 3s TTL.

### Как AI должен продолжать

- Не трогать таблицу (sheet-grid) без явного запроса — она считается нормальной.
- Топ фильтры и шапку можно улучшать, но сохранять отделение карточками.
- Все новые поля в Payers должны иметь type, и логика № счета должна зависеть от type.
- Все редактирование — inline, без модалок, с верхней edit-bar для длинного текста с переносами.
- Формулы должны поддерживать `=` в реализации и в подрядчиках, live update без потери фокуса.
- История должна писаться на каждый `update*`.
- Отчеты — стандартизировать через `report-page` / `report-section` / `report-stats`.
- При добавлении нового отчета — добавлять в `reportSub` и в фильтры `state.data.report`.
- Bump `LS_KEY` при breaking change в структуре данных.

### Деплой чеклист для человека

- [ ] `turso db create` + token
- [ ] `.env` заполнить
- [ ] `pnpm install`
- [ ] `pnpm migrate`
- [ ] `pnpm dev` проверить http://localhost:5173
- [ ] `vercel env add` все три переменные
- [ ] `vercel --prod`
- [ ] Проверить что `/api/orders` возвращает JSON
- [ ] Импортировать старый JSON если есть через кнопку Import (создает history snapshot)

Готово — можно качать папку `crm-fullstack` и деплоить.
