import { useMemo, useState, useEffect } from 'react'
import { calcOrderTotals, evalFormula } from '../utils/formula'

// Это React-обёртка над v10 vanilla-прототипом.
// Для продакшна мы оставляем логику компактной таблицы, но данные грузим через API (Turso) с фолбэком в localStorage.

type PayerType = 'cashless' | 'cash' | 'card'

export default function DashboardPage(){
  // Упрощённо: используем тот же LS ключ что и в прототипе v10, но если /api доступен — грузим оттуда
  const [orders,setOrders]=useState<any[]>(()=>{
    try{ const raw=localStorage.getItem('crm_v10_reports_fixed'); if(raw) return JSON.parse(raw).orders || []; }catch{}
    return []
  })
  const [clients]=useState<any[]>([
    {id:'c1',name:'ООО Альфа Медиа'},{id:'c2',name:'Бета Трейд'}
  ])
  const [payers,setPayers]=useState<any[]>([
    {id:'p1',name:'ИП Иванов безнал',type:'cashless'},
    {id:'p3',name:'Наличные',type:'cash'},
    {id:'p4',name:'Карта',type:'card'},
  ])
  const [expanded,setExpanded]=useState<Record<string,boolean>>({})
  const [activeCell,setActiveCell]=useState<{row:number,field:string,oid:string}|null>(null)
  const [editBar,setEditBar]=useState('')

  useEffect(()=>{
    // попытка загрузить из Turso
    fetch('/api/orders').then(r=> r.ok? r.json(): null).then(data=>{
      if(data && Array.isArray(data) && data.length) setOrders(data)
    }).catch(()=>{})
    fetch('/api/payers').then(r=> r.ok? r.json(): null).then(data=>{
      if(data && data.length) setPayers(data)
    }).catch(()=>{})
  },[])

  const filtered = useMemo(()=> orders, [orders])

  const isCash = (payerId:string)=>{
    const p=payers.find((x:any)=>x.id===payerId)
    return p?.type==='cash'
  }

  return (
    <div className="flex flex-col h-[calc(100vh-96px)]">
      {/* Filters */}
      <div className="bg-white border border-[#d1d9e6] rounded-xl m-3 p-3 flex gap-2 shadow-sm">
        <span className="text-xs text-slate-500 py-1">Всего {filtered.length} • компактная таблица • offline fallback</span>
        <button className="ml-auto bg-blue-600 text-white rounded-full px-4 py-1.5 text-xs" onClick={()=>{
          const id=Math.random().toString(36).slice(2,8)
          const no={id, date:new Date().toISOString().slice(0,10), clientId:clients[0]?.id||'c1', productName:'', contractors:[], saleAmount:0, paymentReceiverId:payers[0]?.id||'p1', paymentNote:'', paymentReceived:false, status:'active', note:'', createdAt:new Date().toISOString()}
          setOrders(o=>[no,...o])
        }}>+ Заказ</button>
      </div>

      {/* Edit bar */}
      <div className="bg-white border border-[#d1d9e6] rounded-xl mx-3 mb-2 p-2 shadow-sm border-l-4 border-l-blue-600">
        <div className="text-[10px] text-slate-500 mb-1">{activeCell ? `${activeCell.field} • ${activeCell.oid.slice(0,4)}` : 'кликни ячейку'} — полный текст с переносами, в таблице ...</div>
        <textarea className="w-full min-h-[36px] border border-slate-200 rounded-lg p-2 text-sm resize-y" value={editBar} onChange={e=>{
          setEditBar(e.target.value)
          if(!activeCell) return
          const v=e.target.value
          if(activeCell.field==='productName'){
            setOrders(os=> os.map(o=> o.id===activeCell.oid? {...o, productName:v}:o))
          } else if(activeCell.field==='saleAmount'){
            const s=v.trim()
            if(s.startsWith('=')){
              setOrders(os=> os.map(o=> o.id===activeCell.oid? {...o, saleAmount:evalFormula(s), saleFormula:s}:o))
            } else {
              setOrders(os=> os.map(o=> o.id===activeCell.oid? {...o, saleAmount:Number(s)||0, saleFormula:''}:o))
            }
          }
        }} placeholder="Выбери ячейку — здесь удобно править длинный текст" />
      </div>

      {/* Sheet */}
      <div className="flex-1 overflow-auto bg-white m-3 mt-2 border border-[#d1d9e6] rounded-xl shadow-sm">
        <table className="sheet-grid">
          <thead><tr>
            <th className="sheet-header" style={{width:56}}>#</th>
            <th className="sheet-header" style={{width:100}}>Дата</th>
            <th className="sheet-header" style={{width:140}}>Клиент</th>
            <th className="sheet-header" style={{width:220}}>Продукция</th>
            <th className="sheet-header" style={{width:90}}>Затраты</th>
            <th className="sheet-header" style={{width:110}}>Реализация</th>
            <th className="sheet-header" style={{width:80}}>Прибыль</th>
            <th class="sheet-header" style={{width:60}}>Рент%</th>
            <th className="sheet-header" style={{width:150}}>Получатель</th>
            <th className="sheet-header" style={{width:60}}>№ счета</th>
            <th className="sheet-header" style={{width:40}}>Опл</th>
            <th className="sheet-header" style={{width:80}}>Прим</th>
            <th class="sheet-header" style={{width:56}}>Стат</th>
            <th className="sheet-header" style={{width:70}}>Действ</th>
          </tr></thead>
          <tbody>
            {filtered.map((order:any, idx:number)=>{
              const t=calcTotals(order)
              const isExp=!!expanded[order.id]
              const cash=isCash(order.paymentReceiverId)
              return (
                <>
                <tr key={order.id} className="hover:bg-[#f1f8ff] h-7">
                  <td className="sheet-cell text-center cursor-pointer" style={{width:56}} onClick={()=>setExpanded(s=>({...s,[order.id]:!s[order.id]}))}>{idx+1} {isExp?'▼':'▶'}</td>
                  <td className="sheet-cell"><div className="cell-truncate">{order.date}</div></td>
                  <td className="sheet-cell"><div className="cell-truncate">{clients.find(c=>c.id===order.clientId)?.name||order.clientId}</div></td>
                  <td className="sheet-cell cursor-pointer" onClick={()=>{ setActiveCell({row:idx, field:'productName', oid:order.id}); setEditBar(order.productName) }}>
                    <div className="cell-truncate">{order.productName||'—'}</div>
                  </td>
                  <td className="sheet-cell text-right"><div className="cell-truncate">{t.costs.toLocaleString('ru-RU')}</div></td>
                  <td className="sheet-cell cursor-pointer text-right font-medium" onClick={()=>{ setActiveCell({row:idx, field:'saleAmount', oid:order.id}); setEditBar(order.saleFormula||String(order.saleAmount)) }}>
                    <div className="cell-truncate">{order.saleAmount}</div>
                  </td>
                  <td className="sheet-cell text-right" style={{color: t.profit>=0?'#16a34a':'#dc2626'}}><div className="cell-truncate">{t.profit.toLocaleString('ru-RU')}</div></td>
                  <td className="sheet-cell text-right"><div className="cell-truncate">{t.rent.toFixed(1)}%</div></td>
                  <td className="sheet-cell"><div className="cell-truncate">{payers.find(p=>p.id===order.paymentReceiverId)?.name||''}</div></td>
                  <td className="sheet-cell"><div className="cell-truncate">{cash?'—':(order.paymentNote||'№…')}</div></td>
                  <td className="sheet-cell text-center"><input type="checkbox" checked={!!order.paymentReceived} readOnly/></td>
                  <td className="sheet-cell"><div className="cell-truncate">{order.note||''}</div></td>
                  <td className="sheet-cell text-center">{order.status==='completed'?'✓':'○'}</td>
                  <td className="sheet-cell"><button className="text-xs border rounded px-1" onClick={()=>{
                    const copy={...order, id:Math.random().toString(36).slice(2,8), date:new Date().toISOString().slice(0,10)}
                    setOrders(o=>[copy,...o])
                  }}>⎘</button><button className="text-xs border rounded px-1 ml-1" onClick={()=> setOrders(o=>o.filter(x=>x.id!==order.id))}>🗑</button></td>
                </tr>
                {isExp && (
                  <tr><td colSpan={14} style={{padding:0, border:'1px solid #e2e8f0'}}>
                    <div style={{background:'#fffdf5', padding:6}}>
                      <div style={{display:'flex', gap:8, marginBottom:6}}><span style={{fontSize:11, fontWeight:600}}>Подрядчики</span><button className="ml-auto text-xs border rounded px-2" onClick={()=>{
                        const nr={id:Math.random().toString(36).slice(2,6), contractorId:'co1', description:'', costFormula:'', costValue:0, payerId:payers[0]?.id||'p1', paid:false, reconciled:false, note:''}
                        setOrders(os=> os.map(o=> o.id===order.id? {...o, contractors:[...(o.contractors||[]), nr]}:o))
                      }}>+ Добавить</button></div>
                      <table className="sheet-grid" style={{width:'100%'}}>
                        <thead><tr><th className="sheet-header">Описание</th><th className="sheet-header" style={{width:100}}>Формула</th><th className="sheet-header" style={{width:70}}>=</th></tr></thead>
                        <tbody>
                          {(order.contractors||[]).map((cr:any)=>(
                            <tr key={cr.id}><td className="sheet-cell"><div className="cell-truncate">{cr.description||'—'}</div></td><td className="sheet-cell"><input defaultValue={cr.costFormula} className="w-full h-6 text-xs px-1 outline-none" placeholder="=6*3*450" onBlur={e=>{
                              const val=e.currentTarget.value
                              setOrders(os=> os.map(o=>{
                                if(o.id!==order.id) return o
                                return {...o, contractors: o.contractors.map((c:any)=> c.id===cr.id? {...c, costFormula:val, costValue:evalFormula(val)}:c)}
                              }))
                            }}/></td><td className="sheet-cell"><div className="cell-truncate">{cr.costValue}</div></td></tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </td></tr>
                )}
                </>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
