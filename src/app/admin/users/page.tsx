'use client'

import { useState, useEffect } from 'react'
import { Plus, X, Search, ShieldCheck, Pencil, Trash2, ChevronDown } from 'lucide-react'
import type { User, Role } from '@/types'
import { getInitials } from '@/lib/utils'
import { useAuth } from '@/contexts/auth'
import { createClient } from '@/lib/supabase/client'

const SUPER_ADMIN_EMAIL = 'operation1@hanoisuntravel.com'

const ROLE_LABELS: Record<Role, string> = {
  boss: 'Giám đốc',
  admin: 'Quản trị viên',
  sale_admin: 'Sale Admin',
  mkt: 'Marketing',
  cskh: 'Chăm sóc KH',
  sale: 'Sale TV',
}

const ROLE_COLORS: Record<Role, string> = {
  boss: 'bg-indigo-100 text-indigo-700',
  admin: 'bg-sky-100 text-sky-700',
  sale_admin: 'bg-teal-100 text-teal-700',
  mkt: 'bg-pink-100 text-pink-700',
  cskh: 'bg-emerald-100 text-emerald-700',
  sale: 'bg-slate-100 text-slate-700',
}

type FormData = {
  full_name: string
  email: string
  password: string
  phone: string
  role: Role
  is_sale_tv: boolean
  can_manage_campaign: boolean
  can_qualify_lead: boolean
  can_cskh_post: boolean
  is_active: boolean
}

const EMPTY_FORM: FormData = {
  full_name: '',
  email: '',
  password: '',
  phone: '',
  role: 'sale',
  is_sale_tv: false,
  can_manage_campaign: false,
  can_qualify_lead: false,
  can_cskh_post: false,
  is_active: true,
}

const FLAGS = [
  { key: 'is_sale_tv',          label: 'Sale TV',           desc: 'Được phân công đơn hàng, ghi nhật ký' },
  { key: 'can_manage_campaign', label: 'Quản lý Campaign',  desc: 'Tạo và quản lý chiến dịch MKT' },
  { key: 'can_qualify_lead',    label: 'Qualify Lead',      desc: 'Xác nhận chất lượng lead đầu vào' },
  { key: 'can_cskh_post',       label: 'CSKH Post-tour',    desc: 'Chăm sóc khách hàng sau tour' },
]

