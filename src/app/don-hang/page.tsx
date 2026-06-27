'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useTopbar } from '@/contexts/topbar'
import { STAGE_LABELS, STAGE_COLORS, SOURCE_LABELS, SOURCE_COLORS, formatDate, formatVND, getInitials, daysUntil } from '@/lib/utils'
import type { OppStage, LeadSource } from '@/types'

type Row = {
  id: string
  title: string
  description: string | null
  stage: OppStage
  source: LeadSource | null
  tour_date: string | null
  tour_end_date: string | null
  estimated_value: number | null
  actual_value: number | null
  contact: { name: string; company?: string } | null
  assigned_user: { id: string; full_name: string } | null
  creator: { id: string; full_name: string } | null
}

type UserOpt = { id: string; full_name: string }

const SOURCES = Object.entries(SOURCE_LABELS) as [LeadSource, string][]

export default function DangThucHienPage() {
  const router = useRouter()
  const { setOnRefresh, setBreadcrumb } = useTopbar()
  const supabase = createClient()

  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState<UserOpt[]>([])
  const [filterSource, setFilterSource] = useState('')
  const [filterSaleTV, setFilterSaleTV] = useState('')
  const [filterCreator, setFilterCreator] = useState('')

  const loadData = useCallback(async () => {
    setLoading(true)
    const [{ data }, { data: userData }] = await Promise.all([
      supabase
        .from('opportunities')
        .select('id, title, description, stage, source, tour_date, tour_end_date, estimated_value, actual_value, contact:contacts(name, company), assigned_user:users!assigned_to(id, full_name), creator:users!created_by(id, full_name)')
        .is('deleted_at', null)
        .in('stage', ['stage_3', 'stage_4'])
        .order('tour_date', { ascending: true }),
      supabase.from('users').select('id, full_name').eq('is_active', true).order('full_name'),
    ])
    setRows((data ?? []) as unknown as Row[])
    setUsers((userData ?? []) as UserOpt[])
    setLoading(false)
  }, [])

  useEffect(() => {
    setBreadcrumb('Đang thực hiện')
    loadData()
    setOnRefresh(loadData)
    return () => setOnRefresh(null)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filtered = rows.filter(r => {
    if (filterSource && r.source !== filterSource) return false
    if (filterSaleTV && r.assigned_user?.id !== filterSaleTV) return false
    if (filterCreator && r.creator?.id !== filterCreator) return false
    return true
  })

  const hasFilter = !!filterSource || !!filterSaleTV || !!filterCreator

  const cols = ['Đơn hàng', 'Giai đoạn', 'Nguồn', 'Sale TV', 'Điểm đến', 'Ngày đi', 'Ngày về', 'Còn lại', 'Giá trị']

  return (
    <div className="flex flex-col h-full">
      {/* Filter bar */}
      <div className="flex-shrink-0 px-5 py-3 border-b border-gray-100 bg-white flex items-center gap-2 flex-wrap">
        <select value={filterSource} onChange={e => setFilterSource(e.target.value)}
          className="text-xs border border-gray-200 rounded-xl px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-400 min-w-[130px]">
          <option value="">Tất cả nguồn</option>
          {SOURCES.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={filterSaleTV} onChange={e => setFilterSaleTV(e.target.value)}
          className="text-xs border border-gray-200 rounded-xl px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-400 min-w-[150px]">
          <option value="">Tất cả Sale TV</option>
          {users.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
        </select>
        <select value={filterCreator} onChange={e => setFilterCreator(e.target.value)}
          className="text-xs border border-gray-200 rounded-xl px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-400 min-w-[150px]">
          <option value="">Tất cả người tạo</option>
          {users.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
        </select>
        {hasFilter && (
          <button onClick={() => { setFilterSource(''); setFilterSaleTV(''); setFilterCreator('') }}
            className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            Xóa bộ lọc
          </button>
        )}
        <span className="ml-auto text-xs text-gray-400">{filtered.length} đơn</span>
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
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  {[38, 16, 14, 18, 20, 12, 12, 10, 12].map((w, j) => (
                    <td key={j} className="px-5 py-4"><div className="h-3 bg-gray-100 rounded" style={{ width: `${w + (i % 3) * 4}%` }} /></td>
                  ))}
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr><td colSpan={9} className="px-5 py-12 text-center text-gray-400">Không có đơn nào</td></tr>
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
                  <td className="px-5 py-3.5">
                    {r.source ? (
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${SOURCE_COLORS[r.source] ?? 'bg-gray-100 text-gray-500'}`}>
                        {SOURCE_LABELS[r.source] ?? r.source}
                      </span>
                    ) : <span className="text-gray-300">—</span>}
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
