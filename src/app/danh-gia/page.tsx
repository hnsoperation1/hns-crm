'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import Link from 'next/link'
import { Star, ThumbsUp, ThumbsDown, Search, ChevronDown, ChevronUp, ExternalLink, X, MapPin, Users, Link2, CheckSquare } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, Legend } from 'recharts'
import { createClient } from '@/lib/supabase/client'
import { formatDate } from '@/lib/utils'
import DateInput from '@/components/DateInput'
import { useTopbar } from '@/contexts/topbar'

type FeedbackRow = {
  id: string
  opportunity_id: string | null
  submitted_at: string
  group_name: string | null
  respondent_name: string | null
  phone: string | null
  itinerary: string | null
  rating_restaurant_space: string | null
  rating_restaurant_food: string | null
  rating_restaurant_service: string | null
  rating_restaurant_price: string | null
  rating_guide_attitude: string | null
  rating_guide_skill: string | null
  rating_guide_knowledge: string | null
  rating_transport_quality: string | null
  rating_transport_safety: string | null
  rating_transport_driver: string | null
  rating_staff_attitude: string | null
  rating_staff_skill: string | null
  rating_staff_knowledge: string | null
  rating_hotel: string | null
  rating_teambuilding: string | null
  rating_gala: string | null
  rating_conference: string | null
  rating_flight_support: string | null
  rating_flight_attitude: string | null
  rating_flight_handling: string | null
  overall_comment: string | null
  is_satisfied: boolean | null
  will_return: boolean | null
  next_destination: string | null
  opportunity?: { title: string } | null
}

const RATING_FIELDS: { key: keyof FeedbackRow; label: string }[] = [
  { key: 'rating_restaurant_space',   label: 'Nhà hàng · Không gian' },
  { key: 'rating_restaurant_food',    label: 'Nhà hàng · Ẩm thực' },
  { key: 'rating_restaurant_service', label: 'Nhà hàng · Thái độ phục vụ' },
  { key: 'rating_restaurant_price',   label: 'Nhà hàng · Giá cả' },
  { key: 'rating_guide_attitude',     label: 'HDV · Thái độ' },
  { key: 'rating_guide_skill',        label: 'HDV · Nghiệp vụ' },
  { key: 'rating_guide_knowledge',    label: 'HDV · Kiến thức' },
  { key: 'rating_transport_quality',  label: 'Phương tiện · Chất lượng xe' },
  { key: 'rating_transport_safety',   label: 'Phương tiện · An toàn' },
  { key: 'rating_transport_driver',   label: 'Phương tiện · Thái độ tài xế' },
  { key: 'rating_staff_attitude',     label: 'Nhân viên TV · Thái độ' },
  { key: 'rating_staff_skill',        label: 'Nhân viên TV · Nghiệp vụ' },
  { key: 'rating_staff_knowledge',    label: 'Nhân viên TV · Kiến thức' },
  { key: 'rating_hotel',              label: 'Khách sạn' },
  { key: 'rating_flight_support',     label: 'Vé máy bay · Hỗ trợ' },
  { key: 'rating_flight_attitude',    label: 'Vé máy bay · Thái độ' },
  { key: 'rating_flight_handling',    label: 'Vé máy bay · Xử lý tình huống' },
  { key: 'rating_teambuilding',       label: 'Teambuilding' },
  { key: 'rating_gala',               label: 'Gala dinner' },
  { key: 'rating_conference',         label: 'Hội nghị' },
]

const GROUP_ORDER = ['Nhà hàng', 'HDV', 'Phương tiện', 'Nhân viên TV', 'Khách sạn', 'Vé máy bay', 'Teambuilding', 'Gala dinner', 'Hội nghị']

const RATING_COLOR: Record<string, string> = {
  'Rất tốt': 'bg-emerald-100 text-emerald-700',
  'Tốt': 'bg-blue-100 text-blue-700',
  'Trung bình': 'bg-amber-100 text-amber-700',
  'Kém': 'bg-red-100 text-red-700',
}