export default function AdminUsersPage() {
  const { user: currentUser } = useAuth()
  const isSuperAdmin = currentUser?.is_super_admin === true || currentUser?.email === SUPER_ADMIN_EMAIL
  const [users, setUsers] = useState<User[]>([])
  const [fetchLoading, setFetchLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    supabase.from('users').select('*').order('created_at').then(({ data }) => {
      if (data) setUsers(data as User[])
      setFetchLoading(false)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const [search, setSearch] = useState('')
  const [panelOpen, setPanelOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [form, setForm] = useState<FormData>(EMPTY_FORM)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  if (!isSuperAdmin) {
    return (
      <div className="flex items-center justify-center" style={{ height: 'calc(100vh - 40px)' }}>
        <div className="text-center">
          <ShieldCheck size={48} className="mx-auto text-gray-200 mb-4" />
          <h2 className="text-xl font-bold text-gray-500 mb-2">Không có quyền truy cập</h2>
          <p className="text-gray-400 text-sm">Chỉ Super Admin mới có thể quản lý người dùng.</p>
        </div>
      </div>
    )
  }

  const filtered = users.filter(u =>
    u.full_name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  )

  const activeCount = users.filter(u => u.is_active).length

  function openAdd() {
    setEditingUser(null)
    setForm(EMPTY_FORM)
    setErrors({})
    setPanelOpen(true)
  }

  function openEdit(user: User) {
    setEditingUser(user)
    setForm({
      full_name: user.full_name,
      email: user.email,
      password: '',
      phone: user.phone ?? '',
      role: user.role,
      is_sale_tv: user.is_sale_tv,
      can_manage_campaign: user.can_manage_campaign,
      can_qualify_lead: user.can_qualify_lead,
      can_cskh_post: user.can_cskh_post,
      is_active: user.is_active,
    })
    setErrors({})
    setPanelOpen(true)
  }

  function closePanel() {
    setPanelOpen(false)
    setEditingUser(null)
    setErrors({})
  }

  function validate() {
    const e: Record<string, string> = {}
    if (!form.full_name.trim()) e.full_name = 'Bắt buộc'
    if (!form.email.trim()) e.email = 'Bắt buộc'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Email không hợp lệ'
    else if (!editingUser && users.some(u => u.email === form.email)) e.email = 'Email đã tồn tại'
    if (!editingUser) {
      if (!form.password) e.password = 'Bắt buộc'
      else if (form.password.length < 6) e.password = 'Tối thiểu 6 ký tự'
    }
    return e
  }

  async function handleSubmit() {
    const e = validate()
    if (Object.keys(e).length > 0) { setErrors(e); return }
    setSaving(true)

    const payload = {
      full_name: form.full_name.trim(),
      phone: form.phone.trim() || undefined,
      role: form.role,
      is_sale_tv: form.is_sale_tv,
      can_manage_campaign: form.can_manage_campaign,
      can_qualify_lead: form.can_qualify_lead,
      can_cskh_post: form.can_cskh_post,
      is_active: form.is_active,
    }

    if (editingUser) {
      const { error } = await supabase.from('users').update(payload).eq('id', editingUser.id)
      if (error) { setErrors({ _: error.message }); setSaving(false); return }
      setUsers(prev => prev.map(u => u.id === editingUser.id ? { ...u, ...payload } : u))
    } else {
      const res = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.email.trim(),
          password: form.password,
          full_name: form.full_name.trim(),
          phone: form.phone.trim() || null,
          role: form.role,
          is_sale_tv: form.is_sale_tv,
          can_manage_campaign: form.can_manage_campaign,
          can_qualify_lead: form.can_qualify_lead,
          can_cskh_post: form.can_cskh_post,
        }),
      })
      const json = await res.json()
      if (!res.ok) { setErrors({ _: json.error ?? 'Tạo tài khoản thất bại' }); setSaving(false); return }
      if (json.user) setUsers(prev => [...prev, json.user])
    }

    setSaving(false)
    closePanel()
  }

  async function toggleActive(userId: string) {
    const target = users.find(u => u.id === userId)
    if (!target) return
    const newVal = !target.is_active
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_active: newVal } : u))
    await supabase.from('users').update({ is_active: newVal }).eq('id', userId)
  }

  async function handleDelete(userId: string) {
    setUsers(prev => prev.filter(u => u.id !== userId))
    setDeleteConfirm(null)
    await supabase.from('users').delete().eq('id', userId)
  }

  const pendingDelete = users.find(u => u.id === deleteConfirm)

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 40px)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white flex-shrink-0">
        <div>
          <div className="flex items-center gap-2.5 mb-0.5">
            <h1 className="text-2xl font-bold text-gray-900">Người dùng</h1>
            <span className="flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
              <ShieldCheck size={12} />
              Super Admin
            </span>
          </div>
          <p className="text-sm text-gray-400">{activeCount}/{users.length} tài khoản đang hoạt động</p>
        </div>
        <button onClick={openAdd}
          className="flex items-center gap-2 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors hover:opacity-90"
          style={{ background: '#ef5e2f' }}>
          <Plus size={16} strokeWidth={2.5} />
          Thêm người dùng
        </button>
      </div>

      {/* Search + role breakdown */}
      <div className="px-6 py-3 bg-white border-b border-gray-100 flex items-center gap-4 flex-shrink-0 flex-wrap">
        <div className="relative w-64">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Tìm tên, email..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-300"
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {(Object.keys(ROLE_LABELS) as Role[]).map(role => {
            const count = users.filter(u => u.role === role).length
            if (count === 0) return null
            return (
              <span key={role} className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${ROLE_COLORS[role]}`}>
                {ROLE_LABELS[role]}: {count}
              </span>
            )
          })}
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Người dùng</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Vai trò</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Quyền hạn</th>
                <th className="text-center px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Hoạt động</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(user => (
                <tr key={user.id} className="hover:bg-gray-50/60 transition-colors group">
                  {/* User info */}
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                        style={{ background: user.is_active ? 'linear-gradient(135deg, #0e6a95, #052f43)' : '#d1d5db' }}
                      >
                        {getInitials(user.full_name)}
                      </div>
                      <div>
                        <div className={`font-semibold flex items-center gap-1.5 ${user.is_active ? 'text-gray-900' : 'text-gray-400'}`}>
                          {user.full_name}
                          {user.is_super_admin && (
                            <ShieldCheck size={13} className="text-amber-500 flex-shrink-0" />
                          )}
                        </div>
                        <div className="text-xs text-gray-400">{user.email}</div>
                        {user.phone && <div className="text-xs text-gray-400">{user.phone}</div>}
                      </div>
                    </div>
                  </td>

                  {/* Role */}
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${ROLE_COLORS[user.role]}`}>
                      {ROLE_LABELS[user.role]}
                    </span>
                  </td>

                  {/* Flags */}
                  <td className="px-5 py-3.5">
                    <div className="flex flex-wrap gap-1">
                      {user.is_sale_tv          && <FlagBadge label="Sale TV" />}
                      {user.can_manage_campaign  && <FlagBadge label="Campaign" />}
                      {user.can_qualify_lead     && <FlagBadge label="Qualify" />}
                      {user.can_cskh_post        && <FlagBadge label="CSKH" />}
                      {!user.is_sale_tv && !user.can_manage_campaign && !user.can_qualify_lead && !user.can_cskh_post && (
                        <span className="text-xs text-gray-300">—</span>
                      )}
                    </div>
                  </td>

                  {/* Active toggle */}
                  <td className="px-5 py-3.5">
                    <div className="flex justify-center">
                      <button
                        onClick={() => toggleActive(user.id)}
                        disabled={!!user.is_super_admin}
                        title={user.is_super_admin ? 'Super Admin không thể bị vô hiệu hóa' : undefined}
                        className={`relative inline-flex h-5 w-9 rounded-full transition-colors flex-shrink-0 ${
                          user.is_active ? 'bg-emerald-400' : 'bg-gray-200'
                        } ${user.is_super_admin ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                      >
                        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                          user.is_active ? 'translate-x-[18px]' : 'translate-x-0.5'
                        }`} />
                      </button>
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => openEdit(user)}
                        className="p-1.5 rounded-lg hover:bg-sky-50 text-gray-400 hover:text-sky-600 transition-colors"
                        title="Chỉnh sửa"
                      >
                        <Pencil size={14} />
                      </button>
                      {!user.is_super_admin && (
                        <button
                          onClick={() => setDeleteConfirm(user.id)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                          title="Xóa"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {fetchLoading && (
                <tr>
                  <td colSpan={5} className="px-5 py-14 text-center text-sm text-gray-400">
                    Đang tải...
                  </td>
                </tr>
              )}
              {!fetchLoading && filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-14 text-center text-sm text-gray-400">
                    Không tìm thấy người dùng
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit slide-over panel */}
      {panelOpen && (
        <>
          <div className="fixed inset-0 bg-black/20 z-40" onClick={closePanel} />
          <div className="fixed top-0 right-0 h-full w-[420px] bg-white shadow-2xl z-50 flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
              <h2 className="text-lg font-bold text-gray-900">
                {editingUser ? 'Chỉnh sửa người dùng' : 'Thêm người dùng mới'}
              </h2>
              <button onClick={closePanel} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              {/* Full name */}
              <Field label="Họ và tên" required error={errors.full_name}>
                <input
                  value={form.full_name}
                  onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                  className={inputCls(!!errors.full_name)}
                  placeholder="Nguyễn Văn A"
                />
              </Field>

              {/* Email */}
              <Field label="Email" required error={errors.email}>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  disabled={!!editingUser}
                  className={inputCls(!!errors.email, !!editingUser)}
                  placeholder="nhanvien@hanoisuntravel.com"
                />
              </Field>

              {/* Password — chỉ khi tạo mới */}
              {!editingUser && (
                <Field label="Mật khẩu" required error={errors.password}>
                  <input
                    type="password"
                    value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    className={inputCls(!!errors.password)}
                    placeholder="Tối thiểu 6 ký tự"
                  />
                </Field>
              )}

              {/* Phone */}
              <Field label="Số điện thoại">
                <input
                  value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  className={inputCls(false)}
                  placeholder="09xxxxxxxx"
                />
              </Field>

              {/* Role */}
              <Field label="Vai trò" required>
                <div className="relative">
                  <select
                    value={form.role}
                    onChange={e => setForm(f => ({ ...f, role: e.target.value as Role }))}
                    className={inputCls(false) + ' appearance-none pr-9'}
                  >
                    {(Object.keys(ROLE_LABELS) as Role[]).map(r => (
                      <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </Field>

              {/* Flags */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                  Quyền hạn bổ sung
                </label>
                <div className="space-y-3">
                  {FLAGS.map(({ key, label, desc }) => (
                    <label key={key} className="flex items-start gap-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={form[key as keyof FormData] as boolean}
                        onChange={e => setForm(f => ({ ...f, [key]: e.target.checked }))}
                        className="mt-0.5 w-4 h-4 rounded border-gray-300 accent-sky-600"
                      />
                      <div>
                        <div className="text-sm font-medium text-gray-700 group-hover:text-gray-900">{label}</div>
                        <div className="text-xs text-gray-400">{desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Active toggle — only in edit mode, not for super admin */}
              {editingUser && !editingUser.is_super_admin && (
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2.5">
                    Trạng thái tài khoản
                  </label>
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))}
                    className="flex items-center gap-3"
                  >
                    <div className={`relative inline-flex h-5 w-9 rounded-full transition-colors ${form.is_active ? 'bg-emerald-400' : 'bg-gray-200'}`}>
                      <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${form.is_active ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
                    </div>
                    <span className="text-sm text-gray-700">{form.is_active ? 'Đang hoạt động' : 'Đã vô hiệu hóa'}</span>
                  </button>
                </div>
              )}

              {errors._ && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-xs text-red-600">
                  {errors._}
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex gap-3 flex-shrink-0">
              <button
                onClick={closePanel}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors hover:opacity-90 disabled:opacity-60"
                style={{ background: '#ef5e2f' }}
              >
                {saving ? (
                  <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : editingUser ? 'Lưu thay đổi' : 'Tạo người dùng'}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Delete confirmation dialog */}
      {deleteConfirm && pendingDelete && (
        <>
          <div className="fixed inset-0 bg-black/30 z-50" />
          <div className="fixed inset-0 flex items-center justify-center z-50 px-4">
            <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                <Trash2 size={22} className="text-red-500" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 text-center mb-1">Xóa người dùng?</h3>
              <p className="text-sm text-gray-500 text-center mb-6">
                <strong>{pendingDelete.full_name}</strong> sẽ bị xóa khỏi hệ thống. Hành động này không thể hoàn tác.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Hủy
                </button>
                <button
                  onClick={() => handleDelete(deleteConfirm)}
                  className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-sm font-semibold text-white transition-colors"
                >
                  Xóa
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function FlagBadge({ label }: { label: string }) {
  return (
    <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-sky-50 text-sky-600 border border-sky-100">
      {label}
    </span>
  )
}

function Field({ label, required, error, children }: {
  label: string
  required?: boolean
  error?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  )
}

function inputCls(hasError: boolean, disabled?: boolean) {
  return [
    'w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-sky-300 transition-colors',
    hasError ? 'border-red-400' : 'border-gray-200',
    disabled ? 'bg-gray-50 text-gray-400 cursor-not-allowed' : '',
  ].join(' ')
}
