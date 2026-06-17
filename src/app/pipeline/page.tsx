'use client'

import Link from 'next/link'
import { Plus } from 'lucide-react'
import { OPPORTUNITIES, getUserById, getContactById } from '@/lib/mock-data'
import { STAGE_LABELS, STAGE_COLORS, SOURCE_LABELS, SOURCE_COLORS, formatVND, formatDate, daysUntil, getInitials } from '@/lib/utils'
import type { OppStage } from '@/types'

const COLUMNS: { stage: OppStage; label: string }[] = [
  { stage: 'stage_1', label: 'GĐ1 · Tư vấn' },
  { stage: 'stage_2', label: 'GĐ2 · Báo giá' },
  { stage: 'stage_3', label: 'GĐ3 · Trước tour' },
  { stage: 'stage_4', label: 'GĐ4 · Trong tour' },
  { stage: 'stage_5', label: 'GĐ5 · Sau tour' },
  { stage: 'lost', label: 'Mất đơn' },
]

export default function PipelinePage() {
  const activeCount = OPPORTUNITIES.filter(o => !['lost', 'cancelled'].includes(o.stage)).length

  return (
    <div className="flex flex-col" style={{ height: '100vh' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200 bg-white flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pipeline</h1>
          <p className="text-sm text-gray-400 mt-0.5">{activeCount} đơn đang xử lý</p>
        </div>
        <Link href="/opportunities/new" className="flex items-center gap-2 bg-accent-500 hover:bg-accent-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors">
          <Plus size={16} strokeWidth={2.5} />
          Thêm đơn
        </Link>
      </div>

      {/* Kanban board */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden">
        <div className="flex h-full" style={{ minWidth: `${COLUMNS.length * 290}px` }}>
          {COLUMNS.map(({ stage, label }) => {
            const cards = OPPORTUNITIES.filter(o => o.stage === stage)
            const totalValue = cards.reduce((s, o) => s + (o.estimated_value ?? 0), 0)
            const sc = STAGE_COLORS[stage]
            return (
              <div key={stage} className="flex flex-col border-r border-gray-200 bg-gray-50/70" style={{ width: '290px', minWidth: '290px' }}>
                {/* Column header */}
                <div className="px-4 py-3 border-b border-gray-200 bg-white flex-shrink-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <div className="flex items-center gap-2">
                      <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${sc.dot}`} />
                      <span className="font-semibold text-gray-800 text-sm">{label}</span>
                    </div>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${sc.bg} ${sc.text}`}>
                      {cards.length}
                    </span>
                  </div>
                  {totalValue > 0 && (
                    <div className="text-xs text-gray-400 pl-5">{formatVND(totalValue)}</div>
                  )}
                </div>

                {/* Cards */}
                <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
                  {cards.map(opp => {
                    const contact = getContactById(opp.contact_id)
                    const user = getUserById(opp.assigned_to)
                    const deadline = opp.deadline ? daysUntil(opp.deadline) : null
                    const isUrgent = deadline !== null && deadline >= 0 && deadline <= 5
                    const isOverdue = deadline !== null && deadline < 0

                    return (
                      <Link key={opp.id} href={`/opportunities/${opp.id}`}>
                        <div className={`bg-white rounded-xl border border-gray-200 border-l-4 ${sc.side} p-3.5 hover:shadow-md transition-all cursor-pointer group`}>
                          <div className="font-semibold text-sm text-gray-900 group-hover:text-brand-700 transition-colors mb-0.5 line-clamp-2 leading-snug">
                            {opp.title}
                          </div>
                          <div className="text-xs text-gray-400 mb-2.5">
                            {contact?.company ?? contact?.name}
                          </div>

                          <div className="flex items-center justify-between mb-2.5">
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${SOURCE_COLORS[opp.source]}`}>
                              {SOURCE_LABELS[opp.source]}
                            </span>
                            {opp.estimated_value && stage !== 'lost' && (
                              <span className="text-xs font-bold text-gray-700">{formatVND(opp.estimated_value)}</span>
                            )}
                          </div>

                          <div className="flex items-center justify-between">
                            {user && (
                              <div className="flex items-center gap-1.5">
                                <div className="w-5 h-5 bg-slate-200 rounded-full flex items-center justify-center text-[10px] font-bold text-slate-600">
                                  {getInitials(user.full_name)}
                                </div>
                                <span className="text-xs text-gray-500">{user.full_name.split(' ').pop()}</span>
                              </div>
                            )}
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
                            <div className="mt-2.5 text-[11px] text-red-500 bg-red-50 rounded-lg px-2.5 py-2 line-clamp-2 leading-relaxed">
                              {opp.lost_reason}
                            </div>
                          )}
                        </div>
                      </Link>
                    )
                  })}

                  {cards.length === 0 && (
                    <div className="flex items-center justify-center h-20 text-sm text-gray-300 border-2 border-dashed border-gray-200 rounded-xl">
                      Không có đơn
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
