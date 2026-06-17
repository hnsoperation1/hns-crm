'use client'

import { useState } from 'react'
import { Search, Plus, X, ChevronRight } from 'lucide-react'
import { CONTACTS, OPPORTUNITIES } from '@/lib/mock-data'
import {
  SOURCE_LABELS, SOURCE_COLORS, SCORE_LABELS, SCORE_COLORS,
  TIER_LABELS, TIER_COLORS, formatDate, getInitials,
} from '@/lib/utils'
import type { Contact, Opportunity, LeadSource, LeadScore, CustomerTier } from '@/types'

const SOURCES: { value: LeadSource; label: string }[] = [
  { value: 'mkt', label: 'Marketing' },
  { value: 'sale', label: 'Sale' },
  { value: 'partner', label: 'Đối tác' },
  { value: 'bod', label: 'Ban Giám đốc' },
  { value: 'referral', label: 'Giới thiệu' },
  { value: 'cskh', label: 'CSKH' },
]

const SCORES: { value: LeadScore; label: string }[] = [
  { value: 'hot', label: '🔥 Hot' },
  { value: 'warm', label: '☀️ Warm' },
  { value: 'cold', label: '❄️ Cold' },
]

const EMPTY_FORM = {
  name: '', company: '', phone: '', email: '',
  source: 'sale' as LeadSource, lead_score: 'warm' as LeadScore,
  opp_title: '',
}

