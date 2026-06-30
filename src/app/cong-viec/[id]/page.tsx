'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  CheckCircle2, Circle, CalendarDays, User, Link2,
  Clock, Pencil, Check, X, Loader2, ChevronLeft, Plus, Square,
  MessageSquare, Send, ArrowRight, ListTodo,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/auth'
import { useTopbar } from '@/contexts/topbar'
import DateInput from '@/components/DateInput'
import { formatDate, getInitials, daysUntil } from '@/lib/utils'

type TaskStatus = 'todo' | 'in_progress' | 'done'

const STATUS_OPTS: { key: TaskStatus; label: string; bg: string; text: string; dot: string }[] = [
  { key: 'todo',        label: 'Cần thực hiện',  bg: 'bg-sky-50',     text: 'text-sky-700',     dot: 'bg-sky-500' },
  { key: 'in_progress', label: 'Đang thực hiện', bg: 'bg-blue-50',    text: 'text-blue-700',    dot: 'bg-blue-500' },
  { key: 'done',        label: 'Đã hoàn thành',  bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
]

const STATUS_VI: Record<string, string> = {
  todo: 'Cần thực hiện',
  in_progress: 'Đang thực hiện',
  done: 'Đã hoàn thành',
}

type TaskDetail = {
  id: string; title: string; status: TaskStatus | null; is_done: boolean
  done_at: string | null; due_date: string | null; assigned_to: string | null
  created_by: string | null; opportunity_id: string | null; created_at: string; stage: number
}

type UserMin = { id: string; full_name: string }
type SubTask = { id: string; title: string; is_done: boolean; created_at: string }

type TaskLog = {
  id: string; task_id: string; user_id: string | null; type: string
  content: string | null; meta: Record<string, unknown> | null
  created_at: string; user?: { id: string; full_name: string } | null
}

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 60) return 'vừa xong'
  if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)} ngày trước`
  return formatDate(iso)
}

function logText(log: TaskLog): string {
  const m = log.meta ?? {}
  switch (log.type) {
    case 'status_change': return `đổi trạng thái: ${STATUS_VI[m.from as string] ?? m.from} → ${STATUS_VI[m.to as string] ?? m.to}`
    case 'done_toggle': return (m.done as boolean) ? 'đánh dấu hoàn thành' : 'bỏ đánh dấu hoàn thành'
    case 'assignee_change': return m.to_name ? `giao cho ${m.to_name}` : 'bỏ giao việc'
    case 'title_change': return `đổi tên → "${m.to}"`
    case 'due_date_change': return m.to ? `đổi deadline → ${formatDate(m.to as string)}` : 'xóa deadline'
    case 'subtask_add': return `thêm nhiệm vụ: "${m.title}"`
    case 'subtask_done': return (m.done as boolean) ? `hoàn thành: "${m.title}"` : `bỏ hoàn thành: "${m.title}"`
    default: return ''
  }
}

export default function CongViecDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { user: currentUser } = useAuth()
  const { setBreadcrumb, setOnRefresh } = useTopbar()
  const supabase = createClient()

  const [task, setTask] = useState<TaskDetail | null>(null)
  const [allUsers, setAllUsers] = useState<UserMin[]>([])
  const [oppTitle, setOppTitle] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const [editingTitle, setEditingTitle] = useState(false)
  const [titleDraft, setTitleDraft] = useState('')
  const [editingAssignee, setEditingAssignee] = useState(false)
  const [editingDue, setEditingDue] = useState(false)
  const [dueDraft, setDueDraft] = useState('')
  const [saving, setSaving] = useState(false)

  const [subtasks, setSubtasks] = useState<SubTask[]>([])
  const [newSubtask, setNewSubtask] = useState('')
  const [addingSub, setAddingSub] = useState(false)
  const [showSubInput, setShowSubInput] = useState(false)

  const [logs, setLogs] = useState<TaskLog[]>([])
  const [commentText, setCommentText] = useState('')
  const [sendingComment, setSendingComment] = useState(false)
  const commentRef = useRef<HTMLTextAreaElement>(null)

  const [activeTab, setActiveTab] = useState<'tasks' | 'logs'>('tasks')

  const isManager = ['boss', 'admin', 'sale_admin'].includes(currentUser?.role ?? '')

  async function loadLogs() {
    const { data } = await supabase
      .from('task_logs')
      .select('*')
      .eq('task_id', id)
      .order('created_at', { ascending: false })
    setLogs((data ?? []) as TaskLog[])
  }

  async function loadData() {
    setLoading(true)
    const [taskRes, usersRes, subsRes] = await Promise.all([
      supabase.from('tasks').select('*').eq('id', id).single(),
      supabase.from('users').select('id,full_name').eq('is_active', true).order('full_name'),
      supabase.from('tasks').select('id,title,is_done,created_at').eq('parent_id', id).order('created_at'),
    ])
    const t = taskRes.data as TaskDetail | null
    setTask(t)
    setAllUsers((usersRes.data ?? []) as UserMin[])
    setSubtasks((subsRes.data ?? []) as SubTask[])
    if (t?.opportunity_id) {
      const { data } = await supabase.from('opportunities').select('title').eq('id', t.opportunity_id).single()
      setOppTitle(data?.title ?? null)
    }
    if (t) {
      setBreadcrumb(
        <span className="flex items-center gap-1 text-sm text-gray-500">
          <a href="/cong-viec" className="hover:text-gray-800 transition-colors">Công việc</a>
          <span className="text-gray-300">/</span>
          <span className="text-gray-800 font-medium truncate max-w-[200px]">{t.title}</span>
        </span>
      )
    }
    await loadLogs()
    setLoading(false)
  }

  async function addLog(type: string, meta?: Record<string, unknown>, content?: string) {
    // Lưu _user_name vào meta để không phụ thuộc join hay RLS của bảng users
    const logMeta = { ...(meta ?? {}), _user_name: currentUser?.full_name ?? null }
    const { data } = await supabase
      .from('task_logs')
      .insert({ task_id: id, user_id: currentUser?.id, type, content: content ?? null, meta: logMeta })
      .select('*')
      .single()
    if (data) {
      const entry = { ...(data as TaskLog), user: currentUser ? { id: currentUser.id, full_name: currentUser.full_name } : null }
      setLogs(prev => [entry, ...prev])
    }
  }

  async function addSubtask() {
    if (!newSubtask.trim() || addingSub) return
    setAddingSub(true)
    const title = newSubtask.trim()
    const { data } = await supabase.from('tasks').insert({
      title, parent_id: id, opportunity_id: task?.opportunity_id ?? null,
      created_by: currentUser?.id, is_done: false, stage: 0,
    }).select('id,title,is_done,created_at').single()
    if (data) {
      setSubtasks(prev => [...prev, data as SubTask])
      await addLog('subtask_add', { title })
    }
    setNewSubtask(''); setAddingSub(false); setShowSubInput(false)
  }

  async function toggleSubtask(subId: string, done: boolean) {
    const sub = subtasks.find(s => s.id === subId)
    setSubtasks(prev => prev.map(s => s.id === subId ? { ...s, is_done: done } : s))
    await supabase.from('tasks').update({ is_done: done, status: done ? 'done' : 'todo', done_at: done ? new Date().toISOString() : null }).eq('id', subId)
    if (sub) await addLog('subtask_done', { done, title: sub.title })
  }

  async function deleteSubtask(subId: string) {
    setSubtasks(prev => prev.filter(s => s.id !== subId))
    await supabase.from('tasks').delete().eq('id', subId)
  }

  useEffect(() => {
    loadData()
    setOnRefresh(loadData)
    return () => { setOnRefresh(null); setBreadcrumb([]) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function updateField(fields: Partial<TaskDetail>) {
    if (!task) return
    setSaving(true)
    const { data } = await supabase.from('tasks').update(fields).eq('id', task.id).select('*').single()
    if (data) setTask(data as TaskDetail)
    setSaving(false)
  }

  async function saveTitle() {
    if (!titleDraft.trim() || titleDraft === task?.title) { setEditingTitle(false); return }
    const newTitle = titleDraft.trim()
    await updateField({ title: newTitle })
    await addLog('title_change', { from: task?.title, to: newTitle })
    setBreadcrumb(
      <span className="flex items-center gap-1 text-sm text-gray-500">
        <a href="/cong-viec" className="hover:text-gray-800 transition-colors">Công việc</a>
        <span className="text-gray-300">/</span>
        <span className="text-gray-800 font-medium truncate max-w-[200px]">{newTitle}</span>
      </span>
    )
    setEditingTitle(false)
  }

  async function toggleDone() {
    if (!task) return
    const newDone = !task.is_done
    const newStatus: TaskStatus = newDone ? 'done' : 'todo'
    await updateField({ is_done: newDone, done_at: newDone ? new Date().toISOString() : null, status: newStatus })
    await addLog('done_toggle', { done: newDone })
  }

  async function changeStatus(s: TaskStatus) {
    const oldStatus = task?.status ?? (task?.is_done ? 'done' : 'todo')
    if (s === oldStatus) return
    const isDone = s === 'done'
    await updateField({ status: s, is_done: isDone, done_at: isDone ? new Date().toISOString() : null })
    await addLog('status_change', { from: oldStatus, to: s })
  }

  async function saveAssignee() {
    const sel = (document.getElementById('assignee-select') as HTMLSelectElement).value
    const newAssignee = sel || null
    const newName = allUsers.find(u => u.id === newAssignee)?.full_name ?? null
    await updateField({ assigned_to: newAssignee })
    await addLog('assignee_change', { to: newAssignee, to_name: newName })
    setEditingAssignee(false)
  }

  async function saveDueDate() {
    await updateField({ due_date: dueDraft || null })
    await addLog('due_date_change', { to: dueDraft || null })
    setEditingDue(false)
  }

  async function sendComment() {
    const text = commentText.trim()
    if (!text || sendingComment) return
    setSendingComment(true)
    await addLog('comment', {}, text)
    setCommentText('')
    setSendingComment(false)
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 size={24} className="animate-spin text-gray-300" />
    </div>
  )
  if (!task) return <div className="p-8 text-center text-gray-400">Không tìm thấy công việc</div>

  const status = task.status ?? (task.is_done ? 'done' : 'todo')
  const statusOpt = STATUS_OPTS.find(s => s.key === status) ?? STATUS_OPTS[0]
  const assignee = allUsers.find(u => u.id === task.assigned_to)
  const creator  = allUsers.find(u => u.id === task.created_by)
  const td = task.due_date ? daysUntil(task.due_date) : null
  const subDone = subtasks.filter(s => s.is_done).length
  const subTotal = subtasks.length
  const pct = subTotal > 0 ? Math.round(subDone / subTotal * 100) : 0

  return (
    <div className="p-6 max-w-6xl mx-auto">

      {/* Back */}
      <Link href="/cong-viec" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 transition-colors mb-5">
        <ChevronLeft size={15} /> Quay lại Công việc
      </Link>

      {/* Title card — full width */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 mb-5">
        <div className="flex items-start gap-3">
          <button onClick={toggleDone} disabled={saving} className="mt-0.5 flex-shrink-0 transition-transform hover:scale-110">
            {task.is_done
              ? <CheckCircle2 size={22} className="text-emerald-500" />
              : <Circle size={22} className="text-gray-300 hover:text-brand-400" />}
          </button>
          <div className="flex-1 min-w-0">
            {editingTitle ? (
              <div className="flex items-center gap-2">
                <input autoFocus value={titleDraft} onChange={e => setTitleDraft(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') saveTitle(); if (e.key === 'Escape') setEditingTitle(false) }}
                  className="flex-1 text-lg font-bold text-gray-900 border border-brand-300 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-400" />
                <button onClick={saveTitle} className="p-1.5 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600"><Check size={14} /></button>
                <button onClick={() => setEditingTitle(false)} className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-500"><X size={14} /></button>
              </div>
            ) : (
              <div className="flex items-start gap-2 group">
                <h1 className={`text-lg font-bold leading-snug ${task.is_done ? 'line-through text-gray-400' : 'text-gray-900'}`}>{task.title}</h1>
                <button onClick={() => { setTitleDraft(task.title); setEditingTitle(true) }}
                  className="opacity-0 group-hover:opacity-100 mt-0.5 p-1 rounded-lg hover:bg-gray-100 text-gray-400 flex-shrink-0 transition-opacity">
                  <Pencil size={13} />
                </button>
              </div>
            )}
            <div className="flex items-center gap-2 mt-2">
              <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${statusOpt.bg} ${statusOpt.text}`}>
                <div className={`w-2 h-2 rounded-full ${statusOpt.dot}`} />
                {statusOpt.label}
              </div>
              {saving && <Loader2 size={12} className="animate-spin text-gray-400" />}
            </div>
          </div>
        </div>
      </div>

      {/* 2-column layout */}
      <div className="flex gap-5 items-start">

        {/* ── LEFT: Tab card ── */}
        <div className="flex-1 min-w-0 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">

          {/* Tab header */}
          <div className="flex border-b border-gray-200 bg-gray-50/60">
            <button
              onClick={() => setActiveTab('tasks')}
              className={`flex items-center gap-2 px-5 py-3.5 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'tasks' ? 'border-brand-500 text-brand-600 bg-white' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
              <ListTodo size={14} />
              Nhiệm vụ
              {subTotal > 0 && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${activeTab === 'tasks' ? 'bg-brand-100 text-brand-600' : 'bg-gray-200 text-gray-500'}`}>
                  {subDone}/{subTotal}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('logs')}
              className={`flex items-center gap-2 px-5 py-3.5 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'logs' ? 'border-brand-500 text-brand-600 bg-white' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
              <MessageSquare size={14} />
              Ghi chú & Hoạt động
              {logs.length > 0 && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${activeTab === 'logs' ? 'bg-brand-100 text-brand-600' : 'bg-gray-200 text-gray-500'}`}>
                  {logs.length}
                </span>
              )}
            </button>
          </div>

          {/* ── Tab: Nhiệm vụ ── */}
          {activeTab === 'tasks' && (
            <div className="p-5">
              {/* Progress */}
              {subTotal > 0 && (
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-gray-400">Tiến độ</span>
                    <span className={`text-xs font-bold ${pct === 100 ? 'text-emerald-600' : 'text-gray-500'}`}>{pct}%</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-2 rounded-full transition-all duration-500 ${pct === 100 ? 'bg-emerald-500' : 'bg-brand-400'}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )}

              {/* List */}
              <ul className="space-y-1 mb-4">
                {subtasks.length === 0 && (
                  <li className="py-8 text-center text-sm text-gray-300">Chưa có nhiệm vụ nào</li>
                )}
                {subtasks.map(sub => (
                  <li key={sub.id} className="flex items-center gap-2.5 group px-2 py-2 rounded-xl hover:bg-gray-50">
                    <button onClick={() => toggleSubtask(sub.id, !sub.is_done)} className="flex-shrink-0 transition-transform hover:scale-110">
                      {sub.is_done
                        ? <CheckCircle2 size={17} className="text-emerald-500" />
                        : <Square size={17} className="text-gray-300 hover:text-brand-400" />}
                    </button>
                    <span className={`flex-1 text-sm ${sub.is_done ? 'line-through text-gray-400' : 'text-gray-700'}`}>{sub.title}</span>
                    <button onClick={() => deleteSubtask(sub.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-50 text-gray-300 hover:text-red-400 transition-all">
                      <X size={12} />
                    </button>
                  </li>
                ))}
              </ul>

              {/* Add */}
              {showSubInput ? (
                <div className="flex items-center gap-2">
                  <input autoFocus value={newSubtask} onChange={e => setNewSubtask(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') addSubtask(); if (e.key === 'Escape') { setShowSubInput(false); setNewSubtask('') } }}
                    placeholder="Tên nhiệm vụ..."
                    className="flex-1 text-sm border border-brand-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-400" />
                  <button onClick={addSubtask} disabled={addingSub || !newSubtask.trim()}
                    className="p-1.5 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-40">
                    {addingSub ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                  </button>
                  <button onClick={() => { setShowSubInput(false); setNewSubtask('') }}
                    className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-500"><X size={14} /></button>
                </div>
              ) : (
                <button onClick={() => setShowSubInput(true)}
                  className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-brand-600 transition-colors py-1 px-2 rounded-lg hover:bg-brand-50">
                  <Plus size={13} /> Thêm nhiệm vụ
                </button>
              )}
            </div>
          )}

          {/* ── Tab: Ghi chú & Hoạt động ── */}
          {activeTab === 'logs' && (
            <div className="p-5">
              {/* Comment input */}
              <div className="flex gap-3 mb-5">
                <div className="w-7 h-7 rounded-full bg-brand-100 flex items-center justify-center text-[10px] font-bold text-brand-700 flex-shrink-0 mt-1">
                  {getInitials(currentUser?.full_name ?? '')}
                </div>
                <div className="flex-1">
                  <textarea
                    ref={commentRef}
                    value={commentText}
                    onChange={e => setCommentText(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) sendComment() }}
                    placeholder="Thêm ghi chú... (Ctrl+Enter để gửi)"
                    rows={2}
                    className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-400 resize-none placeholder:text-gray-300"
                  />
                  {commentText.trim() && (
                    <div className="flex justify-end mt-2">
                      <button onClick={sendComment} disabled={sendingComment}
                        className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 bg-brand-500 text-white rounded-xl hover:bg-brand-600 disabled:opacity-40 transition-colors shadow-sm">
                        {sendingComment ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                        Gửi
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Log list */}
              {logs.length === 0 ? (
                <div className="text-center py-8 text-xs text-gray-300">Chưa có hoạt động nào</div>
              ) : (
                <div className="space-y-0">
                  {logs.map((log, i) => {
                    const userName = (log.meta?._user_name as string | null)
                      ?? allUsers.find(u => u.id === log.user_id)?.full_name
                      ?? log.user?.full_name
                      ?? 'Hệ thống'
                    const isComment = log.type === 'comment'
                    const text = logText(log)
                    return (
                      <div key={log.id} className={`flex gap-3 py-3 ${i < logs.length - 1 ? 'border-b border-gray-50' : ''}`}>
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5 ${isComment ? 'bg-brand-100 text-brand-700' : 'bg-gray-100 text-gray-500'}`}>
                          {getInitials(userName)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline gap-2 flex-wrap">
                            <span className="text-xs font-semibold text-gray-700">{userName}</span>
                            {!isComment && (
                              <span className="text-xs text-gray-500 flex items-center gap-1">
                                <ArrowRight size={10} className="text-gray-300" />{text}
                              </span>
                            )}
                            <span className="text-[10px] text-gray-300 ml-auto">{timeAgo(log.created_at)}</span>
                          </div>
                          {isComment && log.content && (
                            <div className="mt-1.5 bg-gray-50 rounded-xl px-3 py-2.5 text-sm text-gray-700 leading-relaxed border border-gray-100 whitespace-pre-wrap">
                              {log.content}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── RIGHT: Detail fields ── */}
        <div className="w-72 flex-shrink-0 bg-white rounded-2xl border border-gray-200 shadow-sm divide-y divide-gray-100 overflow-hidden">

          {/* Trạng thái */}
          <div className="px-4 py-3">
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">Trạng thái</div>
            <select value={status} onChange={e => changeStatus(e.target.value as TaskStatus)}
              className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg border-0 focus:outline-none focus:ring-1 focus:ring-brand-400 cursor-pointer w-full ${statusOpt.bg} ${statusOpt.text}`}>
              {STATUS_OPTS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
          </div>

          {/* Người thực hiện */}
          <div className="px-4 py-3">
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1.5 flex items-center gap-1"><User size={10} /> Người thực hiện</div>
            {editingAssignee ? (
              <div className="flex items-center gap-1.5">
                <select defaultValue={task.assigned_to ?? ''} id="assignee-select"
                  className="flex-1 text-xs border border-brand-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-400 bg-white text-gray-700">
                  <option value="">— Chưa giao —</option>
                  {allUsers.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
                </select>
                <button onClick={saveAssignee} className="p-1 rounded bg-emerald-500 text-white hover:bg-emerald-600"><Check size={12} /></button>
                <button onClick={() => setEditingAssignee(false)} className="p-1 rounded border border-gray-200 text-gray-400"><X size={12} /></button>
              </div>
            ) : (
              <div className="flex items-center gap-2 group">
                {assignee ? (
                  <span className="flex items-center gap-1.5 text-xs text-gray-700">
                    <div className="w-5 h-5 rounded-full bg-brand-100 flex items-center justify-center text-[9px] font-bold text-brand-700 flex-shrink-0">{getInitials(assignee.full_name)}</div>
                    {assignee.full_name}
                  </span>
                ) : <span className="text-xs text-gray-400">Chưa giao</span>}
                {(isManager || task.assigned_to === currentUser?.id) && (
                  <button onClick={() => setEditingAssignee(true)} className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-gray-100 text-gray-400 ml-auto transition-opacity">
                    <Pencil size={11} />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Người tạo */}
          <div className="px-4 py-3">
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1.5 flex items-center gap-1"><User size={10} /> Người tạo</div>
            {creator ? (
              <span className="flex items-center gap-1.5 text-xs text-gray-700">
                <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-[9px] font-bold text-gray-600 flex-shrink-0">{getInitials(creator.full_name)}</div>
                {creator.full_name}
              </span>
            ) : <span className="text-xs text-gray-400">—</span>}
          </div>

          {/* Deadline */}
          <div className="px-4 py-3">
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1.5 flex items-center gap-1"><CalendarDays size={10} /> Deadline</div>
            {editingDue ? (
              <div className="flex items-center gap-1.5">
                <DateInput value={dueDraft} onChange={v => setDueDraft(v)} className="flex-1 text-xs" />
                <button onClick={saveDueDate} className="p-1 rounded bg-emerald-500 text-white hover:bg-emerald-600"><Check size={12} /></button>
                <button onClick={() => setEditingDue(false)} className="p-1 rounded border border-gray-200 text-gray-400"><X size={12} /></button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 group">
                {task.due_date ? (
                  <span className={`text-xs font-medium flex items-center gap-1 ${td !== null && td < 0 ? 'text-red-600' : td !== null && td <= 7 ? 'text-amber-600' : 'text-gray-700'}`}>
                    <Clock size={11} />{formatDate(task.due_date)}
                    {td !== null && <span className="text-[10px]">({td < 0 ? `quá ${Math.abs(td)}N` : `còn ${td}N`})</span>}
                  </span>
                ) : <span className="text-xs text-gray-400">Chưa đặt</span>}
                <button onClick={() => { setDueDraft(task.due_date ?? ''); setEditingDue(true) }}
                  className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-gray-100 text-gray-400 ml-auto transition-opacity"><Pencil size={11} /></button>
              </div>
            )}
          </div>

          {/* Đơn hàng */}
          <div className="px-4 py-3">
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1.5 flex items-center gap-1"><Link2 size={10} /> Đơn hàng</div>
            {task.opportunity_id && oppTitle ? (
              <Link href={`/don-hang/${task.opportunity_id}`} className="text-xs text-accent-600 hover:text-accent-700 font-medium flex items-center gap-1 hover:underline truncate">
                <Link2 size={10} /> {oppTitle}
              </Link>
            ) : <span className="text-xs text-gray-400">—</span>}
          </div>

          {/* Ngày tạo */}
          <div className="px-4 py-3">
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">Ngày tạo</div>
            <span className="text-xs text-gray-600">{formatDate(task.created_at)}</span>
          </div>

          {task.is_done && task.done_at && (
            <div className="px-4 py-3">
              <div className="text-[10px] font-bold text-emerald-500 uppercase tracking-wide mb-1.5">Hoàn thành</div>
              <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                <CheckCircle2 size={11} /> {formatDate(task.done_at)}
              </span>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
