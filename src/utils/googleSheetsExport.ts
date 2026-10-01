import type { Order, Client, Contractor, Payer, OrderContractorRow } from '../types'

/**
 * Checks if a payer represents manager personal payment
 */
export function isManagerPayer(payer: Payer | undefined): boolean {
  if (!payer) return false
  const name = (payer.name || '').toLowerCase()
  // Exclude company bank account "Афиши29 ИП Пенкин АН"
  if (name.includes('афиши')) return false
  return name.includes('менеджер') || name.includes('пенкин-п') || payer.type === 'card'
}

/**
 * Formats a single contractor item for Google Sheet contractor column
 */
function formatContractorLabel(
  cr: OrderContractorRow,
  contractors: Contractor[],
  payers: Payer[],
  includeAmount = false
): string {
  const co = contractors.find(c => c.id === cr.contractorId)
  const coName = co ? co.name : 'Подрядчик'
  const payer = payers.find(p => p.id === cr.payerId)
  const isManager = isManagerPayer(payer)
  const managerTag = isManager ? (coName.includes('ПЕНКИН-П') ? '' : ' ПЕНКИН-П') : ''

  if (includeAmount) {
    const amt = cr.costValue || 0
    return `${coName} ${amt}${isManager ? ' руб. ПЕНКИН-П' : ''}`.trim()
  }

  return `${coName}${managerTag}`.trim()
}

/**
 * Formats an order into a 12-column TSV string ready for pasting into Google Sheets (Ctrl+V)
 * Columns:
 * 1. №
 * 2. Клиент
 * 3. Заказ (описание продукции и работ)
 * 4. Испол 1 (если менеджер оплатил — "Имя ПЕНКИН-П")
 * 5. Стоим 1
 * 6. Испол 2
 * 7. Стоим 2
 * 8. Испол 3 (если > 3 подрядчиков, объединяются через ▒)
 * 9. Стоим 3 (сумма или формула =X+Y)
 * 10. Реал-я
 * 11. Счет, форма опл
 * 12. ОП поступила ли оплата
 */
export function formatOrderForGoogleSheets(
  order: Order,
  orderIndex: number,
  clients: Client[],
  contractors: Contractor[],
  payers: Payer[]
): { tsv: string; rowData: string[] } {
  // 1. №
  const col1_num = String(orderIndex + 1)

  // 2. Клиент
  const client = clients.find(c => c.id === order.clientId)
  const col2_client = client ? client.name : ''

  // 3. Заказ: объединяем номенклатуру заказа и описания работ подрядчиков
  const descItems: string[] = []
  if (order.productName && order.productName.trim() && order.productName.trim() !== 'Новый заказ') {
    descItems.push(order.productName.trim())
  }
  ;(order.contractors || []).forEach(cr => {
    const d = cr.description?.trim()
    if (d && !descItems.some(existing => existing.toLowerCase().includes(d.toLowerCase()))) {
      descItems.push(d)
    }
  })
  const col3_orderDesc = descItems.join(' , ')

  // Подрядчики: сначала сортируем тех, кого оплатил менеджер (ПЕНКИН-П), затем остальных
  const allContractors = [...(order.contractors || [])].sort((a, b) => {
    const aMgr = isManagerPayer(payers.find(p => p.id === a.payerId)) ? 1 : 0
    const bMgr = isManagerPayer(payers.find(p => p.id === b.payerId)) ? 1 : 0
    return bMgr - aMgr // менеджерские первыми
  })

  // Колонки 4-9 для подрядчиков (3 слота: Испол 1-3 и Стоим 1-3)
  let col4_ispol1 = ''
  let col5_stoim1 = ''
  let col6_ispol2 = ''
  let col7_stoim2 = ''
  let col8_ispol3 = ''
  let col9_stoim3 = ''

  if (allContractors.length > 0) {
    // Слот 1
    const cr1 = allContractors[0]
    col4_ispol1 = formatContractorLabel(cr1, contractors, payers, false)
    col5_stoim1 = cr1.costValue ? String(cr1.costValue) : ''
  }

  if (allContractors.length > 1) {
    // Слот 2
    const cr2 = allContractors[1]
    col6_ispol2 = formatContractorLabel(cr2, contractors, payers, false)
    col7_stoim2 = cr2.costValue ? String(cr2.costValue) : ''
  }

  if (allContractors.length === 3) {
    // Слот 3 (ровно 3 подрядчика)
    const cr3 = allContractors[2]
    col8_ispol3 = formatContractorLabel(cr3, contractors, payers, false)
    col9_stoim3 = cr3.costValue ? String(cr3.costValue) : ''
  } else if (allContractors.length > 3) {
    // Слот 3 (> 3 подрядчиков: объединяем начиная с 3-го через ▒)
    const remaining = allContractors.slice(2)
    col8_ispol3 = remaining
      .map(cr => formatContractorLabel(cr, contractors, payers, true))
      .join(' ▒ ')

    const formula = '=' + remaining.map(cr => cr.costValue || 0).join('+')
    col9_stoim3 = formula
  }

  // 10. Реал-я
  const col10_sale = order.saleAmount ? String(order.saleAmount) : '0'

  // 11. Счет, форма опл
  const receiver = payers.find(p => p.id === order.paymentReceiverId)
  let col11_payer = receiver ? receiver.name : ''
  if (order.paymentNote && order.paymentNote.trim()) {
    col11_payer += ` № ${order.paymentNote.trim()}`
  }

  // 12. ОП поступила ли оплата
  const col12_paid = order.paymentReceived ? (order.saleAmount ? String(order.saleAmount) : 'да') : ''

  const rowData = [
    col1_num,
    col2_client,
    col3_orderDesc,
    col4_ispol1,
    col5_stoim1,
    col6_ispol2,
    col7_stoim2,
    col8_ispol3,
    col9_stoim3,
    col10_sale,
    col11_payer,
    col12_paid
  ].map(val => String(val ?? '').replace(/[\t\r\n]+/g, ' ').trim())

  const tsv = rowData.join('\t')

  return { tsv, rowData }
}
