'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useTopbar } from '@/contexts/topbar'
import { formatDate, formatVND, getInitials } from '@/lib/utils'

type Row = {
  id: string
  title: string
  description: string | null
  tour_date: string | null
  tour_end_date: string | null
  estimated_value: number | null
  actual_value: number | null
  contact: { name: string; company?: string } | null
  assigned_user: { full_name: string } | null
}

export default function DaXongPage() {
  const router = useRouter()
  const { setOnRefresh, setBreadcrumb } = useTopbar()
  const supabase = createClient()
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('opportunities')
      .select('id, title, description, tour_date, tour_end_date, estimated_value, actual_value, contact:contacts(name, company), assigned_user:users!assigned_to(full_name)')
      .eq('stage', 'stage_5')
      .order('tour_date', { ascending: false, nullsFirst: false })
    setRows((data ?? []) as Row[])
    setLoading(false)
  }, [])

  useEffect(() => {
    setBreadcrumb(null)
    loadData()
    setOnRefresh(loadData)
    return () => setOnRefresh(null)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const cols = ['Đơn hàng', 'Sale TV', 'Điểm đến', 'Ngày đi', 'Ngày về', 'Doanh thu TT', 'Giá ước tính', 'Chênh lệch']

  const totalActual = rows.reduce((s, r) => s + (r.actual_value ?? 0), 0)
  const totalEst = rows.reduce((s, r) => s + (r.estimated_value ?? 0), 0)

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
                {[38, 18, 18, 12, 12, 14, 14, 12].map((w, j) => (
                  <td key={j} className="px-5 py-4"><div className="h-3 bg-gray-100 rounded" style={{ width: `${w + (i % 3) * 4}%` }} /></td>
                ))}
              </tr>
            ))
          ) : rows.length === 0 ? (
            <tr><td colSpan={8} className="px-5 py-12 text-center text-gray-400">Không có đơn nào</td></tr>
          ) : (
            <>
              {rows.map(r => {
                const diff = (r.actual_value ?? 0) - (r.estimated_value ?? 0)
                const hasDiff = r.actual_value !== null && r.estimated_value !== null
                return (
                  <tr key={r.id} className="hover:bg-gray-50/70 group transition-colors cursor-pointer" onClick={() => router.push(`/co-hoi/${r.id}`)}>
                    <td className="px-5 py-3.5">
                      <div className="font-semibold text-gray-900 group-hover:text-brand-700 transition-colors">{r.title}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{r.contact?.company ?? r.contact?.name}</div>
                    </td>
                    <td className="px-5 py-3.5">
                      {r.assigned_user ? (
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 bg-slate-200 rounded-full flex items-center justify-center text-[10px] font-bold text-slate-600">{getInitials(r.assigned_user.full_name)}</div>
                          <span className="text-gray-700 whitespace-nowrap">{r.assigned_user.full_name}</span>
                        </div>
                      ) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-5 py-3.5 text-gray-600">{r.description || <span className="text-gray-300">—</span>}</td>
                    <td className="px-5 py-3.5 whitespace-nowrap text-gray-700">{formatDate(r.tour_date)}</td>
                    <td className="px-5 py-3.5 whitespace-nowrap text-gray-700">{formatDate(r.tour_end_date)}</td>
                    <td className="px-5 py-3.5 text-right font-bold text-emerald-700">{r.actual_value ? formatVND(r.actual_value) : <span className="text-gray-300">—</span>}</td>
                    <td className="px-5 py-3.5 text-right text-gray-500">{r.estimated_value ? formatVND(r.estimated_value) : <span className="text-gray-300">—</span>}</td>
                    <td className="px-5 py-3.5 text-right">
                      {hasDiff ? (
                        <span className={`text-xs font-semibold ${diff >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                          {diff >= 0 ? '+' : ''}{formatVND(diff)}
                        </span>
                      ) : <span className="text-gray-300">—</span>}
                    </td>
                  </tr>
                )
              })}
              {/* Footer tổng */}
              <tr className="bg-gray-50 border-t-2 border-gray-200">
                <td colSpan={5} className="px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">{rows.length} đơn</td>
                <td className="px-5 py-3 text-right font-bold text-emerald-700">{formatVND(totalActual)}</td>
                <td className="px-5 py-3 text-right font-semibold text-gray-500">{formatVND(totalEst)}</td>
                <td className="px-5 py-3 text-right">
                  {totalActual > 0 && totalEst > 0 && (
                    <span className={`text-xs font-bold ${totalActual >= totalEst ? 'text-emerald-600' : 'text-red-500'}`}>
                      {totalActual >= totalEst ? '+' : ''}{formatVND(totalActual - totalEst)}
                    </span>
                  )}
                </td>
              </tr>
            </>
          )}
        </tbody>
      </table>
    </div>
  )
}