export default function CustomersPage() {
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [localContacts, setLocalContacts] = useState<Contact[]>([])
  const [localOpps, setLocalOpps] = useState<Opportunity[]>([])

  const allContacts = [...CONTACTS, ...localContacts]
  const allOpps = [...OPPORTUNITIES, ...localOpps]

  const filtered = allContacts.filter(c => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      c.name.toLowerCase().includes(q) ||
      (c.company ?? '').toLowerCase().includes(q) ||
      (c.phone ?? '').includes(q)
    )
  })

  function handleNameChange(name: string) {
    setForm(f => ({
      ...f,
      name,
      opp_title: f.opp_title === autoOppTitle(f.company, f.name) || f.opp_title === ''
        ? autoOppTitle(f.company, name)
        : f.opp_title,
    }))
  }

  function handleCompanyChange(company: string) {
    setForm(f => ({
      ...f,
      company,
      opp_title: f.opp_title === autoOppTitle(f.company, f.name) || f.opp_title === ''
        ? autoOppTitle(company, f.name)
        : f.opp_title,
    }))
  }

  function autoOppTitle(company: string, name: string) {
    if (company) return company
    return name
  }

  function validate() {
    const errs: Record<string, string> = {}
    if (!form.name.trim()) errs.name = 'Vui lòng nhập tên'
    if (!form.opp_title.trim()) errs.opp_title = 'Vui lòng nhập tên cơ hội'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  function handleSubmit() {
    if (!validate()) return

    const now = new Date().toISOString()
    const today = now.split('T')[0]

    const newContact: Contact = {
      id: `c-local-${Date.now()}`,
      name: form.name.trim(),
      company: form.company.trim() || undefined,
      phone: form.phone.trim() || undefined,
      email: form.email.trim() || undefined,
      source: form.source,
      lead_score: form.lead_score,
      created_by: 'u8',
      created_at: today,
    }

    const newOpp: Opportunity = {
      id: `opp-local-${Date.now()}`,
      title: form.opp_title.trim(),
      contact_id: newContact.id,
      assigned_to: '',       // chưa phân công
      created_by: 'u8',
      source: form.source,
      stage: 'stage_1',
      stage_updated_at: today,
      created_at: today,
      updated_at: today,
    }

    setLocalContacts(prev => [newContact, ...prev])
    setLocalOpps(prev => [newOpp, ...prev])
    setForm({ ...EMPTY_FORM })
    setErrors({})
    setShowForm(false)
  }

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Khách hàng</h1>
          <p className="text-sm text-gray-400 mt-0.5">{allContacts.length} liên hệ</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-accent-500 hover:bg-accent-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-sm"
        >
          <Plus size={16} strokeWidth={2.5} />
          Thêm liên hệ
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-5">
        {[
          { label: 'Tổng liên hệ', value: allContacts.length, color: 'text-gray-900' },
          { label: '🔥 Hot leads', value: allContacts.filter(c => c.lead_score === 'hot').length, color: 'text-red-600' },
          { label: '☀️ Warm leads', value: allContacts.filter(c => c.lead_score === 'warm').length, color: 'text-orange-600' },
          { label: 'VIP / Tiềm năng', value: allContacts.filter(c => ['vip', 'potential'].includes(c.customer_tier ?? '')).length, color: 'text-brand-700' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <div className="text-xs text-gray-400 mb-1">{label}</div>
            <div className={`text-2xl font-bold ${color}`}>{value}</div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Tìm theo tên, công ty, số điện thoại..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 shadow-sm"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              {['Khách hàng', 'SĐT / Email', 'Nguồn', 'Lead Score', 'Phân hạng KH', 'Đơn hàng đang xử lý', 'Ngày thêm'].map(h => (
                <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map(contact => {
              const currentOpp = allOpps.find(o =>
                o.contact_id === contact.id &&
                !['lost', 'cancelled', 'stage_5'].includes(o.stage)
              )
              const isUnassigned = currentOpp && !currentOpp.assigned_to
              return (
                <tr key={contact.id} className="hover:bg-gray-50/70 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-gradient-to-br from-blue-100 to-indigo-200 rounded-full flex items-center justify-center text-xs font-bold text-brand-700 flex-shrink-0">
                        {getInitials(contact.name)}
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900">{contact.name}</div>
                        {contact.company && <div className="text-xs text-gray-400">{contact.company}</div>}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="text-gray-700">{contact.phone ?? '—'}</div>
                    {contact.email && <div className="text-xs text-gray-400 mt-0.5 max-w-[180px] truncate">{contact.email}</div>}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${SOURCE_COLORS[contact.source]}`}>
                      {SOURCE_LABELS[contact.source]}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    {contact.lead_score ? (
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${SCORE_COLORS[contact.lead_score as LeadScore]}`}>
                        {SCORE_LABELS[contact.lead_score as LeadScore]}
                      </span>
                    ) : <span className="text-gray-300 text-xs">—</span>}
                  </td>
                  <td className="px-5 py-3.5">
                    {contact.customer_tier ? (
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${TIER_COLORS[contact.customer_tier as CustomerTier]}`}>
                        {TIER_LABELS[contact.customer_tier as CustomerTier]}
                      </span>
                    ) : <span className="text-gray-300 text-xs">—</span>}
                  </td>
                  <td className="px-5 py-3.5">
                    {currentOpp ? (
                      <div className="flex items-center gap-2">
                        <span className="text-accent-500 font-semibold text-xs">{currentOpp.title}</span>
                        {isUnassigned && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 whitespace-nowrap">
                            Chờ phân công
                          </span>
                        )}
                      </div>
                    ) : <span className="text-gray-300 text-xs">—</span>}
                  </td>
                  <td className="px-5 py-3.5 text-gray-400 text-xs whitespace-nowrap">
                    {formatDate(contact.created_at)}
                  </td>
                </tr>
              )
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-5 py-12 text-center text-gray-400">
                  Không tìm thấy khách hàng phù hợp
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Slide-over form */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div className="flex-1 bg-black/30" onClick={() => setShowForm(false)} />

          {/* Panel */}
          <div className="w-[420px] bg-white h-full shadow-2xl flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200 flex-shrink-0">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Thêm liên hệ mới</h2>
                <p className="text-xs text-gray-400 mt-0.5">Sẽ tạo kèm 1 cơ hội ở GĐ1 · Chờ phân công</p>
              </div>
              <button onClick={() => setShowForm(false)} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 transition-colors">
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

              {/* Thông tin liên hệ */}
              <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">Thông tin liên hệ</div>

              <Field label="Tên khách hàng" required error={errors.name}>
                <input
                  type="text" placeholder="Nguyễn Văn A"
                  value={form.name}
                  onChange={e => handleNameChange(e.target.value)}
                  className={inputCls(errors.name)}
                />
              </Field>

              <Field label="Công ty">
                <input
                  type="text" placeholder="Công ty TNHH ABC"
                  value={form.company}
                  onChange={e => handleCompanyChange(e.target.value)}
                  className={inputCls()}
                />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Số điện thoại">
                  <input
                    type="text" placeholder="0901234567"
                    value={form.phone}
                    onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                    className={inputCls()}
                  />
                </Field>
                <Field label="Email">
                  <input
                    type="email" placeholder="email@cty.vn"
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    className={inputCls()}
                  />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Nguồn">
                  <select
                    value={form.source}
                    onChange={e => setForm(f => ({ ...f, source: e.target.value as LeadSource }))}
                    className={inputCls()}
                  >
                    {SOURCES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </Field>
                <Field label="Lead score">
                  <select
                    value={form.lead_score}
                    onChange={e => setForm(f => ({ ...f, lead_score: e.target.value as LeadScore }))}
                    className={inputCls()}
                  >
                    {SCORES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </Field>
              </div>

              {/* Divider */}
              <div className="border-t border-gray-100 pt-4">
                <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Cơ hội phát sinh</div>
                <Field label="Tên cơ hội" required error={errors.opp_title}>
                  <input
                    type="text" placeholder="VD: Công ty ABC – Tour hè 2026"
                    value={form.opp_title}
                    onChange={e => setForm(f => ({ ...f, opp_title: e.target.value }))}
                    className={inputCls(errors.opp_title)}
                  />
                </Field>
                <p className="text-xs text-gray-400 mt-1.5">
                  Cơ hội sẽ được tạo ở <span className="font-semibold text-blue-600">GĐ1 · Tư vấn</span>, chờ sale admin phân công.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-200 flex gap-3 flex-shrink-0">
              <button
                onClick={handleSubmit}
                className="flex-1 bg-accent-500 hover:bg-accent-600 text-white py-2.5 rounded-xl text-sm font-bold transition-colors"
              >
                Tạo liên hệ & cơ hội
              </button>
              <button
                onClick={() => { setShowForm(false); setErrors({}) }}
                className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-500 hover:bg-gray-50 transition-colors"
              >
                Huỷ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Field({ label, required, error, children }: {
  label: string; required?: boolean; error?: string; children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 mb-1">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  )
}

function inputCls(error?: string) {
  return `w-full text-sm border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-400 bg-white transition-colors ${
    error ? 'border-red-300' : 'border-gray-200'
  }`
}
