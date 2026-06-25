'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useTopbar } from '@/contexts/topbar'
import { useAuth } from '@/contexts/auth'
import { SOURCE_LABELS, SOURCE_COLORS, STAGE_LABELS, STAGE_COLORS, formatDate, formatVND, getInitials } from '@/lib/utils'
import type { OppStage, LeadSource } from '@/types'
import { Plus, X, Loader2, AlertTriangle } from 'lucide-react'

type Row = {
  id: string
  title: string
  description: string | null
  stage: OppStage
  source: string
  estimated_value: number | null
  created_at: string
  contact: { name: string; company?: string } | null
  assigned_user: { full_name: string } | null
}

type ContactOpt = { id: string; name: string; phone?: string | null; company?: string | null }
type UserOpt = { id: string; full_name: string }

const SOURCES: { value: LeadSource; label: string }[] = [
  { value: 'mkt', label: 'Marketing' }, { value: 'sale', label: 'Sale' },
  { value: 'partner', label: 'Đối tác' }, { value: 'bod', label: 'Ban GĐ' },
  { value: 'cskh', label: 'CSKH' }, { value: 'referral', label: 'Giới thiệu' },
  { value: 'test', label: 'Test' },
]

const EMPTY_FORM = {
  title: '', description: '', contact_id: '', source: 'mkt' as LeadSource, assigned_to: '',
}

