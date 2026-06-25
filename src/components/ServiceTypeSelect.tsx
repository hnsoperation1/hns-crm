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

  return (
    <select
      value={value ?? ''}
      onChange={e => onChange(e.target.value || null)}
      className={`w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 bg-white ${className}`}
    >
      <option value="">-- Chọn loại dịch vụ --</option>
      {parents.map(parent => {
        const children = types.filter(t => t.parent_id === parent.id)
        if (children.length === 0) {
          return <option key={parent.id} value={parent.id}>{parent.name}</option>
        }
        return (
          <optgroup key={parent.id} label={parent.name}>
            {children.map(child => (
              <option key={child.id} value={child.id}>{child.name}</option>
            ))}
          </optgroup>
        )
      })}
    </select>
  )
}
