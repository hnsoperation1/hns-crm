'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  ChevronLeft, ChevronRight, CalendarDays, Clock,
  CheckCircle2, Square, CheckSquare, ClipboardList,
  ShoppingBag, LayoutGrid, List, Calendar, Loader2, GripVertical, User, Plus, X, Search, Filter,
} from 'lucide-react'
import DateInput from '@/components/DateInput'
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
  created_by?: string | null
  opportunity_id?: string | null
  parent_id?: string | null
  created_at: string
  stage: number
  opportunity?: { id: string; title: string } | null
}

type SubSummary = { total: number; done: number }

type UserRow = { id: string; full_name: string; role: string }

const COLS: { key: TaskStatus; label: string; text: string; bg: string; border: string; dot: string }[] = [
  { key: 'todo',        label: 'Cần thực hiện',  text: 'text-sky-700',     bg: 'bg-sky-50',     border: 'border-sky-200',     dot: 'bg-sky-500' },
  { key: 'in_progress', label: 'Đang thực hiện', text: 'text-blue-700',    bg: 'bg-blue-50',    border: 'border-blue-200',    dot: 'bg-blue-500' },
  { key: 'done',        label: 'Đã hoàn thành',  text: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', dot: 'bg-emerald-500' },
]

const WEEKDAYS = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật']

function toDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

function getWeekStart(date: Date): Date {
  const d = new Date(date)
  const dow = d.getDay()
  d.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1))
  d.setHours(0, 0, 0, 0)
  return d
}

function weekDays(start: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    return d
  })
}

function getStatus(t: TaskRow): TaskStatus {
  return t.status ?? (t.is_done ? 'done' : 'todo')
}

