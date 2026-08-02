import { evaluate } from 'mathjs'

export function evalFormula(str: string): number {
  if(!str) return 0
  const s = String(str).trim()
  if(!s.startsWith('=')){
    const v = Number(s.replace(',','.').replace(/\s/g,''))
    return isNaN(v) ? 0 : v
  }
  try{
    const expr = s.slice(1).replace(/\*\*/g,'*')
    const r = evaluate(expr)
    return typeof r === 'number' && isFinite(r) ? r : 0
  }catch{
    return 0
  }
}

export function calcOrderTotals(order: { contractors: { costValue: number }[], saleAmount: number }){
  const costs = (order.contractors||[]).reduce((sum,c)=> sum + (Number(c.costValue)||0),0)
  const profit = (Number(order.saleAmount)||0) - costs
  const rent = order.saleAmount ? profit / order.saleAmount * 100 : 0
  return { costs, profit, rent }
}
