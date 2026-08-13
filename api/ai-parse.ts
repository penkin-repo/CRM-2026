import type { VercelRequest, VercelResponse } from '@vercel/node'
import dotenv from 'dotenv'
import { verifyAuth } from './auth-helper.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  dotenv.config({ override: true })
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const auth = verifyAuth(req)
  if (!auth.valid) {
    return res.status(401).json({ ok: false, error: 'Неавторизованный доступ (требуется сессионный токен)' })
  }

  try {
    const { text, imageBase64, apiKey: customApiKey, clients = [], contractors = [], payers = [] } = req.body || {}
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

    const todayStr = new Date().toISOString().slice(0, 10)

    const systemPrompt = `Ты — высокоточный ИИ-помощник CRM для создания и разбора заказов.
Ты умеешь анализировать как обычный текст/сообщения от менеджеров, так и скриншоты расчетных таблиц, смет, накладных и спецификаций.
Твоя задача — извлечь все данные заказа и вернуть СТРОГО чистый JSON.

Доступные сущности в системе CRM:
- Существующие Клиенты: ${JSON.stringify(clients.map((c: any) => ({ id: c.id, name: c.name })))}
- Существующие Подрядчики: ${JSON.stringify(contractors.map((co: any) => ({ id: co.id, name: co.name })))}
- Существующие Счета/Плательщики: ${JSON.stringify(payers.map((p: any) => ({ id: p.id, name: p.name, type: p.type })))}

ПРАВИЛА ИЗВЛЕЧЕНИЯ ДАННЫХ:

1. ДАТА ("date"):
   - Формат YYYY-MM-DD. Если в документе или тексте нет даты — используй сегодняшнюю дату "${todayStr}".

2. КЛИЕНТ ("clientId", "clientNameExtracted"):
   - Ищи название клиента/заказчика в шапке таблицы (например, в строке формул или заголовке типа "ИП Дракунов Долина Алко"), в тексте или поле "Клиент:".
   - "clientId": найди наиболее подходящий id клиента из списка "Существующие Клиенты" (сравнивай по названию/ФИО). Если точного совпадения нет или это новый клиент — верни null.
   - "clientNameExtracted": точное текстовое название клиента из источника (например "ИП Дракунов Долина Алко").

3. НАИМЕНОВАНИЕ / СПИСОК ПОЗИЦИЙ ("productName"):
   - Сделай общее детальное описание со ВСЕМИ позициями из таблицы/текста в точности, с указанием характеристик, размеров и количества (тиража).
   - КРИТИЧЕСКИ ВАЖНО: В "productName" ЗАПРЕЩЕНО указывать какие-либо суммы и цены (никаких рублей, цен за 1 шт, себестоимости и наценки)! Только наименования, размеры и тиражи.
   - Формат перечисления:
     Если позиций несколько:
     1. [Название позиции 1] — [кол-во] шт.
     2. [Название позиции 2] — [кол-во] шт.
     ...
     Пример:
     1. Печать визиток (матовая спец. бумага для написания) — 200 шт.
     2. Печать визиток 110х60мм, картон, нестандартный размер АРТ — 100 шт.
     3. Печать баннера 1800х1200мм с люверсами ПЕКАРНЯ — 1 шт.
     4. Отрисовка макета для баннера и визиток — 1 шт.
     Если позиция только одна: "[Название позиции] — [кол-во] шт."

4. СУММА РЕАЛИЗАЦИИ КЛИЕНТУ ("saleAmount", "saleFormula"):
   - В сметах/таблицах сумма берется из колонки "КЛИЕНТУ" или "СТ-ТЬ, РУБ" / "ИТОГО".
   - Сложи суммы по всем позициям заказа.
   - "saleAmount": итоговая общая сумма заказа для клиента (число, например 8180).
   - "saleFormula": если было несколько позиций, запиши формулу сложения (например, "=3100+2000+2080+1000"), иначе "".

5. ПОДРЯДЧИКИ И СЕБЕСТОИМОСТЬ ("contractors"):
   - В таблицах и сметах имя/название подрядчика указывается в колонке "ПРИМЕЧАНИЕ" (например, "Гефест", "БР", "Иванов" и т.д.), а сумма затрат на этого подрядчика — в колонке "СЕБЕС" (себестоимость) или расчете ("ЗА ШТ" * "КОЛ-ВО").
   - Для КАЖДОЙ строки/позиции, где есть подрядчик или себестоимость, создай отдельный элемент в массиве:
     - "contractorNameExtracted": точное название подрядчика (например "Гефест", "БР").
     - "contractorId": id подрядчика из списка "Существующие Подрядчики", если есть совпадение по имени, иначе null.
     - "description": краткое наименование работы/позиции (например "Печать визиток (матовая спец. бумага)", "Печать баннера 1800х1200мм", "Отрисовка макета").
     - "costValue": сумма себестоимости по этой позиции из колонки "СЕБЕС" (число).
     - "costFormula": формула себестоимости (если есть расчет), иначе "".
     - "payerId": id плательщика/счета (если указан в контексте, иначе null).
     - "note": примечание к работе (если есть).

6. СЧЕТ ПОЛУЧАТЕЛЯ ("paymentReceiverId", "paymentNote"):
   - "paymentReceiverId": id счета/плательщика из списка существующих (если указано, куда перечислять деньги). Если не указано — null.
   - "paymentNote": примечание к оплате/счету (если есть).

7. ОБЩЕЕ ПРИМЕЧАНИЕ ("note"):
   - Любые общие комментарии к заказу (сроки готовности, доставка, особенности).

8. РАБОТА С ОБЫЧНЫМ ТЕКСТОМ:
   - Если пользователь пишет обычный текст (например: "ИП Дракунов, 200 визиток матовых по 3100 (себес Гефест 1200), баннер 2080 (себес БР 1080)"), правила действуют АНАЛОГИЧНО: формируй список позиций без цен в "productName", считай общую сумму клиенту в "saleAmount", а подрядчиков и себес распределяй в "contractors".

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

    const selectedModel = process.env.OPENROUTER_MODEL || 'google/gemini-2.0-flash-001'

    const payload = {
      model: selectedModel,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessageContent.length === 1 && userMessageContent[0].type === 'text' ? userMessageContent[0].text : userMessageContent }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1
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
      // Clean possible markdown code fences if model returned ```json ... ```
      const cleanedContent = content.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim()
      parsedResult = JSON.parse(cleanedContent)
    } catch (e) {
      return res.status(500).json({ error: 'ИИ вернул невалидный JSON', raw: content })
    }

    return res.json({ ok: true, data: parsedResult })
  } catch (error: any) {
    console.error('AI Parse error:', error)
    return res.status(500).json({ error: error.message || 'Внутренняя ошибка при разборе ИИ' })
  }
}
