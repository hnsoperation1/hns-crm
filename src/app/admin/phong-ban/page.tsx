'use client'

import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, Users, X, ChevronRight, Building } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { getInitials } from '@/lib/utils'
import type { User } from '@/types'

type Department = {
  id: string
  name: string
  description: string | null
  color: string
  manager_id: string | null
  created_at: string
}

type DeptWithMembers = Department & { members: User[]; manager: User | null }

const COLORS = ['#0e6a95', '#ef5e2f', '#10b981', '#8b5cf6', '#f59e0b', '#ec4899', '#06b6d4', '#84cc16']

const EMPTY_FORM = { name: '', description: '', color: '#0e6a95', manager_id: '' }

export default function PhongBanPage() {
  const supabase = createClient()
  const [depts, setDepts] = useState<DeptWithMembers[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<DeptWithMembers | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Department | null>(null)
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [submitting, setSubmitting] = useState(false)
  const [showAddMember, setShowAddMember] = useState(false)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const [{ data: d }, { data: u }] = await Promise.all([
      supabase.from('departments').select('*').order('name'),
      supabase.from('users').select('*').eq('is_active', true).order('full_name'),
    ])
    const allUsers = (u ?? []) as User[]
    const allDepts = (d ?? []) as Department[]

    // Load members per dept (select * includes department_id if column exists)
    const { data: members } = await supabase.from('users').select('*').eq('is_active', true)
    const membersList = (members ?? []) as (User & { department_id?: string | null })[]

    const withMembers: DeptWithMembers[] = allDepts.map(dept => ({
      ...dept,
      members: membersList.filter(m => (m as any).department_id === dept.id),
      manager: membersList.find(m => m.id === dept.manager_id) ?? null,
    }))

    setDepts(withMembers)
    setUsers(allUsers)
    setLoading(false)

    if (selected) {
      const updated = withMembers.find(d => d.id === selected.id)
      if (updated) setSelected(updated)
    }
  }

  async function handleSubmit() {
    if (!form.name.trim()) return
    setSubmitting(true)
    if (editing) {
      await supabase.from('departments').update({
        name: form.name.trim(),
        description: form.description.trim() || null,
        color: form.color,
        manager_id: form.manager_id || null,
      }).eq('id', editing.id)
    } else {
      await supabase.from('departments').insert({
        name: form.name.trim(),
        description: form.description.trim() || null,
        color: form.color,
        manager_id: form.manager_id || null,
      })
    }
    setSubmitting(false)
    setShowForm(false)
    setEditing(null)
    setForm({ ...EMPTY_FORM })
    loadData()
  }

  async function handleDelete(dept: DeptWithMembers) {
    if (!confirm(`Xoá phòng ban "${dept.name}"? Thành viên sẽ không còn thuộc phòng nào.`)) return
    // Remove dept from all members first
    await supabase.from('users').update({ department_id: null }).eq('department_id', dept.id)
    await supabase.from('departments').delete().eq('id', dept.id)
    if (selected?.id === dept.id) setSelected(null)
    loadData()
  }

  async function handleAddMember(userId: string) {
    if (!selected) return
    await supabase.from('users').update({ department_id: selected.id }).eq('id', userId)
    loadData()
  }

  async function handleRemoveMember(userId: string) {
    await supabase.from('users').update({ department_id: null }).eq('id', userId)
    loadData()
  }

  function openEdit(dept: DeptWithMembers) {
    setEditing(dept)
    setForm({ name: dept.name, description: dept.description ?? '', color: dept.color, manager_id: dept.manager_id ?? '' })
    setShowForm(true)
  }

  const unassigned = users.filter(u => !depts.some(d => d.members.some(m => m.id === u.id)))
  const availableToAdd = selected ? users.filter(u => !selected.members.some(m => m.id === u.id)) : []

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-gray-50/80">
      <div className="flex-shrink-0 px-6 py-5 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Phòng ban</h1>
          <p className="text-sm text-gray-400 mt-0.5">{depts.length} phòng ban · {users.length - unassigned.length}/{users.length} nhân viên đã phân công</p>
        </div>
        <button onClick={() => { setEditing(null); setForm({ ...EMPTY_FORM }); setShowForm(true) }}
          className="flex items-center gap-2 px-4 py-2.5 bg-accent-500 text-white rounded-xl text-sm font-semibold hover:bg-accent-600 transition-colors shadow-sm">
          <Plus size={16} /> Thêm phòng ban
        </button>
      </div>

      <div className="flex-1 overflow-hidden px-6 pb-6">
        <div className="h-full grid grid-cols-[320px_1fr] gap-5">

          {/* Left: list */}
          <div className="flex flex-col gap-3 overflow-y-auto">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="bg-white rounded-2xl border border-gray-200 p-4 animate-pulse space-y-2">
                  <div className="h-4 bg-gray-100 rounded w-1/2" />
                  <div className="h-3 bg-gray-100 rounded w-1/3" />
                </div>
              ))
            ) : depts.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center text-gray-400">
                <Users size={32} className="mx-auto mb-3 text-gray-200" />
                <p className="text-sm">Chưa có phòng ban nào</p>
                <p className="text-xs mt-1">Bấm "+ Thêm phòng ban" để bắt đầu</p>
              </div>
            ) : (
              depts.map(dept => (
                <div key={dept.id}
                  onClick={() => setSelected(selected?.id === dept.id ? null : dept)}
                  className={`bg-white rounded-2xl border cursor-pointer transition-all hover:shadow-md ${selected?.id === dept.id ? 'border-brand-400 shadow-md' : 'border-gray-200'}`}>
                  <div className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-xl flex-shrink-0 flex items-center justify-center text-white text-sm font-bold"
                        style={{ background: dept.color }}>
                        {dept.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-semibold text-gray-900 text-sm truncate">{dept.name}</p>
                          <div className="flex items-center gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
                            <button onClick={() => openEdit(dept)} className="p-1 hover:bg-gray-100 rounded-lg text-gray-400 transition-colors"><Pencil size={13} /></button>
                            <button onClick={() => handleDelete(dept)} className="p-1 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500 transition-colors"><Trash2 size={13} /></button>
                          </div>
                        </div>
                        {dept.description && <p className="text-xs text-gray-400 mt-0.5 truncate">{dept.description}</p>}
                        <div className="flex items-center gap-3 mt-2">
                          <span className="text-xs text-gray-500 flex items-center gap-1"><Users size={11} /> {dept.members.length} thành viên</span>
                          {dept.manager && <span className="text-xs text-gray-400">Trưởng: <span className="font-medium text-gray-600">{dept.manager.full_name}</span></span>}
                        </div>
                      </div>
                      <ChevronRight size={14} className={`text-gray-300 flex-shrink-0 mt-1 transition-transform ${selected?.id === dept.id ? 'rotate-90 text-brand-500' : ''}`} />
                    </div>

                    {/* Members avatars */}
                    {dept.members.length > 0 && (
                      <div className="flex items-center gap-1 mt-3 pl-12">
                        {dept.members.slice(0, 6).map(m => (
                          <div key={m.id} title={m.full_name}
                            className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white border-2 border-white -ml-1.5 first:ml-0"
                            style={{ background: dept.color + 'cc' }}>
                            {getInitials(m.full_name)}
                          </div>
                        ))}
                        {dept.members.length > 6 && (
                          <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-500 border-2 border-white -ml-1.5">
                            +{dept.members.length - 6}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Right: detail */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden flex flex-col">
            {!selected ? (
              <div className="flex-1 flex flex-col items-center justify-center text-gray-300">
                <Building size={40} className="mb-3" />
                <p className="text-sm">Chọn một phòng ban để xem chi tiết</p>
              </div>
            ) : (
              <>
                <div className="px-6 py-4 border-b border-gray-100 flex-shrink-0 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold"
                    style={{ background: selected.color }}>
                    {selected.name.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <h2 className="font-bold text-gray-900">{selected.name}</h2>
                    {selected.description && <p className="text-xs text-gray-400 mt-0.5">{selected.description}</p>}
                  </div>
                  <button onClick={() => { setShowAddMember(true) }}
                    className="flex items-center gap-1.5 px-3 py-2 bg-brand-600 text-white rounded-xl text-xs font-semibold hover:bg-brand-700 transition-colors">
                    <Plus size={13} /> Thêm thành viên
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto">
                  {selected.members.length === 0 ? (
                    <div className="py-16 text-center text-gray-300">
                      <Users size={32} className="mx-auto mb-2" />
                      <p className="text-sm">Chưa có thành viên</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-50">
                      {selected.members.map(m => (
                        <div key={m.id} className="flex items-center gap-4 px-6 py-3.5 hover:bg-gray-50/70 group">
                          <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                            style={{ background: selected.color + 'cc' }}>
                            {getInitials(m.full_name)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-semibold text-gray-900">{m.full_name}</p>
                              {selected.manager_id === m.id && (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white" style={{ background: selected.color }}>Trưởng phòng</span>
                              )}
                            </div>
                            <p className="text-xs text-gray-400">{m.email}</p>
                          </div>
                          <button onClick={() => handleRemoveMember(m.id)}
                            className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-50 rounded-lg text-gray-300 hover:text-red-500 transition-all">
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Modal thêm/sửa phòng ban */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <p className="font-bold text-gray-900">{editing ? 'Sửa phòng ban' : 'Thêm phòng ban mới'}</p>
              <button onClick={() => setShowForm(false)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400"><X size={16} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Tên phòng ban *</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="VD: Phòng Sale, Phòng Marketing..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Mô tả</label>
                <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Mô tả ngắn về phòng ban..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-2 block">Màu sắc</label>
                <div className="flex items-center gap-2 flex-wrap">
                  {COLORS.map(c => (
                    <button key={c} type="button" onClick={() => setForm(f => ({ ...f, color: c }))}
                      className={`w-7 h-7 rounded-lg transition-all ${form.color === c ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : ''}`}
                      style={{ background: c }} />
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Trưởng phòng</label>
                <select value={form.manager_id} onChange={e => setForm(f => ({ ...f, manager_id: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 bg-white">
                  <option value="">-- Chưa chỉ định --</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
                </select>
              </div>
            </div>
            <div className="px-6 pb-6 flex gap-3">
              <button onClick={() => setShowForm(false)} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-500 hover:bg-gray-50 transition-colors font-medium">Huỷ</button>
              <button onClick={handleSubmit} disabled={submitting || !form.name.trim()}
                className="flex-1 px-4 py-2.5 bg-accent-500 text-white rounded-xl text-sm font-semibold hover:bg-accent-600 transition-colors disabled:opacity-50">
                {submitting ? 'Đang lưu...' : editing ? 'Lưu thay đổi' : 'Tạo phòng ban'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal thêm thành viên */}
      {showAddMember && selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm" onClick={() => setShowAddMember(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <p className="font-bold text-gray-900 text-sm">Thêm vào {selected.name}</p>
              <button onClick={() => setShowAddMember(false)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400"><X size={16} /></button>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {availableToAdd.length === 0 ? (
                <div className="py-10 text-center text-sm text-gray-400">Tất cả nhân viên đã có trong phòng ban này</div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {availableToAdd.map(u => (
                    <button key={u.id} onClick={async () => { await handleAddMember(u.id); setShowAddMember(false) }}
                      className="w-full flex items-center gap-3 px-5 py-3 hover:bg-brand-50 transition-colors text-left">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                        style={{ background: selected.color + 'cc' }}>
                        {getInitials(u.full_name)}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{u.full_name}</p>
                        <p className="text-xs text-gray-400">{u.email}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
