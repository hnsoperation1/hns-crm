'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { ChevronRight, X, Eye } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useTopbar } from '@/contexts/topbar'
import { STAGE_LABELS, STAGE_COLORS, SOURCE_LABELS, SOURCE_COLORS, formatDate, formatVND, getInitials, daysUntil, ROLE_LABELS } from '@/lib/utils'
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

type UserOpt = { id: string; full_name: string; role: string }

const SOURCES = Object.entries(SOURCE_LABELS) as [LeadSource, string][]

export default function DangThucHienPage() {
  const { setOnRefresh, setBreadcrumb } = useTopbar()
  const supabase = createClient()

  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState<UserOpt[]>([])
  const [filterSource, setFilterSource] = useState('')
  const [filterSaleTV, setFilterSaleTV] = useState('')
  const [filterCreator, setFilterCreator] = useState('')
  const [slideRow, setSlideRow] = useState<Row | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    const [{ data }, { data: userData }] = await Promise.all([
      supabase
        .from('opportunities')
        .select('id, title, description, stage, source, tour_date, tour_end_date, estimated_value, actual_value, contact:contacts(name, company), assigned_user:users!assigned_to(id, full_name), creator:users!created_by(id, full_name)')
        .is('deleted_at', null)
        .in('stage', ['stage_1', 'stage_2', 'stage_3', 'stage_4'])
        .order('tour_date', { ascending: true }),
      supabase.from('users').select('id, full_name, role').eq('is_active', true).order('full_name'),
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
    <>
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
          {users.map(u => <option key={u.id} value={u.id}>{ROLE_LABELS[u.role] ?? u.role} - {u.full_name}</option>)}
        </select>
        <select value={filterCreator} onChange={e => setFilterCreator(e.target.value)}
          className="text-xs border border-gray-200 rounded-xl px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-400 min-w-[150px]">
          <option value="">Tất cả người tạo</option>
          {users.map(u => <option key={u.id} value={u.id}>{ROLE_LABELS[u.role] ?? u.role} - {u.full_name}</option>)}
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
                <tr key={r.id} className="hover:bg-gray-50/70 group transition-colors cursor-pointer" onClick={() => setSlideRow(r)}>
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

    {slideRow && (
      <>
        <div className="fixed inset-0 bg-black/30 z-40" onClick={() => setSlideRow(null)} />
        <div className="fixed top-0 right-0 h-full w-[480px] bg-white shadow-2xl z-50 flex flex-col">
          <button onClick={() => setSlideRow(null)}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-full bg-white border border-gray-200 border-r-0 rounded-l-xl px-1.5 py-3 text-gray-400 hover:text-gray-700 hover:bg-gray-50 shadow-sm transition-colors">
            <ChevronRight size={16} />
          </button>
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-gray-900 truncate">{slideRow.title}</h2>
                {(() => { const sc = STAGE_COLORS[slideRow.stage]; return <span className={`flex-shrink-0 inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${sc.bg} ${sc.text}`}>{STAGE_LABELS[slideRow.stage]}</span> })()}
              </div>
              <p className="text-xs text-gray-400 mt-0.5">{slideRow.contact?.company ?? slideRow.contact?.name ?? '—'}</p>
            </div>
            <button onClick={() => setSlideRow(null)} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 flex-shrink-0 ml-2"><X size={18} /></button>
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
            {[
              { label: 'Liên hệ', value: slideRow.contact?.name ?? '—' },
              { label: 'Nguồn', value: slideRow.source ? (SOURCE_LABELS[slideRow.source] ?? slideRow.source) : '—' },
              { label: 'Sale phụ trách', value: slideRow.assigned_user?.full_name ?? 'Chờ phân công' },
              { label: 'Điểm đến / Mô tả', value: slideRow.description ?? '—' },
              { label: 'Ngày đi', value: formatDate(slideRow.tour_date) || '—' },
              { label: 'Ngày về', value: formatDate(slideRow.tour_end_date) || '—' },
              { label: 'Giá trị ước tính', value: slideRow.estimated_value ? formatVND(slideRow.estimated_value) : '—' },
              { label: 'Người tạo', value: slideRow.creator?.full_name ?? '—' },
            ].map(({ label, value }) => (
              <div key={label} className="flex gap-3">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider w-36 flex-shrink-0 pt-0.5">{label}</span>
                <span className="text-sm text-gray-800">{value}</span>
              </div>
            ))}
          </div>
          <div className="px-6 py-4 border-t border-gray-200 flex-shrink-0">
            <Link href={`/don-hang/${slideRow.id}`}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-brand-600 font-medium transition-colors">
              <Eye size={14} /> Xem chi tiết đầy đủ
            </Link>
          </div>
        </div>
      </>
    )}
    </>
  )
}
