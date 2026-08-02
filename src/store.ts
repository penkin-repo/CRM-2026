import type { DashboardFilters } from './types'

const KEY = 'crm_filters_v1'
export function loadFilters(): DashboardFilters {
  try{
    const raw = localStorage.getItem(KEY)
    if(raw) return JSON.parse(raw)
  }catch{}
  return { status:'all', search:'', month:'all', dateFrom:'', dateTo:'', sort:'date_desc' }
}
export function saveFilters(f:DashboardFilters){ try{ localStorage.setItem(KEY, JSON.stringify(f)) }catch{} }
