'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Plus, Kanban, List, Search, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { STAGE_LABELS, STAGE_COLORS, SOURCE_LABELS, SOURCE_COLORS, formatVND, formatDate, daysUntil, getInitials } from '@/lib/utils'
import type { Opportunity, OppStage } from '@/types'
import { useAuth } from '@/contexts/auth'
import { useTopbar } from '@/contexts/topbar'

type ViewMode = 'kanban' | 'table'

type OppWithRelations = Opportunity & {
  contact: { name: string; company?: string } | null
  assigned_user: { full_name: string } | null
}

const COLUMNS: { stage: OppStage; label: string }[] = [
  { stage: 'stage_1', label: 'GĐ1 · Tư vấn' },
  { stage: 'stage_2', label: 'GĐ2 · Báo giá' },
  { stage: 'stage_3', label: 'GĐ3 · Trước tour' },
  { stage: 'stage_4', label: 'GĐ4 · Trong tour' },
  { stage: 'stage_5', label: 'GĐ5 · Sau tour' },
  { stage: 'lost', label: 'Mất đơn' },
]

const GROUP_STAGES: Record<string, OppStage[]> = {
  collecting: ['stage_1', 'stage_2'],
  processing: ['stage_3', 'stage_4'],
  done: ['stage_5'],
}

const GROUP_LABELS: Record<string, string> = {
  collecting: 'Đang lấy thông tin',
  processing: 'Đang thực hiện',
  done: 'Đã xong',
}

