import { useState, ChangeEvent, useRef } from 'react'
import { Sparkles, X, Upload, Loader2, AlertTriangle, CheckCircle } from 'lucide-react'
import type { Client, Contractor, Payer, Order, OrderContractorRow } from '../types'
import { api } from '../api'

interface AiOrderModalProps {
  isOpen: boolean
  onClose: () => void
  clients: Client[]
  contractors: Contractor[]
  payers: Payer[]
  onConfirmOrder: (
    newOrder: Order,
    newClientsToCreate: Client[],
    newContractorsToCreate: Contractor[]
  ) => void
}

export default function AiOrderModal({
  isOpen,
  onClose,
  clients,
  contractors,
  payers,
  onConfirmOrder
}: AiOrderModalProps) {
  const [inputText, setInputText] = useState('')
  const [imageBase64, setImageBase64] = useState<string | null>(null)
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('openrouter_key') || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [parsedData, setParsedData] = useState<any | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!isOpen) return null

  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 8 * 1024 * 1024) {
      alert('Файл слишком большой. Максимальный размер 8 МБ.')
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      setImageBase64(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleSaveApiKey = (key: string) => {
    setApiKey(key)
    localStorage.setItem('openrouter_key', key)
  }

  const handleParse = async () => {
    if (!inputText.trim() && !imageBase64) {
      setError('Введите текст или загрузите фото/скан документа.')
      return
    }

    setLoading(true)
    setError('')
    setParsedData(null)

    try {
      const res = await api.parseOrderWithAI({
        text: inputText,
        imageBase64: imageBase64 || undefined,
        apiKey: apiKey.trim() || undefined,
        clients,
        contractors,
        payers
      })
      setParsedData(res)
    } catch (err: any) {
      setError(err.message || 'Ошибка при вызове ИИ распознавания')
    } finally {
      setLoading(false)
    }
  }

  const handleApplyOrder = () => {
    if (!parsedData) return

    const newClientsToCreate: Client[] = []
    const newContractorsToCreate: Contractor[] = []

    // 1. Resolve Client
    let targetClientId = parsedData.clientId
    if (!targetClientId) {
      const extractedName = parsedData.clientNameExtracted || 'Новый клиент'
      const placeholderName = `ВНЕСТИ (${extractedName})`
      
      let existingVnesti = clients.find(c => c.name === placeholderName || c.name.startsWith('ВНЕСТИ'))
      if (!existingVnesti) {
        existingVnesti = {
          id: 'cl_' + Math.random().toString(36).slice(2, 8),
          name: placeholderName,
          phone: '',
          contactPerson: '',
          email: '',
          note: 'Автоматически создан ИИ (требуется уточнение)',
          customFields: [],
          createdAt: new Date().toISOString()
        }
        newClientsToCreate.push(existingVnesti)
      }
      targetClientId = existingVnesti.id
    }

    // 2. Resolve Payment Receiver (Payer)
    let targetPaymentReceiverId = parsedData.paymentReceiverId || ''
    if (!targetPaymentReceiverId) {
      const defaultPayer = payers[0]?.id || ''
      targetPaymentReceiverId = defaultPayer
    }

    // 3. Resolve Contractor Rows
    const orderContractors: OrderContractorRow[] = (parsedData.contractors || []).map((row: any) => {
      let coId = row.contractorId
      if (!coId) {
        const coExtractedName = row.contractorNameExtracted || 'Новый подрядчик'
        const coPlaceholderName = `ВНЕСТИ (${coExtractedName})`

        let existingCoVnesti = contractors.find(c => c.name === coPlaceholderName || c.name.startsWith('ВНЕСТИ'))
        if (!existingCoVnesti && !newContractorsToCreate.some(c => c.name === coPlaceholderName)) {
          existingCoVnesti = {
            id: 'co_' + Math.random().toString(36).slice(2, 8),
            name: coPlaceholderName,
            phone: '',
            note: 'Автоматически создан ИИ (требуется уточнение)',
            createdAt: new Date().toISOString()
          }
          newContractorsToCreate.push(existingCoVnesti)
        }
        coId = existingCoVnesti?.id || contractors[0]?.id || ''
      }

      let payerId = row.payerId || ''

      return {
        id: 'cORow_' + Math.random().toString(36).slice(2, 8),
        contractorId: coId,
        description: row.description || '',
        costFormula: row.costFormula || '',
        costValue: Number(row.costValue) || 0,
        payerId: payerId,
        paid: false,
        reconciled: false,
        note: row.note || ''
      }
    })

    // 4. Construct Order
    const newOrder: Order = {
      id: Math.random().toString(36).slice(2, 8),
      date: parsedData.date || new Date().toISOString().slice(0, 10),
      clientId: targetClientId,
      productName: parsedData.productName || 'Заказ из ИИ',
      contractors: orderContractors,
      saleAmount: Number(parsedData.saleAmount) || 0,
      saleFormula: parsedData.saleFormula || '',
      paymentReceiverId: targetPaymentReceiverId,
      paymentNote: parsedData.paymentNote || '',
      paymentReceived: false,
      status: 'active',
      note: parsedData.note || 'Создано через ИИ помощник',
      createdAt: new Date().toISOString()
    }

    onConfirmOrder(newOrder, newClientsToCreate, newContractorsToCreate)
    onClose()
  }

  const getClientName = (id: string | null, extracted?: string) => {
    if (id) {
      const found = clients.find(c => c.id === id)
      if (found) return found.name
    }
    return `ВНЕСТИ (${extracted || 'Не распознан'})`
  }

  const getContractorName = (id: string | null, extracted?: string) => {
    if (id) {
      const found = contractors.find(c => c.id === id)
      if (found) return found.name
    }
    return `ВНЕСТИ (${extracted || 'Не распознан'})`
  }

  const getPayerName = (id: string | null) => {
    if (id) {
      const found = payers.find(p => p.id === id)
      if (found) return found.name
    }
    return 'ВЫБЕРИТЕ (не указан)'
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto backdrop-blur-xs">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col border border-[#b8bdc5]">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#1e40af] to-[#3b82f6] text-white px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-sm">
            <Sparkles className="w-5 h-5 text-yellow-300 animate-pulse" />
            <span>ИИ Помощник создания заказа (OpenRouter)</span>
          </div>
          <button onClick={onClose} className="hover:bg-white/20 p-1 rounded text-white cursor-pointer transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 text-xs overflow-y-auto max-h-[80vh]">
          {/* API Key configuration */}
          <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 flex flex-col gap-1">
            <label className="font-bold text-[#333740] flex items-center justify-between">
              <span>OpenRouter API Key (опционально, если задан в .env):</span>
              {apiKey && <span className="text-[10px] text-emerald-600 font-semibold">✓ Сохранен локально</span>}
            </label>
            <input
              type="password"
              placeholder="sk-or-v1-..."
              value={apiKey}
              onChange={e => handleSaveApiKey(e.target.value)}
              className="border border-slate-300 rounded px-2 py-1 text-xs bg-white focus:outline-blue-500 font-mono"
            />
          </div>

          {/* Text Input */}
          <div className="space-y-1">
            <label className="font-bold text-[#333740]">Введите текст заказа, письмо или описание:</label>
            <textarea
              rows={4}
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              placeholder="Например: Заказ для ИП Соколов, вывеска световая 3х1м. Продажа 45000р. Печать баннера у Иванова 8000р, сборка у Сидорова 6500р. Оплата наличными..."
              className="w-full border border-slate-300 rounded p-2 text-xs focus:outline-blue-500 bg-white"
            />
          </div>

          {/* Image Upload */}
          <div className="space-y-1">
            <label className="font-bold text-[#333740]">Прикрепить фото / скан (накладная, чек, мессенджер):</label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded text-slate-700 font-medium cursor-pointer transition"
              >
                <Upload className="w-4 h-4 text-blue-600" />
                <span>Загрузить изображение</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
              {imageBase64 && (
                <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded">
                  <span className="text-emerald-700 font-medium text-[11px]">✓ Изображение прикреплено</span>
                  <button
                    type="button"
                    onClick={() => setImageBase64(null)}
                    className="text-red-500 hover:text-red-700 font-bold ml-1 text-xs"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Action Button */}
          <button
            type="button"
            disabled={loading}
            onClick={handleParse}
            className="w-full py-2.5 bg-[#1a73e8] hover:bg-blue-700 disabled:bg-blue-300 text-white font-bold rounded-lg flex items-center justify-center gap-2 cursor-pointer shadow-xs transition"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>ИИ распознает данные через OpenRouter...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Распознать и сформировать заказ</span>
              </>
            )}
          </button>

          {/* Error display */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 font-medium flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Parsed Result Preview */}
          {parsedData && (
            <div className="border border-blue-200 bg-blue-50/50 rounded-xl p-3.5 space-y-3">
              <div className="flex items-center justify-between border-b border-blue-200 pb-2">
                <span className="font-extrabold text-[#1e40af] flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  Результат распознавания ИИ
                </span>
                <span className="text-[11px] text-slate-500 font-medium">Проверьте поля перед созданием</span>
              </div>

              {/* Main Fields */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-white p-2 rounded border border-slate-200">
                  <span className="text-slate-500 block text-[10px]">Дата:</span>
                  <span className="font-bold text-slate-800">{parsedData.date || 'Сегодня'}</span>
                </div>

                <div className="bg-white p-2 rounded border border-slate-200">
                  <span className="text-slate-500 block text-[10px]">Клиент:</span>
                  {parsedData.clientId ? (
                    <span className="font-bold text-emerald-700">{getClientName(parsedData.clientId)}</span>
                  ) : (
                    <span className="font-bold text-amber-700 bg-amber-50 px-1 rounded border border-amber-200 inline-block">
                      ⚠️ {getClientName(null, parsedData.clientNameExtracted)}
                    </span>
                  )}
                </div>

                <div className="bg-white p-2 rounded border border-slate-200 col-span-2">
                  <span className="text-slate-500 block text-[10px]">Номенклатура (Продукция):</span>
                  <span className="font-bold text-slate-900 whitespace-pre-line block">{parsedData.productName || 'Не указано'}</span>
                </div>

                <div className="bg-white p-2 rounded border border-slate-200">
                  <span className="text-slate-500 block text-[10px]">Сумма реализации:</span>
                  <span className="font-extrabold text-blue-700">
                    {Number(parsedData.saleAmount || 0).toLocaleString('ru-RU')} ₽
                    {parsedData.saleFormula ? ` (${parsedData.saleFormula})` : ''}
                  </span>
                </div>

                <div className="bg-white p-2 rounded border border-slate-200">
                  <span className="text-slate-500 block text-[10px]">Счет получателя:</span>
                  {parsedData.paymentReceiverId ? (
                    <span className="font-bold text-emerald-700">{getPayerName(parsedData.paymentReceiverId)}</span>
                  ) : (
                    <span className="font-bold text-amber-700 bg-amber-50 px-1 rounded border border-amber-200 inline-block">
                      ⚠️ {getPayerName(null)}
                    </span>
                  )}
                </div>
              </div>

              {/* Contractor rows */}
              {Array.isArray(parsedData.contractors) && parsedData.contractors.length > 0 && (
                <div className="space-y-1.5">
                  <span className="font-bold text-[#333740] block">Работы подрядчиков ({parsedData.contractors.length}):</span>
                  <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
                    {parsedData.contractors.map((cRow: any, i: number) => (
                      <div key={i} className="bg-white p-2 rounded border border-slate-200 text-[11px] space-y-1">
                        <div className="flex items-center justify-between font-semibold">
                          <span className="text-slate-700">{cRow.description || 'Работа'}</span>
                          <span className="text-red-700 font-bold">
                            {Number(cRow.costValue || 0).toLocaleString('ru-RU')} ₽
                            {cRow.costFormula ? ` (${cRow.costFormula})` : ''}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[10px]">
                          <div>
                            <span className="text-slate-400">Подрядчик: </span>
                            {cRow.contractorId ? (
                              <span className="font-bold text-emerald-700">{getContractorName(cRow.contractorId)}</span>
                            ) : (
                              <span className="font-bold text-amber-700 bg-amber-50 px-1 rounded border border-amber-200">
                                ⚠️ {getContractorName(null, cRow.contractorNameExtracted)}
                              </span>
                            )}
                          </div>
                          <div>
                            <span className="text-slate-400">Счет: </span>
                            {cRow.payerId ? (
                              <span className="font-bold text-emerald-700">{getPayerName(cRow.payerId)}</span>
                            ) : (
                              <span className="font-bold text-amber-700 bg-amber-50 px-1 rounded border border-amber-200">
                                ⚠️ {getPayerName(null)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Confirm button */}
              <button
                type="button"
                onClick={handleApplyOrder}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-lg flex items-center justify-center gap-2 cursor-pointer shadow-md transition text-xs"
              >
                <CheckCircle className="w-4 h-4" />
                <span>Создать заказ в CRM с этими данными</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
