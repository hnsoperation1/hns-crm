'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { ServiceType } from '@/types'

interface Props {
  value: string | null | undefined
  onChange: (id: string | null) => void
  className?: string
}

export default function ServiceTypeSelect({ value, onChange, className = '' }: Props) {
  const [types, setTypes] = useState<ServiceType[]>([])
  const supabase = createClient()

  useEffect(() => {
    supabase.from('service_types').select('*').order('sort_order').then(({ data }) => {
      setTypes((data ?? []) as ServiceType[])
    })
  }, [])

  const parents = types.filter(t => !t.parent_id)

  // Tìm parent của value hiện tại
  const currentType = types.find(t => t.id === value)
  const selectedParentId = currentType
    ? (currentType.parent_id ?? currentType.id)
    : null
  const selectedChildId = currentType?.parent_id ? currentType.id : null

  const children = types.filter(t => t.parent_id === selectedParentId)

  function handleParentChange(parentId: string) {
    const kids = types.filter(t => t.parent_id === parentId)
    if (kids.length === 0) {
      // leaf node (Vé máy bay, Dịch vụ khác)
      onChange(parentId)
    } else {
      onChange(null) // reset, chờ chọn con
    }
  }

  function handleChildChange(childId: string) {
    onChange(childId)
  }

  const inputCls = `w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 bg-white ${className}`

  return (
    <div className="flex gap-2">
      {/* Chọn cha */}
      <select
        value={selectedParentId ?? ''}
        onChange={e => handleParentChange(e.target.value)}
        className={inputCls}
      >
        <option value="">-- Nhóm dịch vụ --</option>
        {parents.map(p => (
          <option key={p.id} value={p.id}>{p.name}</option>
        ))}
      </select>

      {/* Chọn con — chỉ hiện nếu cha có con */}
      {children.length > 0 && (
        <select
          value={selectedChildId ?? ''}
          onChange={e => handleChildChange(e.target.value)}
          className={inputCls}
        >
          <option value="">-- Loại cụ thể --</option>
          {children.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      )}
    </div>
  )
}
