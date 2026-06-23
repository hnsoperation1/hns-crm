'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Star, ThumbsUp, ThumbsDown, Search, ChevronDown, ChevronUp, ExternalLink, X } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { createClient } from '@/lib/supabase/client'
import { formatDate } from '@/lib/utils'

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
  { key: 'rating_gala',              label: 'Gala dinner' },
  { key: 'rating_conference',         label: 'Hội nghị' },
]

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

type PanelEntry = { respondent_name: string | null; phone: string | null; group_name: string | null; opportunity_id: string | null; overall_comment?: string | null }
type ChartPanel = { title: string; entries: PanelEntry[] } | null

export default function DanhGiaPage() {
  const supabase = createClient()
  const [list, setList] = useState<FeedbackRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'satisfied' | 'unsatisfied' | 'return'>('all')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [panel, setPanel] = useState<ChartPanel>(null)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('feedback')
        .select('*, opportunity:opportunities(title)')
        .order('submitted_at', { ascending: false })
      setList((data ?? []) as FeedbackRow[])
      setLoading(false)
    }
    load()
  }, [])

  // Chart 1: đánh giá Kém theo từng tiêu chí
  const poorData = RATING_FIELDS
    .map(f => ({
      name: f.label,
      key: f.key,
      count: list.filter(row => row[f.key] === 'Kém').length,
    }))
    .filter(d => d.count > 0)
    .sort((a, b) => b.count - a.count)

  // Chart 2: địa điểm quan tâm
  const destMap: Record<string, number> = {}
  list.forEach(f => {
    if (f.next_destination?.trim()) {
      const d = f.next_destination.trim()
      destMap[d] = (destMap[d] ?? 0) + 1
    }
  })
  const destData = Object.entries(destMap)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)

  function handlePoorClick(entry: { key: string; name: string }) {
    const matches = list.filter(row => (row as any)[entry.key] === 'Kém')
    setPanel({
      title: `Đánh giá Kém · ${entry.name}`,
      entries: matches.map(f => ({ respondent_name: f.respondent_name, phone: f.phone, group_name: f.group_name, opportunity_id: f.opportunity_id, overall_comment: f.overall_comment })),
    })
  }

  function handleDestClick(entry: { name: string }) {
    const matches = list.filter(f => f.next_destination?.trim() === entry.name)
    setPanel({
      title: `Quan tâm · ${entry.name}`,
      entries: matches.map(f => ({ respondent_name: f.respondent_name, phone: f.phone, group_name: f.group_name, opportunity_id: f.opportunity_id })),
    })
  }

  const filtered = list.filter(f => {
    const q = search.toLowerCase()
    const matchSearch = !q || (f.group_name ?? '').toLowerCase().includes(q)
      || (f.respondent_name ?? '').toLowerCase().includes(q)
      || (f.itinerary ?? '').toLowerCase().includes(q)
    const matchFilter =
      filter === 'all' ? true :
      filter === 'satisfied' ? f.is_satisfied === true :
      filter === 'unsatisfied' ? f.is_satisfied === false :
      filter === 'return' ? f.will_return === true : true
    return matchSearch && matchFilter
  })

  const total = list.length
  const satisfied = list.filter(f => f.is_satisfied === true).length
  const willReturn = list.filter(f => f.will_return === true).length

  if (loading) return (
    <div className="flex-1 flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50/80 p-5 space-y-4">

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm px-5 py-4">
          <p className="text-xs text-gray-400 font-medium mb-1">Tổng đánh giá</p>
          <p className="text-2xl font-black text-gray-900">{total}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm px-5 py-4">
          <p className="text-xs text-gray-400 font-medium mb-1">Hài lòng</p>
          <p className="text-2xl font-black text-emerald-600">{satisfied}
            <span className="text-sm font-semibold text-gray-400 ml-1">/ {total}</span>
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm px-5 py-4">
          <p className="text-xs text-gray-400 font-medium mb-1">Sẽ quay lại</p>
          <p className="text-2xl font-black text-brand-600">{willReturn}
            <span className="text-sm font-semibold text-gray-400 ml-1">/ {total}</span>
          </p>
        </div>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-2 gap-4">

        {/* Chart 1: Điểm yếu (Kém) */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
          <h3 className="font-bold text-gray-900 text-sm mb-1">Điểm yếu cần cải thiện</h3>
          <p className="text-xs text-gray-400 mb-4">Số lượt đánh giá Kém theo tiêu chí · Bấm vào xem chi tiết</p>
          {poorData.length === 0 ? (
            <div className="py-10 text-center text-sm text-gray-300">Chưa có đánh giá Kém nào</div>
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(poorData.length * 36, 120)}>
              <BarChart data={poorData} layout="vertical" margin={{ left: 8, right: 24, top: 0, bottom: 0 }}
                onClick={(d: any) => d?.activePayload?.[0] && handlePoorClick(d.activePayload[0].payload)}>
                <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                <YAxis type="category" dataKey="name" width={170} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => [`${v} lượt`, 'Đánh giá Kém']} />
                <Bar dataKey="count" radius={[0, 6, 6, 0]} cursor="pointer">
                  {poorData.map((_, i) => <Cell key={i} fill="#f87171" />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Chart 2: Địa điểm quan tâm */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
          <h3 className="font-bold text-gray-900 text-sm mb-1">Địa điểm quan tâm tiếp theo</h3>
          <p className="text-xs text-gray-400 mb-4">Số khách quan tâm theo điểm đến · Bấm vào xem danh sách</p>
          {destData.length === 0 ? (
            <div className="py-10 text-center text-sm text-gray-300">Chưa có dữ liệu</div>
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(destData.length * 36, 120)}>
              <BarChart data={destData} layout="vertical" margin={{ left: 8, right: 24, top: 0, bottom: 0 }}
                onClick={(d: any) => d?.activePayload?.[0] && handleDestClick(d.activePayload[0].payload)}>
                <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => [`${v} khách`, 'Quan tâm']} />
                <Bar dataKey="count" radius={[0, 6, 6, 0]} cursor="pointer">
                  {destData.map((_, i) => <Cell key={i} fill="#38bdf8" />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Tìm theo tên đoàn, hành trình..."
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 bg-white shadow-sm" />
        </div>
        {(['all', 'satisfied', 'unsatisfied', 'return'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3.5 py-2 rounded-xl text-sm font-semibold transition-colors border ${filter === f ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}>
            {f === 'all' ? 'Tất cả' : f === 'satisfied' ? '😊 Hài lòng' : f === 'unsatisfied' ? '😞 Không hài lòng' : '🔁 Sẽ quay lại'}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <Star size={36} className="text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-400">Chưa có đánh giá nào</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filtered.map(f => (
              <div key={f.id}>
                <div className="px-5 py-4 hover:bg-gray-50/70 transition-colors cursor-pointer"
                  onClick={() => setExpanded(expanded === f.id ? null : f.id)}>
                  <div className="flex items-start gap-4">
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
                          <Link href={`/co-hoi/${f.opportunity_id}`} onClick={e => e.stopPropagation()}
                            className="text-xs text-brand-600 hover:underline flex items-center gap-0.5">
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
                  {f.overall_comment && (
                    <p className="text-xs text-gray-500 mt-2 italic line-clamp-1">"{f.overall_comment}"</p>
                  )}
                </div>

                {expanded === f.id && (
                  <div className="px-5 pb-5 bg-gray-50/50 border-t border-gray-100">
                    <div className="grid grid-cols-2 gap-4 pt-4">
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
                      {(f.rating_teambuilding || f.rating_gala || f.rating_conference) && (
                        <div className="bg-white rounded-xl border border-gray-100 p-4">
                          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Dịch vụ khác</p>
                          <StarRow label="Teambuilding" value={f.rating_teambuilding} />
                          <StarRow label="Gala dinner" value={f.rating_gala} />
                          <StarRow label="Hội nghị" value={f.rating_conference} />
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
                        {f.next_destination && (
                          <span className="text-xs text-gray-500">Quan tâm: <span className="font-medium text-brand-600">{f.next_destination}</span></span>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Slide panel khi click biểu đồ */}
      {panel && (
        <>
          <div className="fixed inset-0 bg-black/30 z-40" onClick={() => setPanel(null)} />
          <div className="fixed right-0 top-0 h-full w-[360px] bg-white shadow-2xl z-50 flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div>
                <h3 className="font-bold text-gray-900 text-sm">{panel.title}</h3>
                <p className="text-xs text-gray-400 mt-0.5">{panel.entries.length} khách</p>
              </div>
              <button onClick={() => setPanel(null)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 transition-colors">
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
              {panel.entries.map((e, i) => (
                <div key={i} className="px-5 py-3.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-sm text-gray-900">{e.respondent_name ?? '—'}</p>
                      {e.phone && <p className="text-xs text-gray-500 mt-0.5">{e.phone}</p>}
                      {e.group_name && <p className="text-xs text-gray-400 mt-0.5">Đoàn: {e.group_name}</p>}
                      {(e as any).overall_comment && <p className="text-xs text-gray-500 mt-1 italic line-clamp-2">"{(e as any).overall_comment}"</p>}
                    </div>
                    {e.opportunity_id && (
                      <Link href={`/co-hoi/${e.opportunity_id}`} onClick={() => setPanel(null)}
                        className="flex-shrink-0 text-xs text-brand-600 hover:underline flex items-center gap-0.5 mt-0.5">
                        <ExternalLink size={11} /> Đơn
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
