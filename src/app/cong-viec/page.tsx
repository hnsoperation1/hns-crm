'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  ChevronRight, Clock, CalendarDays,
  CheckCircle2, AlertCircle, Square,
  Plus, MessageSquare, AlertTriangle, Sparkles,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/auth'
import { useTopbar } from '@/contexts/topbar'
import {
  STAGE_LABELS, STAGE_COLORS, SOURCE_COLORS, SOURCE_LABELS,
  formatVND, formatDate, daysSince, daysUntil,
} from '@/lib/utils'
import type { Opportunity, Task, ActivityLog, OppStage } from '@/types'

const ACTIVE_STAGES: OppStage[] = ['stage_1', 'stage_2', 'stage_3', 'stage_4', 'stage_5']

export default function TasksPage() {
  const { user: currentUser } = useAuth()
  const { setOnRefresh } = useTopbar()
  const supabase = createClient()

  const [opps, setOpps] = useState<Opportunity[]>([])
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)

  const today = new Date().toISOString().split('T')[0]

  const loadData = useCallback(() => {
    if (!currentUser?.id) { setLoading(false); return }
    setLoading(true)
    Promise.all([
      supabase.from('opportunities').select('*').eq('assigned_to', currentUser.id).in('stage', ACTIVE_STAGES),
      supabase.from('activity_logs').select('*').order('log_date', { ascending: false }),
      supabase.from('tasks').select('*'),
    ]).then(([oppsRes, logsRes, tasksRes]) => {
      const oppList = (oppsRes.data ?? []) as Opportunity[]
      setOpps(oppList)
      const oppIds = oppList.map(o => o.id)
      setLogs(((logsRes.data ?? []) as ActivityLog[]).filter(l => oppIds.includes(l.opportunity_id)))
      setTasks(((tasksRes.data ?? []) as Task[]).filter(t => oppIds.includes(t.opportunity_id)))
      setLoading(false)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id])

  useEffect(() => {
    loadData()
    setOnRefresh(loadData)
    return () => setOnRefresh(null)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id])

  // Derived: opp status
  const oppStatus = opps.map(opp => {
    const oppLogs = logs
      .filter(l => l.opportunity_id === opp.id)
      .sort((a, b) => new Date(b.log_date).getTime() - new Date(a.log_date).getTime())
    const last = oppLogs[0]
    return {
      opp,
      lastLogDate: last?.log_date ?? null,
      lastLogDesc: last?.description ?? null,
      loggedToday: last?.log_date === today,
      daysSinceLast: last ? daysSince(last.log_date) : null,
    }
  }).sort((a, b) => {
    if (a.loggedToday !== b.loggedToday) return a.loggedToday ? 1 : -1
    const da = a.opp.deadline ? daysUntil(a.opp.deadline) : 999
    const db = b.opp.deadline ? daysUntil(b.opp.deadline) : 999
    return da - db
  })

  // Derived: task groups
  const taskGroups = opps.map(opp => {
    const oppTasks = tasks.filter(t => t.opportunity_id === opp.id)
    return { opp, pending: oppTasks.filter(t => !t.is_done), done: oppTasks.filter(t => t.is_done) }
  }).filter(g => g.pending.length > 0)

  const urgentTasks = taskGroups
    .flatMap(g => g.pending.map(t => ({ ...t, oppTitle: g.opp.title })))
    .filter(t => t.due_date)
    .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime())

  const loggedTodayCount = oppStatus.filter(s => s.loggedToday).length
  const pendingTaskCount = taskGroups.reduce((s, g) => s + g.pending.length, 0)
  const nearestDeadline = [...opps].filter(o => o.deadline)
    .sort((a, b) => new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime())[0]

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-5">

      {/* HEADER */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Nhiệm vụ hằng ngày</h1>
          <p className="text-sm text-gray-400 mt-0.5">{new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })}</p>
        </div>

      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24 text-sm text-gray-400">Đang tải...</div>
      ) : (
        <>
          {/* SUMMARY CARDS */}
          <div className="grid grid-cols-4 gap-4">
            <SummaryCard label="Đang xử lý" value={`${opps.length} đơn`} sub="được giao" color="blue" icon="📋" />
            <SummaryCard
              label="Đã log hôm nay"
              value={`${loggedTodayCount}/${opps.length}`}
              sub={opps.length === 0 ? '—' : loggedTodayCount === opps.length ? '✓ Hoàn thành' : `Còn ${opps.length - loggedTodayCount} chưa log`}
              color={opps.length > 0 && loggedTodayCount === opps.length ? 'green' : 'amber'}
              icon={opps.length > 0 && loggedTodayCount === opps.length ? '✅' : '⏰'}
            />
            <SummaryCard
              label="Việc chưa hoàn thành"
              value={`${pendingTaskCount} task`}
              sub={urgentTasks.length > 0 ? `${urgentTasks.length} có deadline` : 'Không có deadline gấp'}
              color={pendingTaskCount > 0 ? 'violet' : 'green'}
              icon="📝"
            />
            <SummaryCard
              label="Deadline gần nhất"
              value={nearestDeadline ? formatDate(nearestDeadline.deadline!) : '—'}
              sub={nearestDeadline ? `Còn ${daysUntil(nearestDeadline.deadline!)} ngày` : 'Không có deadline'}
              color={nearestDeadline && daysUntil(nearestDeadline.deadline!) <= 7 ? 'red' : 'gray'}
              icon="📅"
            />
          </div>

          {/* MAIN CONTENT */}
          <div className="grid grid-cols-3 gap-5">

            {/* Left 2/3 */}
            <div className="col-span-2 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-gray-900">Đơn hàng cần theo dõi</h2>
                <span className="text-xs text-gray-400">{opps.length} đơn đang xử lý</span>
              </div>

              {opps.length === 0 && (
                <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center text-gray-400">
                  <div className="text-4xl mb-3">🎉</div>
                  <div className="font-medium">Không có đơn hàng đang xử lý</div>
                </div>
              )}

              {oppStatus.map(({ opp, lastLogDate, lastLogDesc, loggedToday, daysSinceLast }) => {
                const sc = STAGE_COLORS[opp.stage]
                const deadline = opp.deadline ? daysUntil(opp.deadline) : null
                const tourDays = opp.tour_date ? daysUntil(opp.tour_date) : null
                const isUrgentLog = !loggedToday && (daysSinceLast === null || daysSinceLast >= 2)
                return (
                  <div key={opp.id} className={`bg-white rounded-2xl border shadow-sm overflow-hidden hover:shadow-md transition-shadow ${isUrgentLog ? 'border-amber-200' : 'border-gray-200'}`}>
                    <div className="p-4">
                      <div className="flex items-start gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${sc.bg}`}>
                          <div className={`w-3 h-3 rounded-full ${sc.dot}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-3 mb-1.5">
                            <div>
                              <div className="font-bold text-gray-900 leading-snug">{opp.title}</div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${sc.bg} ${sc.text}`}>{STAGE_LABELS[opp.stage]}</span>
                              <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${SOURCE_COLORS[opp.source]}`}>{SOURCE_LABELS[opp.source]}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-4 flex-wrap mb-3">
                            {opp.estimated_value && <span className="text-xs font-bold text-gray-700">{formatVND(opp.estimated_value)}</span>}
                            {tourDays !== null && (
                              <span className={`text-xs flex items-center gap-1 ${tourDays <= 0 ? 'text-emerald-600 font-semibold' : tourDays <= 7 ? 'text-amber-600' : 'text-gray-500'}`}>
                                <CalendarDays size={11} />
                                Tour {formatDate(opp.tour_date!)}{tourDays > 0 ? ` · ${tourDays}N` : ' · Đang diễn ra'}
                              </span>
                            )}
                            {deadline !== null && (
                              <span className={`text-xs flex items-center gap-1 font-medium ${deadline < 0 ? 'text-red-600' : deadline <= 7 ? 'text-red-500' : deadline <= 14 ? 'text-amber-500' : 'text-gray-400'}`}>
                                <Clock size={11} />
                                Deadline {formatDate(opp.deadline!)} · còn {deadline}N
                              </span>
                            )}
                          </div>

                          <div className={`flex items-start gap-3 rounded-xl p-3 ${loggedToday ? 'bg-emerald-50 border border-emerald-100' : isUrgentLog ? 'bg-amber-50 border border-amber-100' : 'bg-gray-50 border border-gray-100'}`}>
                            <div className="flex-shrink-0 mt-0.5">
                              {loggedToday
                                ? <CheckCircle2 size={16} className="text-emerald-500" />
                                : <AlertCircle size={16} className={isUrgentLog ? 'text-amber-500' : 'text-gray-400'} />}
                            </div>
                            <div className="flex-1 min-w-0">
                              {loggedToday ? (
                                <div>
                                  <span className="text-xs font-bold text-emerald-700">Đã log hôm nay</span>
                                  {lastLogDesc && <p className="text-xs text-emerald-600 mt-0.5 line-clamp-1 opacity-80">{lastLogDesc}</p>}
                                </div>
                              ) : (
                                <div>
                                  <span className={`text-xs font-bold ${isUrgentLog ? 'text-amber-700' : 'text-gray-600'}`}>
                                    {daysSinceLast === null ? 'Chưa có log nào'
                                      : daysSinceLast === 0 ? 'Log gần nhất: hôm nay'
                                      : `Log gần nhất: ${daysSinceLast} ngày trước (${formatDate(lastLogDate!)})`}
                                  </span>
                                  {lastLogDesc && <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{lastLogDesc}</p>}
                                </div>
                              )}
                            </div>
                            <Link
                              href={`/co-hoi/${opp.id}`}
                              className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors flex-shrink-0 ${
                                loggedToday ? 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200' : 'bg-accent-500 text-white hover:bg-accent-600'
                              }`}
                            >
                              {loggedToday ? <><MessageSquare size={12} /> Xem log</> : <><Plus size={12} /> Thêm log</>}
                            </Link>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Right 1/3 */}
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-bold text-gray-900">Công việc chưa hoàn thành</h2>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${pendingTaskCount > 0 ? 'bg-violet-100 text-violet-700' : 'bg-gray-100 text-gray-400'}`}>{pendingTaskCount}</span>
                </div>
                {taskGroups.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
                    <div className="text-3xl mb-2">✅</div>
                    <div className="text-sm font-semibold text-gray-700">Tất cả đã hoàn thành!</div>
                    <div className="text-xs text-gray-400 mt-1">Không có công việc nào đang chờ</div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {taskGroups.map(({ opp, pending, done }) => {
                      const sc = STAGE_COLORS[opp.stage]
                      return (
                        <div key={opp.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                          <div className={`px-4 py-3 border-b flex items-center justify-between ${sc.bg} ${sc.border}`}>
                            <div className="flex items-center gap-2 min-w-0">
                              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${sc.dot}`} />
                              <span className={`text-xs font-bold truncate ${sc.text}`}>{opp.title}</span>
                            </div>
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              <span className={`text-[11px] font-semibold ${sc.text} opacity-70`}>{done.length}/{done.length + pending.length}</span>
                              <Link href={`/co-hoi/${opp.id}`} className={`${sc.text} hover:opacity-70`}><ChevronRight size={14} /></Link>
                            </div>
                          </div>
                          <div className="h-1 bg-gray-100">
                            <div className={`h-1 ${sc.col} transition-all`} style={{ width: `${(done.length / (done.length + pending.length)) * 100}%` }} />
                          </div>
                          <div className="p-3 space-y-2">
                            {pending.map(task => {
                              const td = task.due_date ? daysUntil(task.due_date) : null
                              return (
                                <div key={task.id} className="flex items-start gap-2">
                                  <Square size={14} className="text-gray-300 mt-0.5 flex-shrink-0" />
                                  <div className="flex-1 min-w-0">
                                    <div className="text-xs text-gray-700 leading-relaxed">{task.title}</div>
                                    {task.due_date && (
                                      <div className={`text-[11px] font-medium mt-0.5 ${td !== null && td < 0 ? 'text-red-600' : td !== null && td <= 7 ? 'text-amber-500' : 'text-gray-400'}`}>
                                        {td !== null && td < 0 ? '⚠ ' : ''}Hạn: {formatDate(task.due_date)}{td !== null && td >= 0 && ` · ${td}N`}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {urgentTasks.filter(t => { const d = t.due_date ? daysUntil(t.due_date) : null; return d !== null && d <= 14 }).length > 0 && (
                <div className="bg-amber-50 rounded-2xl border border-amber-200 overflow-hidden">
                  <div className="px-4 py-3 border-b border-amber-200 flex items-center gap-2">
                    <AlertTriangle size={14} className="text-amber-600" />
                    <span className="text-sm font-bold text-amber-800">Deadline trong 14 ngày</span>
                  </div>
                  <div className="p-3 space-y-2">
                    {urgentTasks.filter(t => { const d = t.due_date ? daysUntil(t.due_date) : null; return d !== null && d <= 14 }).map(task => {
                      const d = daysUntil(task.due_date!)
                      return (
                        <div key={task.id} className="flex items-start gap-2 bg-white rounded-xl p-2.5 border border-amber-100">
                          <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5 ${d <= 3 ? 'bg-red-500' : d <= 7 ? 'bg-amber-500' : 'bg-yellow-400'}`} />
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-medium text-gray-700 line-clamp-1">{task.title}</div>
                            <div className="text-[11px] text-gray-400">{task.oppTitle.split('–')[0].trim()}</div>
                          </div>
                          <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${d <= 3 ? 'bg-red-100 text-red-600' : d <= 7 ? 'bg-amber-100 text-amber-700' : 'bg-yellow-100 text-yellow-700'}`}>{d}N</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-4 py-3.5 border-b border-gray-100 flex items-center gap-2">
                  <Sparkles size={14} className="text-sky-500" />
                  <span className="text-sm font-bold text-gray-900">Ghi chú nhanh</span>
                </div>
                <div className="p-4">
                  <textarea
                    className="w-full text-sm border border-gray-200 rounded-xl p-3 resize-none focus:outline-none focus:ring-2 focus:ring-sky-300 placeholder-gray-300 bg-gray-50"
                    placeholder="Ghi chú nhắc nhở cá nhân cho hôm nay..."
                    rows={3}
                  />
                  <button className="mt-2 w-full bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-semibold py-2 rounded-lg transition-colors">
                    Lưu ghi chú
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function SummaryCard({ label, value, sub, color, icon }: { label: string; value: string; sub: string; color: string; icon: string }) {
  const bg: Record<string, string> = { blue: 'bg-sky-50 border-sky-200', green: 'bg-emerald-50 border-emerald-200', amber: 'bg-amber-50 border-amber-200', violet: 'bg-violet-50 border-violet-200', red: 'bg-red-50 border-red-200', gray: 'bg-gray-50 border-gray-200' }
  const tx: Record<string, string> = { blue: 'text-sky-700', green: 'text-emerald-700', amber: 'text-amber-700', violet: 'text-violet-700', red: 'text-red-700', gray: 'text-gray-600' }
  return (
    <div className={`rounded-2xl border p-4 ${bg[color] ?? bg.gray}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-gray-500">{label}</span>
        <span className="text-xl">{icon}</span>
      </div>
      <div className={`text-2xl font-black mb-1 ${tx[color] ?? tx.gray}`}>{value}</div>
      <div className="text-xs text-gray-400">{sub}</div>
    </div>
  )
}
