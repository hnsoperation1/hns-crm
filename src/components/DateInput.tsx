'use client'
import { useRef, useState, useEffect } from 'react'

interface Props {
  value: string        // yyyy-mm-dd hoặc ''
  onChange: (val: string) => void
  className?: string
}

export default function DateInput({ value, onChange, className = '' }: Props) {
  const [day, setDay]   = useState('')
  const [mon, setMon]   = useState('')
  const [year, setYear] = useState('')
  const monRef  = useRef<HTMLInputElement>(null)
  const yearRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (value && value.length >= 10) {
      const [y, m, d] = value.slice(0, 10).split('-')
      setDay(d ?? ''); setMon(m ?? ''); setYear(y ?? '')
    } else if (!value) {
      setDay(''); setMon(''); setYear('')
    }
  }, [value])

  function emit(d: string, m: string, y: string) {
    if (d.length === 2 && m.length === 2 && y.length === 4) {
      const iso = `${y}-${m}-${d}`
      if (!isNaN(new Date(iso).getTime())) onChange(iso)
    } else if (!d && !m && !y) {
      onChange('')
    }
  }

  function handleDay(v: string) {
    const s = v.replace(/\D/g, '').slice(0, 2)
    setDay(s); emit(s, mon, year)
    if (s.length === 2) monRef.current?.focus()
  }
  function handleMon(v: string) {
    const s = v.replace(/\D/g, '').slice(0, 2)
    setMon(s); emit(day, s, year)
    if (s.length === 2) yearRef.current?.focus()
  }
  function handleYear(v: string) {
    const s = v.replace(/\D/g, '').slice(0, 4)
    setYear(s); emit(day, mon, s)
  }

  const inp = 'bg-transparent outline-none text-sm text-center'

  return (
    <div className={`inline-flex items-center border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white focus-within:ring-2 focus-within:ring-brand-400 focus-within:border-brand-400 ${className}`}>
      <input value={day}  onChange={e => handleDay(e.target.value)}  placeholder="DD"   inputMode="numeric" className={`${inp} w-6`}  />
      <span className="text-gray-300 select-none">/</span>
      <input value={mon}  onChange={e => handleMon(e.target.value)}  placeholder="MM"   inputMode="numeric" className={`${inp} w-6`}  ref={monRef} />
      <span className="text-gray-300 select-none">/</span>
      <input value={year} onChange={e => handleYear(e.target.value)} placeholder="YYYY" inputMode="numeric" className={`${inp} w-12`} ref={yearRef} />
    </div>
  )
}
