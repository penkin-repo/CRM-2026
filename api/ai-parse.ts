import type { VercelRequest, VercelResponse } from '@vercel/node'
import { verifyAuth } from './auth-helper.js'

export const maxDuration = 60

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const auth = verifyAuth(req)
  if (!auth.valid) {
    return res.status(401).json({ ok: false, error: 'Неавторизованный доступ (требуется сессионный токен)' })
  }

  try {
    const { text, imageBase64, apiKey: customApiKey, model: customModel, clients = [], contractors = [], payers = [], currentMonth = '2026-10' } = req.body || {}
    const rawKey = (customApiKey || process.env.OPENROUTER_API_KEY || '').trim()

    if (!rawKey || rawKey === 'sk-or-v1-...' || rawKey.length < 15) {
      return res.status(400).json({
        error: 'Не найден валидный API ключ OpenRouter. Пожалуйста, вставьте ваш реальный ключ (sk-or-v1-...) в поле модального окна или пропишите в файле .env (OPENROUTER_API_KEY=sk-or-v1-...)'
      })
    }

    const apiKey = rawKey

    if (!text && !imageBase64) {
      return res.status(400).json({ error: 'Введите текст или загрузите изображение для распознавания.' })
    }

    const todayStr = `${currentMonth}-${String(new Date().getDate()).padStart(2, '0')}`

    const systemPrompt = `Ты — высокоточный ИИ-помощник CRM для создания и разбора заказов.
Ты умеешь анализировать как обычный текст/сообщения от менеджеров, так и скриншоты расчетных таблиц, смет, накладных и спецификаций.
Твоя задача — извлечь все данные заказа и вернуть СТРОГО чистый JSON.

Доступные сущности в системе CRM:
- Существующие Клиенты: ${JSON.stringify(clients.map((c: any) => ({ id: c.id, name: c.name })))}
- Существующие Подрядчики: ${JSON.stringify(contractors.map((co: any) => ({ id: co.id, name: co.name })))}
- Существующие Счета/Плательщики: ${JSON.stringify(payers.map((p: any) => ({ id: p.id, name: p.name, type: p.type })))}

ПРАВИЛА ИЗВЛЕЧЕНИЯ ДАННЫХ ИЗ СКРИНШОТОВ И ТЕКСТА:

А. СПЕЦИАЛЬНОЕ ПРАВИЛО ДЛЯ СКРИНШОТОВ КАЛЬКУЛЯТОРОВ / СМЕТ ПРОДУКЦИИ:
Таблицы расчета заказа содержат следующие ключевые зоны и колонки:
1. Шапка окна / статусная строка:
   - Вверху (например, рядом со статусом «Копия изменена» или строкой «fx») указано наименование Клиента (например: «Лисьев Максим ACP ASR бывш Арктика»).
   - Извлеки полное наименование в "clientNameExtracted".
   - Сопоставь с доступным списком "Существующие Клиенты" (например: «Лисьев Максим ACP ASR») и укажи его "clientId", если совпадение найдено.

2. Назначение колонок в таблице:
   - «ТОВАРЫ / УСЛУГИ»: наименование позиции (продукция или работа).
   - «КОЛ-ВО, ШТ.»: количество / тираж изделия (например: 200, 4, 8, 1).
   - «СТ-ТЬ ЗА 1 ШТ, РУБ.»: цена за единицу, выставленная клиенту (например: 21, 570, 640, 700).
   - «СТ-ТЬ, РУБ.» (или «КЛИЕНТУ»): общая сумма позиции для клиента (равна КОЛ-ВО * СТ-ТЬ ЗА 1 ШТ, например: 4200, 2280, 5120, 700).
     * «saleAmount»: ИТОГОВАЯ СУММА РЕАЛИЗАЦИИ КЛИЕНТУ = сумма по всем строкам столбца «СТ-ТЬ, РУБ.» (например: 4200 + 2280 + 5120 + 700 = 12300).
     * «saleFormula»: запиши формулу сложения (например: "=4200+2280+5120+700").
   - «ЗА ШТ» (колонка сразу после «СТ-ТЬ, РУБ»): это СЕБЕСТОИМОСТЬ ЗА 1 ШТ от подрядчика/исполнителя (например: 10,5, 270, 400, 700).
   - КОЛОНКИ «%», «НАЦЕНКА», «ОКРУГ», «ПРИБЫЛЬ», «СПЕЦ ПР»: СТРОГО ИГНОРИРОВАТЬ! CRM рассчитывает маржу, наценку и прибыль автоматически.
   - «СЕБЕС»: общая себестоимость позиции (затраты на изготовление / подрядчика). Равна числу из столбца «СЕБЕС» или (КОЛ-ВО * СЕБЕС ЗА ШТ, например: 2100, 1080, 3200, 700).
     * Запиши сумму в "costValue" строки подрядчика.
     * В "costFormula" запиши формулу (например: "=200*10.5", "=4*270", "=8*400", "=700").
   - «ПРИМЕЧАНИЕ»: здесь указывается ПОДРЯДЧИК (исполнитель) и детали его работы (например: «ДАПРИНТ Картон», «БР», «МОнШеврон», «Пенкин Дизайн 5»).
     * Первое слово или название — это подрядчик (ДАПРИНТ, БР, МонШеврон, Пенкин и т.д.).
     * Сопоставь с доступным списком "Существующие Подрядчики" (без учета регистра и лишних пробелов). Если совпал — укажи его "contractorId", иначе сохрани точное название в "contractorNameExtracted".
     * Дополнительные слова (например «Картон», «Дизайн 5») сохрани в "note" строки подрядчика.
     * В "description" строки подрядчика запиши наименование работы (из колонки «ТОВАРЫ / УСЛУГИ»).

3. Поле «productName» (Номенклатура заказа):
   - Нумерованный список ВСЕХ позиций таблицы с указанием тиража:
     1. Печать евро-листовок 99х210мм Картон 4+4 — 200 шт.
     2. Наклейки АСР с градиентом, аппликация 300х300мм — 4 шт.
     3. Вышивка на кепке — 8 шт.
     4. Отрисовка и подготовка макетов — 1 шт.
   - В «productName» ЗАПРЕЩЕНО указывать цены, рубли, себестоимость и наценку. Только наименование и количество!

Б. РАБОТА С ОБЫЧНЫМ ТЕКСТОМ / СООБЩЕНИЯМИ:
Если пользователь ввел текст (например: «ИП Дракунов, 200 визиток матовых по 3100 (себес Гефест 1200), баннер 2080 (себес БР 1080)»):
- Извлеки клиента, позиции без цен в "productName", общую сумму клиенту в "saleAmount", а подрядчиков и себестоимость распредели в массив "contractors".

В. ПРАВИЛО ДЛЯ ДАТЫ ("date"):
- Формат YYYY-MM-DD.
- Текущий рабочий год системы CRM — 2026 (активный месяц: "${currentMonth}").
- Если на скриншоте/в документе стоит старый архивный год (например 2023, 2024, 2025) или дата не указана — СТРОГО подставляй дату в текущем рабочем месяце (например, "${todayStr}").
- ЗАПРЕЩЕНО создавать заказы в 2023, 2024 или 2025 году! Все заказы создаются в 2026 году.

СХЕМА JSON ДЛЯ ОТВЕТА:
{
  "date": "YYYY-MM-DD",
  "clientId": "id" | null,
  "clientNameExtracted": "string",
  "productName": "string",
  "saleAmount": number,
  "saleFormula": "string",
  "paymentReceiverId": "id" | null,
  "paymentNote": "string",
  "note": "string",
  "contractors": [
    {
      "contractorId": "id" | null,
      "contractorNameExtracted": "string",
      "description": "string",
      "costFormula": "string",
      "costValue": number,
      "payerId": "id" | null,
      "note": "string"
    }
  ]
}`

    const userMessageContent: any[] = []
    if (text) {
      userMessageContent.push({ type: 'text', text: `Данные для разбора:\n${text}` })
    }
    if (imageBase64) {
      userMessageContent.push({
        type: 'image_url',
        image_url: {
          url: imageBase64.startsWith('data:') ? imageBase64 : `data:image/jpeg;base64,${imageBase64}`
        }
      })
    }

    const selectedModel = (customModel || process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini').trim()

    const isGptModel = selectedModel.includes('gpt-') || selectedModel.includes('openai/')
    const payload: any = {
      model: selectedModel,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessageContent.length === 1 && userMessageContent[0].type === 'text' ? userMessageContent[0].text : userMessageContent }
      ],
      temperature: 0.1
    }
    if (isGptModel) {
      payload.response_format = { type: 'json_object' }
    }

    const openRouterRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://crm-a29.vercel.app',
        'X-Title': 'CRM A29 Assistant'
      },
      body: JSON.stringify(payload)
    })

    if (!openRouterRes.ok) {
      const errText = await openRouterRes.text().catch(() => '')
      let errMsg = `Ошибка OpenRouter: HTTP ${openRouterRes.status}`
      try {
        const errJson = JSON.parse(errText)
        if (errJson.error?.message) errMsg = errJson.error.message
      } catch {}
      return res.status(openRouterRes.status).json({ error: errMsg })
    }

    const data = await openRouterRes.json()
    const content = data.choices?.[0]?.message?.content || '{}'

    let parsedResult: any = {}
    try {
      const cleanedContent = content.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim()
      const jsonMatch = cleanedContent.match(/\{[\s\S]*\}/)
      parsedResult = JSON.parse(jsonMatch ? jsonMatch[0] : cleanedContent)
    } catch (e: any) {
      return res.status(500).json({ error: 'ИИ вернул невалидный JSON: ' + (e.message || ''), raw: content })
    }

    return res.json({ ok: true, data: parsedResult })
  } catch (error: any) {
    console.error('AI Parse error:', error)
    return res.status(500).json({ error: error.message || 'Внутренняя ошибка при разборе ИИ' })
  }
}
