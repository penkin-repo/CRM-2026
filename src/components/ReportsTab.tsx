import { useState, useMemo, useEffect } from 'react'
import { Calendar, User, Building2, Wallet, CheckCircle2, Circle } from 'lucide-react'
import type { Order, Client, Contractor, Payer, SalaryRecord } from '../types'
import { calcOrderTotals, evalFormula } from '../utils/formula'
import { api } from '../api'

export type ReportSubTab = 'monthly' | 'byClient' | 'byContractor' | 'salary'

interface PayerAdj {
  id: string
  payerId: string
  sign?: '+' | '-'
  note: string
}

interface ManagerWorkAdj {
  id: string
  contractorId: string
  note: string
}

interface ContractorPayerAdj {
  id: string
  payerId: string
  sign?: '+' | '-'
  note: string
}

interface SalaryPreset {
  name: string
  salaryPercent: number
  payerAdjs: PayerAdj[]
  managerWorkAdjs: ManagerWorkAdj[]
  contractorPayerAdjs?: ContractorPayerAdj[]
}

interface ReportsTabProps {
  orders: Order[]
  clients: Client[]
  contractors: Contractor[]
  payers: Payer[]
  selectedMonth: string
  onUpdateOrder?: (order: Order, logDesc?: string) => void
  onLogHistory?: (action: string, description: string) => void
}

