import React, { useState, useRef, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { Search, X, Check, Building2, User } from 'lucide-react'
import type { Client } from '../types'

interface ClientSearchSelectProps {
  id?: string
  value: string
  clients: Client[]
  onChange: (clientId: string) => void
  onFocus?: () => void
  onKeyDown?: (e: React.KeyboardEvent<HTMLElement>) => void
  disabled?: boolean
}

export default function ClientSearchSelect({
  id,
  value,
  clients,
  onChange,
  onFocus,
  onKeyDown,
  disabled
}: ClientSearchSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [highlightedIndex, setHighlightedIndex] = useState(0)

  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const selectedClient = useMemo(() => {
    return clients.find(c => c.id === value)
  }, [clients, value])

  // Filter clients by substring across name, phone, contactPerson
  const filteredClients = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    if (!q) return clients
    return clients.filter(c => {
      const name = (c.name || '').toLowerCase()
      const phone = (c.phone || '').toLowerCase()
      const contact = (c.contactPerson || '').toLowerCase()
      return name.includes(q) || phone.includes(q) || contact.includes(q)
    })
  }, [clients, searchQuery])

  // Reset highlight index when filtered list changes
  useEffect(() => {
    setHighlightedIndex(0)
  }, [filteredClients.length])

  // Calculate dropdown position
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 260, openUp: false })

  const updatePosition = () => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const spaceBelow = window.innerHeight - rect.bottom
    const openUp = spaceBelow < 250 && rect.top > 250
    const top = openUp ? rect.top - 240 : rect.bottom + 2
    const width = Math.max(rect.width, 280)
    const left = Math.min(rect.left, window.innerWidth - width - 10)

    setDropdownPos({
      top: Math.max(10, top),
      left: Math.max(10, left),
      width,
      openUp
    })
  }

  // Open dropdown and focus input
  const handleOpen = () => {
    if (disabled) return
    updatePosition()
    setSearchQuery(selectedClient ? selectedClient.name : '')
    setIsOpen(true)
    if (onFocus) onFocus()
    setTimeout(() => {
      inputRef.current?.focus()
      inputRef.current?.select()
    }, 20)
  }

  // Close dropdown
  const handleClose = () => {
    setIsOpen(false)
    setSearchQuery('')
  }

  // Select client
  const handleSelect = (clientId: string) => {
    onChange(clientId)
    handleClose()
  }

  // Handle outside click
  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node
      if (
        containerRef.current &&
        !containerRef.current.contains(target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(target)
      ) {
        handleClose()
      }
    }

    const handleScrollOrResize = () => {
      if (isOpen) updatePosition()
    }

    document.addEventListener('mousedown', handleClickOutside)
    window.addEventListener('resize', handleScrollOrResize)
    window.addEventListener('scroll', handleScrollOrResize, true)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      window.removeEventListener('resize', handleScrollOrResize)
      window.removeEventListener('scroll', handleScrollOrResize, true)
    }
  }, [isOpen])

  // Keyboard navigation inside input
  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      e.stopPropagation()
      setHighlightedIndex(prev => Math.min(prev + 1, filteredClients.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      e.stopPropagation()
      setHighlightedIndex(prev => Math.max(prev - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      e.stopPropagation()
      if (filteredClients.length > 0 && highlightedIndex >= 0 && highlightedIndex < filteredClients.length) {
        handleSelect(filteredClients[highlightedIndex].id)
      } else {
        handleClose()
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      handleClose()
    } else if (e.key === 'Tab') {
      handleClose()
    } else if (onKeyDown && !isOpen) {
      onKeyDown(e)
    }
  }

  return (
    <div
      ref={containerRef}
      className="w-full h-full relative flex items-center select-none"
      onClick={() => {
        if (!isOpen) handleOpen()
      }}
    >
      {isOpen ? (
        <div className="w-full h-full flex items-center px-1 bg-white dark:bg-[#1c1f26]">
          <Search className="w-3.5 h-3.5 text-amber-500 mr-1 shrink-0" />
          <input
            ref={inputRef}
            id={id}
            type="text"
            value={searchQuery}
            onChange={e => {
              setSearchQuery(e.target.value)
              updatePosition()
            }}
            onKeyDown={handleInputKeyDown}
            placeholder="Поиск по названию или телефону..."
            className="w-full h-full text-xs font-semibold outline-none bg-transparent client-selected-text placeholder-unfilled"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={e => {
                e.stopPropagation()
                setSearchQuery('')
                inputRef.current?.focus()
              }}
              className="text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      ) : (
        <div
          id={id}
          tabIndex={0}
          onFocus={onFocus}
          onKeyDown={e => {
            if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
              e.preventDefault()
              handleOpen()
            } else if (onKeyDown) {
              onKeyDown(e)
            }
          }}
          className="w-full h-full px-1.5 flex items-center justify-between cursor-pointer group"
          title={selectedClient ? selectedClient.name : 'Выберите контрагента'}
        >
          {selectedClient ? (
            <span className="text-xs font-bold client-selected-text truncate">
              {selectedClient.name}
            </span>
          ) : (
            <span className="text-xs font-semibold text-red-500 dark:text-red-400 flex items-center gap-1 truncate">
              Выберите контрагента...
            </span>
          )}
          <Search className="w-3 h-3 text-slate-400 group-hover:text-amber-500 opacity-0 group-hover:opacity-100 transition-opacity ml-1 shrink-0" />
        </div>
      )}

      {/* Floating Dropdown List Portal */}
      {isOpen &&
        createPortal(
          <div
            ref={dropdownRef}
            style={{
              position: 'fixed',
              top: `${dropdownPos.top}px`,
              left: `${dropdownPos.left}px`,
              width: `${dropdownPos.width}px`,
              zIndex: 99999
            }}
            className="bg-white dark:bg-[#1c1e24] border border-[#b8bdc5] dark:border-[#333642] rounded shadow-xl max-h-[260px] flex flex-col overflow-hidden text-xs"
          >
            {/* Search feedback header */}
            <div className="bg-[#f0f2f5] dark:bg-[#282b36] px-2.5 py-1.5 border-b border-[#b8bdc5] dark:border-[#333642] flex justify-between items-center text-[11px] font-bold text-slate-700 dark:text-slate-300">
              <span>Контрагенты ({filteredClients.length})</span>
              {value && (
                <button
                  type="button"
                  onClick={() => handleSelect('')}
                  className="text-red-600 hover:text-red-800 text-[10px] font-semibold cursor-pointer underline"
                >
                  Очистить выбор
                </button>
              )}
            </div>

            {/* Client list */}
            <div className="overflow-y-auto max-h-[220px]">
              {filteredClients.length === 0 ? (
                <div className="p-3 text-center text-slate-500 text-xs">
                  Ничего не найдено по запросу "{searchQuery}".
                </div>
              ) : (
                filteredClients.map((client, idx) => {
                  const isSelected = client.id === value
                  const isHighlighted = idx === highlightedIndex

                  return (
                    <div
                      key={client.id}
                      onClick={() => handleSelect(client.id)}
                      onMouseEnter={() => setHighlightedIndex(idx)}
                      className={`px-2.5 py-1.5 cursor-pointer flex items-center justify-between transition-colors border-b border-slate-100 dark:border-slate-800/50 ${
                        isHighlighted
                          ? 'bg-[#ffe97d] text-[#1c1d1f] font-semibold'
                          : isSelected
                          ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200'
                          : 'text-[#1c1d1f] dark:text-[#f8fafc] hover:bg-[#fff9d6] dark:hover:bg-[#282e3d]'
                      }`}
                    >
                      <div className="flex flex-col min-w-0 pr-2">
                        <div className="flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          <span className="truncate font-bold">{client.name}</span>
                        </div>
                        {(client.contactPerson || client.phone) && (
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 pl-5 truncate">
                            {client.contactPerson && <span>{client.contactPerson}</span>}
                            {client.contactPerson && client.phone && <span> • </span>}
                            {client.phone && <span>{client.phone}</span>}
                          </div>
                        )}
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-emerald-600 shrink-0" />}
                    </div>
                  )
                })
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  )
}
