'use client'

import { useState, useEffect, useCallback } from 'react'
import { CheckCircle2, X, UserPlus, ClipboardList, ChevronDown, ChevronUp, ClipboardCheck } from 'lucide-react'
import Link from 'next/link'
import { USERS, OPPORTUNITIES, CONTACTS, TASKS, getOppById, mockFetch } from '@/lib/mock-data'
import { useTopbar } from '@/contexts/topbar'
import { STAGE_COLORS, STAGE_SHORT, formatVND, getInitials, formatDate } from '@/lib/utils'
import type { OppStage, LeadSource } from '@/types'

const ACTIVE_STAGES: OppStage[] = ['stage_1', 'stage_2', 'stage_3', 'stage_4', 'stage_5']

const ROLE_LABELS: Record<string, string> = {
  boss: 'Giám đốc', admin: 'Quản trị viên', sale_admin: 'Sale Admin',
  mkt: 'Marketing', cskh: 'CSKH', sale: 'Sale TV',
}
const ROLE_COLORS: Record<string, string> = {
  boss: 'bg-yellow-100 text-yellow-700',
  admin: 'bg-slate-100 text-slate-700',
  sale_admin: 'bg-brand-100 text-brand-700',
  mkt: 'bg-pink-100 text-pink-700',
  cskh: 'bg-teal-100 text-teal-700',
  sale: 'bg-brand-100 text-brand-700',
}
const AVATAR_COLORS = [
  'from-blue-400 to-blue-600',
  'from-indigo-400 to-indigo-600',
  'from-violet-400 to-violet-600',
  'from-amber-400 to-amber-600',
]
const SOURCES: { value: LeadSource; label: string }[] = [
  { value: 'mkt', label: 'Marketing' },
  { value: 'sale', label: 'Sale' },
  { value: 'partner', label: 'Đối tác' },
  { value: 'bod', label: 'Ban Giám đốc' },
  { value: 'referral', label: 'Giới thiệu' },
  { value: 'cskh', label: 'CSKH' },
]
const EMPTY_FORM = { title: '', contact_id: '', source: 'mkt' as LeadSource }

// All pending tasks from all opportunities
const ALL_PENDING_TASKS = TASKS.filter(t => !t.is_done)

