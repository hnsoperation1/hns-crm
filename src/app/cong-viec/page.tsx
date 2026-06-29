'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  ChevronLeft, ChevronRight, CalendarDays, Clock,
  CheckCircle2, Square, CheckSquare, ClipboardList,
  Link2, LayoutGrid, List, Calendar, Loader2, GripVertical, User,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/auth'
import { useTopbar } from '@/contexts/topbar'
import { formatDate, getInitials, daysUntil } from '@/lib/utils'

type TaskStatus = 'todo' | 'in_progress' | 'done'
type ViewMode = 'kanban' | 'table' | 'calendar'

type TaskRow = {
  id: string
  title: string
  status: TaskStatus | null
  is_done: boolean
  done_at?: string | null
  due_date?: string | null
  assigned_to?: string | null
  opportunity_id?: string | null
  created_at: string
  stage: number
  opportunity?: { id: string; title: string } | null
}

type UserRow = { id: string; full_name: string; role: string }

const COLS: { key: TaskStatus; label: string; text: string; bg: string; border: string; dot: string }[] = [
  { key: 'todo',        label: 'Cần thực hiện',  text: 'text-sky-700',     bg: 'bg-sky-50',     border: 'border-sky-200',     dot: 'bg-sky-500' },
  { key: 'in_progress', label: 'Đang thực hiện', text: 'text-blue-700',    bg: 'bg-blue-50',    border: 'border-blue-200',    dot: 'bg-blue-500' },
  { key: 'done',        label: 'Đã hoàn thành',  text: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', dot: 'bg-emerald-500' },
]

const WEEKDAYS = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật']

function getStatus(t: TaskRow): TaskStatus {
  return t.status ?? (t.is_done ? 'done' : 'todo')
}

export default function CongViecPage() {
  const { user: currentUser } = useAuth()
  const { setOnRefresh } = useTopbar()
  const supabase = createClient()

  const [tasks, setTasks] = useState<TaskRow[]>([])
  const [allUsers, setAllUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<ViewMode>('kanban')
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [dragOverCol, setDragOverCol] = useState<TaskStatus | null>(null)
  const [calMonth, setCalMonth] = useState(() => {
    const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), 1)
  })

  const isManager = ['boss', 'admin', 'sale_admin'].includes(currentUser?.role ?? '')

  const loadData = useCallback(async () => {
    if (!currentUser?.id) { setLoading(false); return }
    setLoading(true)
    if (isManager) {
      const [tasksRes, usersRes] = await Promise.all([
        supabase.from('tasks').select('*, opportunity:opportunities!left(id,title)').order('due_date', { nullsFirst: false }).order('created_at'),
        supabase.from('users').select('id,full_name,role').eq('is_active', true).order('full_name'),
      ])
      setTasks((tasksRes.data ?? []) as TaskRow[])
      setAllUsers((usersRes.data ?? []) as UserRow[])
    } else {
      const { data } = await supabase
        .from('tasks').select('*, opportunity:opportunities!left(id,title)')
        .eq('assigned_to', currentUser.id).order('due_date', { nullsFirst: false })
      setTasks((data ?? []) as TaskRow[])
    }
    setLoading(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id, isManager])

  useEffect(() => {
    loadData()
    setOnRefresh(loadData)
    return () => setOnRefresh(null)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id])

  async function updateStatus(taskId: string, newStatus: TaskStatus) {
    const isDone = newStatus === 'done'
    setTasks(prev => prev.map(t => t.id === taskId
      ? { ...t, status: newStatus, is_done: isDone, done_at: isDone ? new Date().toISOString() : null }
      : t))
    await supabase.from('tasks').update({
      status: newStatus, is_done: isDone,
      done_at: isDone ? new Date().toISOString() : null,
    }).eq('id', taskId)
  }

  function getUserName(uid: string | null | undefined) {
    if (!uid) return null
    return allUsers.find(u => u.id === uid)?.full_name ?? null
  }

  // Calendar helpers
  function calDays() {
    const y = calMonth.getFullYear(), m = calMonth.getMonth()
    const first = new Date(y, m, 1), last = new Date(y, m + 1, 0)
    const dow = first.getDay()
    const offset = dow === 0 ? 6 : dow - 1
    const days: (Date | null)[] = Array(offset).fill(null)
    for (let d = 1; d <= last.getDate(); d++) days.push(new Date(y, m, d))
    while (days.length % 7 !== 0) days.push(null)
    return days
  }

  function tasksForDay(date: Date) {
    const s = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`
    return tasks.filter(t => t.due_date === s)
  }

  const pending = tasks.filter(t => !t.is_done)
  const done = tasks.filter(t => t.is_done)
  const today = new Date()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* ── View toggle + stats bar ── */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200 px-5 h-11 flex items-center gap-4">
        <div className="flex items-center gap-0.5 bg-gray-100 rounded-xl p-1">
          {([
            { k: 'kanban' as ViewMode, icon: LayoutGrid, label: 'Kanban' },
            { k: 'table'  as ViewMode, icon: List,       label: 'Bảng' },
            { k: 'calendar' as ViewMode, icon: Calendar, label: 'Lịch' },
          ]).map(({ k, icon: Icon, label }) => (
            <button key={k} onClick={() => setView(k)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${view === k ? 'bg-white shadow-sm text-gray-800' : 'text-gray-400 hover:text-gray-600'}`}>
              <Icon size={13} />{label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-4 text-xs ml-auto">
          <span className="text-gray-500">{tasks.length} công việc</span>
          <span className="text-amber-600 font-medium">{pending.length} chờ</span>
          <span className="text-emerald-600 font-medium">{done.length} xong</span>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 size={24} className="animate-spin text-gray-300" />
        </div>
      ) : (
        <div className="flex-1 overflow-auto">

          {/* ══════════ KANBAN ══════════ */}
          {view === 'kanban' && (
            <div className="flex gap-4 p-5 h-full" style={{ minWidth: 700 }}>
              {COLS.map(col => {
                const colTasks = tasks.filter(t => getStatus(t) === col.key)
                const isOver = dragOverCol === col.key && draggedId !== null
                return (
                  <div key={col.key}
                    className="flex flex-col flex-1 min-w-[200px]"
                    onDragOver={e => { e.preventDefault(); setDragOverCol(col.key) }}
                    onDragLeave={() => setDragOverCol(null)}
                    onDrop={e => {
                      e.preventDefault()
                      if (draggedId) updateStatus(draggedId, col.key)
                      setDraggedId(null); setDragOverCol(null)
                    }}
                  >
                    {/* header */}
                    <div className={`flex items-center gap-2 px-3 py-2.5 rounded-t-2xl border border-b-0 ${col.bg} ${col.border}`}>
                      <div className={`w-2.5 h-2.5 rounded-full ${col.dot}`} />
                      <span className={`text-xs font-bold ${col.text}`}>{col.label}</span>
                      <span className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/70 ${col.text}`}>{colTasks.length}</span>
                    </div>
                    {/* body */}
                    <div className={`flex-1 border rounded-b-2xl p-2 space-y-2 overflow-y-auto transition-all ${col.bg} ${col.border} ${isOver ? 'ring-2 ring-accent-400 ring-inset' : ''}`}
                      style={{ minHeight: 200 }}>
                      {colTasks.map(task => {
                        const td = task.due_date ? daysUntil(task.due_date) : null
                        const assignee = getUserName(task.assigned_to)
                        const isDragging = draggedId === task.id
                        return (
                          <div key={task.id}
                            draggable
                            onDragStart={() => setDraggedId(task.id)}
                            onDragEnd={() => { setDraggedId(null); setDragOverCol(null) }}
                            className={`bg-white rounded-xl border border-gray-200 p-3 shadow-sm hover:shadow-md transition-all cursor-grab active:cursor-grabbing select-none ${isDragging ? 'opacity-30 scale-95' : ''} ${col.key === 'done' ? 'opacity-60' : ''}`}
                          >
                            <div className="flex items-start gap-1.5">
                              <GripVertical size={12} className="text-gray-300 mt-0.5 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <div className={`text-xs font-semibold leading-snug ${col.key === 'done' ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                                  {task.title}
                                </div>
                                {task.opportunity && (
                                  <Link href={`/don-hang/${task.opportunity.id}`} onClick={e => e.stopPropagation()}
                                    className="flex items-center gap-0.5 text-[10px] text-gray-400 hover:text-accent-500 mt-0.5 truncate">
                                    <Link2 size={8} />{task.opportunity.title}
                                  </Link>
                                )}
                                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                  {assignee && isManager && (
                                    <span className="flex items-center gap-1 text-[10px] bg-brand-50 text-brand-700 px-1.5 py-0.5 rounded-full font-medium">
                                      <span className="w-3 h-3 rounded-full bg-brand-500 flex items-center justify-center text-[7px] text-white font-bold flex-shrink-0">
                                        {getInitials(assignee)}
                                      </span>
                                      {assignee.split(' ').slice(-1)[0]}
                                    </span>
                                  )}
                                  {task.due_date && (
                                    <span className={`text-[10px] flex items-center gap-0.5 font-medium ${td !== null && td < 0 ? 'text-red-500' : td !== null && td <= 3 ? 'text-amber-500' : 'text-gray-400'}`}>
                                      <CalendarDays size={8} />
                                      {td !== null && td < 0 ? `Quá ${Math.abs(td)}N` : formatDate(task.due_date)}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                      {colTasks.length === 0 && (
                        <div className="flex items-center justify-center h-20 text-[11px] text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
                          Kéo thả vào đây
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* ══════════ TABLE ══════════ */}
          {view === 'table' && (
            <div className="p-5">
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 w-10">STT</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-400">Tên công việc</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 w-44">Đơn hàng</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 w-40">Nhóm công việc</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 w-36">Tình trạng</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 w-32">Hạn hoàn thành</th>
                      {isManager && <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 w-36">Người thực hiện</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {tasks.map((task, i) => {
                      const st = getStatus(task)
                      const col = COLS.find(c => c.key === st)!
                      const td = task.due_date ? daysUntil(task.due_date) : null
                      const assignee = getUserName(task.assigned_to)
                      return (
                        <tr key={task.id} className="hover:bg-gray-50/60 group">
                          <td className="px-4 py-2.5 text-xs text-gray-400 font-mono">{i + 1}</td>
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-2">
                              <button onClick={() => updateStatus(task.id, st === 'done' ? 'todo' : 'done')} className="flex-shrink-0">
                                {task.is_done
                                  ? <CheckCircle2 size={14} className="text-emerald-500" />
                                  : <Square size={14} className="text-gray-300 hover:text-brand-400 transition-colors" />}
                              </button>
                              <span className={`text-xs font-medium ${task.is_done ? 'line-through text-gray-400' : 'text-gray-800'}`}>{task.title}</span>
                            </div>
                          </td>
                          <td className="px-4 py-2.5">
                            {task.opportunity
                              ? <Link href={`/don-hang/${task.opportunity.id}`} className="text-xs text-gray-500 hover:text-accent-500 flex items-center gap-1 truncate max-w-[160px]">
                                  <Link2 size={9} />{task.opportunity.title}
                                </Link>
                              : <span className="text-xs text-gray-300">—</span>}
                          </td>
                          <td className="px-4 py-2.5">
                            <select value={st} onChange={e => updateStatus(task.id, e.target.value as TaskStatus)}
                              className={`text-[11px] font-semibold px-2 py-1 rounded-lg border-0 focus:outline-none cursor-pointer ${col.bg} ${col.text}`}>
                              {COLS.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                            </select>
                          </td>
                          <td className="px-4 py-2.5">
                            {task.is_done
                              ? <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium"><CheckCircle2 size={11} />Hoàn thành</span>
                              : td !== null
                                ? <span className={`text-xs font-medium flex items-center gap-1 ${td < 0 ? 'text-red-600' : td <= 7 ? 'text-amber-600' : 'text-gray-500'}`}>
                                    <Clock size={10} />{td < 0 ? `Quá ${Math.abs(td)}N` : `Còn ${td}N`}
                                  </span>
                                : <span className="text-xs text-gray-400">Chưa xong</span>}
                          </td>
                          <td className="px-4 py-2.5">
                            {task.due_date
                              ? <span className={`text-xs font-medium ${td !== null && td < 0 ? 'text-red-600' : td !== null && td <= 7 ? 'text-amber-600' : 'text-gray-600'}`}>
                                  {formatDate(task.due_date)}
                                </span>
                              : <span className="text-gray-300 text-xs">—</span>}
                          </td>
                          {isManager && (
                            <td className="px-4 py-2.5">
                              {assignee
                                ? <span className="flex items-center gap-1.5 text-xs text-gray-700">
                                    <span className="w-5 h-5 rounded-full bg-brand-100 flex items-center justify-center text-[9px] font-bold text-brand-700 flex-shrink-0">
                                      {getInitials(assignee)}
                                    </span>
                                    {assignee}
                                  </span>
                                : <span className="text-xs text-gray-300">—</span>}
                            </td>
                          )}
                        </tr>
                      )
                    })}
                    {tasks.length === 0 && (
                      <tr><td colSpan={isManager ? 7 : 6} className="px-4 py-16 text-center">
                        <ClipboardList size={32} className="text-gray-200 mx-auto mb-2" />
                        <div className="text-sm text-gray-400">Không có công việc nào</div>
                      </td></tr>
                    )}
                  </tbody>
                  {tasks.length > 0 && (
                    <tfoot>
                      <tr className="bg-gray-50 border-t-2 border-gray-200">
                        <td colSpan={2} className="px-4 py-2 text-xs font-bold text-gray-500">
                          Tổng {tasks.length} · {done.length} hoàn thành · {pending.length} chờ
                        </td>
                        <td colSpan={isManager ? 5 : 4} />
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          )}

          {/* ══════════ CALENDAR ══════════ */}
          {view === 'calendar' && (
            <div className="p-5">
              {/* nav */}
              <div className="flex items-center gap-2 mb-4">
                <button onClick={() => setCalMonth(m => new Date(m.getFullYear(), m.getMonth()-1, 1))}
                  className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-600">
                  <ChevronLeft size={16} />
                </button>
                <span className="font-bold text-gray-900 text-sm w-32 text-center">
                  Tháng {calMonth.getMonth()+1}/{calMonth.getFullYear()}
                </span>
                <button onClick={() => setCalMonth(m => new Date(m.getFullYear(), m.getMonth()+1, 1))}
                  className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-600">
                  <ChevronRight size={16} />
                </button>
                <button onClick={() => setCalMonth(() => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), 1) })}
                  className="ml-2 text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600">
                  Hôm nay
                </button>
                {/* legend */}
                <div className="ml-auto flex items-center gap-3">
                  {COLS.map(col => (
                    <div key={col.key} className="flex items-center gap-1.5">
                      <div className={`w-2 h-2 rounded-full ${col.dot}`} />
                      <span className="text-[11px] text-gray-500">{col.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                {/* weekday headers */}
                <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50">
                  {WEEKDAYS.map(d => (
                    <div key={d} className={`px-2 py-2.5 text-center text-[11px] font-bold ${d === 'Chủ nhật' ? 'text-red-500' : 'text-gray-500'}`}>{d}</div>
                  ))}
                </div>
                {/* day cells */}
                <div className="grid grid-cols-7">
                  {calDays().map((date, i) => {
                    if (!date) return <div key={`e${i}`} className="border-r border-b border-gray-100 min-h-[110px] bg-gray-50/30" />
                    const dayTasks = tasksForDay(date)
                    const dateStr = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`
                    const isToday = dateStr === todayStr
                    const isSun = date.getDay() === 0
                    return (
                      <div key={dateStr} className={`border-r border-b border-gray-100 min-h-[110px] p-1.5 ${isSun ? 'bg-red-50/20' : ''}`}>
                        <div className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full mb-1 ${isToday ? 'bg-accent-500 text-white' : isSun ? 'text-red-500' : 'text-gray-700'}`}>
                          {date.getDate()}
                        </div>
                        <div className="space-y-0.5">
                          {dayTasks.slice(0, 3).map(task => {
                            const col = COLS.find(c => c.key === getStatus(task))!
                            return (
                              <div key={task.id} className={`text-[10px] leading-tight px-1.5 py-0.5 rounded font-medium truncate ${col.bg} ${col.text}`}
                                title={task.title}>
                                {task.title}
                              </div>
                            )
                          })}
                          {dayTasks.length > 3 && (
                            <div className="text-[10px] text-gray-400 px-1">+{dayTasks.length - 3}</div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Tasks without due date */}
              {tasks.filter(t => !t.due_date).length > 0 && (
                <div className="mt-4 bg-gray-50 rounded-2xl border border-gray-200 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <User size={13} className="text-gray-400" />
                    <span className="text-xs font-bold text-gray-600">Chưa có deadline ({tasks.filter(t => !t.due_date).length})</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {tasks.filter(t => !t.due_date).map(task => {
                      const col = COLS.find(c => c.key === getStatus(task))!
                      return (
                        <div key={task.id} className={`text-[11px] px-2.5 py-1 rounded-lg font-medium ${col.bg} ${col.text}`}>
                          {task.title}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      )}
    </div>
  )
}
