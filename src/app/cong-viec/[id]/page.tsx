'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  CheckCircle2, Circle, CalendarDays, User, Link2,
  Clock, Pencil, Check, X, Loader2, ChevronLeft, Plus, Square,
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

type TaskDetail = {
  id: string
  title: string
  status: TaskStatus | null
  is_done: boolean
  done_at: string | null
  due_date: string | null
  assigned_to: string | null
  created_by: string | null
  opportunity_id: string | null
  created_at: string
  stage: number
}

type UserMin = { id: string; full_name: string }
type SubTask = { id: string; title: string; is_done: boolean; created_at: string }

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

  // Subtasks
  const [subtasks, setSubtasks] = useState<SubTask[]>([])
  const [newSubtask, setNewSubtask] = useState('')
  const [addingSub, setAddingSub] = useState(false)
  const [showSubInput, setShowSubInput] = useState(false)

  const isManager = ['boss', 'admin', 'sale_admin'].includes(currentUser?.role ?? '')

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
    setLoading(false)
  }

  async function addSubtask() {
    if (!newSubtask.trim() || addingSub) return
    setAddingSub(true)
    const { data } = await supabase.from('tasks').insert({
      title: newSubtask.trim(),
      parent_id: id,
      opportunity_id: task?.opportunity_id ?? null,
      created_by: currentUser?.id,
      is_done: false,
      stage: 0,
    }).select('id,title,is_done,created_at').single()
    if (data) setSubtasks(prev => [...prev, data as SubTask])
    setNewSubtask('')
    setAddingSub(false)
    setShowSubInput(false)
  }

  async function toggleSubtask(subId: string, done: boolean) {
    setSubtasks(prev => prev.map(s => s.id === subId ? { ...s, is_done: done } : s))
    await supabase.from('tasks').update({
      is_done: done,
      status: done ? 'done' : 'todo',
      done_at: done ? new Date().toISOString() : null,
    }).eq('id', subId)
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
    await updateField({ title: titleDraft.trim() })
    setBreadcrumb(
      <span className="flex items-center gap-1 text-sm text-gray-500">
        <a href="/cong-viec" className="hover:text-gray-800 transition-colors">Công việc</a>
        <span className="text-gray-300">/</span>
        <span className="text-gray-800 font-medium truncate max-w-[200px]">{titleDraft.trim()}</span>
      </span>
    )
    setEditingTitle(false)
  }

  async function toggleDone() {
    if (!task) return
    const newDone = !task.is_done
    const newStatus: TaskStatus = newDone ? 'done' : 'todo'
    await updateField({ is_done: newDone, done_at: newDone ? new Date().toISOString() : null, status: newStatus })
  }

  async function changeStatus(s: TaskStatus) {
    const isDone = s === 'done'
    await updateField({ status: s, is_done: isDone, done_at: isDone ? new Date().toISOString() : null })
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 size={24} className="animate-spin text-gray-300" />
    </div>
  )

  if (!task) return (
    <div className="p-8 text-center text-gray-400">Không tìm thấy công việc</div>
  )

  const status = task.status ?? (task.is_done ? 'done' : 'todo')
  const statusOpt = STATUS_OPTS.find(s => s.key === status) ?? STATUS_OPTS[0]
  const assignee = allUsers.find(u => u.id === task.assigned_to)
  const creator  = allUsers.find(u => u.id === task.created_by)
  const td = task.due_date ? daysUntil(task.due_date) : null

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-5">

      {/* Back */}
      <Link href="/cong-viec" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 transition-colors">
        <ChevronLeft size={15} /> Quay lại Công việc
      </Link>

      {/* Title card */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
        <div className="flex items-start gap-3">
          {/* Done toggle */}
          <button onClick={toggleDone} disabled={saving} className="mt-1 flex-shrink-0 transition-transform hover:scale-110">
            {task.is_done
              ? <CheckCircle2 size={22} className="text-emerald-500" />
              : <Circle size={22} className="text-gray-300 hover:text-brand-400" />}
          </button>

          {/* Title */}
          <div className="flex-1 min-w-0">
            {editingTitle ? (
              <div className="flex items-center gap-2">
                <input autoFocus value={titleDraft} onChange={e => setTitleDraft(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') saveTitle(); if (e.key === 'Escape') setEditingTitle(false) }}
                  className="flex-1 text-lg font-bold text-gray-900 border border-brand-300 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-400" />
                <button onClick={saveTitle} className="p-1.5 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600">
                  <Check size={14} />
                </button>
                <button onClick={() => setEditingTitle(false)} className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-500">
                  <X size={14} />
                </button>
              </div>
            ) : (
              <div className="flex items-start gap-2 group">
                <h1 className={`text-lg font-bold leading-snug ${task.is_done ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                  {task.title}
                </h1>
                <button onClick={() => { setTitleDraft(task.title); setEditingTitle(true) }}
                  className="opacity-0 group-hover:opacity-100 mt-0.5 p-1 rounded-lg hover:bg-gray-100 text-gray-400 flex-shrink-0 transition-opacity">
                  <Pencil size={13} />
                </button>
              </div>
            )}

            {/* Status badge */}
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

      {/* Detail fields */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm divide-y divide-gray-100">

        {/* Status */}
        <div className="flex items-center gap-4 px-5 py-3.5">
          <div className="w-28 text-xs font-semibold text-gray-400 flex-shrink-0">Trạng thái</div>
          <select value={status} onChange={e => changeStatus(e.target.value as TaskStatus)}
            className={`text-xs font-semibold px-3 py-1.5 rounded-lg border-0 focus:outline-none focus:ring-1 focus:ring-brand-400 cursor-pointer ${statusOpt.bg} ${statusOpt.text}`}>
            {STATUS_OPTS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
        </div>

        {/* Assignee */}
        <div className="flex items-center gap-4 px-5 py-3.5">
          <div className="w-28 text-xs font-semibold text-gray-400 flex-shrink-0 flex items-center gap-1.5">
            <User size={12} /> Người thực hiện
          </div>
          {editingAssignee ? (
            <div className="flex items-center gap-2 flex-1">
              <select defaultValue={task.assigned_to ?? ''} id="assignee-select"
                className="flex-1 text-sm border border-brand-300 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-400 bg-white text-gray-700">
                <option value="">— Chưa giao —</option>
                {allUsers.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
              </select>
              <button onClick={async () => {
                const sel = (document.getElementById('assignee-select') as HTMLSelectElement).value
                await updateField({ assigned_to: sel || null })
                setEditingAssignee(false)
              }} className="p-1.5 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600"><Check size={14} /></button>
              <button onClick={() => setEditingAssignee(false)} className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-500"><X size={14} /></button>
            </div>
          ) : (
            <div className="flex items-center gap-2 group">
              {assignee ? (
                <span className="flex items-center gap-2 text-sm text-gray-700">
                  <div className="w-6 h-6 rounded-full bg-brand-100 flex items-center justify-center text-[10px] font-bold text-brand-700">
                    {getInitials(assignee.full_name)}
                  </div>
                  {assignee.full_name}
                </span>
              ) : <span className="text-sm text-gray-400">Chưa giao</span>}
              {(isManager || task.assigned_to === currentUser?.id) && (
                <button onClick={() => setEditingAssignee(true)}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-gray-100 text-gray-400 transition-opacity">
                  <Pencil size={12} />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Creator */}
        <div className="flex items-center gap-4 px-5 py-3.5">
          <div className="w-28 text-xs font-semibold text-gray-400 flex-shrink-0 flex items-center gap-1.5">
            <User size={12} /> Người tạo
          </div>
          {creator ? (
            <span className="flex items-center gap-2 text-sm text-gray-700">
              <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-600">
                {getInitials(creator.full_name)}
              </div>
              {creator.full_name}
            </span>
          ) : <span className="text-sm text-gray-400">—</span>}
        </div>

        {/* Due date */}
        <div className="flex items-center gap-4 px-5 py-3.5">
          <div className="w-28 text-xs font-semibold text-gray-400 flex-shrink-0 flex items-center gap-1.5">
            <CalendarDays size={12} /> Deadline
          </div>
          {editingDue ? (
            <div className="flex items-center gap-2">
              <DateInput value={dueDraft} onChange={v => setDueDraft(v)} className="w-40" />
              <button onClick={async () => { await updateField({ due_date: dueDraft || null }); setEditingDue(false) }}
                className="p-1.5 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600"><Check size={14} /></button>
              <button onClick={() => setEditingDue(false)} className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-500"><X size={14} /></button>
            </div>
          ) : (
            <div className="flex items-center gap-2 group">
              {task.due_date ? (
                <span className={`text-sm font-medium flex items-center gap-1.5 ${td !== null && td < 0 ? 'text-red-600' : td !== null && td <= 7 ? 'text-amber-600' : 'text-gray-700'}`}>
                  <Clock size={13} />
                  {formatDate(task.due_date)}
                  {td !== null && <span className="text-xs">({td < 0 ? `quá ${Math.abs(td)} ngày` : `còn ${td} ngày`})</span>}
                </span>
              ) : <span className="text-sm text-gray-400">Chưa đặt deadline</span>}
              <button onClick={() => { setDueDraft(task.due_date ?? ''); setEditingDue(true) }}
                className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-gray-100 text-gray-400 transition-opacity">
                <Pencil size={12} />
              </button>
            </div>
          )}
        </div>

        {/* Opportunity */}
        <div className="flex items-center gap-4 px-5 py-3.5">
          <div className="w-28 text-xs font-semibold text-gray-400 flex-shrink-0 flex items-center gap-1.5">
            <Link2 size={12} /> Đơn hàng
          </div>
          {task.opportunity_id && oppTitle ? (
            <Link href={`/don-hang/${task.opportunity_id}`} className="text-sm text-accent-600 hover:text-accent-700 font-medium flex items-center gap-1.5 hover:underline">
              <Link2 size={13} /> {oppTitle}
            </Link>
          ) : <span className="text-sm text-gray-400">Không thuộc đơn hàng nào</span>}
        </div>

        {/* Created at */}
        <div className="flex items-center gap-4 px-5 py-3.5">
          <div className="w-28 text-xs font-semibold text-gray-400 flex-shrink-0">Ngày tạo</div>
          <span className="text-sm text-gray-500">{formatDate(task.created_at)}</span>
        </div>

        {task.is_done && task.done_at && (
          <div className="flex items-center gap-4 px-5 py-3.5">
            <div className="w-28 text-xs font-semibold text-gray-400 flex-shrink-0">Hoàn thành</div>
            <span className="text-sm text-emerald-600 font-medium flex items-center gap-1.5">
              <CheckCircle2 size={13} /> {formatDate(task.done_at)}
            </span>
          </div>
        )}
      </div>

      {/* Subtasks */}
      {(() => {
        const subDone = subtasks.filter(s => s.is_done).length
        const subTotal = subtasks.length
        const pct = subTotal > 0 ? Math.round(subDone / subTotal * 100) : 0
        return (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-gray-900">Công việc con</span>
                {subTotal > 0 && (
                  <span className="text-xs text-gray-400 font-medium">{subDone}/{subTotal}</span>
                )}
              </div>
              {subTotal > 0 && (
                <span className={`text-xs font-bold ${pct === 100 ? 'text-emerald-600' : 'text-gray-500'}`}>{pct}%</span>
              )}
            </div>

            {/* Progress bar */}
            {subTotal > 0 && (
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-4">
                <div
                  className={`h-2 rounded-full transition-all duration-500 ${pct === 100 ? 'bg-emerald-500' : 'bg-brand-400'}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            )}

            {/* Subtask list */}
            <ul className="space-y-1 mb-3">
              {subtasks.map(sub => (
                <li key={sub.id} className="flex items-center gap-2.5 group px-1 py-1 rounded-lg hover:bg-gray-50">
                  <button onClick={() => toggleSubtask(sub.id, !sub.is_done)} className="flex-shrink-0 transition-transform hover:scale-110">
                    {sub.is_done
                      ? <CheckCircle2 size={16} className="text-emerald-500" />
                      : <Square size={16} className="text-gray-300 hover:text-brand-400" />}
                  </button>
                  <span className={`flex-1 text-sm ${sub.is_done ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                    {sub.title}
                  </span>
                  <button onClick={() => deleteSubtask(sub.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-50 text-gray-300 hover:text-red-400 transition-all">
                    <X size={12} />
                  </button>
                </li>
              ))}
            </ul>

            {/* Add subtask */}
            {showSubInput ? (
              <div className="flex items-center gap-2">
                <input
                  autoFocus
                  value={newSubtask}
                  onChange={e => setNewSubtask(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') addSubtask()
                    if (e.key === 'Escape') { setShowSubInput(false); setNewSubtask('') }
                  }}
                  placeholder="Tên công việc con..."
                  className="flex-1 text-sm border border-brand-300 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-400"
                />
                <button onClick={addSubtask} disabled={addingSub || !newSubtask.trim()}
                  className="p-1.5 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-40">
                  {addingSub ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                </button>
                <button onClick={() => { setShowSubInput(false); setNewSubtask('') }}
                  className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-500">
                  <X size={14} />
                </button>
              </div>
            ) : (
              <button onClick={() => setShowSubInput(true)}
                className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-brand-600 transition-colors py-1 px-1 rounded-lg hover:bg-brand-50">
                <Plus size={13} />
                Thêm công việc con
              </button>
            )}
          </div>
        )
      })()}

    </div>
  )
}