export default function DangLayPage() {
  const router = useRouter()
  const { setOnRefresh, setBreadcrumb } = useTopbar()
  const { user } = useAuth()
  const supabase = createClient()
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [contacts, setContacts] = useState<ContactOpt[]>([])
  const [users, setUsers] = useState<UserOpt[]>([])
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [errors, setErrors] = useState<Partial<typeof EMPTY_FORM>>({})
  const [saving, setSaving] = useState(false)
  const [contactSearch, setContactSearch] = useState('')
  const [contactDropOpen, setContactDropOpen] = useState(false)
  const [showNewContact, setShowNewContact] = useState(false)
  const [newContact, setNewContact] = useState({ name: '', phone: '', company: '' })
  const [newContactErrors, setNewContactErrors] = useState<{ name?: string; phone?: string }>({})
  const [savingContact, setSavingContact] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('opportunities')
      .select('id, title, description, stage, source, estimated_value, created_at, contact:contacts(name, company), assigned_user:users!assigned_to(full_name)')
      .in('stage', ['stage_1', 'stage_2'])
      .order('created_at', { ascending: false })
    setRows((data ?? []) as unknown as Row[])
    setLoading(false)
  }, [])

  useEffect(() => {
    setBreadcrumb(null)
    loadData()
    setOnRefresh(loadData)
    return () => setOnRefresh(null)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function openModal() {
    setShowModal(true)
    setForm({ ...EMPTY_FORM })
    setErrors({})
    setContactSearch('')
    const [{ data: c }, { data: u }] = await Promise.all([
      supabase.from('contacts').select('id, name, phone, company').order('name').limit(200),
      supabase.from('users').select('id, full_name').eq('is_sale_tv', true).eq('is_active', true).order('full_name'),
    ])
    setContacts((c ?? []) as ContactOpt[])
    setUsers((u ?? []) as UserOpt[])
  }

  async function handleSave() {
    const e: Partial<typeof EMPTY_FORM> = {}
    if (!form.title.trim()) e.title = 'Bắt buộc'
    if (!form.contact_id) e.contact_id = 'Bắt buộc'
    if (!form.description.trim()) e.description = 'Bắt buộc'
    setErrors(e)
    if (Object.keys(e).length) return

    setSaving(true)
    const { error } = await supabase.from('opportunities').insert({
      title: form.title.trim(),
      description: form.description.trim(),
      contact_id: form.contact_id,
      source: form.source,
      assigned_to: form.assigned_to || null,
      stage: 'stage_1' as OppStage,
      stage_updated_at: new Date().toISOString(),
      created_by: user!.id,
    })
    setSaving(false)
    if (!error) {
      setShowModal(false)
      loadData()
    }
  }

  async function handleSaveContact() {
    const ce: { name?: string; phone?: string } = {}
    if (!newContact.name.trim()) ce.name = 'Bắt buộc'
    if (!newContact.phone.trim()) ce.phone = 'Bắt buộc'
    setNewContactErrors(ce)
    if (Object.keys(ce).length) return
    setSavingContact(true)

    // Check phone đã tồn tại
    const { data: existing } = await supabase
      .from('contacts').select('id, name, company')
      .eq('phone', newContact.phone.trim()).maybeSingle()
    if (existing) {
      const c = existing as ContactOpt
      if (!contacts.find(x => x.id === c.id)) setContacts(prev => [c, ...prev])
      setForm(f => ({ ...f, contact_id: c.id }))
      setContactSearch(c.name)
      setShowNewContact(false)
      setNewContact({ name: '', phone: '', company: '' })
      setNewContactErrors({})
      setSavingContact(false)
      return
    }

    const { data, error } = await supabase.from('contacts').insert({
      name: newContact.name.trim(),
      phone: newContact.phone.trim() || null,
      company: newContact.company.trim() || null,
      source: form.source,
      created_by: user!.id,
    }).select('id, name, company').single()
    setSavingContact(false)
    if (!error && data) {
      const c = data as ContactOpt
      setContacts(prev => [c, ...prev])
      setForm(f => ({ ...f, contact_id: c.id }))
      setContactSearch(c.name)
      setShowNewContact(false)
      setNewContact({ name: '', phone: '', company: '' })
    }
  }

  const filteredContacts = contacts.filter(c =>
    `${c.name} ${c.phone ?? ''} ${c.company ?? ''}`.toLowerCase().includes(contactSearch.toLowerCase())
  )

  const iField = 'w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400'

  const cols = ['Đơn hàng', 'Giai đoạn', 'Nguồn', 'Sale TV', 'Điểm đến', 'Giá trị ước tính', 'Ngày tạo']

  return (
    <>
      <div className="overflow-y-auto bg-white" style={{ height: 'calc(100vh - 40px)' }}>
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10">
            <tr className="bg-gray-50 border-b border-gray-200">
              {cols.map(h => (
                <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
              ))}
              <th className="px-5 py-3 text-right">
                <button onClick={openModal}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-accent-500 hover:bg-accent-600 text-white text-xs font-semibold rounded-lg transition-colors ml-auto">
                  <Plus size={13} strokeWidth={2.5} /> Thêm đơn
                </button>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  {[40, 16, 14, 18, 20, 14, 12, 8].map((w, j) => (
                    <td key={j} className="px-5 py-4"><div className="h-3 bg-gray-100 rounded" style={{ width: `${w + (i % 3) * 4}%` }} /></td>
                  ))}
                </tr>
              ))
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-5 py-16 text-center">
                  <div className="text-gray-300 text-4xl mb-3">📋</div>
                  <div className="text-gray-400 text-sm mb-4">Chưa có đơn nào đang lấy thông tin</div>
                  <button onClick={openModal} className="inline-flex items-center gap-1.5 px-4 py-2 bg-accent-500 text-white text-sm font-semibold rounded-xl hover:bg-accent-600 transition-colors">
                    <Plus size={15} /> Thêm đơn đầu tiên
                  </button>
                </td>
              </tr>
            ) : rows.map(r => {
              const sc = STAGE_COLORS[r.stage]
              return (
                <tr key={r.id} className="hover:bg-gray-50/70 group transition-colors cursor-pointer" onClick={() => router.push(`/don-hang-moi/${r.id}`)}>
                  <td className="px-5 py-3.5">
                    <div className="font-semibold text-gray-900 group-hover:text-brand-700 transition-colors">{r.title}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{r.contact?.company ?? r.contact?.name}</div>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${sc.bg} ${sc.text}`}>{STAGE_LABELS[r.stage]}</span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${SOURCE_COLORS[r.source as keyof typeof SOURCE_COLORS]}`}>{SOURCE_LABELS[r.source as keyof typeof SOURCE_LABELS]}</span>
                  </td>
                  <td className="px-5 py-3.5">
                    {r.assigned_user ? (
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-slate-200 rounded-full flex items-center justify-center text-[10px] font-bold text-slate-600">{getInitials(r.assigned_user.full_name)}</div>
                        <span className="text-gray-700 whitespace-nowrap">{r.assigned_user.full_name}</span>
                      </div>
                    ) : <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Chờ phân công</span>}
                  </td>
                  <td className="px-5 py-3.5 text-gray-600">{r.description || <span className="text-gray-300">—</span>}</td>
                  <td className="px-5 py-3.5 text-right font-semibold text-gray-800">{r.estimated_value ? formatVND(r.estimated_value) : <span className="text-gray-300">—</span>}</td>
                  <td className="px-5 py-3.5 text-gray-400 whitespace-nowrap">{formatDate(r.created_at)}</td>
                  <td />
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Modal thêm đơn */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-900">Thêm đơn hàng mới</h3>
              <button onClick={() => setShowModal(false)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400"><X size={16} /></button>
            </div>

            <div className="px-5 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Tên đơn hàng */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  Tên đơn hàng <span className="text-red-500">*</span>
                </label>
                <input value={form.title} onChange={e => { setForm(f => ({ ...f, title: e.target.value })); setErrors(er => ({ ...er, title: '' })) }}
                  placeholder="VD: Công ty ABC – Đà Nẵng Q3/2026"
                  className={`${iField} ${errors.title ? 'border-red-300 bg-red-50' : ''}`} autoFocus />
                {errors.title && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertTriangle size={11} /> {errors.title}</p>}
              </div>

              {/* Liên hệ + Sale + Nguồn */}
              <div className="grid grid-cols-3 gap-3">
                {/* Liên hệ */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Liên hệ <span className="text-red-500">*</span>
                    </label>
                    <button type="button" onClick={() => { setShowNewContact(v => !v); setNewContact({ name: contactSearch, phone: '', company: '' }) }}
                      className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-lg transition-colors ${showNewContact ? 'bg-brand-100 text-brand-700' : 'text-brand-600 hover:bg-brand-50'}`}>
                      <Plus size={12} strokeWidth={2.5} /> Tạo mới
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      value={contactSearch}
                      onChange={e => { setContactSearch(e.target.value); setForm(f => ({ ...f, contact_id: '' })); setContactDropOpen(true) }}
                      onFocus={() => setContactDropOpen(true)}
                      onBlur={() => setTimeout(() => setContactDropOpen(false), 150)}
                      placeholder="Tìm tên, SĐT, công ty..."
                      className={`${iField} ${errors.contact_id ? 'border-red-300 bg-red-50' : ''}`}
                    />
                    {form.contact_id && !contactDropOpen && (
                      <div className="mt-1.5 flex items-center gap-2 px-3 py-2 bg-brand-50 border border-brand-100 rounded-xl text-sm text-brand-700 font-medium">
                        <div className="w-6 h-6 bg-brand-200 rounded-full flex items-center justify-center text-[10px] font-bold text-brand-700 flex-shrink-0">
                          {getInitials(contacts.find(c => c.id === form.contact_id)?.name ?? '')}
                        </div>
                        <span className="truncate">{contacts.find(c => c.id === form.contact_id)?.name}</span>
                        <button type="button" onClick={() => { setForm(f => ({ ...f, contact_id: '' })); setContactSearch('') }} className="ml-auto flex-shrink-0 text-brand-400 hover:text-brand-600"><X size={13} /></button>
                      </div>
                    )}
                    {contactDropOpen && (
                      <div className="absolute left-0 right-0 top-full mt-1 border border-gray-200 rounded-xl bg-white shadow-lg z-20 overflow-hidden max-h-44 overflow-y-auto">
                        {filteredContacts.slice(0, 30).map(c => (
                          <div key={c.id} onMouseDown={() => { setForm(f => ({ ...f, contact_id: c.id })); setContactSearch(c.name); setErrors(er => ({ ...er, contact_id: '' })); setContactDropOpen(false) }}
                            className={`flex items-center gap-2 px-3 py-2 cursor-pointer text-sm transition-colors ${form.contact_id === c.id ? 'bg-brand-50 text-brand-700 font-semibold' : 'hover:bg-gray-50 text-gray-700'}`}>
                            <div className="w-6 h-6 bg-slate-200 rounded-full flex items-center justify-center text-[10px] font-bold text-slate-600 flex-shrink-0">{getInitials(c.name)}</div>
                            <div className="min-w-0">
                              <div className="font-medium truncate">{c.name}</div>
                              {c.company && <div className="text-xs text-gray-400 truncate">{c.company}</div>}
                            </div>
                          </div>
                        ))}
                        {filteredContacts.length === 0 && (
                          <div className="px-3 py-4 text-sm text-gray-400 text-center">
                            Không tìm thấy —{' '}
                            <button type="button" onMouseDown={() => { setShowNewContact(true); setNewContact({ name: contactSearch, phone: '', company: '' }); setContactDropOpen(false) }}
                              className="text-brand-600 font-semibold hover:underline">tạo mới</button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  {errors.contact_id && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertTriangle size={11} /> {errors.contact_id}</p>}
                </div>

                {/* Sale TV */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Sale phụ trách</label>
                  <select value={form.assigned_to} onChange={e => setForm(f => ({ ...f, assigned_to: e.target.value }))} className={iField}>
                    <option value="">— Chọn Sale TV —</option>
                    {users.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
                  </select>
                </div>

                {/* Nguồn */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Nguồn</label>
                  <select value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value as LeadSource }))} className={iField}>
                    {SOURCES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
              </div>

              {/* Sub-form tạo khách hàng mới — full width */}
              {showNewContact && (
                <div className="p-3 bg-brand-50 border border-brand-100 rounded-xl space-y-2">
                  <p className="text-xs font-semibold text-brand-700 mb-2">Thông tin khách hàng mới</p>
                  <div className="grid grid-cols-3 gap-2">
                    <input value={newContact.name} onChange={e => { setNewContact(v => ({ ...v, name: e.target.value })); setNewContactErrors(er => ({ ...er, name: '' })) }}
                      placeholder="Tên khách hàng *" autoFocus
                      className={`${iField} text-sm py-2 ${newContactErrors.name ? 'border-red-300 bg-red-50' : ''}`} />
                    <input value={newContact.phone} onChange={e => { setNewContact(v => ({ ...v, phone: e.target.value })); setNewContactErrors(er => ({ ...er, phone: '' })) }}
                      placeholder="Số điện thoại *"
                      className={`${iField} text-sm py-2 ${newContactErrors.phone ? 'border-red-300 bg-red-50' : ''}`} />
                    <input value={newContact.company} onChange={e => setNewContact(v => ({ ...v, company: e.target.value }))}
                      placeholder="Công ty" className={`${iField} text-sm py-2`} />
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button type="button" onClick={handleSaveContact} disabled={savingContact}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors">
                      {savingContact ? <Loader2 size={11} className="animate-spin" /> : null}
                      Lưu & chọn
                    </button>
                    <button type="button" onClick={() => { setShowNewContact(false); setNewContactErrors({}) }}
                      className="px-3 py-1.5 text-xs text-gray-500 hover:bg-white rounded-lg transition-colors font-medium">
                      Huỷ
                    </button>
                  </div>
                </div>
              )}

              {/* Mô tả sơ lược */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  Mô tả sơ lược <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={form.description}
                  onChange={e => { setForm(f => ({ ...f, description: e.target.value })); setErrors(er => ({ ...er, description: '' })) }}
                  rows={4}
                  placeholder="Dịch vụ mong muốn, điểm đến dự kiến, số lượng hành khách, ngày dự kiến, yêu cầu đặc biệt..."
                  className={`${iField} resize-none ${errors.description ? 'border-red-300 bg-red-50' : ''}`}
                />
                {errors.description && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertTriangle size={11} /> {errors.description}</p>}
              </div>
            </div>

            <div className="px-5 py-4 border-t border-gray-100 flex justify-end gap-2">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 rounded-xl text-sm text-gray-500 hover:bg-gray-100 font-medium">Huỷ</button>
              <button onClick={handleSave} disabled={saving}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-accent-500 hover:bg-accent-600 disabled:opacity-60 text-white text-sm font-semibold transition-colors">
                {saving && <Loader2 size={13} className="animate-spin" />}
                Tạo đơn
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
