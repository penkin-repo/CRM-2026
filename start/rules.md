# Rules — CRM Dashboard Рекламного Агентства

## Менеджер пакетов
- **Только PNPM**. Никакого npm, yarn, bun.
- Команды: `pnpm install`, `pnpm dev`, `pnpm build`, `pnpm preview`

---

## Стек технологий

| Категория | Технология | Версия |
|---|---|---|
| Фреймворк | React | 19.x |
| Язык | TypeScript | 5.x |
| Стили | Tailwind CSS | 4.x (через @tailwindcss/vite) |
| Сборка | Vite | 7.x |
| Формулы | mathjs | 15.x |
| Иконки | lucide-react | latest |
| ID | uuid | 13.x |
| Утилиты | clsx, tailwind-merge | latest |
| Bundling | vite-plugin-singlefile | — (single-file build) |
| Хранилище | localStorage | встроено |

**Нет** внешних UI-библиотек (MUI, Ant Design, shadcn и т.д.) — всё строится на Tailwind.  
**Нет** backend, Firebase, БД — только localStorage.

---

## Архитектурные принципы

1. **SPA, одностраничное приложение** — маршрутизация через вкладки в `App.tsx` (state-based, без react-router).
2. **localStorage как единственное хранилище** — все данные сериализуются через `src/store.ts`.
3. **История изменений** — каждое мутирующее действие пишет снапшот через `src/historyStore.ts`.
4. **Single-file build** — `vite-plugin-singlefile` собирает всё в один `index.html` для автономного использования.
5. **Portal для выпадающих списков** — `SearchSelect` рендерит dropdown через `createPortal` в `document.body`, чтобы избежать clip-overflow внутри модалок.
6. **Безопасные формулы** — вычисление через `mathjs`, не через `eval`.

---

## Структура файлов

```
project root/
├── index.html                  # точка входа
├── vite.config.ts              # Vite + Tailwind + singlefile плагины
├── tsconfig.json
├── package.json
├── src/
│   ├── main.tsx                # ReactDOM.createRoot
│   ├── App.tsx                 # корневой компонент, навигация по вкладкам
│   ├── types.ts                # все TypeScript-интерфейсы
│   ├── store.ts                # localStorage load/save для всех сущностей
│   ├── historyStore.ts         # история изменений (до 50 записей)
│   ├── seedData.ts             # демо-данные (загружаются при первом запуске)
│   ├── index.css               # глобальные стили, Tailwind directives
│   ├── components/
│   │   ├── Modal.tsx           # базовый компонент модального окна
│   │   ├── OrderForm.tsx       # форма создания/редактирования заказа
│   │   └── SearchSelect.tsx    # select с поиском через portal
│   ├── pages/
│   │   ├── DashboardPage.tsx   # вкладка «Заказы»
│   │   ├── ClientsPage.tsx     # вкладка «Клиенты»
│   │   ├── ContractorsPage.tsx # вкладка «Подрядчики»
│   │   ├── PayersPage.tsx      # вкладка «Плательщики»
│   │   ├── ReportsPage.tsx     # вкладка «Отчёты» (3 под-вкладки)
│   │   └── HistoryPage.tsx     # вкладка «История»
│   └── utils/
│       ├── cn.ts               # clsx + tailwind-merge хелпер
│       └── formula.ts          # парсер формул (= prefix → mathjs)
└── start/
    ├── start_prompt.md         # исходное ТЗ
    ├── rules.md                # этот файл
    ├── context.md              # карта проекта
    └── LOG.md                  # журнал изменений
```

---

## Соглашения по коду

### Именование
- **Компоненты**: PascalCase (`OrderForm`, `SearchSelect`)
- **Файлы компонентов**: PascalCase.tsx
- **Хуки**: camelCase с префиксом `use`
- **Утилиты**: camelCase
- **Константы**: UPPER_SNAKE_CASE
- **Типы/Интерфейсы**: PascalCase с префиксом `I` только если есть коллизия

### TypeScript
- Всегда явные типы для props (interface, не type если нет union)
- Не использовать `any` — только `unknown` с проверкой
- Все публичные функции store.ts возвращают типизированные значения

### Стили
- Tailwind utility-first
- Кастомные классы только через `cn()` хелпер (`src/utils/cn.ts`)
- Цветовая схема: фон `#f1f5f9` (slate-100), акцент `#3b82f6` (blue-500)
- Статус выполнено: green, активно: white/default, прибыль+: green, прибыль−: red

### State management
- Нет глобального state-менеджера (Redux, Zustand и т.д.)
- Состояние поднимается в `App.tsx` или в page-компоненты
- Каждый page-компонент сам читает/пишет localStorage через `store.ts`

---

## Правила работы с историей изменений

Каждое действие, изменяющее данные, ОБЯЗАНО:
1. Сделать снапшот текущих данных
2. Применить изменение
3. Вызвать `pushHistory()` из `historyStore.ts`

Действия, которые записываются в историю:
- Создание/редактирование/удаление заказа
- Создание/редактирование/удаление клиента
- Создание/редактирование/удаление подрядчика/плательщика
- Изменения чекбоксов и плательщиков из отчётов
- Импорт данных из JSON

---

## LocalStorage ключи

| Ключ | Данные |
|---|---|
| `agency_clients` | Client[] |
| `agency_contractors` | Contractor[] |
| `agency_payers` | Payer[] |
| `agency_orders` | Order[] |
| `agency_filters` | DashboardFilters |
| `agency_salary_records` | SalaryRecord[] |
| `agency_history` | HistoryEntry[] |
| `agency_seeded` | 'true' — флаг первого запуска |

---

## Команды разработки

```bash
pnpm install          # установка зависимостей
pnpm dev              # dev-сервер (http://localhost:5173)
pnpm build            # production build (dist/)
pnpm preview          # превью production build
```

---

## Правила добавления нового функционала

1. Новый тип → добавить в `src/types.ts`
2. Новые данные в store → добавить load/save функции в `src/store.ts` и ключ в `KEYS`
3. Новая страница → создать в `src/pages/`, добавить вкладку в `App.tsx`
4. Новый компонент → создать в `src/components/`
5. После любого изменения → обновить `start/context.md` и `start/LOG.md`

---

## Запрещено

- Использовать `eval()` для вычислений (только mathjs)
- Хранить чувствительные данные в localStorage в незашифрованном виде
- Добавлять зависимости без согласования
- Вводить внешние UI-библиотеки компонентов
- Использовать npm/yarn/bun вместо pnpm
