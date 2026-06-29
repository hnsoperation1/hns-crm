'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  Plus, Loader2, Check, ClipboardList, User, CalendarDays, Link2,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/auth'
import { useTopbar } from '@/contexts/topbar'
import DateInput from '@/components/DateInput'
import { formatDate, getInitials } from '@/lib/utils'

export default function GiaoViecPage() {
  const supabase = createClient()
  const { user: currentUser } = useAuth()
  const { setOnRefresh } = useTopbar()

  const [users, setUsers] = useState<{ id: string; full_name: string; role: string }[]>([])
  const [opps, setOpps] = useState<{ id: string; title: string }[]>([])
  const [tasks, setTasks] = useState<{
    id: string; title: string; due_date: string | null; is_done: boolean
    assigned_to: string | null; opportunity_id: string | null; created_at: string
  }[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ title: '', opportunity_id: '', due_date: '', assigned_to: '', note: '' })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    const [usersRes, oppsRes, tasksRes] = await Promise.all([
      supabase.from('users').select('id,full_name,role').eq('is_active', true).order('full_name'),
      supabase.from('opportunities').select('id,title').is('deleted_at', null).order('created_at', { ascending: false }).limit(200),
      supabase.from('tasks').select('id,title,due_date,is_done,assigned_to,opportunity_id,created_at').order('created_at', { ascending: false }).limit(100),
    ])
    setUsers(usersRes.data ?? [])
    setOpps(oppsRes.data ?? [])
    setTasks(tasksRes.data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    loadData()
    setOnRefresh(loadData)
    return () => setOnRefresh(null)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id])

  async function handleSubmit() {
    if (!form.title.trim()) return
    setSaving(true)
    const { data, error } = await supabase.from('tasks').insert({
      title: form.title.trim(),
      opportunity_id: form.opportunity_id || null,
      due_date: form.due_date || null,
      assigned_to: form.assigned_to || null,
      created_by: currentUser?.id,
      is_done: false,
      stage: 0,
    }).select('*').single()
    if (!error && data) {
      setTasks(prev => [data, ...prev])
      setForm({ title: '', opportunity_id: '', due_date: '', assigned_to: '', note: '' })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }
    setSaving(false)
  }

  const getUserName = (id: string | null) => {
    if (!id) return null
    return users.find(u => u.id === id)?.full_name ?? null
  }

  const getOppTitle = (id: string | null) => {
    if (!id) return null
    return opps.find(o => o.id === id)?.title ?? null
  }

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">

      {/* HEADER */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Giao việc</h1>
        <p className="text-sm text-gray-400 mt-0.5">Tạo và phân công nhiệm vụ cho nhân viên</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 size={28} className="animate-spin text-gray-300" />
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-6">

          {/* LEFT: Task list (2/3) */}
          <div className="col-span-2 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-gray-900">Nhiệm vụ gần đây</h2>
              <span className="text-xs text-gray-400">{tasks.length} nhiệm vụ</span>
            </div>

            {tasks.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-12 text-center">
                <ClipboardList size={36} className="text-gray-200 mx-auto mb-3" />
                <div className="text-sm font-semibold text-gray-400">Chưa có nhiệm vụ nào</div>
                <div className="text-xs text-gray-300 mt-1">Tạo nhiệm vụ đầu tiên từ form bên phải</div>
              </div>
            ) : (
              <div className="space-y-2.5">
                {tasks.map(task => {
                  const assigneeName = getUserName(task.assigned_to)
                  const oppTitle = getOppTitle(task.opportunity_id)
                  return (
                    <div key={task.id} className={`bg-white rounded-2xl border shadow-sm transition-all ${task.is_done ? 'border-gray-100 opacity-60' : 'border-gray-200 hover:border-accent-200 hover:shadow-md'}`}>
                      <div className="p-4 flex items-start gap-3">
                        <div className={`mt-0.5 w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${task.is_done ? 'bg-emerald-500 border-emerald-500' : 'border-gray-300'}`}>
                          {task.is_done && <Check size={10} className="text-white" strokeWidth={3} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className={`text-sm font-semibold ${task.is_done ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                            {task.title}
                          </div>
                          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                            {oppTitle && task.opportunity_id ? (
                              <span className="flex items-center gap-1 text-xs text-gray-400">
                                <Link2 size={10} />
                                <Link href={`/don-hang/${task.opportunity_id}`} className="hover:text-accent-500 transition-colors truncate max-w-[180px]">
                                  {oppTitle}
                                </Link>
                              </span>
                            ) : task.opportunity_id ? (
                              <span className="text-xs text-gray-400 truncate max-w-[180px]">{task.opportunity_id}</span>
                            ) : null}
                            {assigneeName && (
                              <span className="flex items-center gap-1.5 text-xs text-gray-500">
                                <div className="w-4 h-4 rounded-full bg-brand-100 flex items-center justify-center text-[8px] font-bold text-brand-700 flex-shrink-0">
                                  {getInitials(assigneeName)}
                                </div>
                                {assigneeName}
                              </span>
                            )}
                            {!assigneeName && (
                              <span className="flex items-center gap-1 text-xs text-gray-300">
                                <User size={10} /> Chưa giao
                              </span>
                            )}
                            {task.due_date && (
                              <span className="flex items-center gap-1 text-xs text-amber-500">
                                <CalendarDays size={10} />
                                Hạn {formatDate(task.due_date)}
                              </span>
                            )}
                          </div>
                        </div>
                        {task.is_done && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 flex-shrink-0">
                            Xong
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* RIGHT: Create form (1/3) */}
          <div>
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden sticky top-5">
              <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-accent-50 to-brand-50">
                <h2 className="font-bold text-gray-900">Tạo nhiệm vụ mới</h2>
                <p className="text-xs text-gray-500 mt-0.5">Điền thông tin và phân công nhân viên</p>
              </div>

              <div className="p-5 space-y-4">

                {saved && (
                  <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2.5">
                    <Check size={14} className="text-emerald-500" />
                    <span className="text-xs font-semibold text-emerald-700">Đã tạo nhiệm vụ thành công!</span>
                  </div>
                )}

                {/* Title */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                    Tên nhiệm vụ <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="VD: Liên hệ xác nhận danh sách khách..."
                    value={form.title}
                    onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                    className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-400 bg-white hover:border-gray-300 transition-colors"
                  />
                </div>

                {/* Order */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                    Đơn hàng <span className="text-gray-400 font-normal">(tuỳ chọn)</span>
                  </label>
                  <select
                    value={form.opportunity_id}
                    onChange={e => setForm(f => ({ ...f, opportunity_id: e.target.value }))}
                    className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-400 bg-white hover:border-gray-300 transition-colors text-gray-700"
                  >
                    <option value="">— Chọn đơn hàng —</option>
                    {opps.map(o => (
                      <option key={o.id} value={o.id}>{o.title}</option>
                    ))}
                  </select>
                </div>

                {/* Assignee */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Giao cho</label>
                  <select
                    value={form.assigned_to}
                    onChange={e => setForm(f => ({ ...f, assigned_to: e.target.value }))}
                    className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-400 bg-white hover:border-gray-300 transition-colors text-gray-700"
                  >
                    <option value="">— Chưa giao —</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>{u.full_name}</option>
                    ))}
                  </select>
                </div>

                {/* Due date */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Deadline</label>
                  <DateInput value={form.due_date} onChange={v => setForm(f => ({ ...f, due_date: v }))} className="w-full" />
                </div>

                {/* Submit */}
                <button
                  onClick={handleSubmit}
                  disabled={saving || !form.title.trim()}
                  className="w-full flex items-center justify-center gap-2 bg-accent-500 hover:bg-accent-600 disabled:opacity-50 text-white py-3 rounded-xl font-bold text-sm transition-all shadow-sm"
                >
                  {saving ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
                  Tạo nhiệm vụ
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
