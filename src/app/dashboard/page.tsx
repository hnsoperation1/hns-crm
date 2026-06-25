'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useTopbar } from '@/contexts/topbar'
import { formatVND, formatDate } from '@/lib/utils'
import {
  TrendingUp, Package, Users, DollarSign, AlertCircle,
  CalendarDays, ArrowUpRight, Clock, ChevronRight,
} from 'lucide-react'

interface DashStats {
  totalOrders: number
  activeOrders: number
  totalRevenue: number
  estimatedRevenue: number
  conversionRate: number
  newThisMonth: number
  stageBreakdown: { stage: string; label: string; count: number; color: string }[]
  upcomingTours: { id: string; title: string; date: string; contact: string; daysLeft: number }[]
  recentOrders: { id: string; title: string; stage: string; stageLabel: string; assigned: string; value: number | null; created: string }[]
  topSale: { name: string; count: number; revenue: number }[]
}

const MOCK_DATA: DashStats = {
  totalOrders: 142,
  activeOrders: 38,
  totalRevenue: 4_820_000_000,
  estimatedRevenue: 2_150_000_000,
  conversionRate: 34,
  newThisMonth: 17,
  stageBreakdown: [
    { stage: 'stage_1', label: 'GĐ1 · Tư vấn', count: 12, color: 'bg-blue-400' },
    { stage: 'stage_2', label: 'GĐ2 · Báo giá', count: 9, color: 'bg-indigo-400' },
    { stage: 'stage_3', label: 'GĐ3 · Trước tour', count: 7, color: 'bg-violet-400' },
    { stage: 'stage_4', label: 'GĐ4 · Trong tour', count: 5, color: 'bg-purple-400' },
    { stage: 'stage_5', label: 'GĐ5 · Sau tour', count: 5, color: 'bg-fuchsia-400' },
    { stage: 'lost', label: 'Mất đơn', count: 22, color: 'bg-red-300' },
  ],
  upcomingTours: [
    { id: '1', title: 'Đà Nẵng – Hội An 4N3Đ', date: '2026-06-28', contact: 'Cty TNHH ABC', daysLeft: 3 },
    { id: '2', title: 'Phú Quốc 3N2Đ', date: '2026-07-02', contact: 'Nguyễn Văn An', daysLeft: 7 },
    { id: '3', title: 'Nhật Bản 7N6Đ', date: '2026-07-10', contact: 'Cty CP Tân Bình', daysLeft: 15 },
    { id: '4', title: 'Singapore – Malaysia 5N4Đ', date: '2026-07-18', contact: 'Trần Thị Lan', daysLeft: 23 },
  ],
  recentOrders: [
    { id: 'r1', title: 'Vinpearl Nha Trang – 06/2026', stage: 'stage_3', stageLabel: 'Trước tour', assigned: 'Minh Châu', value: 45_000_000, created: '2026-06-22' },
    { id: 'r2', title: 'Công ty Gia Phát – Đà Lạt', stage: 'stage_2', stageLabel: 'Báo giá', assigned: 'Quốc Toản', value: 120_000_000, created: '2026-06-21' },
    { id: 'r3', title: 'Vé máy bay HAN-SGN', stage: 'stage_1', stageLabel: 'Tư vấn', assigned: 'Thu Hà', value: null, created: '2026-06-21' },
    { id: 'r4', title: 'Team building Q3 – 80 người', stage: 'stage_2', stageLabel: 'Báo giá', assigned: 'Minh Châu', value: 200_000_000, created: '2026-06-20' },
    { id: 'r5', title: 'Gala dinner Tập đoàn XYZ', stage: 'stage_3', stageLabel: 'Trước tour', assigned: 'Quốc Toản', value: 350_000_000, created: '2026-06-19' },
  ],
  topSale: [
    { name: 'Minh Châu', count: 14, revenue: 1_820_000_000 },
    { name: 'Quốc Toản', count: 11, revenue: 1_430_000_000 },
    { name: 'Thu Hà', count: 8, revenue: 960_000_000 },
    { name: 'Bảo Long', count: 5, revenue: 610_000_000 },
  ],
}

const STAGE_COLORS: Record<string, string> = {
  stage_1: 'bg-blue-100 text-blue-700',
  stage_2: 'bg-indigo-100 text-indigo-700',
  stage_3: 'bg-violet-100 text-violet-700',
  stage_4: 'bg-purple-100 text-purple-700',
  stage_5: 'bg-fuchsia-100 text-fuchsia-700',
  lost: 'bg-red-100 text-red-600',
}

