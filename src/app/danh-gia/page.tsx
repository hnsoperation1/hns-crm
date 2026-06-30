'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import Link from 'next/link'
import { Star, ThumbsUp, ThumbsDown, Search, ExternalLink, X, MapPin, Users, ShoppingBag, ChevronRight, CheckSquare, LayoutGrid, BarChart2, List, Table2, ChevronUp, ChevronDown, ChevronsUpDown, Maximize2, Minimize2, Heart, Send } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, Legend } from 'recharts'
import { createClient } from '@/lib/supabase/client'
import { formatDate } from '@/lib/utils'
import DateInput from '@/components/DateInput'
import { useTopbar } from '@/contexts/topbar'
import { useAuth } from '@/contexts/auth'

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
  opportunity?: { title: string; tour_date: string | null; stage: string | null } | null
}

function oppHref(opportunityId: string | null, stage: string | null | undefined) {
  if (!opportunityId) return '#'
  if (stage === 'stage_5') return `/don-hang-da-xong/${opportunityId}`
  if (stage === 'stage_0') return `/don-hang-moi/${opportunityId}`
  return `/don-hang/${opportunityId}`
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

type CareCardSummary = { id: string; content: string; contact_date: string | null; is_done: boolean }
type CareLog = { id: string; log_content: string; created_at: string }

function CustomerList({ data, onClose, onExpand, expandedId, onCreateCard, careCardsMap }: {
  data: SelectedList; onClose: () => void
  onExpand: (f: FeedbackRow) => void; expandedId: string | null
  onCreateCard: (f: FeedbackRow) => void
  careCardsMap: Record<string, CareCardSummary[]>
}) {
  const [expandedCareId, setExpandedCareId] = useState<string | null>(null)
  const [selectedCard, setSelectedCard] = useState<CareCardSummary | null>(null)
  const [cardLogs, setCardLogs] = useState<CareLog[]>([])
  const [loadingLogs, setLoadingLogs] = useState(false)

  async function openCard(card: CareCardSummary) {
    setSelectedCard(card)
    setLoadingLogs(true)
    const { data: logs } = await createClient().from('care_card_logs')
      .select('id,log_content,created_at').eq('care_card_id', card.id).order('created_at')
    setCardLogs((logs ?? []) as CareLog[])
    setLoadingLogs(false)
  }

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
          <p className="text-xs text-gray-400 mt-0.5">{data.entries.length} khách · bấm để xem chi tiết</p>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg text-gray-400 transition-colors"><X size={14} /></button>
      </div>
      <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
        {data.entries.map((f, i) => {
          const cards = careCardsMap[f.id] ?? []
          const careOpen = expandedCareId === f.id
          return (
            <div key={i} onClick={() => onExpand(f)}
              className={`px-4 py-3 cursor-pointer transition-colors hover:bg-gray-50 ${expandedId === f.id ? 'bg-brand-50 border-l-2 border-brand-500' : ''}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm text-gray-900">{f.respondent_name ?? '—'}</p>
                  {f.phone && <p className="text-xs text-gray-800 mt-0.5">SĐT: {f.phone}</p>}
                  {f.group_name && <p className="text-xs text-gray-800 mt-0.5 truncate">Đoàn: {f.group_name}</p>}
                  {f.overall_comment && <p className="text-xs text-gray-800 mt-1 italic line-clamp-2">Đánh giá chung: "{f.overall_comment}"</p>}
                </div>
                {f.opportunity_id && (
                  <Link href={oppHref(f.opportunity_id, f.opportunity?.stage)} onClick={e => e.stopPropagation()}
                    className="flex-shrink-0 text-xs text-brand-600 hover:underline flex items-center gap-0.5 mt-0.5">
                    <ExternalLink size={11} /> Đơn
                  </Link>
                )}
              </div>

              {/* Bottom row */}
              <div className="mt-2 flex items-center gap-1" onClick={e => e.stopPropagation()}>
                {/* Toggle lịch sử CS */}
                <button onClick={() => setExpandedCareId(prev => prev === f.id ? null : f.id)}
                  className={`flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-lg transition-colors ${careOpen ? 'bg-pink-100 text-pink-700' : 'text-gray-400 hover:text-pink-600 hover:bg-pink-50'}`}>
                  <Heart size={10} />
                  Lịch sử CSKH
                  {cards.length > 0 && (
                    <span className={`text-[10px] px-1.5 py-0 rounded-full font-bold ${careOpen ? 'bg-pink-200 text-pink-700' : 'bg-gray-100 text-gray-500'}`}>{cards.length}</span>
                  )}
                  {careOpen ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                </button>
                <button onClick={() => onCreateCard(f)}
                  className="flex items-center gap-1 text-[11px] text-pink-500 hover:text-pink-700 font-medium px-2 py-1 rounded-lg hover:bg-pink-50 transition-colors">
                  + Tạo thẻ CSKH
                </button>
              </div>

              {/* Expandable care history */}
              {careOpen && (
                <div className="mt-2 space-y-1" onClick={e => e.stopPropagation()}>
                  {cards.length === 0 ? (
                    <p className="text-[11px] text-gray-400 px-2 py-1 italic">Chưa có thẻ chăm sóc nào</p>
                  ) : (
                    cards.map(card => (
                      <button key={card.id} onClick={() => openCard(card)}
                        className={`w-full flex items-start gap-2 px-2 py-1.5 rounded-lg text-left transition-colors group ${card.is_done ? 'bg-emerald-50 hover:bg-emerald-100' : 'hover:bg-pink-50'}`}>
                        <Heart size={10} fill={card.is_done ? 'currentColor' : 'none'} className={`mt-0.5 flex-shrink-0 ${card.is_done ? 'text-emerald-400' : 'text-pink-400'}`} />
                        <span className={`flex-1 text-[11px] leading-relaxed ${card.is_done ? 'text-emerald-700' : 'text-gray-700 group-hover:text-pink-700'}`}>{card.content}</span>
                        {card.contact_date && (
                          <span className={`flex-shrink-0 text-[10px] ${card.is_done ? 'text-emerald-500' : 'text-gray-400'}`}>{card.contact_date.slice(8, 10)}/{card.contact_date.slice(5, 7)}</span>
                        )}
                        <ChevronDown size={9} className={`flex-shrink-0 mt-0.5 ${card.is_done ? 'text-emerald-300' : 'text-gray-300 group-hover:text-pink-400'}`} />
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Care card detail modal */}
      {selectedCard && (
        <div className="absolute inset-0 z-20 bg-white flex flex-col" onClick={() => setSelectedCard(null)}>
          <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100" onClick={e => e.stopPropagation()}>
            <button onClick={() => setSelectedCard(null)} className="p-1 hover:bg-gray-100 rounded-lg text-gray-400 transition-colors">
              <ChevronDown size={14} className="rotate-90" />
            </button>
            <Heart size={14} className={selectedCard.is_done ? 'text-emerald-400' : 'text-pink-400'} />
            <p className="font-semibold text-sm text-gray-900 flex-1 line-clamp-1">{selectedCard.content}</p>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3" onClick={e => e.stopPropagation()}>
            {/* Meta */}
            <div className="flex items-center gap-3 flex-wrap">
              <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${selectedCard.is_done ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                {selectedCard.is_done ? '✓ Đã xong' : '⏳ Chưa xong'}
              </span>
              {selectedCard.contact_date && (
                <span className="text-[11px] text-gray-500 flex items-center gap-1">
                  📅 {selectedCard.contact_date.slice(8, 10)}/{selectedCard.contact_date.slice(5, 7)}/{selectedCard.contact_date.slice(0, 4)}
                </span>
              )}
            </div>
            {/* Content */}
            <div className="bg-pink-50 rounded-xl px-3 py-2.5">
              <p className="text-xs font-semibold text-pink-600 mb-1">Nội dung chăm sóc</p>
              <p className="text-sm text-gray-700 leading-relaxed">{selectedCard.content}</p>
            </div>
            {/* Logs */}
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-2">Nhật ký tư vấn</p>
              {loadingLogs ? (
                <p className="text-xs text-gray-400 italic">Đang tải...</p>
              ) : cardLogs.length === 0 ? (
                <p className="text-xs text-gray-400 italic">Chưa có ghi chú nào</p>
              ) : (
                <div className="space-y-2">
                  {cardLogs.map(log => (
                    <div key={log.id} className="flex gap-2.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-brand-400 mt-1.5 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-xs text-gray-700 leading-relaxed">{log.log_content}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">{formatDate(log.created_at)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const SUPER_ADMIN_EMAIL = 'operation1@hanoisuntravel.com'

export default function DanhGiaPage() {
  const supabase = createClient()
  const { setOnRefresh } = useTopbar()
  const { user: currentUser } = useAuth()
  const isSuperAdmin = currentUser?.is_super_admin === true || currentUser?.email === SUPER_ADMIN_EMAIL
  const [list, setList] = useState<FeedbackRow[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'all' | 'poor' | 'destination' | 'summary'>('all')
  const [selectedOppSummary, setSelectedOppSummary] = useState<string | null>(null)
  const [summarySearch, setSummarySearch] = useState('')
  const [destView, setDestView] = useState<'chart' | 'grid'>('grid')
  const [destSearch, setDestSearch] = useState('')
  const [dateFrom, setDateFrom] = useState(() => `${new Date().getFullYear()}-01-01`)
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().slice(0, 10))
  const [search, setSearch] = useState('')
  const [filterSatisfied, setFilterSatisfied] = useState<'all' | 'satisfied' | 'unsatisfied' | 'return'>('all')
  const [allView, setAllView] = useState<'list' | 'table'>('table')
  const [tableSort, setTableSort] = useState<{ col: string; dir: 'asc' | 'desc' } | null>(null)
  const [tableFilters, setTableFilters] = useState<Record<string, string>>({})
  const [commentModal, setCommentModal] = useState<{ name: string; comment: string } | null>(null)
  const [tableFullscreen, setTableFullscreen] = useState(false)
  const [tableScrolled, setTableScrolled] = useState(false)
  const tableScrollCleanup = useRef<(() => void) | null>(null)
  const tableScrollRef = useCallback((node: HTMLDivElement | null) => {
    if (tableScrollCleanup.current) { tableScrollCleanup.current(); tableScrollCleanup.current = null }
    if (!node) return
    const handler = () => setTableScrolled(node.scrollTop > 30)
    node.addEventListener('scroll', handler, { passive: true })
    tableScrollCleanup.current = () => node.removeEventListener('scroll', handler)
  }, [])
  const [expanded, setExpanded] = useState<string | null>(null)
  const [selected, setSelected] = useState<SelectedList>(null)
  const [expandedFeedback, setExpandedFeedback] = useState<FeedbackRow | null>(null)
  const [careCardsMap, setCareCardsMap] = useState<Record<string, CareCardSummary[]>>({})
  const [createCardModal, setCreateCardModal] = useState<FeedbackRow | null>(null)
  const [newCardContent, setNewCardContent] = useState('')
  const [newCardDate, setNewCardDate] = useState('')
  const [creatingCard, setCreatingCard] = useState(false)
  const [cardCreated, setCardCreated] = useState(false)
  const [filterHasOpp, setFilterHasOpp] = useState(false)
  const [filterNoOpp, setFilterNoOpp] = useState(true)
  // multi-select + link to opportunity
  const [selectMode, setSelectMode] = useState(false)
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set())
  const [linkModal, setLinkModal] = useState(false)
  const [oppSearch, setOppSearch] = useState('')
  const [oppResults, setOppResults] = useState<{ id: string; title: string; tour_date: string | null }[]>([])
  const [oppSearching, setOppSearching] = useState(false)
  const [linking, setLinking] = useState(false)
  const oppSearchRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const loadData = useCallback(() => {
    setLoading(true)
    supabase.from('feedback').select('*, opportunity:opportunities(title, tour_date, stage)').order('submitted_at', { ascending: false })
      .then(({ data }) => { setList((data ?? []) as FeedbackRow[]); setLoading(false) })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    loadData()
    setOnRefresh(loadData)
    return () => setOnRefresh(null)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Load/search opportunities when modal is open
  useEffect(() => {
    if (!linkModal) return
    if (oppSearchRef.current) clearTimeout(oppSearchRef.current)
    const delay = oppSearch.trim() ? 300 : 0
    oppSearchRef.current = setTimeout(async () => {
      setOppSearching(true)
      const q = supabase.from('opportunities').select('id, title, tour_date').order('created_at', { ascending: false }).limit(20)
      const { data } = oppSearch.trim() ? await q.ilike('title', `%${oppSearch.trim()}%`) : await q
      setOppResults((data ?? []) as { id: string; title: string; tour_date: string | null }[])
      setOppSearching(false)
    }, delay)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [oppSearch, linkModal])

  async function handleLinkOpp(oppId: string) {
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
    const map: Record<string, { id: string; title: string; tour_date: string | null; stage: string | null; feedbacks: FeedbackRow[] }> = {}
    dateFiltered.forEach(f => {
      if (!f.opportunity_id) return
      if (!map[f.opportunity_id]) map[f.opportunity_id] = {
        id: f.opportunity_id,
        title: f.opportunity?.title ?? f.opportunity_id,
        tour_date: f.opportunity?.tour_date ?? null,
        stage: f.opportunity?.stage ?? null,
        feedbacks: [],
      }
      map[f.opportunity_id].feedbacks.push(f)
    })
    return Object.values(map).sort((a, b) => (b.tour_date ?? '').localeCompare(a.tour_date ?? ''))
  }, [dateFiltered])

  // Auto-select first item when switching tabs (tab button already clears selected via onClick)
  useEffect(() => {
    if (tab === 'poor' && poorData.length > 0) handlePoorClick(poorData[0])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, poorData.length])

  useEffect(() => {
    if (tab === 'destination' && destData.length > 0) handleDestClick(destData[0])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, destData.length])

  useEffect(() => {
    if (tab === 'summary' && oppGroups.length > 0 && !selectedOppSummary) {
      setSelectedOppSummary(oppGroups[0].id)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, oppGroups.length])

  const RATING_VALUES = ['Kém', 'Trung bình', 'Tốt', 'Rất tốt'] as const
  const RATING_COLORS: Record<string, string> = { 'Kém': '#ef4444', 'Trung bình': '#f59e0b', 'Tốt': '#3b82f6', 'Rất tốt': '#10b981' }
  const RATING_SCORE: Record<string, number> = { 'Kém': 1, 'Trung bình': 2, 'Tốt': 3, 'Rất tốt': 4 }

  function scoreToLabel(avg: number): string {
    if (avg < 1.5) return 'Kém'
    if (avg < 2.5) return 'Trung bình'
    if (avg < 3.5) return 'Tốt'
    return 'Rất tốt'
  }

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

  const avgChartData = useMemo(() => {
    const group = oppGroups.find(g => g.id === selectedOppSummary)
    if (!group) return []
    return RATING_FIELDS
      .map(f => {
        const scores: number[] = []
        group.feedbacks.forEach(fb => {
          const v = fb[f.key] as string | null
          if (v && v in RATING_SCORE) scores.push(RATING_SCORE[v])
        })
        if (scores.length === 0) return null
        const avg = scores.reduce((a, b) => a + b, 0) / scores.length
        return { name: f.label, avg: Math.round(avg * 10) / 10, label: scoreToLabel(avg), color: RATING_COLORS[scoreToLabel(avg)] }
      })
      .filter(Boolean) as { name: string; avg: number; label: string; color: string }[]
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedOppSummary, oppGroups])

  // Fetch care cards khi selected thay đổi
  useEffect(() => {
    if (!selected || selected.entries.length === 0) return
    const ids = selected.entries.map(f => f.id)
    createClient().from('care_cards').select('id,feedback_id,content,contact_date,is_done')
      .in('feedback_id', ids)
      .then(({ data }) => {
        if (!data) return
        const map: Record<string, CareCardSummary[]> = {}
        data.forEach((c: any) => {
          if (!c.feedback_id) return
          if (!map[c.feedback_id]) map[c.feedback_id] = []
          map[c.feedback_id].push(c as CareCardSummary)
        })
        setCareCardsMap(prev => ({ ...prev, ...map }))
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected])

  async function refreshCareCards(feedbackId: string) {
    const { data } = await createClient().from('care_cards').select('id,feedback_id,content,contact_date,is_done').eq('feedback_id', feedbackId)
    setCareCardsMap(prev => ({ ...prev, [feedbackId]: (data ?? []) as CareCardSummary[] }))
  }

  function handlePoorClick(entry: { key: string; name: string }) {
    const matches = dateFiltered.filter(row => (row as any)[entry.key] === 'Kém')
    setSelected({ title: `Đánh giá Kém · ${entry.name}`, entries: matches })
  }

  function handleDestClick(entry: { name: string }) {
    const matches = dateFiltered.filter(f => f.next_destination?.trim() === entry.name)
    setSelected({ title: `Quan tâm · ${entry.name}`, entries: matches })
  }

  async function createCareCard() {
    if (!createCardModal || !newCardContent.trim()) return
    setCreatingCard(true)
    await createClient().from('care_cards').insert({
      feedback_id: createCardModal.id,
      opportunity_id: createCardModal.opportunity_id ?? null,
      assigned_to: currentUser?.id,
      created_by: currentUser?.id,
      customer_name: createCardModal.respondent_name,
      customer_phone: createCardModal.phone,
      content: newCardContent.trim(),
      contact_date: newCardDate || null,
    })
    setCreatingCard(false)
    setCardCreated(true)
    await refreshCareCards(createCardModal.id)
    setTimeout(() => {
      setCreateCardModal(null)
      setNewCardContent('')
      setNewCardDate('')
      setCardCreated(false)
    }, 1200)
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
    const hasOpp = !!f.opportunity_id
    const matchLinked = !isSuperAdmin ? true
      : (filterHasOpp && filterNoOpp) ? true
      : filterHasOpp ? hasOpp
      : filterNoOpp ? !hasOpp
      : true
    return matchSearch && matchFilter && matchLinked
  })

  const TABLE_COLS: { key: string; label: string; filter?: boolean }[] = [
    { key: 'respondent_name', label: 'Họ tên / SĐT', filter: true },
    { key: 'group_name',      label: 'Đoàn',         filter: true },
    { key: 'itinerary',       label: 'Hành trình',   filter: true },
    { key: 'overall_comment', label: 'Đánh giá chung', filter: true },
    { key: 'is_satisfied',    label: 'Hài lòng' },
    { key: 'will_return',     label: 'Sẽ quay lại' },
    { key: 'next_destination',label: 'Địa điểm quan tâm', filter: true },
    { key: 'submitted_at',    label: 'Ngày' },
  ]

  const tableData = useMemo(() => {
    let data = [...listFiltered]
    Object.entries(tableFilters).forEach(([col, q]) => {
      if (!q.trim()) return
      const qLow = q.toLowerCase()
      data = data.filter(f => String((f as any)[col] ?? '').toLowerCase().includes(qLow))
    })
    if (tableSort) {
      data.sort((a, b) => {
        const av = (a as any)[tableSort.col] ?? ''
        const bv = (b as any)[tableSort.col] ?? ''
        let cmp = 0
        if (typeof av === 'boolean' || typeof bv === 'boolean') {
          cmp = (av === true ? 0 : av === false ? 1 : 2) - (bv === true ? 0 : bv === false ? 1 : 2)
        } else {
          cmp = String(av).localeCompare(String(bv), 'vi')
        }
        return tableSort.dir === 'asc' ? cmp : -cmp
      })
    }
    return data
  }, [listFiltered, tableSort, tableFilters])

  function toggleTableSort(col: string) {
    setTableSort(prev =>
      prev?.col === col
        ? prev.dir === 'asc' ? { col, dir: 'desc' } : null
        : { col, dir: 'asc' }
    )
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-gray-50/80">
      {/* Top bar */}
      <div className="flex-shrink-0 px-5 pt-5 pb-3 space-y-3">
        {/* Tab bar + date filter */}
        <div className="flex items-stretch gap-3">
          <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-2xl p-1 shadow-sm">
            {([
              { key: 'all', label: 'Tất cả đánh giá' },
              { key: 'summary', label: 'Theo đoàn' },
              { key: 'poor', label: 'Đánh giá kém' },
              { key: 'destination', label: 'Địa điểm quan tâm' },
            ] as const).map(t => (
              <button key={t.key} onClick={() => { setTab(t.key); setSelected(null); setExpandedFeedback(null) }}
                className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all ${tab === t.key ? 'bg-accent-500 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}>
                {t.label}
              </button>
            ))}
          </div>
          {/* Date filter */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm px-4 flex items-center gap-3 ml-auto">
            <span className="text-xs text-gray-400 font-medium whitespace-nowrap">Từ ngày</span>
            <DateInput value={dateFrom} onChange={v => { setDateFrom(v); setSelected(null) }} />
            <span className="text-xs text-gray-400">đến</span>
            <DateInput value={dateTo} onChange={v => { setDateTo(v); setSelected(null) }} />
            {(dateFrom || dateTo) && (
              <button onClick={() => { setDateFrom(''); setDateTo('') }} className="text-xs text-gray-400 hover:text-gray-600 font-medium">Xoá</button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden px-5 pb-5">

        {/* ── Tab: Tất cả đánh giá ── */}
        {tab === 'all' && (
          <div className="h-full flex flex-col gap-3 overflow-hidden">
            {/* Filter bar */}
            <div className="flex items-center gap-3 flex-shrink-0 px-0.5 pt-0.5">
              <div className="relative w-72 flex-shrink-0">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm theo tên đoàn, hành trình..."
                  className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 bg-white shadow-sm" />
              </div>
              <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl p-1 shadow-sm">
                {(['all', 'satisfied', 'unsatisfied', 'return'] as const).map(f => (
                  <button key={f} onClick={() => setFilterSatisfied(f)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${filterSatisfied === f ? 'bg-brand-600 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-100'}`}>
                    {f === 'all' ? 'Tất cả' : f === 'satisfied' ? '😊 Hài lòng' : f === 'unsatisfied' ? '😞 Không hài lòng' : '🔁 Sẽ quay lại'}
                  </button>
                ))}
              </div>
              <div className="ml-auto flex items-center gap-3">
                <div className="flex items-center bg-white border border-gray-200 rounded-xl p-1 shadow-sm">
                  <button onClick={() => setAllView('list')} title="Dạng danh sách"
                    className={`p-1.5 rounded-lg transition-colors ${allView === 'list' ? 'bg-brand-600 text-white' : 'text-gray-400 hover:bg-gray-100'}`}>
                    <List size={15} />
                  </button>
                  <button onClick={() => setAllView('table')} title="Dạng bảng"
                    className={`p-1.5 rounded-lg transition-colors ${allView === 'table' ? 'bg-brand-600 text-white' : 'text-gray-400 hover:bg-gray-100'}`}>
                    <Table2 size={15} />
                  </button>
                </div>
                {allView === 'table' && (
                  <button onClick={() => setTableFullscreen(f => !f)} title={tableFullscreen ? 'Thu nhỏ' : 'Phóng to'}
                    className="p-1.5 rounded-lg border border-gray-200 bg-white shadow-sm text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors">
                    {tableFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
                  </button>
                )}
              {isSuperAdmin && (
                <div className="flex items-center gap-4">
                  {([
                    { label: 'Đã có đơn', value: filterHasOpp, set: setFilterHasOpp },
                    { label: 'Chưa có đơn', value: filterNoOpp, set: setFilterNoOpp },
                  ] as const).map(({ label, value, set }) => (
                    <label key={label} className="flex items-center gap-1.5 cursor-pointer select-none">
                      <input type="checkbox" checked={value} onChange={e => set(e.target.checked)}
                        className="w-3.5 h-3.5 rounded accent-brand-600 cursor-pointer" />
                      <span className="text-xs font-medium text-gray-600">{label}</span>
                    </label>
                  ))}
                  <button onClick={() => { setSelectMode(v => !v); setCheckedIds(new Set()) }}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-colors ${selectMode ? 'bg-brand-50 border-brand-300 text-brand-700' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
                    <CheckSquare size={13} />
                    Chọn
                  </button>
                </div>
              )}
              </div>
            </div>

            {/* List / Table */}
            <div
              ref={allView === 'table' && !tableFullscreen ? tableScrollRef : undefined}
              className={`overflow-y-auto bg-white rounded-2xl border border-gray-200 shadow-sm ${allView === 'table' ? 'overflow-x-auto' : ''} ${tableFullscreen && allView === 'table' ? 'fixed top-10 left-52 right-0 bottom-0 z-30 rounded-none' : 'flex-1 min-h-0'}`}>
                {loading ? (
                  <div className="divide-y divide-gray-100">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="px-4 py-3 animate-pulse space-y-2">
                        <div className="flex items-center gap-3">
                          <div className="h-3.5 bg-gray-100 rounded w-32" />
                          <div className="h-3 bg-gray-100 rounded w-20" />
                          <div className="h-5 bg-gray-100 rounded-full w-16" />
                        </div>
                        <div className="h-3 bg-gray-100 rounded w-48" />
                      </div>
                    ))}
                  </div>
                ) : listFiltered.length === 0 ? (
                  <div className="py-16 text-center"><Star size={36} className="text-gray-200 mx-auto mb-3" /><p className="text-sm text-gray-400">Chưa có đánh giá nào</p></div>
                ) : allView === 'table' ? (
                  <table className="w-full text-sm border-collapse">
                    <thead className="sticky top-0 z-10">
                      {/* Header row with sort */}
                      <tr className="bg-brand-50 border-b border-brand-100">
                        {isSuperAdmin && selectMode && <th className="w-10 px-3 py-2.5" />}
                        {TABLE_COLS.map(({ key, label }) => {
                          const isActive = tableSort?.col === key
                          return (
                            <th key={key} onClick={() => toggleTableSort(key)}
                              className="text-left px-4 py-2.5 whitespace-nowrap cursor-pointer select-none group">
                              <div className="flex items-center gap-1 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                {label}
                                <span className={`transition-colors ${isActive ? 'text-brand-500' : 'text-gray-300 group-hover:text-gray-400'}`}>
                                  {isActive ? (tableSort!.dir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />) : <ChevronsUpDown size={12} />}
                                </span>
                              </div>
                            </th>
                          )
                        })}
                      </tr>
                      {/* Filter row */}
                      <tr className="bg-brand-50 border-b border-brand-100">
                        {isSuperAdmin && selectMode && <td className="w-10 px-3 py-1.5" />}
                        {TABLE_COLS.map(({ key, filter }) => (
                          <td key={key} className="px-2 py-1.5">
                            {filter ? (
                              <input value={tableFilters[key] ?? ''}
                                onChange={e => setTableFilters(p => ({ ...p, [key]: e.target.value }))}
                                placeholder="Lọc..."
                                className="w-full text-xs px-2 py-1 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-400 bg-gray-50 placeholder:text-gray-300" />
                            ) : <div className="h-6" />}
                          </td>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {tableData.map(f => (
                        <tr key={f.id} onClick={() => isSuperAdmin && selectMode ? toggleCheck(f.id, { stopPropagation: () => {} } as React.MouseEvent) : setExpanded(v => v === f.id ? null : f.id)}
                          className={`cursor-pointer transition-colors hover:bg-gray-50 ${expanded === f.id ? 'bg-brand-50/40' : checkedIds.has(f.id) ? 'bg-amber-50/40' : ''}`}>
                          {isSuperAdmin && selectMode && (
                            <td className="w-10 px-3 py-3" onClick={e => { e.stopPropagation(); toggleCheck(f.id, e) }}>
                              <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${checkedIds.has(f.id) ? 'bg-brand-600 border-brand-600' : 'border-gray-300 hover:border-brand-400'}`}>
                                {checkedIds.has(f.id) && <svg viewBox="0 0 10 8" className="w-2.5 h-2 fill-white"><path d="M1 4l2.5 2.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>}
                              </div>
                            </td>
                          )}
                          <td className="px-4 py-3 w-40">
                            <div className="font-semibold text-gray-900 text-sm">{f.respondent_name ?? '—'}</div>
                            {f.phone && <div className="text-xs text-gray-400 mt-0.5">{f.phone}</div>}
                          </td>
                          <td className="px-4 py-3 text-gray-700 min-w-[130px]">{f.group_name ?? '—'}</td>
                          <td className="px-4 py-3 text-gray-600 min-w-[120px]">{f.itinerary ?? '—'}</td>
                          <td className="px-4 py-3 text-gray-500 italic min-w-[180px] max-w-[260px]">
                            {f.overall_comment ? (() => {
                              const isLong = f.overall_comment.length > 160
                              return (
                                <div>
                                  <span className={isLong ? 'line-clamp-4' : ''}>"{f.overall_comment}"</span>
                                  {isLong && (
                                    <button onClick={e => { e.stopPropagation(); setCommentModal({ name: f.respondent_name ?? '—', comment: f.overall_comment! }) }}
                                      className="text-xs text-brand-500 hover:underline mt-0.5 block not-italic font-medium">
                                      ... xem thêm
                                    </button>
                                  )}
                                </div>
                              )
                            })() : '—'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {f.is_satisfied === true && <span className="text-xs font-semibold text-emerald-600">Hài lòng</span>}
                            {f.is_satisfied === false && <span className="text-xs font-semibold text-red-500">Không hài lòng</span>}
                            {f.is_satisfied === null && <span className="text-gray-300">—</span>}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {f.will_return === true && <span className="text-xs font-semibold text-blue-600">Có</span>}
                            {f.will_return === false && <span className="text-xs font-semibold text-gray-400">Không</span>}
                            {f.will_return === null && <span className="text-gray-300">—</span>}
                          </td>
                          <td className="px-4 py-3 w-32 max-w-[128px]"><span className="text-brand-600 font-medium text-xs truncate block">{f.next_destination ?? '—'}</span></td>
                          <td className="px-4 py-3 text-gray-400 whitespace-nowrap">{formatDate(f.submitted_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {listFiltered.map(f => (
                      <div key={f.id} className={expanded === f.id ? 'bg-brand-50/40' : checkedIds.has(f.id) ? 'bg-amber-50/30' : ''}>
                        <div className="px-5 py-4 hover:bg-gray-50/70 transition-colors cursor-pointer" onClick={() => setExpanded(v => v === f.id ? null : f.id)}>
                          <div className="flex items-start gap-3">
                            {isSuperAdmin && selectMode && (
                              <div className="pt-0.5 flex-shrink-0" onClick={e => toggleCheck(f.id, e)}>
                                <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${checkedIds.has(f.id) ? 'bg-brand-600 border-brand-600' : 'border-gray-300 hover:border-brand-400'}`}>
                                  {checkedIds.has(f.id) && <svg viewBox="0 0 10 8" className="w-2.5 h-2 fill-white"><path d="M1 4l2.5 2.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>}
                                </div>
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`font-semibold text-base ${expanded === f.id ? 'text-brand-700' : 'text-gray-900'}`}>{f.respondent_name ?? '—'}</span>
                                {f.phone && <span className="text-sm text-gray-400">{f.phone}</span>}
                              </div>
                              <div className="flex items-center gap-2 mt-0.5 flex-wrap text-sm text-gray-500">
                                {f.group_name && <span>Đoàn: <span className="font-medium text-gray-700">{f.group_name}</span></span>}
                                {f.itinerary && <><span className="text-gray-300">·</span><span>Hành trình: <span className="text-gray-600">{f.itinerary}</span></span></>}
                              </div>
                              {f.overall_comment && <p className="text-sm text-gray-400 mt-0.5 italic line-clamp-1">Đánh giá chung: "{f.overall_comment}"</p>}
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                {f.is_satisfied === true && <span className="text-xs font-semibold text-emerald-600">Hài lòng</span>}
                                {f.is_satisfied === false && <span className="text-xs font-semibold text-red-500">Không hài lòng</span>}
                                {f.will_return === true && <span className="text-xs font-semibold text-blue-600">· Sẽ quay lại</span>}
                                {f.will_return === false && <span className="text-xs font-semibold text-gray-400">· Không quay lại</span>}
                                {f.next_destination && <span className="text-xs text-gray-400">· Quan tâm: <span className="font-semibold text-brand-600">{f.next_destination}</span></span>}
                              </div>
                            </div>
                            <span className="text-sm text-gray-400 flex-shrink-0">{formatDate(f.submitted_at)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Right drawer */}
              {expanded && listFiltered.find(x => x.id === expanded) && (() => {
                  const f = listFiltered.find(x => x.id === expanded)!
                  return (
                    <div className="fixed right-0 top-10 bottom-0 w-[460px] bg-white border-l border-gray-200 shadow-2xl flex flex-col z-40">
                    <>
                      {/* Nút đóng bám cạnh trái drawer */}
                      <button onClick={() => setExpanded(null)}
                        className="absolute left-0 top-1/2 -translate-x-full -translate-y-1/2 flex items-center justify-center w-6 h-12 bg-white border border-r-0 border-gray-200 rounded-l-xl shadow-md text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors z-10">
                        <svg width="8" height="14" viewBox="0 0 8 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="1 1 7 7 1 13" />
                        </svg>
                      </button>
                      <div className="px-5 py-4 border-b border-gray-100 flex items-start justify-between flex-shrink-0">
                        <div>
                          <p className="font-semibold text-gray-900">{f.respondent_name ?? '—'}</p>
                          <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                            {f.phone && <span className="text-xs text-gray-500">{f.phone}</span>}
                            {f.group_name && <span className="text-xs text-gray-400">Đoàn: {f.group_name}</span>}
                            <span className="text-xs text-gray-400">{formatDate(f.submitted_at)}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {f.opportunity_id && (
                            <Link href={oppHref(f.opportunity_id, f.opportunity?.stage)} className="text-xs text-brand-600 hover:underline flex items-center gap-0.5 font-medium">
                              <ExternalLink size={11} /> Đơn
                            </Link>
                          )}
                          <button onClick={() => setCreateCardModal(f)}
                            className="flex items-center gap-0.5 text-[11px] text-pink-500 hover:text-pink-700 font-semibold px-2 py-1 rounded-lg hover:bg-pink-50 transition-colors">
                            <Heart size={11} /> Tạo thẻ CSKH
                          </button>
                          <button onClick={() => setExpanded(null)} className="p-1 hover:bg-gray-100 rounded-lg text-gray-400 transition-colors"><X size={14} /></button>
                        </div>
                      </div>
                      <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          {(f.rating_restaurant_space || f.rating_restaurant_food || f.rating_restaurant_service || f.rating_restaurant_price) && (
                            <div className="bg-gray-50 rounded-xl border border-gray-100 p-3">
                              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Nhà hàng</p>
                              <StarRow label="Không gian" value={f.rating_restaurant_space} />
                              <StarRow label="Ẩm thực" value={f.rating_restaurant_food} />
                              <StarRow label="Thái độ phục vụ" value={f.rating_restaurant_service} />
                              <StarRow label="Giá cả" value={f.rating_restaurant_price} />
                            </div>
                          )}
                          {(f.rating_guide_attitude || f.rating_guide_skill || f.rating_guide_knowledge) && (
                            <div className="bg-gray-50 rounded-xl border border-gray-100 p-3">
                              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Hướng dẫn viên</p>
                              <StarRow label="Thái độ" value={f.rating_guide_attitude} />
                              <StarRow label="Nghiệp vụ" value={f.rating_guide_skill} />
                              <StarRow label="Kiến thức" value={f.rating_guide_knowledge} />
                            </div>
                          )}
                          {(f.rating_transport_quality || f.rating_transport_safety || f.rating_transport_driver) && (
                            <div className="bg-gray-50 rounded-xl border border-gray-100 p-3">
                              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Phương tiện</p>
                              <StarRow label="Chất lượng xe" value={f.rating_transport_quality} />
                              <StarRow label="An toàn" value={f.rating_transport_safety} />
                              <StarRow label="Thái độ tài xế" value={f.rating_transport_driver} />
                            </div>
                          )}
                          {(f.rating_staff_attitude || f.rating_staff_skill || f.rating_staff_knowledge) && (
                            <div className="bg-gray-50 rounded-xl border border-gray-100 p-3">
                              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Nhân viên tư vấn</p>
                              <StarRow label="Thái độ" value={f.rating_staff_attitude} />
                              <StarRow label="Nghiệp vụ" value={f.rating_staff_skill} />
                              <StarRow label="Kiến thức" value={f.rating_staff_knowledge} />
                            </div>
                          )}
                          {f.rating_hotel && (
                            <div className="bg-gray-50 rounded-xl border border-gray-100 p-3">
                              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Khách sạn</p>
                              <StarRow label="Đánh giá" value={f.rating_hotel} />
                            </div>
                          )}
                          {(f.rating_flight_support || f.rating_flight_attitude || f.rating_flight_handling) && (
                            <div className="bg-gray-50 rounded-xl border border-gray-100 p-3">
                              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Vé máy bay</p>
                              <StarRow label="Hỗ trợ chuyên môn" value={f.rating_flight_support} />
                              <StarRow label="Thái độ tư vấn" value={f.rating_flight_attitude} />
                              <StarRow label="Xử lý tình huống" value={f.rating_flight_handling} />
                            </div>
                          )}
                        </div>
                        <div className="bg-gray-50 rounded-xl border border-gray-100 p-3 space-y-2">
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Tổng kết</p>
                          {f.overall_comment && <p className="text-sm text-gray-700 italic">"{f.overall_comment}"</p>}
                          <div className="flex items-center gap-4 pt-1 flex-wrap">
                            <div className="flex items-center gap-1.5">
                              {f.is_satisfied ? <ThumbsUp size={13} className="text-emerald-500" /> : <ThumbsDown size={13} className="text-red-400" />}
                              <span className="text-xs text-gray-600">{f.is_satisfied ? 'Hài lòng' : 'Không hài lòng'}</span>
                            </div>
                            {f.will_return !== null && (
                              <div className="flex items-center gap-1.5">
                                {f.will_return ? <ThumbsUp size={13} className="text-blue-500" /> : <ThumbsDown size={13} className="text-gray-400" />}
                                <span className="text-xs text-gray-600">{f.will_return ? 'Sẽ quay lại' : 'Không quay lại'}</span>
                              </div>
                            )}
                            {f.next_destination && <span className="text-xs text-gray-500">Quan tâm: <span className="font-medium text-brand-600">{f.next_destination}</span></span>}
                          </div>
                        </div>
                      </div>
                    </>
                    </div>
                  )
                })()}
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
              <CustomerList data={selected} onClose={() => setSelected(null)} onExpand={f => setExpandedFeedback(prev => prev?.id === f.id ? null : f)} expandedId={expandedFeedback?.id ?? null} onCreateCard={setCreateCardModal} careCardsMap={careCardsMap} />
            </div>
          </div>
        )}

        {/* ── Tab: Địa điểm quan tâm ── */}
        {tab === 'destination' && (
          <div className="h-full grid grid-cols-2 gap-4">
            {/* Left panel */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col overflow-hidden">
              {/* Header + view toggle */}
              <div className="px-5 pt-5 pb-3 flex-shrink-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-gray-900 text-sm">Địa điểm quan tâm tiếp theo</h3>
                    <p className="text-xs text-gray-400 mt-0.5">Bấm vào địa điểm để xem danh sách khách</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="relative">
                      <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input value={destSearch} onChange={e => setDestSearch(e.target.value)}
                        placeholder="Tìm địa điểm..."
                        className="pl-7 pr-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-brand-400 bg-gray-50 w-36" />
                    </div>
                  <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
                    <button onClick={() => setDestView('chart')}
                      className={`p-1.5 rounded-md transition-colors ${destView === 'chart' ? 'bg-white shadow-sm text-brand-600' : 'text-gray-400 hover:text-gray-600'}`}>
                      <BarChart2 size={14} />
                    </button>
                    <button onClick={() => setDestView('grid')}
                      className={`p-1.5 rounded-md transition-colors ${destView === 'grid' ? 'bg-white shadow-sm text-brand-600' : 'text-gray-400 hover:text-gray-600'}`}>
                      <LayoutGrid size={14} />
                    </button>
                  </div>
                  </div>
                </div>
              </div>

              {destData.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center">
                  <MapPin size={32} className="text-gray-200 mb-3" />
                  <p className="text-sm text-gray-300">Chưa có dữ liệu</p>
                </div>
              ) : destView === 'chart' ? (
                <div className="flex-1 overflow-y-auto px-5 pb-5">
                  {(() => { const filtered = destData.filter(d => !destSearch.trim() || d.name.toLowerCase().includes(destSearch.toLowerCase())); return (
                  <ResponsiveContainer width="100%" height={Math.max(filtered.length * 38, 120)}>
                    <BarChart data={filtered} layout="vertical" margin={{ left: 8, right: 32, top: 0, bottom: 0 }}>
                      <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                      <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v) => [`${v} khách`, 'Quan tâm']} offset={16} />
                      <Bar dataKey="count" radius={[0, 6, 6, 0]} cursor="pointer"
                        label={{ position: 'right', fontSize: 11, fill: '#6b7280' }}
                        onClick={(data: any) => handleDestClick(data)}>
                        {filtered.map((entry, i) => (
                          <Cell key={i} fill={selected?.title.includes(entry.name) ? '#0ea5e9' : '#7dd3fc'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                  )})()}
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto px-5 pb-5">
                  <div className="grid grid-cols-3 gap-2">
                    {destData.filter(d => !destSearch.trim() || d.name.toLowerCase().includes(destSearch.toLowerCase())).map((entry, i) => {
                      const isSelected = selected?.title.includes(entry.name)
                      const maxCount = destData[0]?.count ?? 1
                      const pct = Math.round((entry.count / maxCount) * 100)
                      return (
                        <button key={i} onClick={() => handleDestClick(entry)}
                          className={`text-left p-3 rounded-xl border transition-all hover:shadow-md ${isSelected ? 'border-sky-400 bg-sky-50' : 'border-gray-100 bg-gray-50 hover:bg-white hover:border-gray-200'}`}>
                          <div className="flex items-center justify-between mb-1.5">
                            <MapPin size={12} className={isSelected ? 'text-sky-500' : 'text-gray-400'} />
                            <span className={`text-xs font-bold ${isSelected ? 'text-sky-600' : 'text-gray-700'}`}>{entry.count}</span>
                          </div>
                          <p className={`text-xs font-semibold leading-tight truncate ${isSelected ? 'text-sky-700' : 'text-gray-700'}`}>{entry.name}</p>
                          {/* Mini progress bar */}
                          <div className="mt-2 h-1 rounded-full bg-gray-200 overflow-hidden">
                            <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: isSelected ? '#0ea5e9' : '#7dd3fc' }} />
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* List panel */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col overflow-hidden">
              <CustomerList data={selected} onClose={() => setSelected(null)} onExpand={f => setExpandedFeedback(prev => prev?.id === f.id ? null : f)} expandedId={expandedFeedback?.id ?? null} onCreateCard={setCreateCardModal} careCardsMap={careCardsMap} />
            </div>
          </div>
        )}

        {/* ── Tab: Theo đơn hàng ── */}
        {tab === 'summary' && (
          <div className="h-full grid grid-cols-2 gap-4 overflow-hidden">
            {/* Left: danh sách đơn */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 flex-shrink-0 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Đơn hàng có đánh giá</p>
                  <p className="text-[11px] text-gray-400">{oppGroups.length} đơn · {dateFiltered.filter(f => f.opportunity_id).length} phản hồi</p>
                </div>
                <div className="relative">
                  <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input value={summarySearch} onChange={e => setSummarySearch(e.target.value)}
                    placeholder="Tìm tên đơn hàng..."
                    className="w-full pl-7 pr-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-brand-400 bg-gray-50" />
                </div>
              </div>
              {oppGroups.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center py-16 text-gray-300">
                  <Star size={32} className="mb-2" />
                  <p className="text-sm">Chưa có đơn nào được gắn</p>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
                  {oppGroups
                    .filter(g => !summarySearch.trim() || g.title.toLowerCase().includes(summarySearch.toLowerCase()))
                    .map(g => (
                      <button key={g.id} onClick={() => setSelectedOppSummary(g.id)}
                        className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${selectedOppSummary === g.id ? 'bg-brand-50 border-l-2 border-brand-600' : ''}`}>
                        <p className={`text-sm font-semibold truncate ${selectedOppSummary === g.id ? 'text-brand-700' : 'text-gray-800'}`}>{g.title}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[11px] text-gray-400">{g.feedbacks.length} phản hồi</span>
                          {g.tour_date && <span className="text-[11px] text-gray-400">{formatDate(g.tour_date)}</span>}
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
                          <Link href={oppHref(g.id, g.stage)} className="font-bold text-gray-900 hover:text-brand-600 transition-colors text-sm flex items-center gap-1.5">
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

                        {/* Chart 2: điểm trung bình */}
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mt-8 mb-3">Điểm trung bình</p>
                        <ResponsiveContainer width="100%" height={Math.max(avgChartData.length * 38, 160)}>
                          <BarChart data={avgChartData} layout="vertical" margin={{ left: 0, right: 80, top: 0, bottom: 0 }} barSize={16}>
                            <XAxis type="number" domain={[0, 4]} ticks={[1, 2, 3, 4]}
                              tickFormatter={v => ['', 'Kém', 'TB', 'Tốt', 'Rất tốt'][v] ?? ''}
                              tick={{ fontSize: 10 }} />
                            <YAxis type="category" dataKey="name" width={200} tick={{ fontSize: 11 }} />
                            <Tooltip
                              formatter={(value) => [`${value} điểm`, 'Trung bình']}
                              contentStyle={{ fontSize: 12, borderRadius: 10 }}
                              offset={12}
                            />
                            <Bar dataKey="avg" radius={[4, 4, 4, 4]}
                              label={{ position: 'right', fontSize: 11, fill: '#6b7280',
                                formatter: (v: unknown) => `${v} · ${scoreToLabel(Number(v))}` }}>
                              {avgChartData.map((entry, i) => (
                                <Cell key={i} fill={entry.color} />
                              ))}
                            </Bar>
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

      {/* Floating action bar — super admin only */}
      {isSuperAdmin && checkedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-white border border-gray-200 rounded-2xl shadow-xl px-5 py-3 flex items-center gap-4 min-w-[420px]">
          <span className="text-sm font-semibold text-gray-700">Đã chọn <span className="text-brand-600">{checkedIds.size}</span> đánh giá</span>
          <div className="flex-1" />
          <button onClick={() => { setCheckedIds(new Set()); setSelectMode(false) }} className="px-3.5 py-2 rounded-xl text-sm text-gray-500 hover:bg-gray-100 transition-colors font-medium">
            Bỏ chọn
          </button>
          <button onClick={() => { setLinkModal(true); setOppSearch('') }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 transition-colors shadow-sm">
            <ShoppingBag size={14} /> Tìm đơn hàng liên quan
          </button>
        </div>
      )}

      {/* Nút phóng to khi scroll bảng */}
      {allView === 'table' && tableScrolled && !tableFullscreen && (
        <button onClick={() => setTableFullscreen(true)}
          className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 px-4 py-2 bg-gray-900/80 hover:bg-gray-900 text-white text-xs font-semibold rounded-full shadow-lg backdrop-blur-sm transition-colors">
          <Maximize2 size={13} />
          Phóng to bảng
        </button>
      )}

      {/* Nút thu nhỏ fullscreen */}
      {tableFullscreen && (
        <button onClick={() => setTableFullscreen(false)}
          className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 px-4 py-2 bg-gray-900/80 hover:bg-gray-900 text-white text-xs font-semibold rounded-full shadow-lg backdrop-blur-sm transition-colors">
          <Minimize2 size={13} />
          Thu nhỏ
        </button>
      )}

      {/* Drawer xem chi tiết đánh giá — dùng cho tab Đánh giá kém & Địa điểm quan tâm */}
      {expandedFeedback && (
        <div className="fixed right-0 top-10 bottom-0 w-[460px] bg-white border-l border-gray-200 shadow-2xl flex flex-col z-40">
          {/* Nút đóng bám cạnh trái drawer */}
          <button onClick={() => setExpandedFeedback(null)}
            className="absolute left-0 top-1/2 -translate-x-full -translate-y-1/2 flex items-center justify-center w-6 h-12 bg-white border border-r-0 border-gray-200 rounded-l-xl shadow-md text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors z-10">
            <svg width="8" height="14" viewBox="0 0 8 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="1 1 7 7 1 13" />
            </svg>
          </button>
          <div className="px-5 py-4 border-b border-gray-100 flex items-start justify-between flex-shrink-0">
            <div>
              <p className="font-semibold text-gray-900">{expandedFeedback.respondent_name ?? '—'}</p>
              <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                {expandedFeedback.phone && <span className="text-xs text-gray-500">{expandedFeedback.phone}</span>}
                {expandedFeedback.group_name && <span className="text-xs text-gray-400">Đoàn: {expandedFeedback.group_name}</span>}
                <span className="text-xs text-gray-400">{formatDate(expandedFeedback.submitted_at)}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {expandedFeedback.opportunity_id && (
                <Link href={oppHref(expandedFeedback.opportunity_id, expandedFeedback.opportunity?.stage)} className="text-xs text-brand-600 hover:underline flex items-center gap-0.5 font-medium">
                  <ExternalLink size={11} /> Đơn
                </Link>
              )}
              <button onClick={() => setCreateCardModal(expandedFeedback)}
                className="flex items-center gap-0.5 text-[11px] text-pink-500 hover:text-pink-700 font-semibold px-2 py-1 rounded-lg hover:bg-pink-50 transition-colors">
                <Heart size={11} /> Tạo thẻ CSKH
              </button>
              <button onClick={() => setExpandedFeedback(null)} className="p-1 hover:bg-gray-100 rounded-lg text-gray-400 transition-colors"><X size={14} /></button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              {(expandedFeedback.rating_restaurant_space || expandedFeedback.rating_restaurant_food || expandedFeedback.rating_restaurant_service || expandedFeedback.rating_restaurant_price) && (
                <div className="bg-gray-50 rounded-xl border border-gray-100 p-3">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Nhà hàng</p>
                  <StarRow label="Không gian" value={expandedFeedback.rating_restaurant_space} />
                  <StarRow label="Ẩm thực" value={expandedFeedback.rating_restaurant_food} />
                  <StarRow label="Thái độ phục vụ" value={expandedFeedback.rating_restaurant_service} />
                  <StarRow label="Giá cả" value={expandedFeedback.rating_restaurant_price} />
                </div>
              )}
              {(expandedFeedback.rating_guide_attitude || expandedFeedback.rating_guide_skill || expandedFeedback.rating_guide_knowledge) && (
                <div className="bg-gray-50 rounded-xl border border-gray-100 p-3">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Hướng dẫn viên</p>
                  <StarRow label="Thái độ" value={expandedFeedback.rating_guide_attitude} />
                  <StarRow label="Nghiệp vụ" value={expandedFeedback.rating_guide_skill} />
                  <StarRow label="Kiến thức" value={expandedFeedback.rating_guide_knowledge} />
                </div>
              )}
              {(expandedFeedback.rating_transport_quality || expandedFeedback.rating_transport_safety || expandedFeedback.rating_transport_driver) && (
                <div className="bg-gray-50 rounded-xl border border-gray-100 p-3">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Phương tiện</p>
                  <StarRow label="Chất lượng xe" value={expandedFeedback.rating_transport_quality} />
                  <StarRow label="An toàn" value={expandedFeedback.rating_transport_safety} />
                  <StarRow label="Thái độ tài xế" value={expandedFeedback.rating_transport_driver} />
                </div>
              )}
              {(expandedFeedback.rating_staff_attitude || expandedFeedback.rating_staff_skill || expandedFeedback.rating_staff_knowledge) && (
                <div className="bg-gray-50 rounded-xl border border-gray-100 p-3">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Nhân viên tư vấn</p>
                  <StarRow label="Thái độ" value={expandedFeedback.rating_staff_attitude} />
                  <StarRow label="Nghiệp vụ" value={expandedFeedback.rating_staff_skill} />
                  <StarRow label="Kiến thức" value={expandedFeedback.rating_staff_knowledge} />
                </div>
              )}
              {expandedFeedback.rating_hotel && (
                <div className="bg-gray-50 rounded-xl border border-gray-100 p-3">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Khách sạn</p>
                  <StarRow label="Đánh giá" value={expandedFeedback.rating_hotel} />
                </div>
              )}
              {(expandedFeedback.rating_flight_support || expandedFeedback.rating_flight_attitude || expandedFeedback.rating_flight_handling) && (
                <div className="bg-gray-50 rounded-xl border border-gray-100 p-3">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Vé máy bay</p>
                  <StarRow label="Hỗ trợ chuyên môn" value={expandedFeedback.rating_flight_support} />
                  <StarRow label="Thái độ tư vấn" value={expandedFeedback.rating_flight_attitude} />
                  <StarRow label="Xử lý tình huống" value={expandedFeedback.rating_flight_handling} />
                </div>
              )}
              {(expandedFeedback.rating_teambuilding || expandedFeedback.rating_gala || expandedFeedback.rating_conference) && (
                <div className="bg-gray-50 rounded-xl border border-gray-100 p-3">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Dịch vụ khác</p>
                  <StarRow label="Teambuilding" value={expandedFeedback.rating_teambuilding} />
                  <StarRow label="Gala dinner" value={expandedFeedback.rating_gala} />
                  <StarRow label="Hội nghị" value={expandedFeedback.rating_conference} />
                </div>
              )}
            </div>
            <div className="bg-gray-50 rounded-xl border border-gray-100 p-3 space-y-2">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Tổng kết</p>
              {expandedFeedback.overall_comment && <p className="text-sm text-gray-700 italic">"{expandedFeedback.overall_comment}"</p>}
              <div className="flex items-center gap-4 pt-1 flex-wrap">
                <div className="flex items-center gap-1.5">
                  {expandedFeedback.is_satisfied ? <ThumbsUp size={13} className="text-emerald-500" /> : <ThumbsDown size={13} className="text-red-400" />}
                  <span className="text-xs text-gray-600">{expandedFeedback.is_satisfied ? 'Hài lòng' : 'Không hài lòng'}</span>
                </div>
                {expandedFeedback.will_return !== null && (
                  <div className="flex items-center gap-1.5">
                    {expandedFeedback.will_return ? <ThumbsUp size={13} className="text-blue-500" /> : <ThumbsDown size={13} className="text-gray-400" />}
                    <span className="text-xs text-gray-600">{expandedFeedback.will_return ? 'Sẽ quay lại' : 'Không quay lại'}</span>
                  </div>
                )}
                {expandedFeedback.next_destination && <span className="text-xs text-gray-500">Quan tâm: <span className="font-medium text-brand-600">{expandedFeedback.next_destination}</span></span>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal xem đánh giá chung đầy đủ */}
      {commentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm" onClick={() => setCommentModal(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <p className="font-bold text-gray-900 text-sm">{commentModal.name}</p>
              <button onClick={() => setCommentModal(null)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 transition-colors"><X size={16} /></button>
            </div>
            <div className="px-5 py-4 text-sm text-gray-600 italic leading-relaxed max-h-[60vh] overflow-y-auto">
              "{commentModal.comment}"
            </div>
          </div>
        </div>
      )}

      {/* Modal gắn đơn hàng — super admin only */}
      {isSuperAdmin && linkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm" onClick={() => setLinkModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div>
                <p className="font-bold text-gray-900 text-sm">Tìm đơn hàng liên quan</p>
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
              {oppSearching && <div className="py-8 text-center text-sm text-gray-400">Đang tìm...</div>}
              {!oppSearching && oppSearch.trim() && oppResults.length === 0 && (
                <div className="py-8 text-center text-sm text-gray-400">Không tìm thấy đơn hàng nào</div>
              )}
              {oppResults.map(opp => (
                <button key={opp.id} onClick={() => handleLinkOpp(opp.id)} disabled={linking}
                  className="w-full text-left px-5 py-3.5 hover:bg-brand-50 border-b border-gray-50 last:border-0 transition-colors group disabled:opacity-60">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate group-hover:text-brand-700">{opp.title}</p>
                      {opp.tour_date && <p className="text-xs text-gray-400 mt-0.5">Tour: {formatDate(opp.tour_date)}</p>}
                    </div>
                    <ChevronRight size={14} className="text-gray-300 group-hover:text-brand-500 flex-shrink-0 transition-colors" />
                  </div>
                </button>
              ))}
            </div>
            {linking && (
              <div className="px-5 py-3 bg-brand-50 border-t border-brand-100 text-xs text-brand-700 font-medium text-center">Đang lưu...</div>
            )}
          </div>
        </div>
      )}

      {/* Modal tạo thẻ chăm sóc */}
      {createCardModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm" onClick={() => { if (!creatingCard) setCreateCardModal(null) }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Heart size={16} className="text-pink-500" />
                <p className="font-bold text-gray-900 text-sm">Tạo thẻ CSKH</p>
              </div>
              <button onClick={() => setCreateCardModal(null)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 transition-colors"><X size={16} /></button>
            </div>
            <div className="px-5 py-4 space-y-4">
              {/* Khách hàng */}
              <div className="flex items-center gap-3 bg-pink-50 rounded-xl px-3 py-2.5">
                <div className="w-8 h-8 rounded-full bg-pink-200 flex items-center justify-center text-xs font-bold text-pink-700 flex-shrink-0">
                  {(createCardModal.respondent_name ?? '?').charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{createCardModal.respondent_name ?? '—'}</p>
                  {createCardModal.phone && <p className="text-xs text-gray-500">{createCardModal.phone}</p>}
                  {createCardModal.group_name && <p className="text-xs text-gray-400">Đoàn: {createCardModal.group_name}</p>}
                </div>
              </div>
              {/* Nội dung */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Nội dung chăm sóc <span className="text-red-400">*</span></label>
                <textarea value={newCardContent} onChange={e => setNewCardContent(e.target.value)} rows={3}
                  placeholder="VD: Tư vấn tour Hạ Long 3N2Đ, giới thiệu gói mới..."
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400 resize-none" />
              </div>
              {/* Ngày dự kiến */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Thời gian dự kiến liên hệ</label>
                <DateInput value={newCardDate} onChange={setNewCardDate} />
              </div>
            </div>
            <div className="px-5 pb-5 flex gap-2">
              <button onClick={() => setCreateCardModal(null)} disabled={creatingCard}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-500 hover:bg-gray-50 transition-colors disabled:opacity-50">
                Hủy
              </button>
              <button onClick={createCareCard} disabled={creatingCard || !newCardContent.trim()}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors flex items-center justify-center gap-2 disabled:opacity-50 ${cardCreated ? 'bg-emerald-500' : 'bg-pink-500 hover:bg-pink-600'}`}>
                {creatingCard ? <><Send size={14} className="animate-pulse" /> Đang tạo...</>
                  : cardCreated ? '✓ Đã tạo!'
                  : <><Heart size={14} /> Tạo thẻ CSKH</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
