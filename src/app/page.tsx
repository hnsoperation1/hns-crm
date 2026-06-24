'use client'

import { useState } from 'react'
import Link from 'next/link'
import { BarChart3, Clock, CheckCircle2, Activity, Plus, ChevronRight, AlertTriangle } from 'lucide-react'
import { OPPORTUNITIES, ACTIVITY_LOGS, USERS, getContactById, getUserById } from '@/lib/mock-data'
import {
  STAGE_LABELS, STAGE_COLORS, SOURCE_LABELS, SOURCE_COLORS,
  formatVND, formatDate, daysUntil, getInitials,
} from '@/lib/utils'
import type { OppStage, LeadSource } from '@/types'

const TODAY = '2026-06-08'
const ACTIVE_STAGES: OppStage[] = ['stage_1', 'stage_2', 'stage_3', 'stage_4', 'stage_5']

const activeOpps = OPPORTUNITIES.filter(o => ACTIVE_STAGES.includes(o.stage as OppStage))
const wonThisMonth = OPPORTUNITIES.filter(o => o.stage === 'stage_5' && o.stage_updated_at.startsWith('2026-06'))
const lostCount = OPPORTUNITIES.filter(o => o.stage === 'lost').length
const todayLogs = ACTIVITY_LOGS.filter(l => l.log_date === TODAY)
const urgentDeadlines = OPPORTUNITIES.filter(o =>
  ACTIVE_STAGES.includes(o.stage as OppStage) && o.deadline && daysUntil(o.deadline) <= 20
)

type Tab = 'Tất cả đơn' | 'Hôm nay theo NV' | 'Nguồn đơn'
const TABS: Tab[] = ['Tất cả đơn', 'Hôm nay theo NV', 'Nguồn đơn']

