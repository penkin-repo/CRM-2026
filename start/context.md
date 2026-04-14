# Context — CRM Dashboard Рекламного Агентства

## Что строим

**Dashboard для рекламного агентства** — веб-приложение для учёта заказов, клиентов, подрядчиков, плательщиков и расчёта зарплаты сотрудника.

- Тип: SPA (одностраничное приложение)
- Язык интерфейса: **русский**
- Хранилище: **localStorage** (без backend)
- Сборка: **single-file HTML** (vite-plugin-singlefile) — полностью автономный файл
- Пользователи: 2-3 человека, локальное использование

---

## Стек

- React 19 + TypeScript 5
- Tailwind CSS 4 (через @tailwindcss/vite)
- Vite 7 + vite-plugin-singlefile
- mathjs (формулы), uuid (ID), lucide-react (иконки), clsx + tailwind-merge

---

## Структура директорий

```
c:\DEV\2026\CRM 2006\
├── index.html                  # точка входа HTML
├── vite.config.ts              # плагины: react, tailwindcss, viteSingleFile
├── tsconfig.json
├── package.json
├── src/
│   ├── main.tsx                # монтирование React в #root
│   ├── App.tsx                 # корень: навигация, глобальный state, шапка
│   ├── types.ts                # все TS-интерфейсы (см. ниже)
│   ├── store.ts                # localStorage: load/save для всех сущностей
│   ├── historyStore.ts         # история изменений: pushHistory, loadHistory
│   ├── seedData.ts             # демо-данные для первого запуска
│   ├── index.css               # @import tailwindcss
│   ├── components/
│   │   ├── Modal.tsx           # обёртка модального окна (overlay + анимация)
│   │   ├── OrderForm.tsx       # форма создания/редактирования заказа
│   │   └── SearchSelect.tsx    # select с поиском (portal в document.body)
│   ├── pages/
│   │   ├── DashboardPage.tsx   # «📋 Заказы» — главный экран
│   │   ├── ClientsPage.tsx     # «👥 Клиенты»
│   │   ├── ContractorsPage.tsx # «🏗️ Подрядчики»
│   │   ├── PayersPage.tsx      # «💳 Плательщики»
│   │   ├── ReportsPage.tsx     # «📊 Отчёты» (3 под-вкладки)
│   │   └── HistoryPage.tsx     # «🕐 История»
│   └── utils/
│       ├── cn.ts               # cn() = clsx + twMerge
│       └── formula.ts          # вычисление формул (= prefix → mathjs)
└── start/
    ├── start_prompt.md
    ├── rules.md
    ├── context.md              # этот файл
    └── LOG.md
```

---

## Типы данных (`src/types.ts`)

### `Client`
```ts
{ id, name, phone, contactPerson, email, note, customFields: {label, value}[], createdAt }
```

### `Contractor`
```ts
{ id, name, phone, note, createdAt }
```

### `Payer`
```ts
{ id, name, createdAt }
```

### `OrderContractorEntry`
```ts
{ id, contractorId, description, costFormula, costValue, payerId, paid, reconciled, note }
```

### `Order`
```ts
{ id, date, clientId, productName, contractors: OrderContractorEntry[],
  saleAmount, paymentReceiverId, paymentNote, paymentReceived, status: 'active'|'completed',
  note, createdAt }
```
**Вычисляемые поля (не хранятся):**
- `totalCost` = сумма `costValue` всех подрядчиков
- `profit` = `saleAmount` - `totalCost`
- `profitability` = `(profit / saleAmount) * 100`

### `DashboardFilters`
```ts
{ status: 'all'|'active'|'completed', dateFrom, dateTo, month, searchText,
  sortBy: 'date'|'client'|'amount', sortDir: 'asc'|'desc' }
```

### `SalaryRecord`
```ts
{ id, month: "YYYY-MM", salaryPercent, baseSalary, payerAdjustments: [...],
  totalAdjustment, finalSalary, paidAmount, closedAt, note, history: [...] }
```

### `HistoryEntry`
```ts
{ id, timestamp, action, description, snapshot: {clients, contractors, payers, orders} }
```

---

## LocalStorage ключи

| Ключ | Тип |
|---|---|
| `agency_clients` | `Client[]` |
| `agency_contractors` | `Contractor[]` |
| `agency_payers` | `Payer[]` |
| `agency_orders` | `Order[]` |
| `agency_filters` | `DashboardFilters` |
| `agency_salary_records` | `SalaryRecord[]` |
| `agency_history` | `HistoryEntry[]` |
| `agency_seeded` | `'true'` |

