'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useTopbar } from '@/contexts/topbar'
import { useAuth } from '@/contexts/auth'
import { STAGE_LABELS, STAGE_COLORS, formatDate, formatVND, daysUntil } from '@/lib/utils'
import type { OppStage } from '@/types'

type Row = {
  id: string
  title: string
  description: string | null
  stage: OppStage
  tour_date: string | null
  tour_end_date: string | null
  estimated_value: number | null
  actual_value: number | null
  contact: { name: string; company?: string } | null
}

const ALL_STAGES: OppStage[] = ['stage_1', 'stage_2', 'stage_3', 'stage_4', 'stage_5']

export default function DonHangCuaToiPage() {
  const router = useRouter()
  const { setOnRefresh, setBreadcrumb } = useTopbar()
  const { user } = useAuth()
  const supabase = createClient()
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStage, setFilterStage] = useState<OppStage | 'all'>('all')

  const loadData = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const { data } = await supabase
      .from('opportunities')
      .select('id, title, description, stage, tour_date, tour_end_date, estimated_value, actual_value, contact:contacts(name, company)')
      .is('deleted_at', null)
      .eq('assigned_to', user.id)
      .in('stage', ALL_STAGES)
      .order('tour_date', { ascending: true })
    setRows((data ?? []) as unknown as Row[])
    setLoading(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  useEffect(() => {
    setBreadcrumb('Đơn hàng của tôi')
    return () => setBreadcrumb(null)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    loadData()
    setOnRefresh(loadData)
    return () => setOnRefresh(null)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadData])

  const filtered = filterStage === 'all' ? rows : rows.filter(r => r.stage === filterStage)

  const stageCounts = ALL_STAGES.reduce((acc, s) => {
    acc[s] = rows.filter(r => r.stage === s).length
    return acc
  }, {} as Record<string, number>)

  const cols = ['Đơn hàng', 'Giai đoạn', 'Điểm đến', 'Ngày đi', 'Ngày về', 'Còn lại', 'Giá trị']

  return (
    <div className="flex flex-col h-full">
      {/* Filter tabs */}
      <div className="flex-shrink-0 px-5 pt-4 pb-3 border-b border-gray-100 flex items-center gap-1.5 flex-wrap bg-white">
        <button onClick={() => setFilterStage('all')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${filterStage === 'all' ? 'bg-brand-600 text-white shadow-sm' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
          Tất cả
          <span className={`text-[10px] px-1.5 py-0 rounded-full font-bold ${filterStage === 'all' ? 'bg-white/25' : 'bg-white text-gray-500'}`}>{rows.length}</span>
        </button>
        {ALL_STAGES.map(s => {
          const sc = STAGE_COLORS[s]
          const count = stageCounts[s]
          if (!count) return null
          return (
            <button key={s} onClick={() => setFilterStage(s)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${filterStage === s ? `${sc.bg} ${sc.text} shadow-sm` : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
              {STAGE_LABELS[s]}
              <span className={`text-[10px] px-1.5 py-0 rounded-full font-bold ${filterStage === s ? 'bg-white/30' : 'bg-white text-gray-500'}`}>{count}</span>
            </button>
          )
        })}
      </div>

      {/* Table */}
      <div className="flex-1 overflow-y-auto bg-white">
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
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  {[38, 16, 20, 12, 12, 10, 12].map((w, j) => (
                    <td key={j} className="px-5 py-4"><div className="h-3 bg-gray-100 rounded" style={{ width: `${w + (i % 3) * 4}%` }} /></td>
                  ))}
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} className="px-5 py-16 text-center text-gray-400">
                {rows.length === 0 ? 'Bạn chưa có đơn hàng nào' : 'Không có đơn ở giai đoạn này'}
              </td></tr>
            ) : filtered.map(r => {
              const sc = STAGE_COLORS[r.stage]
              const daysLeft = r.tour_date ? daysUntil(r.tour_date) : null
              const isToday = daysLeft === 0
              const isPast = daysLeft !== null && daysLeft < 0
              const isUrgent = daysLeft !== null && daysLeft > 0 && daysLeft <= 3
              return (
                <tr key={r.id} className="hover:bg-gray-50/70 group transition-colors cursor-pointer" onClick={() => router.push(`/don-hang/${r.id}`)}>
                  <td className="px-5 py-3.5">
                    <div className="font-semibold text-gray-900 group-hover:text-brand-700 transition-colors">{r.title}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{r.contact?.company ?? r.contact?.name}</div>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${sc.bg} ${sc.text}`}>{STAGE_LABELS[r.stage]}</span>
                  </td>
                  <td className="px-5 py-3.5 text-gray-600">{r.description || <span className="text-gray-300">—</span>}</td>
                  <td className="px-5 py-3.5 whitespace-nowrap text-gray-700">{formatDate(r.tour_date)}</td>
                  <td className="px-5 py-3.5 whitespace-nowrap text-gray-700">{formatDate(r.tour_end_date)}</td>
                  <td className="px-5 py-3.5 whitespace-nowrap">
                    {daysLeft === null ? <span className="text-gray-300">—</span>
                      : isToday ? <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">Hôm nay</span>
                      : isPast ? <span className="text-xs font-semibold text-gray-400">Đang diễn ra</span>
                      : isUrgent ? <span className="text-xs font-bold text-red-600">{daysLeft} ngày</span>
                      : <span className="text-xs text-gray-500">{daysLeft} ngày</span>}
                  </td>
                  <td className="px-5 py-3.5 text-right font-semibold text-gray-800">{r.estimated_value ? formatVND(r.estimated_value) : <span className="text-gray-300">—</span>}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