export default function CongViecPage() {
  const { user: currentUser } = useAuth()
  const { setOnRefresh } = useTopbar()
  const supabase = createClient()

  const [tasks, setTasks] = useState<TaskRow[]>([])
  const [allUsers, setAllUsers] = useState<UserRow[]>([])
  const [subSummary, setSubSummary] = useState<Record<string, SubSummary>>({})
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<ViewMode>('table')
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [dragOverCol, setDragOverCol] = useState<TaskStatus | null>(null)
  const [calMonth, setCalMonth] = useState(() => {
    const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), 1)
  })
  const [calView, setCalView] = useState<'month' | 'week' | 'day'>('month')
  const [calWeek, setCalWeek] = useState(() => getWeekStart(new Date()))
  const [calDay, setCalDay] = useState(() => new Date())

  // Search & filter
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<TaskStatus | ''>('')
  const [filterAssignee, setFilterAssignee] = useState('')

  // Quick create modal
  const [createDraft, setCreateDraft] = useState<{ status: TaskStatus; due_date: string } | null>(null)
  const [createTitle, setCreateTitle] = useState('')
  const [createAssignee, setCreateAssignee] = useState('')
  const [createLoading, setCreateLoading] = useState(false)

  const isManager = ['boss', 'admin', 'sale_admin'].includes(currentUser?.role ?? '')

  const loadData = useCallback(async () => {
    if (!currentUser?.id) { setLoading(false); return }
    setLoading(true)
    let topLevelTasks: TaskRow[] = []
    if (isManager) {
      const [tasksRes, usersRes] = await Promise.all([
        supabase.from('tasks').select('*, opportunity:opportunities!left(id,title)').is('parent_id', null).order('due_date', { nullsFirst: false }).order('created_at'),
        supabase.from('users').select('id,full_name,role').eq('is_active', true).order('full_name'),
      ])
      topLevelTasks = (tasksRes.data ?? []) as TaskRow[]
      setAllUsers((usersRes.data ?? []) as UserRow[])
    } else {
      // Filter ở cả client lẫn server (RLS backup)
      const { data } = await supabase
        .from('tasks').select('*, opportunity:opportunities!left(id,title)')
        .is('parent_id', null)
        .or(`assigned_to.eq.${currentUser.id},created_by.eq.${currentUser.id}`)
        .order('due_date', { nullsFirst: false })
        .order('created_at')
      topLevelTasks = (data ?? []) as TaskRow[]
    }
    setTasks(topLevelTasks)

    // Load subtask summary for progress bars
    const ids = topLevelTasks.map(t => t.id)
    if (ids.length > 0) {
      const { data: subs } = await supabase.from('tasks').select('parent_id,is_done').in('parent_id', ids)
      const summary: Record<string, SubSummary> = {}
      for (const s of subs ?? []) {
        if (!s.parent_id) continue
        if (!summary[s.parent_id]) summary[s.parent_id] = { total: 0, done: 0 }
        summary[s.parent_id].total++
        if (s.is_done) summary[s.parent_id].done++
      }
      setSubSummary(summary)
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

  function openCreate(status: TaskStatus, due_date = '') {
    setCreateTitle('')
    setCreateAssignee('')
    setCreateDraft({ status, due_date })
  }

  async function quickCreate() {
    if (!createTitle.trim() || createLoading || !createDraft) return
    setCreateLoading(true)
    const isDone = createDraft.status === 'done'
    const { data } = await supabase.from('tasks')
      .insert({
        title: createTitle.trim(),
        status: createDraft.status,
        is_done: isDone,
        done_at: isDone ? new Date().toISOString() : null,
        due_date: createDraft.due_date || null,
        assigned_to: createAssignee || null,
        created_by: currentUser?.id,
        stage: 0,
      })
      .select('*, opportunity:opportunities!left(id,title)')
      .single()
    if (data) setTasks(prev => [...prev, data as TaskRow])
    setCreateDraft(null)
    setCreateLoading(false)
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

  const hasFilter = search !== '' || filterStatus !== '' || filterAssignee !== ''
  const filteredTasks = tasks.filter(t => {
    if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false
    if (filterStatus && getStatus(t) !== filterStatus) return false
    if (filterAssignee && t.assigned_to !== filterAssignee) return false
    return true
  })

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* ── View toggle + stats bar ── */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200 px-5 h-11 flex items-center gap-4">
        <div className="flex items-center gap-0.5 bg-gray-100 rounded-xl p-1">
          {([
            { k: 'table'    as ViewMode, icon: List,       label: 'Bảng' },
            { k: 'kanban'   as ViewMode, icon: LayoutGrid, label: 'Kanban' },
            { k: 'calendar' as ViewMode, icon: Calendar,   label: 'Lịch' },
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

      {/* ── Search & Filter bar ── */}
      <div className="flex-shrink-0 bg-white border-b border-gray-100 px-5 py-2 flex items-center gap-2">
        <div className="relative flex-1 max-w-xs">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="text" placeholder="Tìm công việc..." value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-7 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400 bg-gray-50"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X size={11} />
            </button>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <Filter size={12} className="text-gray-400" />
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as TaskStatus | '')}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand-400 text-gray-600">
            <option value="">Tất cả trạng thái</option>
            {COLS.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
          </select>
          {isManager && (
            <select value={filterAssignee} onChange={e => setFilterAssignee(e.target.value)}
              className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand-400 text-gray-600">
              <option value="">Tất cả người thực hiện</option>
              {allUsers.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
            </select>
          )}
          {hasFilter && (
            <button onClick={() => { setSearch(''); setFilterStatus(''); setFilterAssignee('') }}
              className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 px-2 py-1.5 rounded-lg hover:bg-red-50 transition-colors">
              <X size={11} /> Xóa lọc
            </button>
          )}
        </div>
        {hasFilter && (
          <span className="text-xs text-gray-400 ml-auto">{filteredTasks.length}/{tasks.length} kết quả</span>
        )}
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
                const colTasks = filteredTasks.filter(t => getStatus(t) === col.key)
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
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/70 ${col.text}`}>{colTasks.length}</span>
                      <button onClick={() => openCreate(col.key)}
                        className={`ml-auto p-1 rounded-lg hover:bg-white/60 ${col.text} opacity-60 hover:opacity-100 transition-opacity`}
                        title="Thêm công việc">
                        <Plus size={13} />
                      </button>
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
                                <Link href={`/cong-viec/${task.id}`} onClick={e => e.stopPropagation()}
                                  className={`text-xs font-semibold leading-snug hover:underline ${col.key === 'done' ? 'line-through text-gray-400' : 'text-gray-800 hover:text-accent-600'}`}>
                                  {task.title}
                                </Link>
                                <div className="mt-1.5 space-y-1">
                                  {task.opportunity && (
                                    <div className="flex items-center gap-1">
                                      <span className="text-[9px] text-gray-400 w-12 flex-shrink-0">Đơn hàng</span>
                                      <Link href={`/don-hang/${task.opportunity.id}`} onClick={e => e.stopPropagation()}
                                        className="flex items-center gap-0.5 text-[10px] text-gray-500 hover:text-accent-500 truncate">
                                        <ShoppingBag size={8} />{task.opportunity.title}
                                      </Link>
                                    </div>
                                  )}
                                  {isManager && (() => {
                                    const creator = getUserName(task.created_by)
                                    return creator ? (
                                      <div className="flex items-center gap-1">
                                        <span className="text-[9px] text-gray-400 w-12 flex-shrink-0">Tạo bởi</span>
                                        <span className="flex items-center gap-1 text-[10px] text-gray-600 font-medium">
                                          <span className="w-3 h-3 rounded-full bg-gray-400 flex items-center justify-center text-[7px] text-white font-bold flex-shrink-0">
                                            {getInitials(creator)}
                                          </span>
                                          {creator.split(' ').slice(-1)[0]}
                                        </span>
                                      </div>
                                    ) : null
                                  })()}
                                  {assignee && isManager && (
                                    <div className="flex items-center gap-1">
                                      <span className="text-[9px] text-gray-400 w-12 flex-shrink-0">Giao cho</span>
                                      <span className="flex items-center gap-1 text-[10px] text-brand-700 font-medium">
                                        <span className="w-3 h-3 rounded-full bg-brand-500 flex items-center justify-center text-[7px] text-white font-bold flex-shrink-0">
                                          {getInitials(assignee)}
                                        </span>
                                        {assignee.split(' ').slice(-1)[0]}
                                      </span>
                                    </div>
                                  )}
                                  {task.due_date && (
                                    <div className="flex items-center gap-1">
                                      <span className="text-[9px] text-gray-400 w-12 flex-shrink-0">Hạn</span>
                                      <span className={`text-[10px] flex items-center gap-0.5 font-medium ${td !== null && td < 0 ? 'text-red-500' : td !== null && td <= 3 ? 'text-amber-500' : 'text-gray-500'}`}>
                                        <CalendarDays size={8} />
                                        {td !== null && td < 0 ? `Quá ${Math.abs(td)} ngày` : formatDate(task.due_date)}
                                      </span>
                                    </div>
                                  )}
                                  {subSummary[task.id] && (() => {
                                    const { total, done } = subSummary[task.id]
                                    const pct = Math.round(done / total * 100)
                                    return (
                                      <div className="pt-1">
                                        <div className="flex items-center justify-between mb-0.5">
                                          <span className="text-[9px] text-gray-400">Tiến độ</span>
                                          <span className="text-[9px] font-bold text-gray-500">{done}/{total} · {pct}%</span>
                                        </div>
                                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                          <div className="h-1.5 bg-emerald-400 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                                        </div>
                                      </div>
                                    )
                                  })()}
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
          {view === 'table' && (() => {
            // Group by employee when manager
            const groups: { uid: string; name: string; tasks: TaskRow[] }[] = []
            if (isManager) {
              const map = new Map<string, { uid: string; name: string; tasks: TaskRow[] }>()
              for (const task of filteredTasks) {
                const uid = task.assigned_to ?? task.created_by ?? '__none__'
                if (!map.has(uid)) {
                  const u = allUsers.find(u => u.id === uid)
                  map.set(uid, { uid, name: u?.full_name ?? 'Chưa xác định', tasks: [] })
                }
                map.get(uid)!.tasks.push(task)
              }
              groups.push(...Array.from(map.values()).sort((a, b) => b.tasks.length - a.tasks.length))
            }

            const COL_COUNT = 7

            function TaskRows({ taskList, startIdx }: { taskList: TaskRow[]; startIdx: number }) {
              return <>
                {taskList.map((task, i) => {
                  const st = getStatus(task)
                  const col = COLS.find(c => c.key === st)!
                  const td = task.due_date ? daysUntil(task.due_date) : null
                  return (
                    <tr key={task.id} className="hover:bg-gray-50/60 group">
                      <td className="px-4 py-2.5 text-xs text-gray-400 font-mono">{startIdx + i + 1}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <button onClick={() => updateStatus(task.id, st === 'done' ? 'todo' : 'done')} className="flex-shrink-0">
                            {task.is_done
                              ? <CheckCircle2 size={14} className="text-emerald-500" />
                              : <Square size={14} className="text-gray-300 hover:text-brand-400 transition-colors" />}
                          </button>
                          <Link href={`/cong-viec/${task.id}`} className={`text-xs font-medium hover:underline ${task.is_done ? 'line-through text-gray-400' : 'text-gray-800 hover:text-accent-600'}`}>{task.title}</Link>
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        {task.opportunity
                          ? <Link href={`/don-hang/${task.opportunity.id}`} className="text-xs text-gray-500 hover:text-accent-500 flex items-center gap-1 truncate max-w-[160px]">
                              <ShoppingBag size={9} />{task.opportunity.title}
                            </Link>
                          : <span className="text-xs text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-2.5">
                        {subSummary[task.id] ? (() => {
                          const { total, done: d } = subSummary[task.id]
                          const pct = Math.round(d / total * 100)
                          return (
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                <div className="h-1.5 bg-emerald-400 rounded-full" style={{ width: `${pct}%` }} />
                              </div>
                              <span className="text-[10px] font-bold text-gray-500 w-8 text-right">{pct}%</span>
                            </div>
                          )
                        })() : <span className="text-gray-200 text-xs">—</span>}
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
                    </tr>
                  )
                })}
              </>
            }

            return (
              <div className="p-5 space-y-4">
                {isManager ? (
                  groups.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm px-4 py-16 text-center">
                      <ClipboardList size={32} className="text-gray-200 mx-auto mb-2" />
                      <div className="text-sm text-gray-400">{hasFilter ? 'Không tìm thấy công việc phù hợp' : 'Không có công việc nào'}</div>
                    </div>
                  ) : (
                    groups.map(group => {
                      const doneCount = group.tasks.filter(t => t.is_done).length
                      const pct = group.tasks.length ? Math.round(doneCount / group.tasks.length * 100) : 0
                      const startIdx = groups.slice(0, groups.indexOf(group)).reduce((s, g) => s + g.tasks.length, 0)
                      return (
                        <div key={group.uid} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                          {/* Employee header */}
                          <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 border-b border-gray-200">
                            <div className="w-8 h-8 rounded-full bg-brand-500 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                              {getInitials(group.name)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm font-bold text-gray-800">{group.name}</span>
                                <span className="text-xs text-gray-400">{group.tasks.length} công việc</span>
                                <span className="text-xs text-emerald-600 font-medium ml-1">{doneCount} xong</span>
                                {group.tasks.length - doneCount > 0 && <span className="text-xs text-amber-600 font-medium">{group.tasks.length - doneCount} chờ</span>}
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="w-40 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                  <div className="h-1.5 bg-emerald-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
                                </div>
                                <span className="text-[10px] font-bold text-gray-500">{pct}%</span>
                              </div>
                            </div>
                          </div>
                          {/* Task table */}
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-gray-100">
                                <th className="px-4 py-2 text-left text-xs font-bold text-gray-300 w-10">STT</th>
                                <th className="px-4 py-2 text-left text-xs font-bold text-gray-300">Tên công việc</th>
                                <th className="px-4 py-2 text-left text-xs font-bold text-gray-300 w-44">Đơn hàng</th>
                                <th className="px-4 py-2 text-left text-xs font-bold text-gray-300 w-36">Tiến độ</th>
                                <th className="px-4 py-2 text-left text-xs font-bold text-gray-300 w-36">Tình trạng</th>
                                <th className="px-4 py-2 text-left text-xs font-bold text-gray-300 w-28">Còn lại</th>
                                <th className="px-4 py-2 text-left text-xs font-bold text-gray-300 w-32">Hạn hoàn thành</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              <TaskRows taskList={group.tasks} startIdx={startIdx} />
                            </tbody>
                          </table>
                        </div>
                      )
                    })
                  )
                ) : (
                  <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                          <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 w-10">STT</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-gray-400">Tên công việc</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 w-44">Đơn hàng</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 w-36">Tiến độ</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 w-36">Tình trạng</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 w-28">Còn lại</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 w-32">Hạn hoàn thành</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {filteredTasks.length === 0
                          ? <tr><td colSpan={COL_COUNT} className="px-4 py-16 text-center">
                              <ClipboardList size={32} className="text-gray-200 mx-auto mb-2" />
                              <div className="text-sm text-gray-400">{hasFilter ? 'Không tìm thấy công việc phù hợp' : 'Không có công việc nào'}</div>
                            </td></tr>
                          : <TaskRows taskList={filteredTasks} startIdx={0} />}
                      </tbody>
                      {filteredTasks.length > 0 && (
                        <tfoot>
                          <tr className="bg-gray-50 border-t-2 border-gray-200">
                            <td colSpan={2} className="px-4 py-2 text-xs font-bold text-gray-500">
                              {hasFilter ? `${filteredTasks.length} kết quả · ${filteredTasks.filter(t => t.is_done).length} xong` : `Tổng ${tasks.length} · ${done.length} hoàn thành · ${pending.length} chờ`}
                            </td>
                            <td colSpan={5} />
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  </div>
                )}
              </div>
            )
          })()}

          {/* ══════════ CALENDAR ══════════ */}
          {view === 'calendar' && (
            <div className="p-5">

              {/* nav */}
              <div className="flex items-center gap-2 mb-4 flex-wrap">
                {/* prev */}
                <button onClick={() => {
                  if (calView === 'month') setCalMonth(m => new Date(m.getFullYear(), m.getMonth()-1, 1))
                  else if (calView === 'week') setCalWeek(w => { const d = new Date(w); d.setDate(d.getDate()-7); return d })
                  else setCalDay(d => { const nd = new Date(d); nd.setDate(nd.getDate()-1); return nd })
                }} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-600">
                  <ChevronLeft size={16} />
                </button>

                {/* label */}
                <span className="font-bold text-gray-900 text-sm min-w-[160px] text-center">
                  {calView === 'month' && `Tháng ${calMonth.getMonth()+1}/${calMonth.getFullYear()}`}
                  {calView === 'week' && (() => {
                    const days = weekDays(calWeek)
                    const s = days[0], e = days[6]
                    return `${s.getDate()}/${s.getMonth()+1} – ${e.getDate()}/${e.getMonth()+1}/${e.getFullYear()}`
                  })()}
                  {calView === 'day' && `${WEEKDAYS[(calDay.getDay()+6)%7]}, ${calDay.getDate()}/${calDay.getMonth()+1}/${calDay.getFullYear()}`}
                </span>

                {/* next */}
                <button onClick={() => {
                  if (calView === 'month') setCalMonth(m => new Date(m.getFullYear(), m.getMonth()+1, 1))
                  else if (calView === 'week') setCalWeek(w => { const d = new Date(w); d.setDate(d.getDate()+7); return d })
                  else setCalDay(d => { const nd = new Date(d); nd.setDate(nd.getDate()+1); return nd })
                }} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-600">
                  <ChevronRight size={16} />
                </button>

                {/* hôm nay */}
                <button onClick={() => {
                  const n = new Date()
                  if (calView === 'month') setCalMonth(new Date(n.getFullYear(), n.getMonth(), 1))
                  else if (calView === 'week') setCalWeek(getWeekStart(n))
                  else setCalDay(n)
                }} className="ml-1 text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600">
                  Hôm nay
                </button>

                {/* sub-view toggle */}
                <div className="flex items-center gap-0.5 bg-gray-100 rounded-xl p-1 ml-1">
                  {(['month','week','day'] as const).map(v => (
                    <button key={v} onClick={() => setCalView(v)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${calView === v ? 'bg-white shadow-sm text-gray-800' : 'text-gray-400 hover:text-gray-600'}`}>
                      {v === 'month' ? 'Tháng' : v === 'week' ? 'Tuần' : 'Ngày'}
                    </button>
                  ))}
                </div>

                {/* + button */}
                <button onClick={() => openCreate('todo', calView === 'day' ? toDateStr(calDay) : '')}
                  className="ml-1 flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 bg-brand-500 text-white rounded-xl hover:bg-brand-600 transition-colors shadow-sm">
                  <Plus size={13} /> Thêm
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

              {/* ── MONTH view ── */}
              {calView === 'month' && (
                <>
                  <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50">
                      {WEEKDAYS.map(d => (
                        <div key={d} className={`px-2 py-2.5 text-center text-[11px] font-bold ${d === 'Chủ nhật' ? 'text-red-500' : 'text-gray-500'}`}>{d}</div>
                      ))}
                    </div>
                    <div className="grid grid-cols-7">
                      {calDays().map((date, i) => {
                        if (!date) return <div key={`e${i}`} className="border-r border-b border-gray-100 min-h-[110px] bg-gray-50/30" />
                        const dayTasks = tasksForDay(date)
                        const dateStr = toDateStr(date)
                        const isToday = dateStr === todayStr
                        const isSun = date.getDay() === 0
                        return (
                          <div key={dateStr} className={`border-r border-b border-gray-100 min-h-[110px] p-1.5 group ${isSun ? 'bg-red-50/20' : ''}`}>
                            <div className="flex items-center justify-between mb-1">
                              <div className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-accent-500 text-white' : isSun ? 'text-red-500' : 'text-gray-700'}`}>
                                {date.getDate()}
                              </div>
                              <button onClick={() => openCreate('todo', dateStr)}
                                className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-gray-100 text-gray-300 hover:text-brand-500 transition-opacity">
                                <Plus size={11} />
                              </button>
                            </div>
                            <div className="space-y-0.5">
                              {dayTasks.slice(0, 3).map(task => {
                                const col = COLS.find(c => c.key === getStatus(task))!
                                return (
                                  <Link key={task.id} href={`/cong-viec/${task.id}`}
                                    className={`block text-[10px] leading-tight px-1.5 py-0.5 rounded font-medium truncate hover:opacity-80 ${col.bg} ${col.text}`}
                                    title={task.title}>
                                    {task.title}
                                  </Link>
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
                            <Link key={task.id} href={`/cong-viec/${task.id}`} className={`text-[11px] px-2.5 py-1 rounded-lg font-medium hover:opacity-80 ${col.bg} ${col.text}`}>
                              {task.title}
                            </Link>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* ── WEEK view ── */}
              {calView === 'week' && (
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="grid grid-cols-7">
                    {weekDays(calWeek).map((date, i) => {
                      const dateStr = toDateStr(date)
                      const isToday = dateStr === todayStr
                      const isSun = i === 6
                      const dayTasks = tasksForDay(date)
                      return (
                        <div key={dateStr} className={`flex flex-col border-r last:border-r-0 border-gray-100 ${isSun ? 'bg-red-50/20' : ''}`}>
                          {/* day header */}
                          <div className={`px-2 py-3 text-center border-b border-gray-100 ${isToday ? 'bg-accent-50' : 'bg-gray-50'}`}>
                            <div className={`text-[10px] font-bold uppercase mb-1 ${isSun ? 'text-red-400' : 'text-gray-400'}`}>{WEEKDAYS[i]}</div>
                            <div className={`text-xl font-bold w-8 h-8 flex items-center justify-center rounded-full mx-auto ${isToday ? 'bg-accent-500 text-white' : isSun ? 'text-red-500' : 'text-gray-800'}`}>
                              {date.getDate()}
                            </div>
                          </div>
                          {/* tasks */}
                          <div className="flex-1 p-1.5 space-y-1 min-h-[150px]">
                            {dayTasks.map(task => {
                              const col = COLS.find(c => c.key === getStatus(task))!
                              return (
                                <Link key={task.id} href={`/cong-viec/${task.id}`}
                                  className={`block text-[10px] px-1.5 py-1 rounded-lg font-medium truncate hover:opacity-80 leading-snug ${col.bg} ${col.text}`}
                                  title={task.title}>
                                  {task.title}
                                </Link>
                              )
                            })}
                          </div>
                          {/* + */}
                          <div className="px-1.5 pb-1.5">
                            <button onClick={() => openCreate('todo', dateStr)}
                              className="w-full flex items-center justify-center gap-1 text-[10px] text-gray-300 hover:text-brand-500 hover:bg-brand-50 rounded-lg py-1 transition-colors">
                              <Plus size={10} /> Thêm
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* ── DAY view ── */}
              {calView === 'day' && (() => {
                const dateStr = toDateStr(calDay)
                const dayTasks = tasksForDay(calDay)
                return (
                  <div className="max-w-2xl">
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                      <div className={`px-5 py-4 border-b border-gray-100 flex items-center justify-between ${dateStr === todayStr ? 'bg-accent-50' : 'bg-gray-50'}`}>
                        <div>
                          <div className="text-xs font-bold text-gray-400 uppercase mb-0.5">{WEEKDAYS[(calDay.getDay()+6)%7]}</div>
                          <div className={`text-2xl font-black ${dateStr === todayStr ? 'text-accent-600' : 'text-gray-800'}`}>
                            {calDay.getDate()}/{calDay.getMonth()+1}/{calDay.getFullYear()}
                          </div>
                        </div>
                        <button onClick={() => openCreate('todo', dateStr)}
                          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 bg-brand-500 text-white rounded-xl hover:bg-brand-600 transition-colors shadow-sm">
                          <Plus size={13} /> Thêm việc
                        </button>
                      </div>
                      {dayTasks.length === 0 ? (
                        <div className="py-16 text-center text-sm text-gray-300">Không có công việc nào trong ngày này</div>
                      ) : (
                        <div className="divide-y divide-gray-100">
                          {dayTasks.map(task => {
                            const col = COLS.find(c => c.key === getStatus(task))!
                            const assignee = getUserName(task.assigned_to)
                            return (
                              <div key={task.id} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50/60">
                                <button onClick={() => updateStatus(task.id, task.is_done ? 'todo' : 'done')} className="flex-shrink-0">
                                  {task.is_done
                                    ? <CheckCircle2 size={17} className="text-emerald-500" />
                                    : <Square size={17} className="text-gray-300 hover:text-brand-400 transition-colors" />}
                                </button>
                                <Link href={`/cong-viec/${task.id}`}
                                  className={`flex-1 text-sm font-medium hover:underline ${task.is_done ? 'line-through text-gray-400' : 'text-gray-800 hover:text-accent-600'}`}>
                                  {task.title}
                                </Link>
                                {assignee && isManager && (
                                  <span className="text-[10px] text-gray-400 flex-shrink-0">{assignee.split(' ').slice(-1)[0]}</span>
                                )}
                                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${col.bg} ${col.text}`}>{col.label}</span>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })()}

            </div>
          )}

        </div>
      )}

      {/* ══════════ QUICK CREATE MODAL ══════════ */}
      {createDraft && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setCreateDraft(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-md mx-4 p-6 z-10">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-sm font-bold text-gray-900">Tạo công việc mới</h2>
              <button onClick={() => setCreateDraft(null)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
                <X size={15} />
              </button>
            </div>

            <input
              autoFocus
              value={createTitle}
              onChange={e => setCreateTitle(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') quickCreate(); if (e.key === 'Escape') setCreateDraft(null) }}
              placeholder="Tên công việc..."
              className="w-full text-sm border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-400 mb-3"
            />

            <div className="flex gap-3 mb-3">
              <div className="flex-1">
                <label className="text-[10px] font-semibold text-gray-400 block mb-1.5">Trạng thái</label>
                <select
                  value={createDraft.status}
                  onChange={e => setCreateDraft(d => d ? { ...d, status: e.target.value as TaskStatus } : d)}
                  className="w-full text-xs border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-400 bg-white text-gray-700">
                  {COLS.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                </select>
              </div>
              <div className="flex-1">
                <label className="text-[10px] font-semibold text-gray-400 block mb-1.5">Deadline</label>
                <DateInput value={createDraft.due_date} onChange={v => setCreateDraft(d => d ? { ...d, due_date: v } : d)} />
              </div>
            </div>

            {isManager && (
              <div className="mb-5">
                <label className="text-[10px] font-semibold text-gray-400 block mb-1.5">Giao cho</label>
                <select value={createAssignee} onChange={e => setCreateAssignee(e.target.value)}
                  className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-400 bg-white text-gray-700">
                  <option value="">— Chưa giao —</option>
                  {allUsers.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
                </select>
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <button onClick={() => setCreateDraft(null)}
                className="px-4 py-2 text-xs font-semibold text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50">
                Hủy
              </button>
              <button onClick={quickCreate} disabled={!createTitle.trim() || createLoading}
                className="px-4 py-2 text-xs font-semibold text-white bg-brand-500 rounded-xl hover:bg-brand-600 disabled:opacity-40 flex items-center gap-1.5 shadow-sm transition-colors">
                {createLoading ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                Tạo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
