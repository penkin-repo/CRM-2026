# LOG — CRM Dashboard Рекламного Агентства

## Формат записей

```
### [YYYY-MM-DD] [Тип] Краткое описание
- **Что сделано:** ...
- **Файлы:** ...
- **Причина/Решение:** ...
- **Следующие шаги:** ...
```

---

## 2026-04-15 — Миграция на Turso + Vercel Functions + Auth

### [ARCH] Переход с localStorage на Turso (облачная БД)
- **Что сделано:** Полная архитектурная миграция: localStorage → Turso (libSQL/SQLite cloud) + Vercel Functions
- **Новые файлы:**
  - `api/db.ts` — Turso connection через `@libsql/client`
  - `api/auth.ts` — проверка shared password (`APP_PASSWORD` env)
  - `api/clients.ts` — GET/POST/DELETE
  - `api/contractors.ts` — GET/POST/DELETE
  - `api/payers.ts` — GET/POST/DELETE
  - `api/orders.ts` — GET/POST/DELETE
  - `api/history.ts` — GET/POST/DELETE
  - `api/salary.ts` — GET/POST/DELETE
  - `src/api.ts` — frontend fetch-обёртки (замена store.ts для CRUD)
  - `src/components/LoginScreen.tsx` — экран авторизации (shared password)
  - `scripts/migrate.ts` — скрипт создания схемы БД
  - `vercel.json` — конфигурация Vercel деплоя
  - `.env.example` — шаблон переменных окружения
  - `.gitignore` — добавлен
  - `tsconfig.api.json` — tsconfig для api/ folder
- **Обновлены:**
  - `src/App.tsx` — async загрузка данных из API, экран авторизации, экран загрузки, экран ошибки
  - `vite.config.ts` — добавлен proxy `/api` → `localhost:3000` для dev-режима
  - `package.json` — rename + скрипт `migrate`
  - `tsconfig.json` — включены `api/` и `scripts/`
- **Установлены зависимости:** `@libsql/client`, `@vercel/node` (dev), `dotenv` (dev), `tsx` (dev)
- **Архитектура хранилища:** `store.ts` (localStorage) используется только для `DashboardFilters` — остальное в Turso
- **Известная TS-ошибка:** дублирование типов `@types/node` из-за `@vercel/node` — не влияет на runtime/сборку

### [TODO] Ждём от пользователя
- Создать аккаунт на Turso и получить `TURSO_DATABASE_URL` + `TURSO_AUTH_TOKEN`
- Создать `.env.local` с credentials
- Запустить `pnpm migrate` для создания схемы БД
- Создать `.env.local` и задать `APP_PASSWORD`
- Установить Vercel CLI и подключить к репо
- Задеплоить через Vercel dashboard + GitHub

---

## 2026-04-15 — Миграция на pnpm и запуск dev-сервера

### [SETUP] Переход с npm на pnpm
- **Что сделано:** Удалён `package-lock.json`, выполнен `pnpm install`, одобрены build scripts (`pnpm approve-builds`), запущен dev-сервер `pnpm dev`
- **Файлы:** удалён `package-lock.json`, создан `pnpm-lock.yaml`
- **Результат:** Dev-сервер поднялся на `http://localhost:5173` за 804ms, ошибок нет
- **Установлено:** 106 пакетов, все зависимости из package.json разрешены корректно

---

## 2026-04-15 — Инициализация проекта и старт документации

### [INIT] Создание файлов контекста проекта
- **Что сделано:** Создан полный набор файлов документации в `start/`
- **Файлы:** `start/rules.md`, `start/context.md`, `start/LOG.md`
- **Контекст:** Проект уже имел готовый фронтенд в `src/`. Файлы контекста созданы на основе анализа существующего кода.

---

## Состояние проекта на момент инициализации

### Что уже реализовано (все файлы присутствуют в src/)

- ✅ `src/types.ts` — все TypeScript-интерфейсы (Client, Contractor, Payer, Order, OrderContractorEntry, DashboardFilters, SalaryRecord, HistoryEntry)
- ✅ `src/store.ts` — localStorage load/save для всех сущностей + seed-флаг
- ✅ `src/historyStore.ts` — система истории (до 50 записей, снапшоты)
- ✅ `src/seedData.ts` — демо-данные (10 клиентов, 8 подрядчиков, 5 плательщиков, 15-20 заказов)
- ✅ `src/main.tsx` — точка входа
- ✅ `src/App.tsx` — навигация, шапка, кнопки undo/export/import
- ✅ `src/index.css` — Tailwind directives
- ✅ `src/components/Modal.tsx` — базовый модальный компонент
- ✅ `src/components/OrderForm.tsx` — форма заказа с таблицей подрядчиков и формулами
- ✅ `src/components/SearchSelect.tsx` — select с поиском через createPortal
- ✅ `src/pages/DashboardPage.tsx` — главный экран заказов (29 KB)
- ✅ `src/pages/ClientsPage.tsx` — страница клиентов (18 KB)
- ✅ `src/pages/ContractorsPage.tsx` — страница подрядчиков
- ✅ `src/pages/PayersPage.tsx` — страница плательщиков
- ✅ `src/pages/ReportsPage.tsx` — отчёты с 3 под-вкладками (80 KB!)
- ✅ `src/pages/HistoryPage.tsx` — история изменений
- ✅ `src/utils/cn.ts` — clsx + tailwind-merge хелпер
- ✅ `src/utils/formula.ts` — парсер формул через mathjs

### Технические особенности, выявленные при анализе

1. **Single-file build**: используется `vite-plugin-singlefile` — вся сборка выходит в один `index.html`
2. **React 19**: используется актуальная версия (не 18)
3. **Tailwind CSS 4**: новый синтаксис через `@tailwindcss/vite` плагин (не PostCSS)
4. **SalaryRecord**: в types.ts есть расширенная модель зарплаты с payerAdjustments — это больше, чем описано в start_prompt.md
5. **Contractor имеет phone и note**: в types.ts шире, чем в ТЗ (где только name и id)
6. **package.json name**: "react-vite-tailwind" — стоит переименовать в "agency-crm-dashboard"

### Наблюдения по package.json

- Используется `package-lock.json` (npm lock-файл). При переходе на pnpm нужно удалить его и запустить `pnpm install`.
- `node_modules` скорее всего установлены через npm.

---

## Актуальные задачи

### Приоритет: Высокий
- [ ] Проверить работоспособность проекта: `pnpm dev`
- [ ] Убедиться, что все зависимости установлены через pnpm (`pnpm install`)
- [ ] Удалить `package-lock.json` после перехода на pnpm

### Приоритет: Средний
- [ ] Переименовать `name` в `package.json` с "react-vite-tailwind" на "agency-crm-dashboard"
- [ ] Проверить, не устарел ли `start_prompt.md` в корне (дубль `start/start_prompt.md`)
- [ ] Провести ревью ReportsPage.tsx (80 KB — возможно стоит разбить на под-компоненты)

### Приоритет: Низкий
- [ ] Добавить Firebase в будущем (при необходимости масштабирования)
- [ ] Рассмотреть PWA для офлайн-использования

---

## Известные риски

| Риск | Описание | Статус |
|---|---|---|
| localStorage лимит | ~5-10 MB, при большом количестве заказов/истории может переполниться | Мониторинг |
| package-lock.json | npm lock-файл — нужен переход на pnpm | Требует действия |
| ReportsPage размер | 80 KB — монолитный компонент | Низкий приоритет |