export default function StaffPage() {
  const { setOnRefresh } = useTopbar()
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    setLoading(true)
    await mockFetch(null, 1000)
    setLoading(false)
  }, [])

  useEffect(() => {
    loadData()
    setOnRefresh(loadData)
    return () => setOnRefresh(null)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const allUsers = USERS.filter(u => u.is_active)
  const saleTVUsers = allUsers.filter(u => u.is_sale_tv)
  const otherUsers = allUsers.filter(u => !u.is_sale_tv)

  // "Giao đơn" panel state
  const [openDealCard, setOpenDealCard] = useState<string | null>(null)
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [formError, setFormError] = useState('')
  const [dealSuccessFor, setDealSuccessFor] = useState<string | null>(null)

  // "Giao việc" panel state
  const [openTaskPanel, setOpenTaskPanel] = useState<string | null>(null)
  const [taskAssignments, setTaskAssignments] = useState<Record<string, string>>(() => {
    // seed from mock data
    const init: Record<string, string> = {}
    TASKS.forEach(t => { if (t.assigned_to) init[t.id] = t.assigned_to })
    return init
  })
  const [expandMyTasks, setExpandMyTasks] = useState<string | null>(null)

  function getEffectiveAssignee(taskId: string) { return taskAssignments[taskId] }

  function assignTask(taskId: string, userId: string) {
    setTaskAssignments(prev => ({ ...prev, [taskId]: userId }))
  }
  function unassignTask(taskId: string) {
    setTaskAssignments(prev => { const n = { ...prev }; delete n[taskId]; return n })
  }

  function openDeal(userId: string) {
    setOpenDealCard(userId)
    setOpenTaskPanel(null)
    setForm({ ...EMPTY_FORM })
    setFormError('')
  }
  function openTasks(userId: string) {
    setOpenTaskPanel(userId)
    setOpenDealCard(null)
  }
  function closeAll() {
    setOpenDealCard(null)
    setOpenTaskPanel(null)
    setFormError('')
  }

  function handleDealAssign(userId: string) {
    if (!form.title.trim()) { setFormError('Vui lòng nhập tên đơn hàng'); return }
    if (!form.contact_id) { setFormError('Vui lòng chọn khách hàng'); return }
    setOpenDealCard(null)
    setDealSuccessFor(userId)
    setTimeout(() => setDealSuccessFor(null), 4000)
  }

  if (loading) return (
    <div className="p-6 max-w-[1400px] mx-auto animate-pulse space-y-4">
      <div className="h-8 bg-gray-100 rounded w-32" />
      <div className="grid grid-cols-2 gap-4">
        {[...Array(4)].map((_, i) => <div key={i} className="h-64 bg-gray-100 rounded-2xl" />)}
      </div>
    </div>
  )

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Nhân viên</h1>
        <p className="text-sm text-gray-400 mt-0.5">{allUsers.length} thành viên đang hoạt động</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
          {saleTVUsers.map((user, idx) => {
            const openOpps = OPPORTUNITIES.filter(o =>
              o.assigned_to === user.id && ACTIVE_STAGES.includes(o.stage as OppStage)
            )
            const stageBreakdown = ACTIVE_STAGES
              .map(s => ({ stage: s, count: openOpps.filter(o => o.stage === s).length }))
              .filter(sb => sb.count > 0)
            const totalValue = openOpps.reduce((s, o) => s + (o.estimated_value ?? 0), 0)

            const isDealOpen = openDealCard === user.id
            const isTaskOpen = openTaskPanel === user.id
            const isDealSuccess = dealSuccessFor === user.id

            const myTasks = ALL_PENDING_TASKS.filter(t => getEffectiveAssignee(t.id) === user.id)
            const isTasksExpanded = expandMyTasks === user.id

            // Pending tasks grouped by opp for the assignment panel
            const oppIds = Array.from(new Set(ALL_PENDING_TASKS.map(t => t.opportunity_id)))

            return (
              <div key={user.id} className={`bg-white rounded-2xl border shadow-sm transition-all overflow-hidden ${
                isDealOpen || isTaskOpen ? 'border-brand-300 shadow-md' : 'border-gray-200 hover:shadow-md'
              }`}>

                {/* Card body */}
                <div className="p-5">
                  {/* Top: avatar + info + deal count */}
                  <div className="flex items-start gap-4 mb-4">
                    <div className={`w-14 h-14 bg-gradient-to-br ${AVATAR_COLORS[idx % AVATAR_COLORS.length]} rounded-2xl flex items-center justify-center text-white font-bold text-lg flex-shrink-0 shadow-sm`}>
                      {getInitials(user.full_name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-gray-900">{user.full_name}</div>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${ROLE_COLORS[user.role]}`}>
                        {ROLE_LABELS[user.role]}
                      </span>
                      <div className="text-xs text-gray-400 mt-1.5">{user.email}</div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-3xl font-black text-gray-900">{openOpps.length}</div>
                      <div className="text-xs text-gray-400">đơn đang xử lý</div>
                    </div>
                  </div>

                  {/* Stage breakdown */}
                  {stageBreakdown.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {stageBreakdown.map(({ stage, count }) => {
                        const ss = STAGE_COLORS[stage]
                        return (
                          <span key={stage} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${ss.bg} ${ss.text}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${ss.dot}`} />
                            {STAGE_SHORT[stage]}: {count}
                          </span>
                        )
                      })}
                    </div>
                  )}

                  {/* Total value */}
                  {totalValue > 0 && (
                    <div className="pt-3 border-t border-gray-100 flex items-center justify-between mb-3">
                      <span className="text-xs text-gray-400">Tổng giá trị</span>
                      <span className="font-bold text-gray-900 text-sm">{formatVND(totalValue)}</span>
                    </div>
                  )}

                  {/* Assigned tasks summary */}
                  {myTasks.length > 0 && (
                    <div className="pt-3 border-t border-gray-100 mb-3">
                      <button
                        onClick={() => setExpandMyTasks(isTasksExpanded ? null : user.id)}
                        className="w-full flex items-center justify-between text-xs font-semibold text-accent-500 hover:text-indigo-800 transition-colors"
                      >
                        <span className="flex items-center gap-1.5">
                          <ClipboardList size={12} />
                          {myTasks.length} việc đang được giao
                        </span>
                        {isTasksExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                      </button>
                      {isTasksExpanded && (
                        <div className="mt-2 space-y-1.5">
                          {myTasks.map(task => {
                            const opp = getOppById(task.opportunity_id)
                            return (
                              <div key={task.id} className="bg-brand-50 border border-brand-100 rounded-xl px-3 py-2">
                                <div className="text-xs text-gray-700 font-medium leading-snug">{task.title}</div>
                                <div className="flex items-center justify-between mt-1">
                                  <span className="text-[10px] text-brand-400 truncate">{opp?.title}</span>
                                  {task.due_date && (
                                    <span className="text-[10px] font-bold text-amber-500">{formatDate(task.due_date)}</span>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Action buttons */}
                  {isDealSuccess ? (
                    <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">
                      <CheckCircle2 size={14} className="text-emerald-500 flex-shrink-0" />
                      <span className="text-xs text-emerald-700 font-medium">
                        Đã giao đơn cho <strong>{user.full_name.split(' ').pop()}</strong>!
                      </span>
                    </div>
                  ) : (isDealOpen || isTaskOpen) ? (
                    <button onClick={closeAll} className="w-full flex items-center justify-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 py-1.5 border border-gray-100 rounded-xl transition-colors">
                      <X size={13} /> Đóng
                    </button>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        onClick={() => openDeal(user.id)}
                        className="flex-1 flex items-center justify-center gap-1.5 text-sm font-semibold text-accent-500 bg-brand-50 hover:bg-brand-100 rounded-xl py-2.5 transition-all border border-brand-100"
                      >
                        <UserPlus size={14} /> Giao đơn
                      </button>
                      <button
                        onClick={() => openTasks(user.id)}
                        className="flex-1 flex items-center justify-center gap-1.5 text-sm font-semibold text-accent-500 bg-brand-50 hover:bg-brand-100 rounded-xl py-2.5 transition-all border border-brand-100"
                      >
                        <ClipboardCheck size={14} /> Giao việc
                      </button>
                    </div>
                  )}
                </div>

                {/* ── Giao đơn panel ── */}
                {isDealOpen && (
                  <div className="border-t border-brand-100 bg-brand-50/40 px-5 py-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-brand-700">Giao đơn mới cho {user.full_name.split(' ').pop()}</span>
                      <button onClick={closeAll}><X size={14} className="text-gray-400" /></button>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1">Tên đơn hàng <span className="text-red-400">*</span></label>
                      <input
                        type="text" placeholder="VD: Honda VN – Team Kinh doanh"
                        value={form.title}
                        onChange={e => { setForm(f => ({ ...f, title: e.target.value })); setFormError('') }}
                        className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-400 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1">Khách hàng <span className="text-red-400">*</span></label>
                      <select
                        value={form.contact_id}
                        onChange={e => { setForm(f => ({ ...f, contact_id: e.target.value })); setFormError('') }}
                        className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-400 bg-white text-gray-700"
                      >
                        <option value="">— Chọn liên hệ —</option>
                        {CONTACTS.map(c => <option key={c.id} value={c.id}>{c.name}{c.company ? ` · ${c.company}` : ''}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1">Nguồn</label>
                      <select
                        value={form.source}
                        onChange={e => setForm(f => ({ ...f, source: e.target.value as LeadSource }))}
                        className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-400 bg-white"
                      >
                        {SOURCES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                      </select>
                    </div>
                    {formError && <p className="text-xs text-red-500">⚠ {formError}</p>}
                    <div className="flex gap-2">
                      <button onClick={() => handleDealAssign(user.id)} className="flex-1 bg-accent-500 hover:bg-accent-600 text-white py-2 rounded-xl text-sm font-bold transition-colors">
                        Xác nhận
                      </button>
                      <Link href="/giao-viec" className="px-3 py-2 rounded-xl border border-gray-200 text-xs text-gray-500 hover:bg-gray-100 flex items-center">
                        Chi tiết →
                      </Link>
                    </div>
                  </div>
                )}

                {/* ── Giao việc panel ── */}
                {isTaskOpen && (
                  <div className="border-t border-brand-100 bg-brand-50/30 px-5 py-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-bold text-brand-700">Giao việc cho {user.full_name.split(' ').pop()}</span>
                      <button onClick={closeAll}><X size={14} className="text-gray-400" /></button>
                    </div>

                    <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                      {oppIds.map(oppId => {
                        const opp = getOppById(oppId)
                        const oppTasks = ALL_PENDING_TASKS.filter(t => t.opportunity_id === oppId)
                        if (!opp || oppTasks.length === 0) return null
                        const sc = STAGE_COLORS[opp.stage]
                        return (
                          <div key={oppId} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                            {/* Opp header */}
                            <div className={`px-3 py-2 flex items-center gap-2 border-b border-gray-100 ${sc.bg}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${sc.dot} flex-shrink-0`} />
                              <span className={`text-xs font-bold truncate ${sc.text}`}>{opp.title}</span>
                            </div>
                            {/* Task rows */}
                            <div className="divide-y divide-gray-50">
                              {oppTasks.map(task => {
                                const assignedTo = getEffectiveAssignee(task.id)
                                const assignedUser = assignedTo ? USERS.find(u => u.id === assignedTo) : null
                                const isAssignedToMe = assignedTo === user.id

                                return (
                                  <div key={task.id} className="px-3 py-2.5 flex items-center gap-2">
                                    <div className="flex-1 min-w-0">
                                      <div className="text-xs text-gray-700 leading-snug">{task.title}</div>
                                      {task.due_date && (
                                        <span className="text-[10px] text-amber-500 font-medium">{formatDate(task.due_date)}</span>
                                      )}
                                    </div>
                                    {/* Current assignee badge */}
                                    {isAssignedToMe ? (
                                      <div className="flex items-center gap-1.5 flex-shrink-0">
                                        <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded-full">
                                          ✓ Đã giao
                                        </span>
                                        <button
                                          onClick={() => unassignTask(task.id)}
                                          className="text-[10px] text-gray-400 hover:text-red-500 transition-colors px-1"
                                          title="Huỷ giao"
                                        >
                                          <X size={11} />
                                        </button>
                                      </div>
                                    ) : assignedUser ? (
                                      <div className="flex items-center gap-1.5 flex-shrink-0">
                                        <span className="flex items-center gap-1 text-[10px] text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                                          <span className="w-3 h-3 rounded-full bg-slate-400 flex items-center justify-center text-[7px] font-bold text-white">
                                            {getInitials(assignedUser.full_name)}
                                          </span>
                                          {assignedUser.full_name.split(' ').pop()}
                                        </span>
                                        <button
                                          onClick={() => assignTask(task.id, user.id)}
                                          className="text-[10px] font-bold text-accent-500 bg-brand-100 hover:bg-brand-200 px-2 py-0.5 rounded-full transition-colors flex-shrink-0"
                                        >
                                          Giao lại
                                        </button>
                                      </div>
                                    ) : (
                                      <button
                                        onClick={() => assignTask(task.id, user.id)}
                                        className="text-[10px] font-bold text-accent-500 bg-brand-100 hover:bg-brand-200 px-2.5 py-1 rounded-full transition-colors flex-shrink-0 whitespace-nowrap"
                                      >
                                        + Giao
                                      </button>
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
    </div>
  )
}
