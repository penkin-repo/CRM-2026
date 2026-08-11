import { evaluate } from 'mathjs'

export function evalFormula(str: string): number {
  if(!str) return 0
  const s = String(str).trim()
  const expr = s.startsWith('=') ? s.slice(1) : s
  const cleanExpr = expr.replace(/\*\*/g,'*').replace(/,/g, '.')
  
  if (!cleanExpr) return 0

  if (!/[+\-*/()]/.test(cleanExpr)) {
    const v = Number(cleanExpr.replace(/\s/g,''))
    return isNaN(v) ? 0 : Math.round(v)
  }

  try {
    const r = evaluate(cleanExpr)
    return typeof r === 'number' && isFinite(r) ? Math.round(r) : 0
  } catch {
    return 0
  }
}

export function calcOrderTotals(order: { contractors: { costValue: number }[], saleAmount: number }){
  const costs = Math.round((order.contractors||[]).reduce((sum,c)=> sum + (Number(c.costValue)||0),0))
  const sale = Math.round(Number(order.saleAmount)||0)
  const profit = Math.round(sale - costs)
  const rent = sale ? profit / sale * 100 : 0
  return { costs, profit, rent }
}

