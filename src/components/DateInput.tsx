'use client'
import { useState, useRef, useEffect } from 'react'
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react'

const VI_MONTHS = ['Tháng Một','Tháng Hai','Tháng Ba','Tháng Tư','Tháng Năm','Tháng Sáu','Tháng Bảy','Tháng Tám','Tháng Chín','Tháng Mười','Tháng Mười Một','Tháng Mười Hai']
const DAY_HEADERS = ['Th 2','Th 3','Th 4','Th 5','Th 6','Th 7','CN']

interface Props {
  value: string        // yyyy-mm-dd hoặc ''
  onChange: (val: string) => void
  className?: string
  placeholder?: string
}

export default function DateInput({ value, onChange, className = '', placeholder = 'dd/mm/yyyy' }: Props) {
  const today = new Date().toISOString().slice(0, 10)
  const initYear  = value?.length >= 10 ? parseInt(value.slice(0, 4)) : new Date().getFullYear()
  const initMonth = value?.length >= 10 ? parseInt(value.slice(5, 7)) - 1 : new Date().getMonth()

  const [open, setOpen]           = useState(false)
  const [alignRight, setAlignRight] = useState(false)
  const [viewYear, setViewYear]   = useState(initYear)
  const [viewMonth, setViewMonth] = useState(initMonth)
  const ref = useRef<HTMLDivElement>(null)

  const display = value?.length >= 10
    ? `${value.slice(8, 10)}/${value.slice(5, 7)}/${value.slice(0, 4)}`
    : ''

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  useEffect(() => {
    if (value?.length >= 10) {
      setViewYear(parseInt(value.slice(0, 4)))
      setViewMonth(parseInt(value.slice(5, 7)) - 1)
    }
  }, [value])

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) }
    else setViewMonth(m => m - 1)
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) }
    else setViewMonth(m => m + 1)
  }

  function selectDay(day: number) {
    const mm = String(viewMonth + 1).padStart(2, '0')
    const dd = String(day).padStart(2, '0')
    onChange(`${viewYear}-${mm}-${dd}`)
    setOpen(false)
  }

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const firstDay    = (new Date(viewYear, viewMonth, 1).getDay() + 6) % 7
  const cells       = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)]

  const selectedDay = value?.length >= 10
    && parseInt(value.slice(0, 4)) === viewYear
    && parseInt(value.slice(5, 7)) - 1 === viewMonth
    ? parseInt(value.slice(8, 10)) : null

  const todayDay = today.slice(0, 7) === `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`
    ? parseInt(today.slice(8, 10)) : null

  const years = Array.from({ length: 12 }, (_, i) => new Date().getFullYear() - 3 + i)

  return (
    <div ref={ref} className={`relative ${className}`}>
      {/* Input */}
      <div
        onClick={() => {
          if (!open && ref.current) {
            const rect = ref.current.getBoundingClientRect()
            setAlignRight(rect.left + 256 > window.innerWidth - 16)
          }
          setOpen(o => !o)
        }}
        className={`w-full flex items-center gap-2 text-sm border rounded-lg px-3 py-1.5 bg-white cursor-pointer transition-all select-none
          ${open ? 'border-brand-400 ring-2 ring-brand-100' : 'border-gray-200 hover:border-brand-300'}`}
      >
        <CalendarDays size={14} className={open ? 'text-brand-500' : 'text-gray-400'} />
        <span className={display ? 'text-gray-800' : 'text-gray-400'}>{display || placeholder}</span>
      </div>

      {/* Popup */}
      {open && (
        <div className={`absolute top-full mt-2 z-[200] bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden w-64 ${alignRight ? 'right-0' : 'left-0'}`}>
          {/* Header gradient */}
          <div className="bg-gradient-to-br from-brand-600 to-brand-800 px-3 py-3">
            <div className="flex items-center justify-between">
              <button onClick={prevMonth}
                className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors">
                <ChevronLeft size={14} />
              </button>

              <div className="flex items-center gap-1.5">
                <select value={viewMonth} onChange={e => setViewMonth(Number(e.target.value))}
                  className="text-sm font-bold text-white bg-transparent outline-none cursor-pointer appearance-none">
                  {VI_MONTHS.map((m, i) => <option key={i} value={i} className="text-gray-800 bg-white">{m}</option>)}
                </select>
                <select value={viewYear} onChange={e => setViewYear(Number(e.target.value))}
                  className="text-sm font-bold text-white bg-transparent outline-none cursor-pointer appearance-none">
                  {years.map(y => <option key={y} value={y} className="text-gray-800 bg-white">{y}</option>)}
                </select>
              </div>

              <button onClick={nextMonth}
                className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors">
                <ChevronRight size={14} />
              </button>
            </div>
          </div>

          <div className="p-3">
            {/* Day headers */}
            <div className="grid grid-cols-7 mb-1">
              {DAY_HEADERS.map(d => (
                <div key={d} className={`text-[11px] font-bold text-center py-1 ${d === 'CN' ? 'text-accent-500' : 'text-gray-400'}`}>{d}</div>
              ))}
            </div>

            {/* Days */}
            <div className="grid grid-cols-7 gap-y-0.5">
              {cells.map((day, i) => {
                if (day === null) return <div key={`e-${i}`} />
                const isSun = (firstDay + day - 1) % 7 === 6
                const isSelected = selectedDay === day
                const isToday = todayDay === day
                return (
                  <button key={day} onClick={() => selectDay(day)}
                    className={`text-sm h-8 w-8 mx-auto rounded-full flex items-center justify-center font-medium transition-all
                      ${isSelected
                        ? 'bg-brand-600 text-white shadow-md shadow-brand-200'
                        : isToday
                          ? 'border-2 border-accent-400 text-accent-600 font-bold'
                          : isSun
                            ? 'text-accent-500 hover:bg-accent-50'
                            : 'text-gray-700 hover:bg-brand-50 hover:text-brand-700'
                      }`}>
                    {day}
                  </button>
                )
              })}
            </div>

            {/* Today shortcut */}
            <div className="mt-2 pt-2 border-t border-gray-100 flex justify-center">
              <button onClick={() => { onChange(today); setOpen(false) }}
                className="text-xs font-semibold text-brand-600 hover:text-brand-800 px-3 py-1 rounded-lg hover:bg-brand-50 transition-colors">
                Hôm nay
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