export default function ReportsTab({
  orders,
  clients,
  contractors,
  payers,
  selectedMonth,
  onUpdateOrder,
  onLogHistory
}: ReportsTabProps) {
  // Load saved report filter state from localStorage for seamless tab switching
  const getSavedReportFilters = () => {
    try {
      const saved = localStorage.getItem('crm_reports_filters_state')
      if (saved) return JSON.parse(saved)
    } catch {}
    return {}
  }

  const savedState = useMemo(() => getSavedReportFilters(), [])

  const [reportSubTab, setReportSubTab] = useState<ReportSubTab>(() => {
    return savedState.reportSubTab || 'monthly'
  })
  const [selectedClientId, setSelectedClientId] = useState<string>(() => {
    return savedState.selectedClientId || ''
  })
  const [selectedContractorId, setSelectedContractorId] = useState<string>(() => {
    return savedState.selectedContractorId || ''
  })

  // Report Period Filters
  const [repMonth, setRepMonth] = useState<string>(() => {
    return savedState.repMonth || selectedMonth
  })
  const [dateFrom, setDateFrom] = useState<string>(() => {
    return savedState.dateFrom || ''
  })
  const [dateTo, setDateTo] = useState<string>(() => {
    return savedState.dateTo || ''
  })
  const [reconciledFilter, setReconciledFilter] = useState<'all' | 'reconciled' | 'unreconciled'>(() => {
    return savedState.reconciledFilter || 'all'
  })

  // Save report filter states to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(
        'crm_reports_filters_state',
        JSON.stringify({
          reportSubTab,
          selectedClientId,
          selectedContractorId,
          repMonth,
          dateFrom,
          dateTo,
          reconciledFilter
        })
      )
    } catch {}
  }, [reportSubTab, selectedClientId, selectedContractorId, repMonth, dateFrom, dateTo, reconciledFilter])

  // Salary Percentage & Adjustments state
  const [salaryPercent, setSalaryPercent] = useState<number>(60)
  const [payerAdjs, setPayerAdjs] = useState<PayerAdj[]>([])
  const [managerWorkAdjs, setManagerWorkAdjs] = useState<ManagerWorkAdj[]>([])
  const [contractorPayerAdjs, setContractorPayerAdjs] = useState<ContractorPayerAdj[]>([])

  // Salary DB Records & Presets state
  const [salaryRecords, setSalaryRecords] = useState<SalaryRecord[]>([])
  const [presets, setPresets] = useState<SalaryPreset[]>(() => {
    try {
      const saved = localStorage.getItem('crm_salary_presets')
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })
  const [presetName, setPresetName] = useState('')

  // Load Salary DB Records
  const loadSalaryRecords = async () => {
    try {
      const data = await api.fetchSalary()
      if (Array.isArray(data)) setSalaryRecords(data)
    } catch (e) {
      console.error('Error fetching salary records:', e)
    }
  }

  useEffect(() => {
    loadSalaryRecords()
  }, [])

  // Save presets to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('crm_salary_presets', JSON.stringify(presets))
    } catch {}
  }, [presets])

  // Filter Orders for Monthly & Period Reports
  const periodOrders = useMemo(() => {
    return orders.filter(o => {
      if (dateFrom || dateTo) {
        if (dateFrom && o.date && o.date < dateFrom) return false
        if (dateTo && o.date && o.date > dateTo) return false
      } else if (repMonth && o.date && !o.date.startsWith(repMonth)) {
        return false
      }
      return true
    })
  }, [orders, repMonth, dateFrom, dateTo])

  // Month-specific orders for Salary calculations
  const monthOrders = useMemo(() => {
    return orders.filter(o => o.date && o.date.startsWith(repMonth))
  }, [orders, repMonth])

  // Helper functions for Payer/Contractor Sums
  const getMonthlyPayerSum = (payerId: string) => {
    return monthOrders
      .filter(o => o.paymentReceiverId === payerId && o.paymentReceived)
      .reduce((sum, o) => sum + (Number(o.saleAmount) || 0), 0)
  }

  const getMonthlyContractorSum = (contractorId: string) => {
    let total = 0
    monthOrders.forEach(o => {
      ;(o.contractors || []).forEach(c => {
        if (c.contractorId === contractorId) total += Number(c.costValue) || 0
      })
    })
    return total
  }

  const getMonthlyContractorPayerSum = (payerId: string) => {
    let total = 0
    monthOrders.forEach(o => {
      ;(o.contractors || []).forEach(c => {
        if (c.payerId === payerId && c.paid) total += Number(c.costValue) || 0
      })
    })
    return total
  }

  // Monthly Report Totals
  const monthlyStats = useMemo(() => {
    let totalSale = 0
    let totalCosts = 0
    let totalProfit = 0
    periodOrders.forEach(o => {
      const t = calcOrderTotals(o)
      totalSale += t.sale
      totalCosts += t.costs
      totalProfit += t.profit
    })
    const baseSalary = Math.round(totalProfit * (salaryPercent / 100))
    return { count: periodOrders.length, totalSale, totalCosts, totalProfit, baseSalary }
  }, [periodOrders, salaryPercent])

  // Client Report Data & Totals
  const clientReportOrders = useMemo(() => {
    return periodOrders.filter(o => !selectedClientId || o.clientId === selectedClientId)
  }, [periodOrders, selectedClientId])

  const clientTotals = useMemo(() => {
    let totalSale = 0
    let totalCosts = 0
    let totalProfit = 0
    clientReportOrders.forEach(o => {
      const t = calcOrderTotals(o)
      totalSale += t.sale
      totalCosts += t.costs
      totalProfit += t.profit
    })
    const avgRent = totalSale > 0 ? (totalProfit / totalSale) * 100 : 0
    return { totalSale, totalCosts, totalProfit, avgRent }
  }, [clientReportOrders])

  // Contractor Report Data & Filtered Rows
  const contractorReportAllRows = useMemo(() => {
    return periodOrders
      .flatMap(o => (o.contractors || []).map(cr => ({ order: o, cr })))
      .filter(x => !selectedContractorId || x.cr.contractorId === selectedContractorId)
  }, [periodOrders, selectedContractorId])

  const contractorReportRows = useMemo(() => {
    return contractorReportAllRows.filter(x => {
      if (reconciledFilter === 'reconciled') return !!x.cr.reconciled
      if (reconciledFilter === 'unreconciled') return !x.cr.reconciled
      return true
    })
  }, [contractorReportAllRows, reconciledFilter])

  const reconciledCounts = useMemo(() => {
    const all = contractorReportAllRows.length
    const reconciled = contractorReportAllRows.filter(x => x.cr.reconciled).length
    const unreconciled = all - reconciled
    return { all, reconciled, unreconciled }
  }, [contractorReportAllRows])

  const contractorTotals = useMemo(() => {
    let totalCost = 0
    let paidCost = 0
    let reconciledCost = 0
    contractorReportRows.forEach(x => {
      totalCost += Number(x.cr.costValue) || 0
      if (x.cr.paid) paidCost += Number(x.cr.costValue) || 0
      if (x.cr.reconciled) reconciledCost += Number(x.cr.costValue) || 0
    })
    const unpaidBalance = totalCost - paidCost
    return { totalCost, paidCost, reconciledCost, unpaidBalance }
  }, [contractorReportRows])

  // Strictly Calculated Totals for Salary Adjustments
  const salaryPayerTotal = useMemo(() => {
    return payerAdjs.reduce((acc, curr) => {
      const val = getMonthlyPayerSum(curr.payerId)
      return curr.sign === '-' ? acc - val : acc + val
    }, 0)
  }, [payerAdjs, monthOrders])

  const salaryManagerTotal = useMemo(() => {
    return managerWorkAdjs.reduce((acc, curr) => acc + getMonthlyContractorSum(curr.contractorId), 0)
  }, [managerWorkAdjs, monthOrders])

  const salaryContractorPayerTotal = useMemo(() => {
    return contractorPayerAdjs.reduce((acc, curr) => {
      const val = getMonthlyContractorPayerSum(curr.payerId)
      return curr.sign === '-' ? acc - val : acc + val
    }, 0)
  }, [contractorPayerAdjs, monthOrders])

  const finalCalculatedSalary = useMemo(() => {
    return Math.round(monthlyStats.baseSalary + salaryPayerTotal + salaryManagerTotal + salaryContractorPayerTotal)
  }, [monthlyStats.baseSalary, salaryPayerTotal, salaryManagerTotal, salaryContractorPayerTotal])

  // Save / Load Presets
  const handleSavePreset = () => {
    if (!presetName.trim()) {
      alert('Введите название шаблона (например, "Стандартный 60% (Алексей + Карта)")')
      return
    }
    const newPreset: SalaryPreset = {
      name: presetName.trim(),
      salaryPercent,
      payerAdjs,
      managerWorkAdjs,
      contractorPayerAdjs
    }
    setPresets(prev => [...prev.filter(p => p.name !== newPreset.name), newPreset])
    setPresetName('')
    alert(`Шаблон "${newPreset.name}" сохранён!`)
  }

  const handleApplyPreset = (name: string) => {
    const p = presets.find(x => x.name === name)
    if (!p) return
    if (p.salaryPercent) setSalaryPercent(p.salaryPercent)
    setPayerAdjs(p.payerAdjs || [])
    setManagerWorkAdjs(p.managerWorkAdjs || [])
    setContractorPayerAdjs(p.contractorPayerAdjs || [])
  }

  // Save Salary Record to DB
  const handleCloseSalaryPeriod = async () => {
    try {
      const nowStr = new Date().toLocaleString('ru-RU')
      const rec = {
        id: 'sal_' + repMonth.replace('-', '') + '_' + Math.random().toString(36).slice(2, 6),
        month: repMonth,
        salaryPercent,
        baseSalary: monthlyStats.baseSalary,
        payerAdjustments: payerAdjs.map(a => ({ payerId: a.payerId, amount: getMonthlyPayerSum(a.payerId), note: a.note })),
        totalAdjustment: salaryPayerTotal + salaryManagerTotal,
        finalSalary: finalCalculatedSalary,
        paidAmount: finalCalculatedSalary,
        closedAt: nowStr,
        note: `Ведомость за ${repMonth} на сумму ${finalCalculatedSalary.toLocaleString('ru-RU')} ₽`,
        history: [{ timestamp: nowStr, action: 'Проведение ведомости', prevPaid: 0, newPaid: finalCalculatedSalary, note: 'Зафиксировано в БД' }]
      }
      await api.upsertSalary(rec)
      if (onLogHistory) {
        onLogHistory('Проведение ведомости ЗП', `Проведена ведомость ЗП за ${repMonth} (${finalCalculatedSalary.toLocaleString('ru-RU')} ₽)`)
      }
      await loadSalaryRecords()
      alert(`Зарплатный расчет за ${repMonth} на сумму ${finalCalculatedSalary.toLocaleString('ru-RU')} ₽ успешно проведён в БД!`)
    } catch {
      alert('Ошибка при сохранении ведомости')
    }
  }

  return (
    <div className="flex-1 flex flex-col p-3 overflow-auto">
      {/* Sub-tabs Navigation */}
      <div className="flex flex-wrap items-center gap-1.5 mb-3 bg-[#f0f2f5] p-1 border border-[#b8bdc5] rounded shadow-2xs">
        <button
          className={`px-3 py-1 text-xs font-bold rounded cursor-pointer border flex items-center gap-1 ${reportSubTab === 'monthly' ? 'bg-[#ffcc00] border-[#d9a800] text-[#1c1d1f]' : 'bg-white border-[#b8bdc5] text-slate-700'}`}
          onClick={() => setReportSubTab('monthly')}
        >
          <Calendar className="w-3.5 h-3.5" /> Месячный отчёт
        </button>
        <button
          className={`px-3 py-1 text-xs font-bold rounded cursor-pointer border flex items-center gap-1 ${reportSubTab === 'byClient' ? 'bg-[#ffcc00] border-[#d9a800] text-[#1c1d1f]' : 'bg-white border-[#b8bdc5] text-slate-700'}`}
          onClick={() => setReportSubTab('byClient')}
        >
          <User className="w-3.5 h-3.5" /> По контрагенту
        </button>
        <button
          className={`px-3 py-1 text-xs font-bold rounded cursor-pointer border flex items-center gap-1 ${reportSubTab === 'byContractor' ? 'bg-[#ffcc00] border-[#d9a800] text-[#1c1d1f]' : 'bg-white border-[#b8bdc5] text-slate-700'}`}
          onClick={() => setReportSubTab('byContractor')}
        >
          <Building2 className="w-3.5 h-3.5" /> По подрядчику
        </button>
        <button
          className={`px-3 py-1 text-xs font-bold rounded cursor-pointer border flex items-center gap-1 ${reportSubTab === 'salary' ? 'bg-[#ffcc00] border-[#d9a800] text-[#1c1d1f]' : 'bg-white border-[#b8bdc5] text-slate-700'}`}
          onClick={() => setReportSubTab('salary')}
        >
          <Wallet className="w-3.5 h-3.5" /> Зарплатный расчет
        </button>

        {/* Report Period Filter */}
        <div className="ml-auto flex items-center gap-1.5 text-xs">
          <label className="font-bold text-[#1c1d1f]">Месяц:</label>
          <input
            type="month"
            value={repMonth}
            onChange={e => { setRepMonth(e.target.value); setDateFrom(''); setDateTo(''); }}
            className="border border-[#b8bdc5] rounded p-0.5 text-xs outline-none bg-white font-semibold"
          />
          {reportSubTab !== 'salary' && (
            <>
              <span className="font-bold text-[#1c1d1f] ml-1">Дата с:</span>
              <input
                type="date"
                value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
                className="border border-[#b8bdc5] rounded p-0.5 text-xs outline-none bg-white"
              />
              <span className="font-bold text-[#1c1d1f]">по:</span>
              <input
                type="date"
                value={dateTo}
                onChange={e => setDateTo(e.target.value)}
                className="border border-[#b8bdc5] rounded p-0.5 text-xs outline-none bg-white"
              />
              {(dateFrom || dateTo) && (
                <button
                  onClick={() => { setDateFrom(''); setDateTo(''); }}
                  className="text-[10px] text-red-600 font-bold cursor-pointer ml-1"
                >
                  ✕ сброс
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* 1. Monthly Report */}
      {reportSubTab === 'monthly' && (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-5 gap-2.5">
            <div className="bg-white p-3 rounded border border-[#b8bdc5] shadow-2xs">
              <div className="text-[11px] font-bold text-[#555a64] uppercase">Количество заказов</div>
              <div className="text-lg font-extrabold text-[#1c1d1f] mt-1">{monthlyStats.count}</div>
            </div>
            <div className="bg-white p-3 rounded border border-[#b8bdc5] shadow-2xs">
              <div className="text-[11px] font-bold text-[#555a64] uppercase">Выручка (Реализация)</div>
              <div className="text-lg font-extrabold text-[#1e40af] mt-1">{monthlyStats.totalSale.toLocaleString('ru-RU')} ₽</div>
            </div>
            <div className="bg-white p-3 rounded border border-[#b8bdc5] shadow-2xs">
              <div className="text-[11px] font-bold text-[#555a64] uppercase">Затраты подрядчиков</div>
              <div className="text-lg font-extrabold text-[#9a3412] mt-1">{monthlyStats.totalCosts.toLocaleString('ru-RU')} ₽</div>
            </div>
            <div className="bg-white p-3 rounded border border-[#b8bdc5] shadow-2xs">
              <div className="text-[11px] font-bold text-[#555a64] uppercase">Валовая прибыль</div>
              <div className="text-lg font-extrabold text-[#15803d] mt-1">{monthlyStats.totalProfit.toLocaleString('ru-RU')} ₽</div>
            </div>
            <div className="bg-white p-3 rounded border border-[#b8bdc5] shadow-2xs">
              <div className="text-[11px] font-bold text-[#555a64] uppercase">Фонд ЗП ({salaryPercent}%)</div>
              <div className="text-lg font-extrabold text-[#6b21a8] mt-1">{monthlyStats.baseSalary.toLocaleString('ru-RU')} ₽</div>
            </div>
          </div>
        </div>
      )}

      {/* 2. By Client Report */}
      {reportSubTab === 'byClient' && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 bg-[#f0f2f5] p-2 rounded border border-[#b8bdc5]">
            <span className="text-xs font-bold text-[#333740]">Фильтр Контрагент:</span>
            <select
              value={selectedClientId}
              onChange={e => setSelectedClientId(e.target.value)}
              className="border border-[#b8bdc5] rounded p-1 text-xs outline-none bg-white font-medium"
            >
              <option value="">-- Все клиенты --</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div className="bg-white border border-[#b8bdc5] shadow-2xs overflow-hidden rounded">
            <table className="sheet-grid w-full">
              <thead>
                <tr>
                  <th className="sheet-header" style={{ width: 90 }}>Дата</th>
                  <th className="sheet-header" style={{ width: 180 }}>Контрагент</th>
                  <th className="sheet-header">Номенклатура (Продукция)</th>
                  <th className="sheet-header" style={{ width: 120 }}>Реализация</th>
                  <th className="sheet-header" style={{ width: 110 }}>Затраты</th>
                  <th className="sheet-header" style={{ width: 120 }}>Валовая прибыль</th>
                  <th className="sheet-header" style={{ width: 80 }}>Статус</th>
                </tr>
              </thead>
              <tbody>
                {clientReportOrders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-6 text-slate-400 text-xs">
                      Нет данных за выбранный период
                    </td>
                  </tr>
                ) : (
                  clientReportOrders.map(o => {
                    const t = calcOrderTotals(o)
                    const cName = clients.find(c => c.id === o.clientId)?.name || '—'
                    return (
                      <tr key={o.id} className="text-xs hover:bg-[#fff9d6] border-b border-[#c9ced6]">
                        <td className="sheet-cell font-mono">{o.date}</td>
                        <td className="sheet-cell font-bold">{cName}</td>
                        <td className="sheet-cell font-medium">{o.productName}</td>
                        <td className="sheet-cell text-right font-bold text-[#1e40af]">{o.saleAmount.toLocaleString('ru-RU')} ₽</td>
                        <td className="sheet-cell text-right text-[#9a3412] font-medium">{t.costs.toLocaleString('ru-RU')} ₽</td>
                        <td className="sheet-cell text-right font-bold text-[#15803d]">{t.profit.toLocaleString('ru-RU')} ₽</td>
                        <td className="sheet-cell text-center font-bold">{o.status}</td>
                      </tr>
                    )
                  })
                )}
              </tbody>
              <tfoot>
                <tr className="bg-[#f0f2f5] border-t-2 border-[#b8bdc5] font-extrabold text-xs">
                  <td colSpan={3} className="sheet-cell text-right uppercase font-bold text-[#1c1d1f]">ИТОГО ПО ВЫБОРКЕ:</td>
                  <td className="sheet-cell text-right text-[#1e40af] font-black">{clientTotals.totalSale.toLocaleString('ru-RU')} ₽</td>
                  <td className="sheet-cell text-right text-[#9a3412] font-black">{clientTotals.totalCosts.toLocaleString('ru-RU')} ₽</td>
                  <td className="sheet-cell text-right text-[#15803d] font-black">{clientTotals.totalProfit.toLocaleString('ru-RU')} ₽</td>
                  <td className="sheet-cell text-center text-slate-700">Рент {clientTotals.avgRent.toFixed(1)}%</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* 3. By Contractor Report (Interactive Reconciliation & Amounts) */}
      {reportSubTab === 'byContractor' && (
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-2 bg-[#f0f2f5] p-2 rounded border border-[#b8bdc5]">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#333740]">Фильтр Подрядчик:</span>
              <select
                value={selectedContractorId}
                onChange={e => setSelectedContractorId(e.target.value)}
                className="border border-[#b8bdc5] rounded p-1 text-xs outline-none bg-white font-semibold"
              >
                <option value="">-- Все подрядчики --</option>
                {contractors.map(co => <option key={co.id} value={co.id}>{co.name}</option>)}
              </select>
            </div>

            {/* Reconciliation Filter Buttons */}
            <div className="flex items-center gap-1 bg-[#d9dce1] p-0.5 rounded border border-[#b8bdc5]">
              <button
                className={`px-2.5 py-0.5 text-xs rounded font-semibold cursor-pointer ${reconciledFilter === 'all' ? 'bg-[#ffcc00] text-[#1c1d1f] shadow-2xs border border-[#d9a800]' : 'text-[#44474e]'}`}
                onClick={() => setReconciledFilter('all')}
              >
                Все ({reconciledCounts.all})
              </button>
              <button
                className={`px-2.5 py-0.5 text-xs rounded font-semibold cursor-pointer ${reconciledFilter === 'reconciled' ? 'bg-[#ffcc00] text-[#1c1d1f] shadow-2xs border border-[#d9a800]' : 'text-[#44474e]'}`}
                onClick={() => setReconciledFilter('reconciled')}
              >
                ✓ Сверено ({reconciledCounts.reconciled})
              </button>
              <button
                className={`px-2.5 py-0.5 text-xs rounded font-semibold cursor-pointer ${reconciledFilter === 'unreconciled' ? 'bg-[#ffcc00] text-[#1c1d1f] shadow-2xs border border-[#d9a800]' : 'text-[#44474e]'}`}
                onClick={() => setReconciledFilter('unreconciled')}
              >
                ⏳ Не сверено ({reconciledCounts.unreconciled})
              </button>
            </div>
          </div>

          <div className="bg-white border border-[#b8bdc5] shadow-2xs overflow-hidden rounded">
            <table className="sheet-grid w-full">
              <thead>
                <tr>
                  <th className="sheet-header" style={{ width: 140 }}>Заказ # / Дата</th>
                  <th className="sheet-header" style={{ width: 180 }}>Подрядчик</th>
                  <th className="sheet-header">Содержание работ</th>
                  <th className="sheet-header" style={{ width: 130 }}>Стоимость/Формула</th>
                  <th className="sheet-header" style={{ width: 70 }}>Оплачено</th>
                  <th className="sheet-header" style={{ width: 75 }}>Сверка</th>
                  <th className="sheet-header" style={{ width: 140 }}>Плательщик</th>
                </tr>
              </thead>
              <tbody>
                {contractorReportRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-6 text-slate-400 text-xs">
                      Нет данных за выбранный период по выбранному фильтру
                    </td>
                  </tr>
                ) : (
                  contractorReportRows.map((item, idx) => {
                    const coName = contractors.find(c => c.id === item.cr.contractorId)?.name || '—'
                    const pName = payers.find(p => p.id === item.cr.payerId)?.name || '—'
                    return (
                      <tr key={idx} className="text-xs hover:bg-[#fff9d6] border-b border-[#c9ced6]">
                        <td className="sheet-cell font-mono font-bold">#{item.order.id.slice(0, 6)} ({item.order.date})</td>
                        <td className="sheet-cell font-bold">{coName}</td>
                        <td className="sheet-cell">{item.cr.description || '—'}</td>

                        {/* Interactive Cost / Formula Editing directly from Report */}
                        <td className="sheet-cell p-0">
                          <input
                            type="text"
                            value={item.cr.costFormula || (item.cr.costValue ? String(item.cr.costValue) : '')}
                            onChange={e => {
                              if (!onUpdateOrder) return
                              const val = e.target.value
                              const calcVal = evalFormula(val)
                              const updatedCRs = (item.order.contractors || []).map(c =>
                                c.id === item.cr.id ? { ...c, costFormula: val, costValue: calcVal } : c
                              )
                              onUpdateOrder(
                                { ...item.order, contractors: updatedCRs },
                                `Изменение стоимости подрядчика в отчете сверки заказа #${item.order.id}`
                              )
                            }}
                            className="w-full h-full px-1 text-xs text-right font-bold outline-none bg-transparent text-[#9a3412] font-mono"
                            placeholder="0"
                          />
                        </td>

                        {/* Paid Checkbox */}
                        <td className="sheet-cell text-center font-bold">
                          <input
                            type="checkbox"
                            checked={!!item.cr.paid}
                            onChange={e => {
                              if (!onUpdateOrder) return
                              const updatedCRs = (item.order.contractors || []).map(c =>
                                c.id === item.cr.id ? { ...c, paid: e.target.checked } : c
                              )
                              onUpdateOrder(
                                { ...item.order, contractors: updatedCRs },
                                `Смена оплаты работ подрядчика в заказе #${item.order.id}`
                              )
                            }}
                            className="accent-[#ffcc00] cursor-pointer"
                          />
                        </td>

                        {/* Reconciled Checkbox */}
                        <td className="sheet-cell text-center font-bold">
                          <input
                            type="checkbox"
                            checked={!!item.cr.reconciled}
                            onChange={e => {
                              if (!onUpdateOrder) return
                              const updatedCRs = (item.order.contractors || []).map(c =>
                                c.id === item.cr.id ? { ...c, reconciled: e.target.checked } : c
                              )
                              onUpdateOrder(
                                { ...item.order, contractors: updatedCRs },
                                `Смена статуса сверки подрядчика в заказе #${item.order.id}`
                              )
                            }}
                            className="accent-[#ffcc00] cursor-pointer"
                          />
                        </td>

                        <td className="sheet-cell font-medium text-slate-700">{pName}</td>
                      </tr>
                    )
                  })
                )}
              </tbody>
              <tfoot>
                <tr className="bg-[#f0f2f5] border-t-2 border-[#b8bdc5] font-extrabold text-xs">
                  <td colSpan={3} className="sheet-cell text-right uppercase font-bold text-[#1c1d1f]">ИТОГО ПО ПОДРЯДЧИКАМ:</td>
                  <td className="sheet-cell text-right text-[#9a3412] font-black">{contractorTotals.totalCost.toLocaleString('ru-RU')} ₽</td>
                  <td className="sheet-cell text-center font-bold text-[#15803d]">Опл: {contractorTotals.paidCost.toLocaleString('ru-RU')} ₽</td>
                  <td className="sheet-cell text-center font-bold text-amber-800">Сверено: {contractorTotals.reconciledCost.toLocaleString('ru-RU')} ₽</td>
                  <td className="sheet-cell text-right text-red-700 font-extrabold">Долг: {contractorTotals.unpaidBalance.toLocaleString('ru-RU')} ₽</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* 4. Salary Report */}
      {reportSubTab === 'salary' && (
        <div className="flex flex-col gap-3">
          <div className="bg-white p-3 rounded border border-[#b8bdc5] shadow-2xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#1c1d1f]">Фонд зарплаты (% от прибыли):</span>
              <input
                type="number"
                value={salaryPercent}
                onChange={e => setSalaryPercent(Number(e.target.value) || 0)}
                className="w-16 border border-[#b8bdc5] rounded p-1 text-xs outline-none font-bold text-center bg-[#fffdf0]"
              />
              <span className="text-xs font-bold text-slate-600">%</span>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Название шаблона..."
                value={presetName}
                onChange={e => setPresetName(e.target.value)}
                className="border border-[#b8bdc5] rounded px-2 py-1 text-xs outline-none w-48 bg-white"
              />
              <button
                onClick={handleSavePreset}
                className="bg-[#ffcc00] hover:bg-[#e6b800] text-[#1c1d1f] border border-[#d9a800] rounded px-3 py-1 text-xs font-bold cursor-pointer transition shadow-2xs"
              >
                Сохранить шаблон
              </button>
            </div>

            {presets.length > 0 && (
              <div className="flex items-center gap-1.5 text-xs">
                <span className="font-bold text-slate-700">Загрузить шаблон:</span>
                {presets.map(p => (
                  <button
                    key={p.name}
                    onClick={() => handleApplyPreset(p.name)}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded px-2 py-0.5 text-xs font-semibold cursor-pointer transition"
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Salary Summary Cards */}
          <div className="grid grid-cols-4 gap-3">
            <div className="bg-white p-3 rounded border border-[#b8bdc5] shadow-2xs">
              <div className="text-[11px] font-bold text-slate-500 uppercase">Базовый ЗП Фонд ({salaryPercent}%)</div>
              <div className="text-xl font-black text-[#6b21a8] mt-1">{monthlyStats.baseSalary.toLocaleString('ru-RU')} ₽</div>
            </div>
            <div className="bg-white p-3 rounded border border-[#b8bdc5] shadow-2xs">
              <div className="text-[11px] font-bold text-slate-500 uppercase">Корректировки по Картам/Счетам</div>
              <div className="text-xl font-black text-[#1e40af] mt-1">{salaryPayerTotal >= 0 ? `+${salaryPayerTotal.toLocaleString('ru-RU')}` : salaryPayerTotal.toLocaleString('ru-RU')} ₽</div>
            </div>
            <div className="bg-white p-3 rounded border border-[#b8bdc5] shadow-2xs">
              <div className="text-[11px] font-bold text-slate-500 uppercase">Собственные работы (Затраты)</div>
              <div className="text-xl font-black text-[#9a3412] mt-1">+{salaryManagerTotal.toLocaleString('ru-RU')} ₽</div>
            </div>
            <div className="bg-amber-50 p-3 rounded border border-amber-300 shadow-2xs">
              <div className="text-[11px] font-bold text-amber-900 uppercase">ИТОГО ЗАРПЛАТА К ВЫПЛАТЕ</div>
              <div className="text-2xl font-black text-amber-950 mt-1">{finalCalculatedSalary.toLocaleString('ru-RU')} ₽</div>
            </div>
          </div>

          <div className="flex justify-end mt-2">
            <button
              onClick={handleCloseSalaryPeriod}
              className="bg-gradient-to-b from-[#ffdb4d] to-[#ffcc00] hover:from-[#ffcc00] text-[#1c1d1f] border border-[#d9a800] rounded px-4 py-2 text-xs font-bold cursor-pointer shadow-xs transition"
            >
              Провести ведомость за {repMonth} в БД
            </button>
          </div>

          {/* Salary Records History */}
          {salaryRecords.length > 0 && (
            <div className="mt-4 bg-white border border-[#b8bdc5] rounded shadow-2xs p-3">
              <h3 className="text-xs font-bold text-[#1c1d1f] uppercase tracking-wide mb-2">
                История проведенных ведомостей ЗП
              </h3>
              <div className="overflow-x-auto">
                <table className="sheet-grid w-full">
                  <thead>
                    <tr>
                      <th className="sheet-header" style={{ width: 100 }}>Месяц</th>
                      <th className="sheet-header" style={{ width: 150 }}>Дата проведения</th>
                      <th className="sheet-header" style={{ width: 120 }}>Базовая ЗП</th>
                      <th className="sheet-header" style={{ width: 120 }}>Итого выплата</th>
                      <th className="sheet-header">Примечание</th>
                    </tr>
                  </thead>
                  <tbody>
                    {salaryRecords.map(rec => (
                      <tr key={rec.id} className="text-xs border-b border-[#c9ced6] hover:bg-[#fff9d6]">
                        <td className="sheet-cell font-mono font-bold">{rec.month}</td>
                        <td className="sheet-cell font-mono">{rec.closedAt}</td>
                        <td className="sheet-cell text-right font-semibold">{rec.baseSalary.toLocaleString('ru-RU')} ₽</td>
                        <td className="sheet-cell text-right font-black text-[#15803d]">{rec.finalSalary.toLocaleString('ru-RU')} ₽</td>
                        <td className="sheet-cell text-slate-700">{rec.note}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
