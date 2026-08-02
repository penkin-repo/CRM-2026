import type { Client, Contractor, Payer, Order } from './types'
import { evalFormula } from './utils/formula'

function genId(){ return Math.random().toString(36).slice(2,8)+Date.now().toString(36) }
function today(){ return new Date().toISOString().slice(0,10) }

export const seedClients: Client[] = [
  { id:'c1', name:'ООО Альфа Медиа', phone:'+7 495 123-45-67', contactPerson:'Иванов И.', email:'alpha@media.ru', note:'VIP', customFields:[{label:'ИНН', value:'7701234567'}], createdAt:'2026-02-01' },
  { id:'c2', name:'Бета Трейд', phone:'+7 495 234-56-78', contactPerson:'Петрова А.', email:'beta@trade.ru', note:'', customFields:[], createdAt:'2026-02-05' },
  { id:'c3', name:'Гамма Холдинг', phone:'', contactPerson:'Сидоров', email:'', note:'Срочные', customFields:[], createdAt:'2026-02-10' },
]

export const seedContractors: Contractor[] = [
  { id:'co1', name:'Менеджер Алексей', phone:'', note:'сам делает монтаж', createdAt:'2026-01-10' },
  { id:'co2', name:'Монтаж Сервис', phone:'', note:'', createdAt:'2026-01-12' },
  { id:'co3', name:'Дизайн Бюро', phone:'', note:'', createdAt:'2026-01-15' },
]

export const seedPayers: Payer[] = [
  { id:'p1', name:'ИП Иванов безнал', type:'cashless', createdAt:'2026-01-01' },
  { id:'p2', name:'ООО Рога безнал', type:'cashless', createdAt:'2026-01-02' },
  { id:'p3', name:'Наличные', type:'cash', createdAt:'2026-01-03' },
  { id:'p4', name:'Карта менеджера', type:'card', createdAt:'2026-01-04' },
]

export function genSeedOrders(): Order[] {
  const prods=['Баннер 3x6','Вывеска','Ролл-ап']
  const orders: Order[] = []
  for(let i=0;i<10;i++){
    const client=seedClients[0]
    const payer=seedPayers[0]
    const co=seedContractors[0]
    const f=`=${2+Math.floor(Math.random()*5)}*500`
    const val=evalFormula(f)
    orders.push({
      id: genId(),
      date: today(),
      clientId: client.id,
      productName: prods[i%prods.length],
      contractors:[{ id:genId(), contractorId:co.id, description:'Печать', costFormula:f, costValue:val, payerId:payer.id, paid:Math.random()>0.5, reconciled:false, note:'' }],
      saleAmount: Math.round(val*1.4),
      paymentReceiverId: payer.id,
      paymentNote: '',
      paymentReceived: false,
      status: 'active',
      note:'',
      createdAt: new Date().toISOString()
    })
  }
  return orders
}