function RatingBadge({ value }: { value: string | null }) {
  if (!value) return <span className="text-gray-300 text-xs">—</span>
  return <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${RATING_COLOR[value] ?? 'bg-gray-100 text-gray-500'}`}>{value}</span>
}

function StarRow({ label, value }: { label: string; value: string | null }) {
  if (!value) return null
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
      <span className="text-xs text-gray-500">{label}</span>
      <RatingBadge value={value} />
    </div>
  )
}

type SelectedList = { title: string; entries: FeedbackRow[] } | null

function CustomerList({ data, onClose }: { data: SelectedList; onClose: () => void }) {
  if (!data) return (
    <div className="flex-1 flex flex-col items-center justify-center text-center py-16 text-gray-300">
      <Users size={36} className="mb-3" />
      <p className="text-sm">Bấm vào một mục để xem danh sách khách</p>
    </div>
  )
  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div>
          <p className="font-semibold text-gray-900 text-sm">{data.title}</p>
          <p className="text-xs text-gray-400 mt-0.5">{data.entries.length} khách</p>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg text-gray-400 transition-colors"><X size={14} /></button>
      </div>
      <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
        {data.entries.map((f, i) => (
          <div key={i} className="px-4 py-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-semibold text-sm text-gray-900">{f.respondent_name ?? '—'}</p>
                {f.phone && <p className="text-xs text-gray-500 mt-0.5">{f.phone}</p>}
                {f.group_name && <p className="text-xs text-gray-400 mt-0.5 truncate">Đoàn: {f.group_name}</p>}
                {f.overall_comment && <p className="text-xs text-gray-500 mt-1 italic line-clamp-2">"{f.overall_comment}"</p>}
              </div>
              {f.opportunity_id && (
                <Link href={`/co-hoi/${f.opportunity_id}`} className="flex-shrink-0 text-xs text-brand-600 hover:underline flex items-center gap-0.5 mt-0.5">
                  <ExternalLink size={11} /> Đơn
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function DanhGiaPage() {
  const supabase = createClient()
  const { setOnRefresh } = useTopbar()
  const [list, setList] = useState<FeedbackRow[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'all' | 'poor' | 'destination' | 'summary'>('all')
  const [selectedOppSummary, setSelectedOppSummary] = useState<string | null>(null)
  const [dateFrom, setDateFrom] = useState(() => `${new Date().getFullYear()}-01-01`)
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().slice(0, 10))
  const [search, setSearch] = useState('')
  const [filterSatisfied, setFilterSatisfied] = useState<'all' | 'satisfied' | 'unsatisfied' | 'return'>('all')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [selected, setSelected] = useState<SelectedList>(null)
  // multi-select + link to opportunity
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set())
  const [linkModal, setLinkModal] = useState(false)
  const [oppSearch, setOppSearch] = useState('')
  const [oppResults, setOppResults] = useState<{ id: string; title: string; tour_date: string | null }[]>([])
  const [oppSearching, setOppSearching] = useState(false)
  const [linking, setLinking] = useState(false)
  const oppSearchRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const loadData = useCallback(() => {
    setLoading(true)
    supabase.from('feedback').select('*, opportunity:opportunities(title)').order('submitted_at', { ascending: false })
      .then(({ data }) => { setList((data ?? []) as FeedbackRow[]); setLoading(false) })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    loadData()
    setOnRefresh(loadData)
    return () => setOnRefresh(null)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Debounce search opportunities
  useEffect(() => {
    if (!linkModal) return
    if (oppSearchRef.current) clearTimeout(oppSearchRef.current)
    if (!oppSearch.trim()) { setOppResults([]); return }
    oppSearchRef.current = setTimeout(async () => {
      setOppSearching(true)
      const { data } = await supabase.from('opportunities').select('id, title, tour_date')
        .ilike('title', `%${oppSearch.trim()}%`).order('created_at', { ascending: false }).limit(20)
      setOppResults((data ?? []) as { id: string; title: string; tour_date: string | null }[])
      setOppSearching(false)
    }, 300)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [oppSearch, linkModal])

  async function handleLinkOpp(oppId: string, oppTitle: string) {
    setLinking(true)
    const ids = Array.from(checkedIds)
    const res = await fetch('/api/feedback/link-opportunity', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ feedbackIds: ids, opportunityId: oppId }),
    })
    setLinking(false)
    if (!res.ok) {
      const { error } = await res.json()
      alert('Lỗi: ' + error)
      return
    }
    setLinkModal(false)
    setOppSearch('')
    setOppResults([])
    setCheckedIds(new Set())
    loadData()
  }

  function toggleCheck(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    setCheckedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleCheckAll() {
    if (checkedIds.size === listFiltered.length) {
      setCheckedIds(new Set())
    } else {
      setCheckedIds(new Set(listFiltered.map(f => f.id)))
    }
  }

  // Apply date filter
  const dateFiltered = list.filter(f => {
    const d = f.submitted_at?.slice(0, 10) ?? ''
    if (dateFrom && d < dateFrom) return false
    if (dateTo && d > dateTo) return false
    return true
  })

  const total = dateFiltered.length
  const satisfied = dateFiltered.filter(f => f.is_satisfied === true).length
  const willReturn = dateFiltered.filter(f => f.will_return === true).length

  // Chart 1 data
  const poorData = RATING_FIELDS
    .map(f => ({
      name: f.label,
      key: f.key,
      group: f.label.includes(' · ') ? f.label.split(' · ')[0] : f.label,
      count: dateFiltered.filter(row => row[f.key] === 'Kém').length,
    }))
    .filter(d => d.count > 0)
    .sort((a, b) => {
      const ga = GROUP_ORDER.indexOf(a.group)
      const gb = GROUP_ORDER.indexOf(b.group)
      if (ga !== gb) return (ga === -1 ? 999 : ga) - (gb === -1 ? 999 : gb)
      return b.count - a.count
    })

  // Chart 2 data
  const destMap: Record<string, number> = {}
  dateFiltered.forEach(f => {
    if (f.next_destination?.trim()) {
      const d = f.next_destination.trim()
      destMap[d] = (destMap[d] ?? 0) + 1
    }
  })
  const destData = Object.entries(destMap).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count)

  // Tab "Theo đơn hàng" — group feedbacks by opportunity
  const oppGroups = useMemo(() => {
    const map: Record<string, { id: string; title: string; feedbacks: FeedbackRow[] }> = {}
    dateFiltered.forEach(f => {
      if (!f.opportunity_id) return
      if (!map[f.opportunity_id]) map[f.opportunity_id] = { id: f.opportunity_id, title: f.opportunity?.title ?? f.opportunity_id, feedbacks: [] }
      map[f.opportunity_id].feedbacks.push(f)
    })
    return Object.values(map).sort((a, b) => b.feedbacks.length - a.feedbacks.length)
  }, [dateFiltered])

  const RATING_VALUES = ['Kém', 'Trung bình', 'Tốt', 'Rất tốt'] as const
  const RATING_COLORS: Record<string, string> = { 'Kém': '#ef4444', 'Trung bình': '#f59e0b', 'Tốt': '#3b82f6', 'Rất tốt': '#10b981' }

  const summaryChartData = useMemo(() => {
    const group = oppGroups.find(g => g.id === selectedOppSummary)
    if (!group) return []
    return RATING_FIELDS
      .map(f => {
        const counts: Record<string, number> = { 'Kém': 0, 'Trung bình': 0, 'Tốt': 0, 'Rất tốt': 0 }
        group.feedbacks.forEach(fb => { const v = fb[f.key] as string | null; if (v && v in counts) counts[v]++ })
        const total = Object.values(counts).reduce((a, b) => a + b, 0)
        if (total === 0) return null
        return { name: f.label, ...counts, total }
      })
      .filter(Boolean) as ({ name: string; total: number } & Record<string, number>)[]
  }, [selectedOppSummary, oppGroups])

  function handlePoorClick(entry: { key: string; name: string }) {
    const matches = dateFiltered.filter(row => (row as any)[entry.key] === 'Kém')
    setSelected({ title: `Đánh giá Kém · ${entry.name}`, entries: matches })
  }

  function handleDestClick(entry: { name: string }) {
    const matches = dateFiltered.filter(f => f.next_destination?.trim() === entry.name)
    setSelected({ title: `Quan tâm · ${entry.name}`, entries: matches })
  }

  const listFiltered = dateFiltered.filter(f => {
    const q = search.toLowerCase()
    const matchSearch = !q || (f.group_name ?? '').toLowerCase().includes(q)
      || (f.respondent_name ?? '').toLowerCase().includes(q)
      || (f.itinerary ?? '').toLowerCase().includes(q)
    const matchFilter =
      filterSatisfied === 'all' ? true :
      filterSatisfied === 'satisfied' ? f.is_satisfied === true :
      filterSatisfied === 'unsatisfied' ? f.is_satisfied === false :
      filterSatisfied === 'return' ? f.will_return === true : true
    return matchSearch && matchFilter
  })

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-gray-50/80">
      {/* Top bar: stats + date filter */}
      <div className="flex-shrink-0 px-5 pt-5 pb-3 space-y-3">
        <div className="flex items-center gap-3">
          <div className="grid grid-cols-3 gap-3 flex-1">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm px-5 py-3.5">
              <p className="text-xs text-gray-400 font-medium mb-0.5">Tổng đánh giá</p>
              <p className="text-2xl font-black text-gray-900">{total}</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm px-5 py-3.5">
              <p className="text-xs text-gray-400 font-medium mb-0.5">Hài lòng</p>
              <p className="text-2xl font-black text-emerald-600">{satisfied}<span className="text-sm font-semibold text-gray-400 ml-1">/ {total}</span></p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm px-5 py-3.5">
              <p className="text-xs text-gray-400 font-medium mb-0.5">Sẽ quay lại</p>
              <p className="text-2xl font-black text-brand-600">{willReturn}<span className="text-sm font-semibold text-gray-400 ml-1">/ {total}</span></p>
            </div>
          </div>
          {/* Date filter */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm px-4 py-3 flex items-center gap-3">
            <span className="text-xs text-gray-400 font-medium whitespace-nowrap">Từ ngày</span>
            <DateInput value={dateFrom} onChange={v => { setDateFrom(v); setSelected(null) }} />
            <span className="text-xs text-gray-400">đến</span>
            <DateInput value={dateTo} onChange={v => { setDateTo(v); setSelected(null) }} />
            {(dateFrom || dateTo) && (
              <button onClick={() => { setDateFrom(''); setDateTo('') }} className="text-xs text-gray-400 hover:text-gray-600 font-medium">Xoá</button>
            )}
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-2xl p-1 shadow-sm w-fit">
          {([
            { key: 'all', label: 'Tất cả đánh giá' },
            { key: 'poor', label: 'Đánh giá kém' },
            { key: 'destination', label: 'Địa điểm quan tâm' },
            { key: 'summary', label: 'Theo đơn hàng' },
          ] as const).map(t => (
            <button key={t.key} onClick={() => { setTab(t.key); setSelected(null) }}
              className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all ${tab === t.key ? 'bg-accent-500 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden px-5 pb-5">

        {/* ── Tab: Tất cả đánh giá ── */}
        {tab === 'all' && (
          <div className="h-full flex flex-col gap-3 overflow-hidden">
            <div className="flex items-center gap-3 flex-shrink-0">
              <div className="relative flex-1 max-w-xs">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm theo tên đoàn, hành trình..."
                  className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 bg-white shadow-sm" />
              </div>
              {(['all', 'satisfied', 'unsatisfied', 'return'] as const).map(f => (
                <button key={f} onClick={() => setFilterSatisfied(f)}
                  className={`px-3.5 py-2 rounded-xl text-sm font-semibold transition-colors border ${filterSatisfied === f ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}>
                  {f === 'all' ? 'Tất cả' : f === 'satisfied' ? '😊 Hài lòng' : f === 'unsatisfied' ? '😞 Không hài lòng' : '🔁 Sẽ quay lại'}
                </button>
              ))}
              {/* Select all toggle */}
              {!loading && listFiltered.length > 0 && (
                <button onClick={toggleCheckAll}
                  className={`ml-auto flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-colors ${checkedIds.size > 0 ? 'bg-brand-50 border-brand-300 text-brand-700' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
                  <CheckSquare size={13} />
                  {checkedIds.size > 0 ? `Đã chọn ${checkedIds.size}` : 'Chọn nhiều'}
                </button>
              )}
            </div>
            <div className="flex-1 overflow-y-auto bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              {loading ? (
                <div className="divide-y divide-gray-100">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="px-5 py-4 animate-pulse space-y-2">
                      <div className="flex items-center gap-3">
                        <div className="h-3.5 bg-gray-100 rounded w-32" />
                        <div className="h-3 bg-gray-100 rounded w-20" />
                        <div className="h-5 bg-gray-100 rounded-full w-16" />
                      </div>
                      <div className="h-3 bg-gray-100 rounded w-48" />
                      <div className="h-3 bg-gray-100 rounded w-64" />
                    </div>
                  ))}
                </div>
              ) : listFiltered.length === 0 ? (
                <div className="py-16 text-center"><Star size={36} className="text-gray-200 mx-auto mb-3" /><p className="text-sm text-gray-400">Chưa có đánh giá nào</p></div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {listFiltered.map(f => (
                    <div key={f.id} className={checkedIds.has(f.id) ? 'bg-brand-50/40' : ''}>
                      <div className="px-5 py-4 hover:bg-gray-50/70 transition-colors cursor-pointer" onClick={() => setExpanded(expanded === f.id ? null : f.id)}>
                        <div className="flex items-start gap-4">
                          {/* Checkbox */}
                          <div className="pt-0.5 flex-shrink-0" onClick={e => toggleCheck(f.id, e)}>
                            <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${checkedIds.has(f.id) ? 'bg-brand-600 border-brand-600' : 'border-gray-300 hover:border-brand-400'}`}>
                              {checkedIds.has(f.id) && <svg viewBox="0 0 10 8" className="w-2.5 h-2 fill-white"><path d="M1 4l2.5 2.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>}
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-gray-900 text-sm">{f.respondent_name ?? '—'}</span>
                              {f.phone && <span className="text-xs text-gray-400">{f.phone}</span>}
                              {f.is_satisfied === true && <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600">Hài lòng</span>}
                              {f.is_satisfied === false && <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-500">Không hài lòng</span>}
                              {f.will_return === true && <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">Sẽ quay lại</span>}
                            </div>
                            <div className="flex items-center gap-3 mt-1 flex-wrap">
                              {f.group_name && <span className="text-xs text-gray-500">Đoàn: <span className="font-medium text-gray-700">{f.group_name}</span></span>}
                              {f.opportunity_id && (
                                <Link href={`/co-hoi/${f.opportunity_id}`} onClick={e => e.stopPropagation()} className="text-xs text-brand-600 hover:underline flex items-center gap-0.5">
                                  <ExternalLink size={10} /> Xem đơn
                                </Link>
                              )}
                              {f.itinerary && <span className="text-xs text-gray-400 truncate max-w-[200px]">{f.itinerary}</span>}
                            </div>
                          </div>
                          <div className="flex items-center gap-3 flex-shrink-0">
                            <span className="text-xs text-gray-400">{formatDate(f.submitted_at)}</span>
                            {expanded === f.id ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
                          </div>
                        </div>
                        {f.overall_comment && <p className="text-xs text-gray-500 mt-2 italic line-clamp-1">"{f.overall_comment}"</p>}
                      </div>
                      {expanded === f.id && (
                        <div className="px-5 pb-5 bg-gray-50/50 border-t border-gray-100">
                          <div className="grid grid-cols-4 gap-4 pt-4">
                            {(f.rating_restaurant_space || f.rating_restaurant_food || f.rating_restaurant_service || f.rating_restaurant_price) && (
                              <div className="bg-white rounded-xl border border-gray-100 p-4">
                                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Nhà hàng</p>
                                <StarRow label="Không gian" value={f.rating_restaurant_space} />
                                <StarRow label="Ẩm thực" value={f.rating_restaurant_food} />
                                <StarRow label="Thái độ phục vụ" value={f.rating_restaurant_service} />
                                <StarRow label="Giá cả" value={f.rating_restaurant_price} />
                              </div>
                            )}
                            {(f.rating_guide_attitude || f.rating_guide_skill || f.rating_guide_knowledge) && (
                              <div className="bg-white rounded-xl border border-gray-100 p-4">
                                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Hướng dẫn viên</p>
                                <StarRow label="Thái độ" value={f.rating_guide_attitude} />
                                <StarRow label="Nghiệp vụ" value={f.rating_guide_skill} />
                                <StarRow label="Kiến thức" value={f.rating_guide_knowledge} />
                              </div>
                            )}
                            {(f.rating_transport_quality || f.rating_transport_safety || f.rating_transport_driver) && (
                              <div className="bg-white rounded-xl border border-gray-100 p-4">
                                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Phương tiện</p>
                                <StarRow label="Chất lượng xe" value={f.rating_transport_quality} />
                                <StarRow label="An toàn" value={f.rating_transport_safety} />
                                <StarRow label="Thái độ tài xế" value={f.rating_transport_driver} />
                              </div>
                            )}
                            {(f.rating_staff_attitude || f.rating_staff_skill || f.rating_staff_knowledge) && (
                              <div className="bg-white rounded-xl border border-gray-100 p-4">
                                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Nhân viên tư vấn</p>
                                <StarRow label="Thái độ" value={f.rating_staff_attitude} />
                                <StarRow label="Nghiệp vụ" value={f.rating_staff_skill} />
                                <StarRow label="Kiến thức" value={f.rating_staff_knowledge} />
                              </div>
                            )}
                            {f.rating_hotel && (
                              <div className="bg-white rounded-xl border border-gray-100 p-4">
                                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Khách sạn</p>
                                <StarRow label="Đánh giá" value={f.rating_hotel} />
                              </div>
                            )}
                            {(f.rating_flight_support || f.rating_flight_attitude || f.rating_flight_handling) && (
                              <div className="bg-white rounded-xl border border-gray-100 p-4">
                                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Vé máy bay</p>
                                <StarRow label="Hỗ trợ chuyên môn" value={f.rating_flight_support} />
                                <StarRow label="Thái độ tư vấn" value={f.rating_flight_attitude} />
                                <StarRow label="Xử lý tình huống" value={f.rating_flight_handling} />
                              </div>
                            )}
                          </div>
                          <div className="mt-4 bg-white rounded-xl border border-gray-100 p-4 space-y-2">
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Tổng kết</p>
                            {f.overall_comment && <p className="text-sm text-gray-700 italic">"{f.overall_comment}"</p>}
                            <div className="flex items-center gap-4 pt-1">
                              <div className="flex items-center gap-1.5">
                                {f.is_satisfied ? <ThumbsUp size={14} className="text-emerald-500" /> : <ThumbsDown size={14} className="text-red-400" />}
                                <span className="text-xs text-gray-600">{f.is_satisfied ? 'Hài lòng' : 'Không hài lòng'}</span>
                              </div>
                              {f.will_return !== null && (
                                <div className="flex items-center gap-1.5">
                                  {f.will_return ? <ThumbsUp size={14} className="text-blue-500" /> : <ThumbsDown size={14} className="text-gray-400" />}
                                  <span className="text-xs text-gray-600">{f.will_return ? 'Sẽ quay lại' : 'Không quay lại'}</span>
                                </div>
                              )}
                              {f.next_destination && <span className="text-xs text-gray-500">Quan tâm: <span className="font-medium text-brand-600">{f.next_destination}</span></span>}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}

        {/* ── Tab: Đánh giá kém ── */}
        {tab === 'poor' && (
          <div className="h-full grid grid-cols-2 gap-4">
            {/* Chart */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 overflow-y-auto">
              <h3 className="font-bold text-gray-900 text-sm mb-1">Các đánh giá kém</h3>
              <p className="text-xs text-gray-400 mb-4">Bấm vào tiêu chí để xem danh sách khách</p>
              {poorData.length === 0 ? (
                <div className="py-16 text-center text-sm text-gray-300">Không có đánh giá Kém nào</div>
              ) : (
                <ResponsiveContainer width="100%" height={Math.max(poorData.length * 38, 120)}>
                  <BarChart data={poorData} layout="vertical" margin={{ left: 8, right: 32, top: 0, bottom: 0 }}>
                    <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                    <YAxis type="category" dataKey="name" width={180} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v) => [`${v} lượt`, 'Đánh giá Kém']} offset={16} />
                    <Bar dataKey="count" radius={[0, 6, 6, 0]} cursor="pointer"
                      label={{ position: 'right', fontSize: 11, fill: '#6b7280' }}
                      onClick={(data: any) => handlePoorClick(data)}>
                      {poorData.map((entry, i) => (
                        <Cell key={i} fill={selected?.title.includes(entry.name) ? '#ef4444' : '#fca5a5'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
            {/* List panel */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col overflow-hidden">
              <CustomerList data={selected} onClose={() => setSelected(null)} />
            </div>
          </div>
        )}

        {/* ── Tab: Địa điểm quan tâm ── */}
        {tab === 'destination' && (
          <div className="h-full grid grid-cols-2 gap-4">
            {/* Chart */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 overflow-y-auto">
              <h3 className="font-bold text-gray-900 text-sm mb-1">Địa điểm quan tâm tiếp theo</h3>
              <p className="text-xs text-gray-400 mb-4">Bấm vào địa điểm để xem danh sách khách</p>
              {destData.length === 0 ? (
                <div className="py-16 text-center"><MapPin size={32} className="text-gray-200 mx-auto mb-3" /><p className="text-sm text-gray-300">Chưa có dữ liệu</p></div>
              ) : (
                <ResponsiveContainer width="100%" height={Math.max(destData.length * 38, 120)}>
                  <BarChart data={destData} layout="vertical" margin={{ left: 8, right: 32, top: 0, bottom: 0 }}>
                    <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                    <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v) => [`${v} khách`, 'Quan tâm']} offset={16} />
                    <Bar dataKey="count" radius={[0, 6, 6, 0]} cursor="pointer"
                      label={{ position: 'right', fontSize: 11, fill: '#6b7280' }}
                      onClick={(data: any) => handleDestClick(data)}>
                      {destData.map((entry, i) => (
                        <Cell key={i} fill={selected?.title.includes(entry.name) ? '#0ea5e9' : '#7dd3fc'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
            {/* List panel */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col overflow-hidden">
              <CustomerList data={selected} onClose={() => setSelected(null)} />
            </div>
          </div>
        )}

        {/* ── Tab: Theo đơn hàng ── */}
        {tab === 'summary' && (
          <div className="h-full grid grid-cols-[280px_1fr] gap-4 overflow-hidden">
            {/* Left: danh sách đơn */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 flex-shrink-0">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Đơn hàng có đánh giá</p>
                <p className="text-[11px] text-gray-400 mt-0.5">{oppGroups.length} đơn · {dateFiltered.filter(f => f.opportunity_id).length} phản hồi</p>
              </div>
              {oppGroups.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center py-16 text-gray-300">
                  <Star size={32} className="mb-2" />
                  <p className="text-sm">Chưa có đơn nào được gắn</p>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
                  {oppGroups.map(g => (
                    <button key={g.id} onClick={() => setSelectedOppSummary(g.id === selectedOppSummary ? null : g.id)}
                      className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${selectedOppSummary === g.id ? 'bg-brand-50 border-l-2 border-brand-600' : ''}`}>
                      <p className={`text-sm font-semibold truncate ${selectedOppSummary === g.id ? 'text-brand-700' : 'text-gray-800'}`}>{g.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] text-gray-400">{g.feedbacks.length} phản hồi</span>
                        {g.feedbacks.some(f => f.is_satisfied === false) && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-red-50 text-red-500">Có phàn nàn</span>
                        )}
                        {g.feedbacks.every(f => f.is_satisfied === true) && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600">Hài lòng</span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Right: biểu đồ */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col overflow-hidden">
              {!selectedOppSummary ? (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-300">
                  <Star size={36} className="mb-3" />
                  <p className="text-sm">Chọn một đơn hàng để xem biểu đồ</p>
                </div>
              ) : (
                <>
                  {/* Header */}
                  {(() => {
                    const g = oppGroups.find(x => x.id === selectedOppSummary)!
                    const sat = g.feedbacks.filter(f => f.is_satisfied === true).length
                    const ret = g.feedbacks.filter(f => f.will_return === true).length
                    return (
                      <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-4 flex-shrink-0">
                        <div className="flex-1 min-w-0">
                          <Link href={`/co-hoi/${g.id}`} className="font-bold text-gray-900 hover:text-brand-600 transition-colors text-sm flex items-center gap-1.5">
                            {g.title} <ExternalLink size={12} className="text-gray-400" />
                          </Link>
                          <p className="text-xs text-gray-400 mt-0.5">{g.feedbacks.length} phản hồi</p>
                        </div>
                        <div className="flex items-center gap-3 text-xs">
                          <span className="flex items-center gap-1 text-emerald-600 font-semibold"><ThumbsUp size={12} /> {sat}/{g.feedbacks.length} hài lòng</span>
                          <span className="flex items-center gap-1 text-blue-600 font-semibold"><Users size={12} /> {ret}/{g.feedbacks.length} quay lại</span>
                        </div>
                      </div>
                    )
                  })()}
                  {/* Chart */}
                  <div className="flex-1 overflow-y-auto p-5">
                    {summaryChartData.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-gray-300 text-sm">Chưa có dữ liệu tiêu chí</div>
                    ) : (
                      <>
                        {/* Legend */}
                        <div className="flex items-center gap-4 mb-4 flex-wrap">
                          {(['Kém', 'Trung bình', 'Tốt', 'Rất tốt'] as const).map(v => (
                            <div key={v} className="flex items-center gap-1.5">
                              <div className="w-3 h-3 rounded-sm" style={{ background: RATING_COLORS[v] }} />
                              <span className="text-xs text-gray-500">{v}</span>
                            </div>
                          ))}
                        </div>
                        <ResponsiveContainer width="100%" height={Math.max(summaryChartData.length * 42, 160)}>
                          <BarChart data={summaryChartData} layout="vertical" margin={{ left: 0, right: 48, top: 0, bottom: 0 }} barSize={18}>
                            <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                            <YAxis type="category" dataKey="name" width={200} tick={{ fontSize: 11 }} />
                            <Tooltip
                              formatter={(value, name) => [value ? `${value} người` : null, name]}
                              contentStyle={{ fontSize: 12, borderRadius: 10 }}
                              offset={12}
                            />
                            {(['Kém', 'Trung bình', 'Tốt', 'Rất tốt'] as const).map((v, i) => (
                              <Bar key={v} dataKey={v} stackId="a" fill={RATING_COLORS[v]}
                                radius={i === 0 ? [4, 0, 0, 4] : i === 3 ? [0, 4, 4, 0] : undefined}
                              />
                            ))}
                          </BarChart>
                        </ResponsiveContainer>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

      </div>

      {/* Action bar cố định khi có chọn */}
      {checkedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-white border border-gray-200 rounded-2xl shadow-xl px-5 py-3 flex items-center gap-4 min-w-[420px]">
          <span className="text-sm font-semibold text-gray-700">Đã chọn <span className="text-brand-600">{checkedIds.size}</span> đánh giá</span>
          <div className="flex-1" />
          <button onClick={() => setCheckedIds(new Set())} className="px-3.5 py-2 rounded-xl text-sm text-gray-500 hover:bg-gray-100 transition-colors font-medium">
            Bỏ chọn
          </button>
          <button onClick={() => { setLinkModal(true); setOppSearch('') }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 transition-colors shadow-sm">
            <Link2 size={14} /> Gắn vào đơn hàng
          </button>
        </div>
      )}

      {/* Modal gắn đơn hàng */}
      {linkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm" onClick={() => setLinkModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div>
                <p className="font-bold text-gray-900 text-sm">Gắn vào đơn hàng</p>
                <p className="text-xs text-gray-400 mt-0.5">{checkedIds.size} đánh giá sẽ được liên kết</p>
              </div>
              <button onClick={() => setLinkModal(false)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 transition-colors"><X size={16} /></button>
            </div>
            <div className="p-4">
              <div className="relative">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input autoFocus value={oppSearch} onChange={e => setOppSearch(e.target.value)}
                  placeholder="Tìm tên đơn hàng..."
                  className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 bg-gray-50" />
              </div>
            </div>
            <div className="max-h-72 overflow-y-auto border-t border-gray-100">
              {oppSearching && (
                <div className="py-8 text-center text-sm text-gray-400">Đang tìm...</div>
              )}
              {!oppSearching && oppSearch.trim() && oppResults.length === 0 && (
                <div className="py-8 text-center text-sm text-gray-400">Không tìm thấy đơn hàng nào</div>
              )}
              {!oppSearch.trim() && (
                <div className="py-8 text-center text-sm text-gray-300">Nhập tên đơn hàng để tìm kiếm</div>
              )}
              {oppResults.map(opp => (
                <button key={opp.id} onClick={() => handleLinkOpp(opp.id, opp.title)} disabled={linking}
                  className="w-full text-left px-5 py-3.5 hover:bg-brand-50 border-b border-gray-50 last:border-0 transition-colors group disabled:opacity-60">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate group-hover:text-brand-700">{opp.title}</p>
                      {opp.tour_date && <p className="text-xs text-gray-400 mt-0.5">Tour: {formatDate(opp.tour_date)}</p>}
                    </div>
                    <Link2 size={14} className="text-gray-300 group-hover:text-brand-500 flex-shrink-0 transition-colors" />
                  </div>
                </button>
              ))}
            </div>
            {linking && (
              <div className="px-5 py-3 bg-brand-50 border-t border-brand-100 text-xs text-brand-700 font-medium text-center">
                Đang lưu...
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