export function PipelineView() {
  const { user } = useAuth()
  const { setOnRefresh } = useTopbar()
  const supabase = createClient()
  const router = useRouter()
  const searchParams = useSearchParams()
  const group = searchParams.get('group') as keyof typeof GROUP_STAGES | null
  const groupStages = group ? GROUP_STAGES[group] : null
  const [view, setView] = useState<ViewMode>('table')
  const [opps, setOpps] = useState<OppWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showDrop, setShowDrop] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dragOverStage, setDragOverStage] = useState<OppStage | null>(null)
  const [stageFilter, setStageFilter] = useState<OppStage | 'all'>('all')

  const canDrag = user?.is_super_admin === true

  async function handleDrop(targetStage: OppStage) {
    if (!draggingId || !canDrag) return
    const opp = opps.find(o => o.id === draggingId)
    if (!opp || opp.stage === targetStage) return
    const savedId = draggingId
    setOpps(prev => prev.map(o => o.id === savedId ? { ...o, stage: targetStage } : o))
    setDraggingId(null)
    setDragOverStage(null)
    const { error } = await supabase
      .from('opportunities')
      .update({ stage: targetStage, stage_updated_at: new Date().toISOString() })
      .eq('id', savedId)
    if (error) {
      setOpps(prev => prev.map(o => o.id === savedId ? { ...o, stage: opp.stage } : o))
    }
  }

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowDrop(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const loadData = useCallback(() => {
    setLoading(true)
    supabase
      .from('opportunities')
      .select('*, contact:contacts(name, company), assigned_user:users!assigned_to(full_name)')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setOpps((data ?? []) as OppWithRelations[])
        setLoading(false)
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    loadData()
    setOnRefresh(loadData)
    return () => setOnRefresh(null)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const activeCount = opps.filter(o => !['lost', 'cancelled'].includes(o.stage)).length

  const filtered = opps.filter(o => {
    if (groupStages && !groupStages.includes(o.stage)) return false
    if (stageFilter !== 'all' && o.stage !== stageFilter) return false
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return o.title.toLowerCase().includes(q)
      || (o.contact?.name ?? '').toLowerCase().includes(q)
      || (o.contact?.company ?? '').toLowerCase().includes(q)
      || (o.assigned_user?.full_name ?? '').toLowerCase().includes(q)
  })

  const TableRows = () => (
    <>
      {loading ? (
        Array.from({ length: 8 }).map((_, i) => (
          <tr key={i} className="animate-pulse">
            {[40, 20, 24, 20, 16, 16, 14].map((w, j) => (
              <td key={j} className="px-5 py-4"><div className="h-3 bg-gray-100 rounded" style={{ width: `${w + (i % 3) * 5}%` }} /></td>
            ))}
          </tr>
        ))
      ) : (
        <>
          {filtered.length === 0 && (
            <tr><td colSpan={7} className="px-5 py-12 text-center text-gray-400">Không có đơn nào</td></tr>
          )}
          {filtered.map(opp => {
            const sc = STAGE_COLORS[opp.stage]
            const deadline = opp.deadline ? daysUntil(opp.deadline) : null
            return (
              <tr key={opp.id} className="hover:bg-gray-50/70 group transition-colors cursor-pointer" onClick={() => router.push(`/don-hang/${opp.id}`)}>
                <td className="px-5 py-3.5">
                  <div className="font-semibold text-gray-900 group-hover:text-brand-700 transition-colors">{opp.title}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{opp.contact?.company ?? opp.contact?.name}</div>
                </td>
                <td className="px-5 py-3.5">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${SOURCE_COLORS[opp.source]}`}>{SOURCE_LABELS[opp.source]}</span>
                </td>
                <td className="px-5 py-3.5">
                  <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${sc.bg} ${sc.text}`}>{STAGE_LABELS[opp.stage]}</span>
                </td>
                <td className="px-5 py-3.5">
                  {!opp.assigned_to ? (
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Chờ phân công</span>
                  ) : opp.assigned_user ? (
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-slate-200 rounded-full flex items-center justify-center text-[10px] font-bold text-slate-600">{getInitials(opp.assigned_user.full_name)}</div>
                      <span className="text-gray-700 whitespace-nowrap">{opp.assigned_user.full_name}</span>
                    </div>
                  ) : null}
                </td>
                <td className="px-5 py-3.5 text-right">
                  <span className="font-semibold text-gray-900 whitespace-nowrap">{opp.estimated_value ? formatVND(opp.estimated_value) : '—'}</span>
                </td>
                <td className="px-5 py-3.5 text-gray-500 whitespace-nowrap">{opp.tour_date ? formatDate(opp.tour_date) : '—'}</td>
                <td className="px-5 py-3.5">
                  {opp.deadline ? (
                    <span className={`text-xs font-medium whitespace-nowrap ${deadline !== null && deadline < 0 ? 'text-red-600' : deadline !== null && deadline <= 7 ? 'text-amber-600' : 'text-gray-500'}`}>
                      {formatDate(opp.deadline)}{deadline !== null && deadline >= 0 && deadline <= 7 && ` · ${deadline}N`}
                    </span>
                  ) : <span className="text-gray-300">—</span>}
                </td>
              </tr>
            )
          })}
        </>
      )}
    </>
  )

  const TableHead = () => (
    <tr className="bg-gray-50 border-b border-gray-200">
      {['Đơn hàng', 'Nguồn', 'Giai đoạn', 'Sale TV', 'Giá trị', 'Ngày tour', 'Deadline'].map(h => (
        <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
      ))}
    </tr>
  )

  if (group) {
    return (
      <div className="overflow-y-auto bg-white" style={{ height: 'calc(100vh - 40px)' }}>
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10">
            <TableHead />
          </thead>
          <tbody className="divide-y divide-gray-100">
            <TableRows />
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 40px)' }}>
      {/* Header */}
      <div className="flex flex-col gap-0 border-b border-gray-200 bg-white flex-shrink-0">
        <div className="flex items-center justify-between px-6 pt-4 pb-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Đơn hàng</h1>
            <p className="text-sm text-gray-400 mt-0.5">{activeCount} đơn đang xử lý</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative" ref={searchRef}>
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 z-10" />
              <input
                value={search}
                onChange={e => { setSearch(e.target.value); setShowDrop(true) }}
                onFocus={() => setShowDrop(true)}
                placeholder="Tìm đơn, khách hàng, sale..."
                className="pl-9 pr-8 py-2 w-72 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 bg-white shadow-sm"
              />
              {search && (
                <button onClick={() => { setSearch(''); setShowDrop(false) }} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500">
                  <X size={13} />
                </button>
              )}
              {showDrop && search.trim() && filtered.length > 0 && (
                <div className="absolute top-full left-0 mt-1.5 w-full min-w-[380px] bg-white border border-gray-200 rounded-2xl shadow-xl z-50 overflow-hidden">
                  <div className="py-1 max-h-80 overflow-y-auto divide-y divide-gray-50">
                    {filtered.slice(0, 10).map(opp => {
                      const sc = STAGE_COLORS[opp.stage]
                      return (
                        <Link key={opp.id} href={`/don-hang/${opp.id}`} onClick={() => { setShowDrop(false); setSearch('') }}
                          className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
                          <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${sc.dot}`} />
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm text-gray-900 truncate">{opp.title}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-xs text-gray-400 truncate">{opp.contact?.company ?? opp.contact?.name}</span>
                              <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0 ${sc.bg} ${sc.text}`}>{STAGE_LABELS[opp.stage]}</span>
                            </div>
                          </div>
                          {opp.tour_date && <span className="text-xs text-gray-400 flex-shrink-0 mt-1">{formatDate(opp.tour_date)}</span>}
                        </Link>
                      )
                    })}
                    {filtered.length > 10 && (
                      <div className="px-4 py-2 text-xs text-gray-400 text-center">+{filtered.length - 10} kết quả khác — gõ thêm để thu hẹp</div>
                    )}
                  </div>
                </div>
              )}
              {showDrop && search.trim() && filtered.length === 0 && (
                <div className="absolute top-full left-0 mt-1.5 w-full bg-white border border-gray-200 rounded-2xl shadow-xl z-50 px-4 py-4 text-sm text-gray-400 text-center">
                  Không tìm thấy đơn nào
                </div>
              )}
            </div>
            <div className="flex items-center bg-gray-100 rounded-xl p-1 gap-0.5">
              <button onClick={() => setView('kanban')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${view === 'kanban' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                <Kanban size={15} /> Kanban
              </button>
              <button onClick={() => setView('table')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${view === 'table' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                <List size={15} /> Bảng
              </button>
            </div>
            {user?.role !== 'sale' && (
              <Link href="/don-hang/new" className="flex items-center gap-2 bg-accent-500 hover:bg-accent-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors">
                <Plus size={16} strokeWidth={2.5} /> Thêm đơn
              </Link>
            )}
          </div>
        </div>

        {/* Stage filter tabs */}
        <div className="flex items-center gap-1 px-6 pb-3 overflow-x-auto">
          {([
            { stage: 'all' as const, label: 'Tất cả', count: opps.length },
            ...COLUMNS.map(c => ({ stage: c.stage, label: c.label, count: opps.filter(o => o.stage === c.stage).length }))
          ]).map(({ stage, label, count }) => {
            const active = stageFilter === stage
            const sc = stage !== 'all' ? STAGE_COLORS[stage] : null
            return (
              <button key={stage} onClick={() => setStageFilter(stage)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border ${
                  active ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                }`}>
                {sc && <span className={`w-2 h-2 rounded-full flex-shrink-0 ${sc.dot}`} />}
                {label}
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${active ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'}`}>{count}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Kanban */}
      {view === 'kanban' && (
        <div className="flex-1 overflow-x-auto overflow-y-hidden kanban-scroll">
          <div className="flex h-full" style={{ minWidth: `${COLUMNS.length * 290}px` }}>
            {COLUMNS.map(({ stage, label }) => {
              const cards = filtered.filter(o => o.stage === stage)
              const totalValue = cards.reduce((s, o) => s + (o.estimated_value ?? 0), 0)
              const sc = STAGE_COLORS[stage]
              const isDropTarget = canDrag && dragOverStage === stage && draggingId && opps.find(o => o.id === draggingId)?.stage !== stage
              return (
                <div key={stage}
                  className={`flex flex-col border-r border-gray-200 transition-colors ${isDropTarget ? 'bg-brand-50/60' : 'bg-gray-50/70'}`}
                  style={{ width: '290px', minWidth: '290px' }}
                  onDragOver={canDrag ? e => { e.preventDefault(); setDragOverStage(stage) } : undefined}
                  onDragLeave={canDrag ? e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOverStage(null) } : undefined}
                  onDrop={canDrag ? e => { e.preventDefault(); handleDrop(stage) } : undefined}
                >
                  <div className={`px-4 py-3 border-b border-gray-200 bg-white flex-shrink-0 ${isDropTarget ? 'border-brand-300' : ''}`}>
                    <div className="flex items-center justify-between mb-0.5">
                      <div className="flex items-center gap-2">
                        <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${sc.dot}`} />
                        <span className="font-semibold text-gray-800 text-sm">{label}</span>
                      </div>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${sc.bg} ${sc.text}`}>{cards.length}</span>
                    </div>
                    {totalValue > 0 && <div className="text-xs text-gray-400 pl-5">{formatVND(totalValue)}</div>}
                  </div>
                  <div className="flex-1 overflow-y-auto p-3 pt-4 flex flex-col gap-2">
                    {isDropTarget && (
                      <div className="border-2 border-dashed border-brand-300 rounded-xl h-14 flex items-center justify-center text-xs text-brand-400 font-medium flex-shrink-0">
                        Thả vào đây
                      </div>
                    )}
                    {cards.map(opp => {
                      const deadline = opp.deadline ? daysUntil(opp.deadline) : null
                      const isUrgent = deadline !== null && deadline >= 0 && deadline <= 5
                      const isOverdue = deadline !== null && deadline < 0
                      const isDragging = draggingId === opp.id
                      return (
                        <div key={opp.id}
                          draggable={canDrag}
                          onDragStart={canDrag ? () => setDraggingId(opp.id) : undefined}
                          onDragEnd={canDrag ? () => { setDraggingId(null); setDragOverStage(null) } : undefined}
                          className={`transition-opacity ${isDragging ? 'opacity-40' : 'opacity-100'} ${canDrag ? 'cursor-grab active:cursor-grabbing' : ''}`}
                        >
                          <Link href={`/don-hang/${opp.id}`} className="block" draggable={false}>
                            <div className={`bg-white rounded-xl border p-3.5 hover:shadow-md transition-all group ${!opp.assigned_to ? 'border-amber-200' : 'border-gray-200'}`}>
                              <div className="font-semibold text-sm text-gray-900 group-hover:text-brand-700 transition-colors mb-0.5 line-clamp-2 leading-snug">{opp.title}</div>
                              <div className="text-xs text-gray-400 mb-2.5">{opp.contact?.company ?? opp.contact?.name}</div>
                              <div className="flex items-center justify-between mb-2.5">
                                <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${SOURCE_COLORS[opp.source]}`}>{SOURCE_LABELS[opp.source]}</span>
                                {opp.estimated_value && stage !== 'lost' && (
                                  <span className="text-xs font-bold text-gray-700">{formatVND(opp.estimated_value)}</span>
                                )}
                              </div>
                              <div className="flex items-center justify-between">
                                {!opp.assigned_to ? (
                                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Chờ phân công</span>
                                ) : opp.assigned_user ? (
                                  <div className="flex items-center gap-1.5">
                                    <div className="w-5 h-5 bg-slate-200 rounded-full flex items-center justify-center text-[10px] font-bold text-slate-600">{getInitials(opp.assigned_user.full_name)}</div>
                                    <span className="text-xs text-gray-500">{opp.assigned_user.full_name}</span>
                                  </div>
                                ) : null}
                                <div className="text-right">
                                  {opp.deadline && (
                                    <span className={`text-[11px] font-medium ${isOverdue ? 'text-red-600' : isUrgent ? 'text-amber-600' : 'text-gray-400'}`}>
                                      {isOverdue ? '⚠ ' : isUrgent ? '⏰ ' : ''}{formatDate(opp.deadline)}
                                    </span>
                                  )}
                                  {!opp.deadline && opp.tour_date && (
                                    <span className="text-[11px] text-gray-400">Tour {formatDate(opp.tour_date)}</span>
                                  )}
                                </div>
                              </div>
                              {stage === 'lost' && opp.lost_reason && (
                                <div className="mt-2.5 text-[11px] text-red-500 bg-red-50 rounded-lg px-2.5 py-2 line-clamp-2 leading-relaxed">{opp.lost_reason}</div>
                              )}
                            </div>
                          </Link>
                        </div>
                      )
                    })}
                    {cards.length === 0 && !isDropTarget && (
                      <div className="flex items-center justify-center h-20 text-sm text-gray-300 border-2 border-dashed border-gray-200 rounded-xl">Không có đơn</div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Table */}
      {view === 'table' && (
        <div className="flex-1 overflow-y-auto p-6">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead><TableHead /></thead>
              <tbody className="divide-y divide-gray-100"><TableRows /></tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
