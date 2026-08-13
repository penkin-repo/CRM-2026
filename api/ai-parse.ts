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

    const systemPrompt = `Ты — ИИ-помощник CRM для автоматического создания заказов.
Твоя задача — извлечь данные заказа из текста или изображения и вернуть СТРОГО чистый JSON.

Доступные сущности в системе:
- Существующие Клиенты: ${JSON.stringify(clients.map((c: any) => ({ id: c.id, name: c.name })))}
- Существующие Подрядчики: ${JSON.stringify(contractors.map((co: any) => ({ id: co.id, name: co.name })))}
- Существующие Счета/Плательщики: ${JSON.stringify(payers.map((p: any) => ({ id: p.id, name: p.name, type: p.type })))}

Правила распознавания:
1. "date": дата заказа в формате YYYY-MM-DD (если в тексте нет — поставь "${todayStr}").
2. "clientId": найди наиболее подходящий id клиента из списка Существующих Клиентов. Если клиент из текста новый или не совпадает точно — верни null.
3. "clientNameExtracted": название клиента, как оно прописано в источнике.
4. "productName": наименование продукции/заказа (кратко, например "Баннер 3х6м", "Световой короб").
5. "saleAmount": числовая сумма реализации (с клиента).
6. "saleFormula": формула расчета реализации (например "=12000*1.2" или "=6*2000"), если указан расчет. В противном случае "".
7. "paymentReceiverId": id счета/плательщика из списка Существующих Счетов, куда поступает оплата за заказ. Если не указан — null.
8. "paymentNote": примечание к счету / номер счета (если есть).
9. "note": общее примечание к заказу.
10. "contractors": массив работ подрядчиков:
    - "contractorId": id подрядчика из списка Существующих Подрядчиков. Если не найден — null.
    - "contractorNameExtracted": имя/название подрядчика из источника.
    - "description": описание работы/материала (например "Печать", "Монтаж").
    - "costFormula": формула расчета затрат (например "=6*3*450"), если указан расчет.
    - "costValue": численный результат затрат (число).
    - "payerId": id плательщика для данной работы подрядчика. Если не указан — null.
    - "note": примечание.

Верни JSON по следующей схеме:
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

    const selectedModel = process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini'

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