export default function DashboardPage() {
  const [tab, setTab] = useState<Tab>('Tất cả đơn')

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tổng quan</h1>
          <p className="text-sm text-gray-400 mt-0.5">Thứ Hai, 08/06/2026</p>
        </div>
        <button className="flex items-center gap-2 bg-accent-500 hover:bg-accent-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-sm">
          <Plus size={16} strokeWidth={2.5} />
          Thêm đơn hàng
        </button>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-4 gap-4">
        <MetricCard title="Tổng đơn hàng" value={String(OPPORTUNITIES.length)} sub="tất cả thời gian"
          icon={<BarChart3 size={20} className="text-gray-500" />} iconBg="bg-gray-100" />
        <MetricCard title="Đang xử lý" value={String(activeOpps.length)}
          sub={`${lostCount} đơn đã mất`}
          icon={<Clock size={20} className="text-accent-500" />} iconBg="bg-brand-50" valueColor="text-brand-700" />
        <MetricCard
          title="Hoàn thành tháng này"
          value={String(wonThisMonth.length)}
          sub={`${formatVND(wonThisMonth.reduce((s, o) => s + (o.actual_value ?? 0), 0))} doanh thu`}
          icon={<CheckCircle2 size={20} className="text-emerald-600" />} iconBg="bg-emerald-50" valueColor="text-emerald-700" />
        <MetricCard
          title="Log hôm nay"
          value={String(todayLogs.length)}
          sub={`${new Set(todayLogs.map(l => l.user_id)).size} nhân viên cập nhật`}
          icon={<Activity size={20} className="text-violet-600" />} iconBg="bg-violet-50" valueColor="text-violet-700" />
      </div>

      {/* Deadline alerts */}
      {urgentDeadlines.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-center gap-2 text-amber-800 font-semibold text-sm mb-2.5">
            <AlertTriangle size={15} />
            {urgentDeadlines.length} đơn có deadline trong 20 ngày tới
          </div>
          <div className="space-y-2">
            {urgentDeadlines.map(o => {
              const days = daysUntil(o.deadline!)
              return (
                <div key={o.id} className="flex items-center justify-between bg-white rounded-lg px-4 py-2.5 border border-amber-100">
                  <Link href={`/co-hoi/${o.id}`} className="font-semibold text-gray-800 hover:text-accent-500 hover:underline text-sm">
                    {o.title}
                  </Link>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${days <= 7 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                    {formatDate(o.deadline!)} · còn {days} ngày
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

    </div>
  )
}

function MetricCard({ title, value, sub, icon, iconBg, valueColor = 'text-gray-900' }: {
  title: string; value: string; sub: string; icon: React.ReactNode; iconBg: string; valueColor?: string
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
      <div className="flex items-start justify-between mb-3">
        <span className="text-sm text-gray-500 font-medium">{title}</span>
        <div className={`w-10 h-10 ${iconBg} rounded-xl flex items-center justify-center flex-shrink-0`}>{icon}</div>
      </div>
      <div className={`text-3xl font-bold ${valueColor} mb-1`}>{value}</div>
      <div className="text-xs text-gray-400">{sub}</div>
    </div>
  )
}

function AllOppsTab() {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            {['Đơn hàng', 'Nguồn', 'Giai đoạn', 'Sale TV', 'Giá trị', 'Ngày tour', 'Deadline', ''].map(h => (
              <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {OPPORTUNITIES.map(opp => {
            const contact = getContactById(opp.contact_id)
            const user = getUserById(opp.assigned_to)
            const sc = STAGE_COLORS[opp.stage]
            const deadline = opp.deadline ? daysUntil(opp.deadline) : null
            return (
              <tr key={opp.id} className="hover:bg-gray-50/70 group transition-colors">
                <td className="px-5 py-3.5">
                  <div className="font-semibold text-gray-900 group-hover:text-brand-700 transition-colors">{opp.title}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{contact?.company ?? contact?.name}</div>
                </td>
                <td className="px-5 py-3.5">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${SOURCE_COLORS[opp.source]}`}>
                    {SOURCE_LABELS[opp.source]}
                  </span>
                </td>
                <td className="px-5 py-3.5">
                  <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${sc.bg} ${sc.text}`}>
                    {STAGE_LABELS[opp.stage]}
                  </span>
                </td>
                <td className="px-5 py-3.5">
                  {user && (
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-slate-200 rounded-full flex items-center justify-center text-[10px] font-bold text-slate-600">
                        {getInitials(user.full_name)}
                      </div>
                      <span className="text-gray-700 whitespace-nowrap">{user.full_name.split(' ').pop()}</span>
                    </div>
                  )}
                </td>
                <td className="px-5 py-3.5 text-right">
                  <span className="font-semibold text-gray-900 whitespace-nowrap">
                    {opp.estimated_value ? formatVND(opp.estimated_value) : '—'}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-gray-500 whitespace-nowrap">
                  {opp.tour_date ? formatDate(opp.tour_date) : '—'}
                </td>
                <td className="px-5 py-3.5">
                  {opp.deadline ? (
                    <span className={`text-xs font-medium whitespace-nowrap ${
                      deadline !== null && deadline < 0 ? 'text-red-600'
                      : deadline !== null && deadline <= 7 ? 'text-amber-600'
                      : 'text-gray-500'
                    }`}>
                      {formatDate(opp.deadline)}
                      {deadline !== null && deadline >= 0 && deadline <= 7 && ` · ${deadline}N`}
                    </span>
                  ) : <span className="text-gray-300">—</span>}
                </td>
                <td className="px-4 py-3.5">
                  <Link href={`/co-hoi/${opp.id}`}
                    className="p-1.5 rounded-lg hover:bg-brand-50 text-gray-300 hover:text-accent-500 transition-colors inline-flex">
                    <ChevronRight size={16} />
                  </Link>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function TodayByStaffTab() {
  const saleTVUsers = USERS.filter(u => u.is_sale_tv)
  return (
    <div className="grid grid-cols-2 gap-4 p-5">
      {saleTVUsers.map(user => {
        const userLogs = todayLogs.filter(l => l.user_id === user.id)
        const openCount = OPPORTUNITIES.filter(o => ACTIVE_STAGES.includes(o.stage as OppStage) && o.assigned_to === user.id).length
        const hasLogs = userLogs.length > 0
        return (
          <div key={user.id} className={`rounded-xl border p-4 ${hasLogs ? 'border-emerald-200 bg-emerald-50/40' : 'border-gray-200 bg-gray-50/50'}`}>
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${hasLogs ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-400'}`}>
                {getInitials(user.full_name)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-gray-900 text-sm">{user.full_name}</div>
                <div className="text-xs text-gray-400">{openCount} đơn đang xử lý</div>
              </div>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0 ${hasLogs ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-400'}`}>
                {hasLogs ? `${userLogs.length} log hôm nay` : 'Chưa log'}
              </span>
            </div>
            {userLogs.length > 0 && (
              <div className="space-y-2">
                {userLogs.map(log => {
                  const opp = OPPORTUNITIES.find(o => o.id === log.opportunity_id)
                  return (
                    <div key={log.id} className="bg-white rounded-lg p-3 border border-emerald-100 text-xs">
                      <div className="font-semibold text-gray-700 mb-0.5">{opp?.title}</div>
                      <div className="text-gray-500 line-clamp-2">{log.description}</div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function SourceTab() {
  const active = OPPORTUNITIES.filter(o => o.stage !== 'lost' && o.stage !== 'cancelled')
  const total = active.length
  const sources: LeadSource[] = ['mkt', 'sale', 'partner', 'bod', 'referral', 'cskh']
  const counts: Partial<Record<LeadSource, number>> = {}
  const values: Partial<Record<LeadSource, number>> = {}
  active.forEach(o => {
    counts[o.source] = (counts[o.source] ?? 0) + 1
    values[o.source] = (values[o.source] ?? 0) + (o.estimated_value ?? 0)
  })
  return (
    <div className="p-5">
      <div className="grid grid-cols-3 gap-4">
        {sources.filter(s => (counts[s] ?? 0) > 0).map(s => {
          const cnt = counts[s] ?? 0
          const pct = Math.round((cnt / total) * 100)
          return (
            <div key={s} className="bg-gray-50 border border-gray-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${SOURCE_COLORS[s]}`}>{SOURCE_LABELS[s]}</span>
                <span className="text-xl font-bold text-gray-900">{cnt}</span>
              </div>
              <div className="text-xs text-gray-400 mb-3">{formatVND(values[s] ?? 0)} ước tính</div>
              <div className="w-full bg-gray-200 rounded-full h-1.5 mb-1.5">
                <div className="bg-brand-500 h-1.5 rounded-full" style={{ width: `${pct}%` }} />
              </div>
              <div className="text-xs text-gray-400">{pct}% tổng đơn đang xử lý</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
