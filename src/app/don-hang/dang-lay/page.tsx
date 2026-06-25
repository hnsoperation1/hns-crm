'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useTopbar } from '@/contexts/topbar'
import { SOURCE_LABELS, SOURCE_COLORS, STAGE_LABELS, STAGE_COLORS, formatDate, formatVND, getInitials } from '@/lib/utils'
import type { OppStage } from '@/types'

type Row = {
  id: string
  title: string
  description: string | null
  stage: OppStage
  source: string
  estimated_value: number | null
  created_at: string
  contact: { name: string; company?: string } | null
  assigned_user: { full_name: string } | null
}

export default function DangLayPage() {
  const router = useRouter()
  const { setOnRefresh, setBreadcrumb } = useTopbar()
  const supabase = createClient()
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('opportunities')
      .select('id, title, description, stage, source, estimated_value, created_at, contact:contacts(name, company), assigned_user:users!assigned_to(full_name)')
      .in('stage', ['stage_1', 'stage_2'])
      .order('created_at', { ascending: false })
    setRows((data ?? []) as unknown as Row[])
    setLoading(false)
  }, [])

  useEffect(() => {
    setBreadcrumb(null)
    loadData()
    setOnRefresh(loadData)
    return () => setOnRefresh(null)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const cols = ['Đơn hàng', 'Giai đoạn', 'Nguồn', 'Sale TV', 'Điểm đến', 'Giá trị ước tính', 'Ngày tạo']

  return (
    <div className="overflow-y-auto bg-white" style={{ height: 'calc(100vh - 40px)' }}>
      <table className="w-full text-sm">
        <thead className="sticky top-0 z-10">
          <tr className="bg-gray-50 border-b border-gray-200">
            {cols.map(h => (
              <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {loading ? (
            Array.from({ length: 8 }).map((_, i) => (
              <tr key={i} className="animate-pulse">
                {[40, 16, 14, 18, 20, 14, 12].map((w, j) => (
                  <td key={j} className="px-5 py-4"><div className="h-3 bg-gray-100 rounded" style={{ width: `${w + (i % 3) * 4}%` }} /></td>
                ))}
              </tr>
            ))
          ) : rows.length === 0 ? (
            <tr><td colSpan={7} className="px-5 py-12 text-center text-gray-400">Không có đơn nào</td></tr>
          ) : rows.map(r => {
            const sc = STAGE_COLORS[r.stage]
            return (
              <tr key={r.id} className="hover:bg-gray-50/70 group transition-colors cursor-pointer" onClick={() => router.push(`/co-hoi/${r.id}`)}>
                <td className="px-5 py-3.5">
                  <div className="font-semibold text-gray-900 group-hover:text-brand-700 transition-colors">{r.title}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{r.contact?.company ?? r.contact?.name}</div>
                </td>
                <td className="px-5 py-3.5">
                  <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${sc.bg} ${sc.text}`}>{STAGE_LABELS[r.stage]}</span>
                </td>
                <td className="px-5 py-3.5">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${SOURCE_COLORS[r.source as keyof typeof SOURCE_COLORS]}`}>{SOURCE_LABELS[r.source as keyof typeof SOURCE_LABELS]}</span>
                </td>
                <td className="px-5 py-3.5">
                  {r.assigned_user ? (
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-slate-200 rounded-full flex items-center justify-center text-[10px] font-bold text-slate-600">{getInitials(r.assigned_user.full_name)}</div>
                      <span className="text-gray-700 whitespace-nowrap">{r.assigned_user.full_name}</span>
                    </div>
                  ) : <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Chờ phân công</span>}
                </td>
                <td className="px-5 py-3.5 text-gray-600">{r.description || <span className="text-gray-300">—</span>}</td>
                <td className="px-5 py-3.5 text-right font-semibold text-gray-800">{r.estimated_value ? formatVND(r.estimated_value) : <span className="text-gray-300">—</span>}</td>
                <td className="px-5 py-3.5 text-gray-400 whitespace-nowrap">{formatDate(r.created_at)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