---

## Навигация (вкладки в App.tsx)

| Tab key | Компонент | Иконка |
|---|---|---|
| `dashboard` | `DashboardPage` | 📋 Заказы |
| `clients` | `ClientsPage` | 👥 Клиенты |
| `contractors` | `ContractorsPage` | 🏗️ Подрядчики |
| `payers` | `PayersPage` | 💳 Плательщики |
| `reports` | `ReportsPage` | 📊 Отчёты |
| `history` | `HistoryPage` | 🕐 История |

---

## Под-вкладки «Отчёты» (ReportsPage.tsx)

1. **📅 Месячный отчёт** — фильтр по месяцу/году, % зарплаты от прибыли, карточки статистики, таблица заказов, расчёт зарплаты
2. **👤 По клиенту** — выбор клиента + период, статистика, таблица заказов
3. **🏗️ По подрядчику** — выбор подрядчика + период, статистика (итого/оплачено/не оплачено/сверено), таблица работ с inline-редактированием (плательщик, оплачено, сверка)

---

## Ключевые компоненты

### `SearchSelect.tsx`
- Input + dropdown через `createPortal` в `document.body`
- `position: fixed`, пересчёт при scroll/resize
- Закрывается по клику вне компонента

### `Modal.tsx`
- Overlay с `fadeIn` анимацией
- Закрывается по клику на overlay
- Поддержка прокрутки длинного контента

### `OrderForm.tsx`
- Создание и редактирование заказа
- Таблица подрядчиков (Excel-стиль)
- Формулы в поле стоимости (= prefix → mathjs)
- Live-расчёт итогов (затраты, прибыль, рентабельность)

### `formula.ts`
- Если строка начинается с `=` — парсить как формулу через mathjs
- Иначе — `parseFloat()`
- Защита от ошибок: возвращает `0` при невалидной формуле

---

## Шапка приложения (App.tsx)

- Кнопка **«↩ Отменить»** — откатывает последнее действие из истории, badge с количеством
- Кнопка **«📥 JSON»** — экспорт всех данных
- Кнопка **«📤 Импорт»** — импорт из JSON-файла

---

## Демо-данные (`seedData.ts`)

Загружаются при первом запуске (флаг `agency_seeded`):
- 10 клиентов с разными данными и доп. полями
- 8 подрядчиков
- 5 плательщиков
- 15-20 заказов за последние 3 месяца

---

## Цветовая схема

| Элемент | Цвет |
|---|---|
| Основной фон | `#f1f5f9` (slate-100) |
| Акцент | `#3b82f6` (blue-500) |
| Выполнен | green |
| Прибыль + | green |
| Прибыль − | red |
| Карточки статистики | blue, green, purple, orange градиенты |

---

## Текущее состояние реализации

| Модуль | Статус |
|---|---|
| Типы (`types.ts`) | ✅ Готово |
| Store (`store.ts`) | ✅ Готово |
| History store | ✅ Готово |
| Seed data | ✅ Готово |
| Modal компонент | ✅ Готово |
| SearchSelect | ✅ Готово |
| OrderForm | ✅ Готово |
| DashboardPage | ✅ Готово |
| ClientsPage | ✅ Готово |
| ContractorsPage | ✅ Готово |
| PayersPage | ✅ Готово |
| ReportsPage | ✅ Готово |
| HistoryPage | ✅ Готово |
| App.tsx (навигация, шапка) | ✅ Готово |

---

## ENV-переменные

Не используются — приложение полностью клиентское.

---

## Зависимости (package.json)

```json
dependencies:
  react: 19.2.3, react-dom: 19.2.3
  tailwindcss: 4.1.17, @tailwindcss/vite: 4.1.17
  lucide-react: ^0.577.0
  mathjs: ^15.1.1
  uuid: ^13.0.0, @types/uuid: ^10.0.0
  clsx: 2.1.1, tailwind-merge: 3.4.0

devDependencies:
  vite: 7.2.4, @vitejs/plugin-react: 5.1.1
  vite-plugin-singlefile: 2.3.0
  typescript: 5.9.3
  @types/react: 19.2.7, @types/react-dom: 19.2.3
  @types/node: ^22.0.0
```