export default function DashboardPage() {
  const { setOnRefresh, setBreadcrumb } = useTopbar()
  const [data, setData] = useState<DashStats | null>(null)
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(() => {
    setLoading(true)
    setTimeout(() => {
      setData(MOCK_DATA)
      setLoading(false)
    }, 1000)
  }, [])

  useEffect(() => {
    setBreadcrumb(null)
    loadData()
    setOnRefresh(loadData)
    return () => setOnRefresh(null)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const Skeleton = ({ className }: { className: string }) => (
    <div className={`bg-gray-100 rounded-xl animate-pulse ${className}`} />
  )

  return (
    <div className="flex flex-col gap-6 p-6 overflow-y-auto" style={{ height: 'calc(100vh - 40px)' }}>
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-400 mt-0.5">Tổng quan hoạt động kinh doanh · Tháng 6/2026</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)
        ) : ([
          {
            label: 'Doanh thu thực tế',
            value: formatVND(data!.totalRevenue),
            sub: 'Tháng 6/2026',
            icon: DollarSign,
            color: 'text-emerald-600',
            bg: 'bg-emerald-50',
          },
          {
            label: 'Doanh thu ước tính',
            value: formatVND(data!.estimatedRevenue),
            sub: `${data!.activeOrders} đơn đang xử lý`,
            icon: TrendingUp,
            color: 'text-blue-600',
            bg: 'bg-blue-50',
          },
          {
            label: 'Tổng đơn hàng',
            value: String(data!.totalOrders),
            sub: `+${data!.newThisMonth} tháng này`,
            icon: Package,
            color: 'text-violet-600',
            bg: 'bg-violet-50',
          },
          {
            label: 'Tỷ lệ chốt đơn',
            value: `${data!.conversionRate}%`,
            sub: 'Từ tư vấn → ký HĐ',
            icon: Users,
            color: 'text-accent-600',
            bg: 'bg-accent-50',
          },
        ].map(({ label, value, sub, icon: Icon, color, bg }) => (
          <div key={label} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
            <div className="flex items-start justify-between mb-3">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{label}</span>
              <div className={`p-2 rounded-xl ${bg}`}><Icon size={16} className={color} /></div>
            </div>
            <div className="text-2xl font-bold text-gray-900 mb-1">{value}</div>
            <div className="text-xs text-gray-400">{sub}</div>
          </div>
        )))}
      </div>

      {/* Stage breakdown + Upcoming tours */}
      <div className="grid grid-cols-5 gap-4">
        {/* Pipeline stage */}
        <div className="col-span-2 bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
          <h3 className="font-semibold text-gray-900 mb-4 text-sm">Pipeline theo giai đoạn</h3>
          {loading ? (
            <div className="space-y-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-8" />)}</div>
          ) : (
            <div className="space-y-2.5">
              {data!.stageBreakdown.map(s => {
                const max = Math.max(...data!.stageBreakdown.map(x => x.count))
                const pct = Math.round((s.count / max) * 100)
                return (
                  <div key={s.stage}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-600 font-medium">{s.label}</span>
                      <span className="text-xs font-bold text-gray-700">{s.count}</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full ${s.color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
          <Link href="/don-hang" className="flex items-center gap-1 mt-4 text-xs text-brand-600 hover:text-brand-700 font-medium">
            Xem tất cả đơn <ChevronRight size={13} />
          </Link>
        </div>

        {/* Upcoming tours */}
        <div className="col-span-3 bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 text-sm">Tour sắp khởi hành</h3>
            <CalendarDays size={15} className="text-gray-400" />
          </div>
          {loading ? (
            <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14" />)}</div>
          ) : (
            <div className="space-y-2">
              {data!.upcomingTours.map(t => (
                <div key={t.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
                  <div>
                    <div className="font-semibold text-sm text-gray-800">{t.title}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{t.contact}</div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-4">
                    <div className="text-xs font-bold text-gray-700">{formatDate(t.date)}</div>
                    <div className={`text-[11px] font-semibold mt-0.5 ${t.daysLeft <= 5 ? 'text-red-500' : t.daysLeft <= 14 ? 'text-amber-500' : 'text-gray-400'}`}>
                      {t.daysLeft <= 0 ? 'Hôm nay' : `còn ${t.daysLeft} ngày`}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent orders + Top sale */}
      <div className="grid grid-cols-3 gap-4">
        {/* Recent orders */}
        <div className="col-span-2 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900 text-sm">Đơn hàng mới nhất</h3>
            <Clock size={15} className="text-gray-400" />
          </div>
          {loading ? (
            <div className="p-5 space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
          ) : (
            <table className="w-full text-sm">
              <tbody className="divide-y divide-gray-50">
                {data!.recentOrders.map(o => (
                  <tr key={o.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-5 py-3">
                      <div className="font-medium text-gray-800 truncate max-w-[220px]">{o.title}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{formatDate(o.created)} · {o.assigned}</div>
                    </td>
                    <td className="px-3 py-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STAGE_COLORS[o.stage]}`}>{o.stageLabel}</span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <span className="text-sm font-bold text-gray-700">{o.value ? formatVND(o.value) : '—'}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <div className="px-5 py-3 border-t border-gray-100">
            <Link href="/don-hang" className="flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700 font-medium">
              Xem tất cả <ArrowUpRight size={13} />
            </Link>
          </div>
        </div>

        {/* Top sale */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 text-sm">Top Sale tháng này</h3>
            <AlertCircle size={15} className="text-gray-400" />
          </div>
          {loading ? (
            <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14" />)}</div>
          ) : (
            <div className="space-y-3">
              {data!.topSale.map((s, i) => (
                <div key={s.name} className="flex items-center gap-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${i === 0 ? 'bg-amber-100 text-amber-700' : i === 1 ? 'bg-gray-100 text-gray-600' : 'bg-orange-50 text-orange-600'}`}>
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm text-gray-800">{s.name}</div>
                    <div className="text-xs text-gray-400">{s.count} đơn · {formatVND(s.revenue)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
