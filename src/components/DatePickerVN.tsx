'use client'

import ReactDatePicker, { registerLocale } from 'react-datepicker'
import { vi } from 'date-fns/locale/vi'
import 'react-datepicker/dist/react-datepicker.css'

registerLocale('vi', vi)

interface Props {
  value: string        // YYYY-MM-DD hoặc ''
  onChange: (val: string) => void
  placeholder?: string
  className?: string
}

export default function DatePickerVN({ value, onChange, placeholder = 'dd/mm/yyyy', className }: Props) {
  const selected = value ? new Date(value + 'T00:00:00') : null

  function handleChange(date: Date | null) {
    if (!date) { onChange(''); return }
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    onChange(`${y}-${m}-${d}`)
  }

  return (
    <ReactDatePicker
      selected={selected}
      onChange={handleChange}
      locale="vi"
      dateFormat="dd/MM/yyyy"
      placeholderText={placeholder}
      className={className}
      calendarStartDay={1}
      showMonthDropdown
      showYearDropdown
      dropdownMode="select"
      isClearable
      autoComplete="off"
    />
  )
}
