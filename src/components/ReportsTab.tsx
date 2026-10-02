import { useState, useMemo, useEffect } from 'react'
import { Calendar, User, Building2, Wallet, CheckCircle2, Circle, Lock, RotateCw, Trash2, Plus, X } from 'lucide-react'
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
  const isCashPayer = (payerId: string) => {
    const p = payers.find(x => x.id === payerId)
    return p?.type === 'cash' || p?.type === 'card'
  }

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
                  <th className="sheet-header" style={{ width: 85 }}>Дата</th>
                  <th className="sheet-header" style={{ width: 160 }}>Контрагент</th>
                  <th className="sheet-header">Номенклатура (Продукция)</th>
                  <th className="sheet-header" style={{ width: 110 }}>Реализация</th>
                  <th className="sheet-header" style={{ width: 100 }}>Затраты</th>
                  <th className="sheet-header" style={{ width: 110 }}>Валовая прибыль</th>
                  <th className="sheet-header" style={{ width: 150 }}>Получатель оплаты</th>
                  <th className="sheet-header" style={{ width: 100 }}>Счет №</th>
                  <th className="sheet-header" style={{ width: 65 }}>Оплачено</th>
                </tr>
              </thead>
              <tbody>
                {clientReportOrders.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-6 text-slate-400 text-xs">
                      Нет данных за выбранный период
                    </td>
                  </tr>
                ) : (
                  clientReportOrders.map(o => {
                    const t = calcOrderTotals(o)
                    const cName = clients.find(c => c.id === o.clientId)?.name || '—'
                    const cash = isCashPayer(o.paymentReceiverId)
                    return (
                      <tr key={o.id} className="text-xs hover:bg-[#fff9d6] border-b border-[#c9ced6]">
                        <td className="sheet-cell font-mono">{o.date}</td>
                        <td className="sheet-cell font-bold">{cName}</td>
                        <td className="sheet-cell font-medium">{o.productName}</td>
                        <td className="sheet-cell text-right font-bold text-[#1e40af]">{o.saleAmount.toLocaleString('ru-RU')} ₽</td>
                        <td className="sheet-cell text-right text-[#9a3412] font-medium">{t.costs.toLocaleString('ru-RU')} ₽</td>
                        <td className="sheet-cell text-right font-bold text-[#15803d]">{t.profit.toLocaleString('ru-RU')} ₽</td>

                        {/* Editable Payment Receiver (Кто получает оплату) */}
                        <td className="sheet-cell p-0">
                          <select
                            value={o.paymentReceiverId || ''}
                            onChange={e => {
                              if (!onUpdateOrder) return
                              const newPayerId = e.target.value
                              const isNewCash = isCashPayer(newPayerId)
                              onUpdateOrder(
                                {
                                  ...o,
                                  paymentReceiverId: newPayerId,
                                  paymentNote: isNewCash ? '' : o.paymentNote
                                },
                                `Изменение получателя оплаты заказа #${o.id} в отчете по контрагенту`
                              )
                            }}
                            className="w-full h-full text-xs px-1 outline-none bg-transparent cursor-pointer font-medium"
                          >
                            <option value="">-- Выберите --</option>
                            {payers.map(p => (
                              <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                          </select>
                        </td>

                        {/* Editable Payment Note (Счет № / Прочерк для наличных и карты менеджера) */}
                        <td className="sheet-cell p-0">
                          {cash ? (
                            <div className="text-center text-slate-400 bg-slate-200/80 h-full flex items-center justify-center font-bold select-none">—</div>
                          ) : (
                            <input
                              type="text"
                              value={o.paymentNote || ''}
                              onChange={e => {
                                if (!onUpdateOrder) return
                                onUpdateOrder(
                                  { ...o, paymentNote: e.target.value },
                                  `Изменение № счета заказа #${o.id} в отчете по контрагенту`
                                )
                              }}
                              className="w-full h-full px-1 text-xs outline-none bg-transparent"
                              placeholder="№ счета"
                            />
                          )}
                        </td>

                        {/* Editable Paid Checkbox (Оплачено) */}
                        <td className="sheet-cell text-center p-0">
                          <input
                            type="checkbox"
                            checked={!!o.paymentReceived}
                            onChange={e => {
                              if (!onUpdateOrder) return
                              onUpdateOrder(
                                { ...o, paymentReceived: e.target.checked },
                                `Изменение статуса оплаты заказа #${o.id} в отчете по контрагенту`
                              )
                            }}
                            className="cursor-pointer accent-[#ffcc00]"
                          />
                        </td>
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
                  <td colSpan={3} className="sheet-cell text-center text-slate-700 font-extrabold">Рент {clientTotals.avgRent.toFixed(1)}%</td>
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

          {/* 3 Interactive Adjustment Blocks */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Block 1: Payer Adjustments */}
            <div className="bg-white p-3 rounded border border-[#b8bdc5] shadow-2xs space-y-3">
              <div className="border-b pb-1.5 flex justify-between items-center">
                <div>
                  <h4 className="font-bold text-xs text-[#1c1d1f] uppercase">1. Поступления по счетам</h4>
                  <p className="text-[10px] text-slate-500">Суммы счетов за месяц (+ / -)</p>
                </div>
                <button
                  type="button"
                  className="bg-slate-100 hover:bg-slate-200 text-[#1c1d1f] border border-[#b8bdc5] rounded px-2 py-0.5 text-xs font-bold cursor-pointer flex items-center gap-1 transition"
                  onClick={() => {
                    const firstPayerId = payers[0]?.id || ''
                    setPayerAdjs(prev => [...prev, { id: Math.random().toString(36).slice(2, 6), payerId: firstPayerId, sign: '+', note: '' }])
                  }}
                >
                  <Plus className="w-3 h-3" /> Счет
                </button>
              </div>

              {payerAdjs.length === 0 ? (
                <div className="text-slate-400 text-xs text-center py-4">Счета не добавлены</div>
              ) : (
                <div className="space-y-1.5">
                  {payerAdjs.map((adj, idx) => {
                    const autoCalc = getMonthlyPayerSum(adj.payerId)
                    const isMinus = adj.sign === '-'
                    return (
                      <div key={adj.id} className="flex items-center gap-1.5 bg-slate-50 p-1.5 rounded border border-slate-200 text-xs">
                        <button
                          type="button"
                          onClick={() => setPayerAdjs(prev => prev.map((item, i) => i === idx ? { ...item, sign: item.sign === '-' ? '+' : '-' } : item))}
                          className={`px-1.5 py-0.5 rounded font-black text-xs cursor-pointer border shrink-0 ${
                            isMinus
                              ? 'bg-red-100 text-red-800 border-red-300 hover:bg-red-200'
                              : 'bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-emerald-200'
                          }`}
                          title="Нажмите для смены знака: + (прибавить) / - (вычесть)"
                        >
                          {isMinus ? '-' : '+'}
                        </button>
                        <select
                          value={adj.payerId}
                          onChange={e => {
                            const newPayerId = e.target.value
                            setPayerAdjs(prev => prev.map((item, i) => i === idx ? { ...item, payerId: newPayerId } : item))
                          }}
                          className="border border-[#b8bdc5] rounded p-1 text-xs bg-white font-bold flex-1 min-w-0"
                        >
                          {payers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                        <div className={`border rounded px-2 py-1 font-black text-xs min-w-[85px] text-right shrink-0 ${
                          isMinus ? 'bg-red-50 border-red-200 text-red-700' : 'bg-blue-50 border-blue-200 text-blue-900'
                        }`}>
                          {isMinus ? `- ${autoCalc.toLocaleString('ru-RU')} ₽` : `+ ${autoCalc.toLocaleString('ru-RU')} ₽`}
                        </div>
                        <button
                          type="button"
                          className="text-red-600 hover:text-red-800 font-bold px-1 text-sm cursor-pointer shrink-0"
                          onClick={() => setPayerAdjs(prev => prev.filter((_, i) => i !== idx))}
                          title="Удалить строку"
                        >
                          ✕
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Block 2: Manager Own Works */}
            <div className="bg-white p-3 rounded border border-[#b8bdc5] shadow-2xs space-y-3">
              <div className="border-b pb-1.5 flex justify-between items-center">
                <div>
                  <h4 className="font-bold text-xs text-[#1c1d1f] uppercase">2. Работы менеджера</h4>
                  <p className="text-[10px] text-slate-500">Работы из таблицы за месяц (+)</p>
                </div>
                <button
                  type="button"
                  className="bg-slate-100 hover:bg-slate-200 text-[#1c1d1f] border border-[#b8bdc5] rounded px-2 py-0.5 text-xs font-bold cursor-pointer flex items-center gap-1 transition"
                  onClick={() => {
                    const firstCoId = contractors[0]?.id || ''
                    setManagerWorkAdjs(prev => [...prev, { id: Math.random().toString(36).slice(2, 6), contractorId: firstCoId, note: '' }])
                  }}
                >
                  <Plus className="w-3 h-3" /> Работа
                </button>
              </div>

              {managerWorkAdjs.length === 0 ? (
                <div className="text-slate-400 text-xs text-center py-4">Работы не добавлены</div>
              ) : (
                <div className="space-y-1.5">
                  {managerWorkAdjs.map((adj, idx) => {
                    const autoCalc = getMonthlyContractorSum(adj.contractorId)
                    return (
                      <div key={adj.id} className="flex items-center gap-1.5 bg-slate-50 p-1.5 rounded border border-slate-200 text-xs">
                        <select
                          value={adj.contractorId}
                          onChange={e => {
                            const newCoId = e.target.value
                            setManagerWorkAdjs(prev => prev.map((item, i) => i === idx ? { ...item, contractorId: newCoId } : item))
                          }}
                          className="border border-[#b8bdc5] rounded p-1 text-xs bg-white font-bold flex-1 min-w-0"
                        >
                          {contractors.map(co => <option key={co.id} value={co.id}>{co.name}</option>)}
                        </select>
                        <div className="bg-orange-50 border border-orange-200 text-orange-900 rounded px-2 py-1 font-black text-xs min-w-[85px] text-right shrink-0">
                          + {autoCalc.toLocaleString('ru-RU')} ₽
                        </div>
                        <button
                          type="button"
                          className="text-red-600 hover:text-red-800 font-bold px-1 text-sm cursor-pointer shrink-0"
                          onClick={() => setManagerWorkAdjs(prev => prev.filter((_, i) => i !== idx))}
                          title="Удалить строку"
                        >
                          ✕
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Block 3: Contractor Payments via Payers */}
            <div className="bg-white p-3 rounded border border-[#b8bdc5] shadow-2xs space-y-3">
              <div className="border-b pb-1.5 flex justify-between items-center">
                <div>
                  <h4 className="font-bold text-xs text-[#1c1d1f] uppercase">3. Выплаты подрядчикам</h4>
                  <p className="text-[10px] text-slate-500">Оплаты подрядчикам со счетов (+ / -)</p>
                </div>
                <button
                  type="button"
                  className="bg-slate-100 hover:bg-slate-200 text-[#1c1d1f] border border-[#b8bdc5] rounded px-2 py-0.5 text-xs font-bold cursor-pointer flex items-center gap-1 transition"
                  onClick={() => {
                    const firstPayerId = payers[0]?.id || ''
                    setContractorPayerAdjs(prev => [...prev, { id: Math.random().toString(36).slice(2, 6), payerId: firstPayerId, sign: '+', note: '' }])
                  }}
                >
                  <Plus className="w-3 h-3" /> Счет
                </button>
              </div>

              {contractorPayerAdjs.length === 0 ? (
                <div className="text-slate-400 text-xs text-center py-4">Оплаты по счетам не добавлены</div>
              ) : (
                <div className="space-y-1.5">
                  {contractorPayerAdjs.map((adj, idx) => {
                    const autoCalc = getMonthlyContractorPayerSum(adj.payerId)
                    const isMinus = adj.sign === '-'
                    return (
                      <div key={adj.id} className="flex items-center gap-1.5 bg-slate-50 p-1.5 rounded border border-slate-200 text-xs">
                        <button
                          type="button"
                          onClick={() => setContractorPayerAdjs(prev => prev.map((item, i) => i === idx ? { ...item, sign: item.sign === '-' ? '+' : '-' } : item))}
                          className={`px-1.5 py-0.5 rounded font-black text-xs cursor-pointer border shrink-0 ${
                            isMinus
                              ? 'bg-red-100 text-red-800 border-red-300 hover:bg-red-200'
                              : 'bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-emerald-200'
                          }`}
                          title="Нажмите для смены знака: + (прибавить) / - (вычесть)"
                        >
                          {isMinus ? '-' : '+'}
                        </button>
                        <select
                          value={adj.payerId}
                          onChange={e => {
                            const newPayerId = e.target.value
                            setContractorPayerAdjs(prev => prev.map((item, i) => i === idx ? { ...item, payerId: newPayerId } : item))
                          }}
                          className="border border-[#b8bdc5] rounded p-1 text-xs bg-white font-bold flex-1 min-w-0"
                        >
                          {payers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                        <div className={`border rounded px-2 py-1 font-black text-xs min-w-[85px] text-right shrink-0 ${
                          isMinus ? 'bg-red-50 border-red-200 text-red-700' : 'bg-purple-50 border-purple-200 text-purple-900'
                        }`}>
                          {isMinus ? `- ${autoCalc.toLocaleString('ru-RU')} ₽` : `+ ${autoCalc.toLocaleString('ru-RU')} ₽`}
                        </div>
                        <button
                          type="button"
                          className="text-red-600 hover:text-red-800 font-bold px-1 text-sm cursor-pointer shrink-0"
                          onClick={() => setContractorPayerAdjs(prev => prev.filter((_, i) => i !== idx))}
                          title="Удалить строку"
                        >
                          ✕
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Final Summary Card */}
          <div className="bg-[#fffef2] p-4 border-2 border-[#ffcc00] rounded shadow-sm space-y-2">
            <h4 className="font-extrabold text-xs text-[#1c1d1f] uppercase tracking-wide">
              ИТОГОВЫЙ РАСЧЕТ ЗАРПЛАТНОЙ ВЕДОМОСТИ ({repMonth})
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 text-xs border-t border-[#e6ba00] pt-2">
              <div>
                <span className="text-slate-600">Базовый Фонд ({salaryPercent}%):</span>
                <div className="font-bold text-slate-800 text-sm mt-0.5">{monthlyStats.baseSalary.toLocaleString('ru-RU')} ₽</div>
              </div>
              <div>
                <span className="text-slate-600">Поступления счетов (+/-):</span>
                <div className={`font-bold text-sm mt-0.5 ${salaryPayerTotal < 0 ? 'text-red-700' : 'text-blue-800'}`}>
                  {salaryPayerTotal >= 0 ? `+${salaryPayerTotal.toLocaleString('ru-RU')}` : salaryPayerTotal.toLocaleString('ru-RU')} ₽
                </div>
              </div>
              <div>
                <span className="text-slate-600">Работы менеджера (+):</span>
                <div className="font-bold text-orange-800 text-sm mt-0.5">+{salaryManagerTotal.toLocaleString('ru-RU')} ₽</div>
              </div>
              <div>
                <span className="text-slate-600">Оплаты подрядчикам (+/-):</span>
                <div className={`font-bold text-sm mt-0.5 ${salaryContractorPayerTotal < 0 ? 'text-red-700' : 'text-purple-800'}`}>
                  {salaryContractorPayerTotal >= 0 ? `+${salaryContractorPayerTotal.toLocaleString('ru-RU')}` : salaryContractorPayerTotal.toLocaleString('ru-RU')} ₽
                </div>
              </div>
              <div className="bg-amber-100/60 p-2 rounded border border-amber-300">
                <span className="text-amber-900 font-extrabold uppercase text-[11px]">ИТОГО К ВЫПЛАТЕ:</span>
                <div className="font-black text-green-700 text-lg mt-0.5">{finalCalculatedSalary.toLocaleString('ru-RU')} ₽</div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                className="bg-gradient-to-b from-[#ffdb4d] to-[#ffcc00] hover:from-[#ffcc00] text-[#1c1d1f] border border-[#d9a800] rounded px-4 py-1.5 text-xs font-extrabold cursor-pointer transition shadow-2xs active:scale-95 flex items-center gap-1.5"
                onClick={handleCloseSalaryPeriod}
              >
                <Lock className="w-3.5 h-3.5" /> Провести и сохранить ведомость ЗП
              </button>
            </div>
          </div>

          {/* History Table of Salary Records in DB */}
          <div className="bg-white border border-[#b8bdc5] rounded shadow-2xs overflow-hidden mt-2">
            <div className="bg-[#f0f2f5] px-3 py-2 border-b border-[#b8bdc5] font-bold text-xs text-[#1c1d1f] flex justify-between items-center">
              <span>📋 История проведенных ведомостей ЗП в базе данных Turso ({salaryRecords.length})</span>
              <button
                type="button"
                onClick={loadSalaryRecords}
                className="text-[11px] bg-white border border-[#b8bdc5] rounded px-2 py-0.5 font-bold hover:bg-slate-100 cursor-pointer flex items-center gap-1 shadow-2xs"
              >
                <RotateCw className="w-3 h-3" /> Обновить
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="sheet-grid w-full">
                <thead>
                  <tr>
                    <th className="sheet-header" style={{ width: 40 }}>№</th>
                    <th className="sheet-header" style={{ width: 100 }}>Месяц</th>
                    <th className="sheet-header" style={{ width: 160 }}>Дата проведения</th>
                    <th className="sheet-header" style={{ width: 90 }}>Процент %</th>
                    <th className="sheet-header" style={{ width: 120 }}>Базовый фонд</th>
                    <th className="sheet-header font-bold" style={{ width: 140 }}>Итого к выплате</th>
                    <th className="sheet-header">Примечание / Состояние</th>
                    <th className="sheet-header" style={{ width: 45 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {salaryRecords.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-6 text-slate-400 text-xs">
                        Проведенных ведомостей ЗП пока нет. Нажмите <b>🔒 Провести и сохранить ведомость ЗП</b>.
                      </td>
                    </tr>
                  ) : (
                    salaryRecords.map((sr, idx) => (
                      <tr key={sr.id} className="text-xs hover:bg-[#fff9d6] border-b border-[#c9ced6]">
                        <td className="sheet-cell text-center text-slate-500 font-bold bg-[#f4f6f8]">{idx + 1}</td>
                        <td className="sheet-cell font-mono font-bold text-[#1c1d1f]">{sr.month}</td>
                        <td className="sheet-cell text-slate-600 font-mono">{sr.closedAt || '—'}</td>
                        <td className="sheet-cell text-center font-bold">{sr.salaryPercent}%</td>
                        <td className="sheet-cell text-right font-medium">{sr.baseSalary?.toLocaleString('ru-RU')} ₽</td>
                        <td className="sheet-cell text-right font-black text-green-700">{sr.finalSalary?.toLocaleString('ru-RU')} ₽</td>
                        <td className="sheet-cell text-slate-700 font-medium">{sr.note || 'Проведено ✓'}</td>
                        <td className="sheet-cell text-center p-0">
                          <button
                            type="button"
                            className="text-red-600 hover:text-red-800 p-1 cursor-pointer transition hover:bg-red-50 rounded"
                            title="Удалить ведомость из базы"
                            onClick={async () => {
                              if (!window.confirm(`Удалить ведомость за ${sr.month}?`)) return
                              try {
                                await api.deleteSalary(sr.id)
                                await loadSalaryRecords()
                              } catch (err) {
                                alert('Ошибка при удалении ведомости')
                              }
                            }}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
