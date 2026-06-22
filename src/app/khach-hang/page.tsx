'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Search, Plus, X, Loader2, Building2, Users, Globe, Phone, Mail, MapPin, Trash2, Pencil } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import DatePickerVN from '@/components/DatePickerVN'
import { useAuth } from '@/contexts/auth'
import {
  SOURCE_LABELS, SOURCE_COLORS, SCORE_LABELS, SCORE_COLORS,
  TIER_LABELS, TIER_COLORS, formatDate, getInitials,
} from '@/lib/utils'
import type { Contact, Opportunity, LeadSource, LeadScore, CustomerTier, Organization, OrgType } from '@/types'

// ─── Constants ───────────────────────────────────────────────────────────────

const SOURCES: { value: LeadSource; label: string }[] = [
  { value: 'mkt', label: 'Marketing' },
  { value: 'sale', label: 'Sale' },
  { value: 'partner', label: 'Đối tác' },
  { value: 'bod', label: 'Ban Giám đốc' },
  { value: 'referral', label: 'Giới thiệu' },
  { value: 'cskh', label: 'CSKH' },
  { value: 'test', label: 'Test' },
]

const SCORES: { value: LeadScore; label: string }[] = [
  { value: 'new', label: '🆕 New' },
  { value: 'hot', label: '🔥 Hot' },
  { value: 'warm', label: '☀️ Warm' },
  { value: 'cold', label: '❄️ Cold' },
]

const ORG_TYPE_LABELS: Record<OrgType, string> = {
  company: 'Doanh nghiệp',
  government: 'Cơ quan nhà nước',
  ngo: 'Tổ chức xã hội',
}

const EMPTY_CONTACT_FORM = {
  name: '', phone: '', email: '',
  company: '', tax_code: '', city: '', company_address: '',
  source: 'test' as LeadSource, lead_score: 'new' as LeadScore,
  destination: '', departure_date: '', opp_title: '',
}

const EMPTY_ORG_FORM = {
  name: '', tax_code: '', type: 'company' as OrgType,
  city: '', address: '', phone: '', email: '', website: '', note: '',
}

// ─── Page ────────────────────────────────────────────────────────────────────

type Tab = 'contacts' | 'organizations'

export default function CustomersPage() {
  const [tab, setTab] = useState<Tab>('contacts')

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <div className="flex gap-1 mb-5 bg-gray-100 p-1 rounded-xl w-fit">
        {([
          { key: 'contacts', label: 'Liên hệ', icon: Users },
          { key: 'organizations', label: 'Công ty / Tổ chức', icon: Building2 },
        ] as { key: Tab; label: string; icon: React.ElementType }[]).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              tab === key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      {tab === 'contacts' ? <ContactsTab /> : <OrganizationsTab />}
    </div>
  )
}

// ─── Contacts Tab ─────────────────────────────────────────────────────────────

function ContactsTab() {
  const { user } = useAuth()
  const supabase = createClient()
  const [contacts, setContacts] = useState<Contact[]>([])
  const [opps, setOpps] = useState<Opportunity[]>([])
  const [dataLoading, setDataLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ ...EMPTY_CONTACT_FORM })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [lookupLoading, setLookupLoading] = useState(false)
  const [lookupError, setLookupError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const [{ data: c }, { data: o }] = await Promise.all([
      supabase.from('contacts').select('*').order('created_at', { ascending: false }),
      supabase.from('opportunities').select('id, title, contact_id, stage'),
    ])
    setContacts((c ?? []) as Contact[])
    setOpps((o ?? []) as Opportunity[])
    setDataLoading(false)
  }

  function autoOppTitle(company: string, name: string, destination: string, date: string) {
    const base = company || name
    const formattedDate = date ? date.split('-').reverse().join('') : ''
    const parts = [base, destination, formattedDate].filter(Boolean)
    return parts.join(' - ')
  }

  function handleNameChange(name: string) {
    setForm(f => ({
      ...f, name,
      opp_title: f.opp_title === autoOppTitle(f.company, f.name, f.destination, f.departure_date) || f.opp_title === ''
        ? autoOppTitle(f.company, name, f.destination, f.departure_date) : f.opp_title,
    }))
  }

  function handleCompanyChange(company: string) {
    setForm(f => ({
      ...f, company,
      opp_title: f.opp_title === autoOppTitle(f.company, f.name, f.destination, f.departure_date) || f.opp_title === ''
        ? autoOppTitle(company, f.name, f.destination, f.departure_date) : f.opp_title,
    }))
  }

  function handleDestinationChange(destination: string) {
    setForm(f => ({
      ...f, destination,
      opp_title: f.opp_title === autoOppTitle(f.company, f.name, f.destination, f.departure_date) || f.opp_title === ''
        ? autoOppTitle(f.company, f.name, destination, f.departure_date) : f.opp_title,
    }))
  }

  function handleDepartureDateChange(departure_date: string) {
    setForm(f => ({
      ...f, departure_date,
      opp_title: f.opp_title === autoOppTitle(f.company, f.name, f.destination, f.departure_date) || f.opp_title === ''
        ? autoOppTitle(f.company, f.name, f.destination, departure_date) : f.opp_title,
    }))
  }

  async function handleTaxLookup() {
    if (!form.tax_code.trim()) return
    setLookupLoading(true); setLookupError('')
    try {
      const res = await fetch(`/api/lookup-business?mst=${encodeURIComponent(form.tax_code.trim())}`)
      const json = await res.json()
      if (!res.ok) { setLookupError(json.error ?? 'Không tìm thấy'); return }
      handleCompanyChange(json.name)
    } catch { setLookupError('Lỗi kết nối') }
    finally { setLookupLoading(false) }
  }

  function validate() {
    const errs: Record<string, string> = {}
    if (!form.name.trim()) errs.name = 'Vui lòng nhập tên'
    if (!form.opp_title.trim()) errs.opp_title = 'Vui lòng nhập tên cơ hội'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handleSubmit() {
    if (!validate() || submitting) return
    setSubmitting(true)

    const companyName = form.company.trim()
    const taxCode = form.tax_code.trim()
    let orgId: string | null = null

    try {
      if (companyName) {
        // Tìm org đã tồn tại
        const q = taxCode
          ? supabase.from('organizations').select('id, contact_ids, primary_contact_id').eq('tax_code', taxCode).limit(1)
          : supabase.from('organizations').select('id, contact_ids, primary_contact_id').ilike('name', companyName).limit(1)
        const { data: found } = await q

        if (found && found.length > 0) {
          orgId = found[0].id
        } else {
          const { data: newOrg } = await supabase
            .from('organizations')
            .insert({
              name: companyName,
              tax_code: taxCode || null,
              type: 'company',
              city: form.city.trim() || null,
              address: form.company_address.trim() || null,
              contact_ids: [],
              created_by: user!.id,
            })
            .select('id')
            .single()
          orgId = newOrg?.id ?? null
        }
      }

      // Tạo contact
      const { data: newContact, error: cErr } = await supabase
        .from('contacts')
        .insert({
          name: form.name.trim(),
          company: companyName || null,
          tax_code: taxCode || null,
          phone: form.phone.trim() || null,
          email: form.email.trim() || null,
          source: form.source,
          lead_score: form.lead_score,
          organization_ids: orgId ? [orgId] : [],
          created_by: user!.id,
        })
        .select('*')
        .single()

      if (cErr || !newContact) throw cErr ?? new Error('Tạo liên hệ thất bại')

      // Cập nhật org: thêm contact vào contact_ids
      if (orgId) {
        const { data: org } = await supabase
          .from('organizations')
          .select('contact_ids, primary_contact_id')
          .eq('id', orgId)
          .single()
        if (org) {
          await supabase.from('organizations').update({
            contact_ids: [...(org.contact_ids ?? []), newContact.id],
            ...(org.primary_contact_id ? {} : { primary_contact_id: newContact.id }),
          }).eq('id', orgId)
        }
      }

      // Tạo cơ hội
      await supabase.from('opportunities').insert({
        title: form.opp_title.trim(),
        description: form.destination.trim() || null,
        tour_date: form.departure_date || null,
        contact_id: newContact.id,
        organization_id: orgId,
        created_by: user!.id,
        source: form.source,
        stage: 'stage_1',
        stage_updated_at: new Date().toISOString().split('T')[0],
        updated_at: new Date().toISOString(),
      })

      await loadData()
      setForm({ ...EMPTY_CONTACT_FORM })
      setErrors({}); setLookupError('')
      setShowForm(false)
    } catch (err) {
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  const filtered = contacts.filter(c => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      c.name.toLowerCase().includes(q) ||
      (c.company ?? '').toLowerCase().includes(q) ||
      (c.phone ?? '').includes(q)
    )
  })

  if (dataLoading) {
    return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-gray-300" size={28} /></div>
  }

  return (
    <>
      {/* Stats + actions */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-3">
          {[
            { label: 'Tổng', value: contacts.length, color: 'text-gray-900' },
            { label: '🆕 New', value: contacts.filter(c => c.lead_score === 'new').length, color: 'text-sky-600' },
            { label: '🔥 Hot', value: contacts.filter(c => c.lead_score === 'hot').length, color: 'text-red-600' },
            { label: '☀️ Warm', value: contacts.filter(c => c.lead_score === 'warm').length, color: 'text-orange-500' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white rounded-xl border border-gray-200 px-4 py-2.5 shadow-sm text-center min-w-[80px]">
              <div className="text-xs text-gray-400">{label}</div>
              <div className={`text-xl font-bold ${color}`}>{value}</div>
            </div>
          ))}
        </div>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-accent-500 hover:bg-accent-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-sm">
          <Plus size={16} strokeWidth={2.5} />
          Thêm liên hệ
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Tìm theo tên, công ty, số điện thoại..."
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 shadow-sm" />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              {['Liên hệ', 'SĐT / Email', 'Nguồn', 'Lead Score', 'Phân hạng KH', 'Đơn đang xử lý', 'Ngày thêm'].map(h => (
                <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map(contact => {
              const currentOpp = opps.find(o => o.contact_id === contact.id && !['lost', 'cancelled', 'stage_5'].includes(o.stage))
              return (
                <tr key={contact.id} className="hover:bg-gray-50/70 transition-colors">
                  <td className="px-5 py-3.5">
                    <Link href={`/khach-hang/${contact.id}`} className="flex items-center gap-3 group/name">
                      <div className="w-9 h-9 bg-gradient-to-br from-blue-100 to-indigo-200 rounded-full flex items-center justify-center text-xs font-bold text-brand-700 flex-shrink-0">
                        {getInitials(contact.name)}
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900 group-hover/name:text-brand-600 transition-colors">{contact.name}</div>
                        {contact.company && <div className="text-xs text-gray-400">{contact.company}</div>}
                      </div>
                    </Link>
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
                    {contact.lead_score
                      ? <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${SCORE_COLORS[contact.lead_score as LeadScore]}`}>{SCORE_LABELS[contact.lead_score as LeadScore]}</span>
                      : <span className="text-gray-300 text-xs">—</span>}
                  </td>
                  <td className="px-5 py-3.5">
                    {contact.customer_tier
                      ? <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${TIER_COLORS[contact.customer_tier as CustomerTier]}`}>{TIER_LABELS[contact.customer_tier as CustomerTier]}</span>
                      : <span className="text-gray-300 text-xs">—</span>}
                  </td>
                  <td className="px-5 py-3.5">
                    {currentOpp
                      ? <Link href={`/co-hoi/${currentOpp.id}`} className="text-accent-500 hover:text-accent-600 hover:underline font-semibold text-xs">{currentOpp.title}</Link>
                      : <span className="text-gray-300 text-xs">—</span>}
                  </td>
                  <td className="px-5 py-3.5 text-gray-400 text-xs whitespace-nowrap">{formatDate(contact.created_at)}</td>
                </tr>
              )
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="px-5 py-12 text-center text-gray-400">
                {contacts.length === 0 ? 'Chưa có liên hệ nào. Nhấn "Thêm liên hệ" để bắt đầu.' : 'Không tìm thấy liên hệ'}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add contact slide-over */}
      {showForm && (
        <>
          <div className="fixed inset-0 bg-black/30 z-40" onClick={() => { setShowForm(false); setErrors({}); setLookupError('') }} />
          <div className="fixed top-0 right-0 h-full w-[840px] bg-white shadow-2xl z-50 flex flex-col">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200 flex-shrink-0">
              <h2 className="text-lg font-bold text-gray-900">Thêm liên hệ mới</h2>
              <button onClick={() => { setShowForm(false); setErrors({}); setLookupError('') }} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400">
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              <SectionLabel>Thông tin liên hệ</SectionLabel>

              <Field label="Tên khách hàng" required error={errors.name}>
                <input type="text" placeholder="Nguyễn Văn A" value={form.name}
                  onChange={e => handleNameChange(e.target.value)} className={inputCls(errors.name)} />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Số điện thoại">
                  <input type="text" placeholder="0901234567" value={form.phone}
                    onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className={inputCls()} />
                </Field>
                <Field label="Email">
                  <input type="email" placeholder="email@cty.vn" value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className={inputCls()} />
                </Field>
              </div>

              <Field label="Công ty">
                <input type="text" placeholder="Công ty TNHH ABC" value={form.company}
                  onChange={e => handleCompanyChange(e.target.value)} className={inputCls()} />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Mã số thuế">
                  <div className="flex gap-2">
                    <input type="text" placeholder="0123456789" value={form.tax_code}
                      onChange={e => { setForm(f => ({ ...f, tax_code: e.target.value })); setLookupError('') }}
                      onKeyDown={e => e.key === 'Enter' && handleTaxLookup()}
                      className={`flex-1 ${inputCls(lookupError ? 'err' : '')}`} />
                    <LookupButton loading={lookupLoading} disabled={!form.tax_code.trim()} onClick={handleTaxLookup} />
                  </div>
                  {lookupError && <p className="text-xs text-red-500 mt-1">{lookupError}</p>}
                </Field>
                <Field label="Khu vực">
                  <input type="text" placeholder="VD: Hà Nội, TP.HCM..." value={form.city}
                    onChange={e => setForm(f => ({ ...f, city: e.target.value }))} className={inputCls()} />
                </Field>
              </div>

              <Field label="Địa chỉ công ty">
                <input type="text" placeholder="123 Đường ABC, Quận 1, TP.HCM" value={form.company_address}
                  onChange={e => setForm(f => ({ ...f, company_address: e.target.value }))} className={inputCls()} />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Nguồn">
                  <select value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value as LeadSource }))} className={inputCls()}>
                    {SOURCES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </Field>
                <Field label="Lead score">
                  <select value={form.lead_score} onChange={e => setForm(f => ({ ...f, lead_score: e.target.value as LeadScore }))} className={inputCls()}>
                    {SCORES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </Field>
              </div>

              <div className="border-t border-gray-100 pt-4">
                <SectionLabel>Cơ hội phát sinh</SectionLabel>
                <div className="mt-3 space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Điểm đến dự kiến">
                      <input type="text" placeholder="VD: Đà Nẵng, Nhật Bản..." value={form.destination}
                        onChange={e => handleDestinationChange(e.target.value)} className={inputCls()} />
                    </Field>
                    <Field label="Ngày đi dự kiến">
                      <DatePickerVN
                        value={form.departure_date}
                        onChange={handleDepartureDateChange}
                        className={inputCls()}
                      />
                    </Field>
                  </div>
                  <Field label="Tên cơ hội" required error={errors.opp_title}>
                    <input type="text" placeholder="VD: Công ty ABC – Tour hè 2026" value={form.opp_title}
                      onChange={e => setForm(f => ({ ...f, opp_title: e.target.value }))} className={inputCls(errors.opp_title)} />
                  </Field>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex gap-3 flex-shrink-0">
              <button onClick={handleSubmit} disabled={submitting}
                className="flex-1 flex items-center justify-center gap-2 bg-accent-500 hover:bg-accent-600 disabled:opacity-60 text-white py-2.5 rounded-xl text-sm font-bold transition-colors">
                {submitting && <Loader2 size={14} className="animate-spin" />}
                Tạo liên hệ & cơ hội
              </button>
              <button onClick={() => { setShowForm(false); setErrors({}); setLookupError('') }}
                className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-500 hover:bg-gray-50 transition-colors">
                Huỷ
              </button>
            </div>
          </div>
        </>
      )}
    </>
  )
}

// ─── Organizations Tab ────────────────────────────────────────────────────────

function OrganizationsTab() {
  const { user } = useAuth()
  const supabase = createClient()
  const [orgs, setOrgs] = useState<Organization[]>([])
  const [dataLoading, setDataLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null)
  const [form, setForm] = useState({ ...EMPTY_ORG_FORM })
  const [lookupLoading, setLookupLoading] = useState(false)
  const [lookupError, setLookupError] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    supabase.from('organizations').select('*').order('created_at', { ascending: false })
      .then(({ data }) => { setOrgs((data ?? []) as Organization[]); setDataLoading(false) })
  }, [])

  function openAdd() {
    setEditingOrg(null); setForm({ ...EMPTY_ORG_FORM }); setErrors({}); setLookupError(''); setShowForm(true)
  }

  function openEdit(org: Organization) {
    setEditingOrg(org)
    setForm({ name: org.name, tax_code: org.tax_code ?? '', type: org.type, city: org.city ?? '', address: org.address ?? '', phone: org.phone ?? '', email: org.email ?? '', website: org.website ?? '', note: org.note ?? '' })
    setErrors({}); setLookupError(''); setShowForm(true)
  }

  function closePanel() { setShowForm(false); setEditingOrg(null); setErrors({}); setLookupError('') }

  async function handleTaxLookup() {
    if (!form.tax_code.trim()) return
    setLookupLoading(true); setLookupError('')
    try {
      const res = await fetch(`/api/lookup-business?mst=${encodeURIComponent(form.tax_code.trim())}`)
      const json = await res.json()
      if (!res.ok) { setLookupError(json.error ?? 'Không tìm thấy'); return }
      setForm(f => ({ ...f, name: json.name, address: json.address ?? f.address }))
    } catch { setLookupError('Lỗi kết nối') }
    finally { setLookupLoading(false) }
  }

  function validate() {
    const e: Record<string, string> = {}
    if (!form.name.trim()) e.name = 'Bắt buộc'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit() {
    if (!validate() || submitting) return
    setSubmitting(true)
    try {
      if (editingOrg) {
        const { data } = await supabase
          .from('organizations')
          .update({
            name: form.name.trim(),
            tax_code: form.tax_code.trim() || null,
            type: form.type,
            city: form.city.trim() || null,
            address: form.address.trim() || null,
            phone: form.phone.trim() || null,
            email: form.email.trim() || null,
            website: form.website.trim() || null,
            note: form.note.trim() || null,
          })
          .eq('id', editingOrg.id)
          .select('*')
          .single()
        if (data) setOrgs(prev => prev.map(o => o.id === editingOrg.id ? data as Organization : o))
      } else {
        const { data } = await supabase
          .from('organizations')
          .insert({
            name: form.name.trim(),
            tax_code: form.tax_code.trim() || null,
            type: form.type,
            city: form.city.trim() || null,
            address: form.address.trim() || null,
            phone: form.phone.trim() || null,
            email: form.email.trim() || null,
            website: form.website.trim() || null,
            note: form.note.trim() || null,
            contact_ids: [],
            created_by: user!.id,
          })
          .select('*')
          .single()
        if (data) setOrgs(prev => [data as Organization, ...prev])
      }
      closePanel()
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete() {
    if (!deleteConfirm) return
    await supabase.from('organizations').delete().eq('id', deleteConfirm)
    setOrgs(prev => prev.filter(o => o.id !== deleteConfirm))
    setDeleteConfirm(null)
  }

  const filtered = orgs.filter(o => {
    if (!search) return true
    const q = search.toLowerCase()
    return o.name.toLowerCase().includes(q) || (o.tax_code ?? '').includes(q)
  })

  const pendingDelete = orgs.find(o => o.id === deleteConfirm)

  if (dataLoading) {
    return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-gray-300" size={28} /></div>
  }

  return (
    <>
      {/* Stats + actions */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-3">
          {[
            { label: 'Tổng', value: orgs.length },
            { label: 'Doanh nghiệp', value: orgs.filter(o => o.type === 'company').length },
            { label: 'Cơ quan / Tổ chức', value: orgs.filter(o => o.type !== 'company').length },
          ].map(({ label, value }) => (
            <div key={label} className="bg-white rounded-xl border border-gray-200 px-4 py-2.5 shadow-sm text-center min-w-[80px]">
              <div className="text-xs text-gray-400">{label}</div>
              <div className="text-xl font-bold text-gray-900">{value}</div>
            </div>
          ))}
        </div>
        <button onClick={openAdd}
          className="flex items-center gap-2 bg-accent-500 hover:bg-accent-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-sm">
          <Plus size={16} strokeWidth={2.5} />
          Thêm tổ chức
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Tìm theo tên, mã số thuế..."
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 shadow-sm" />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              {['Tổ chức', 'MST', 'Liên hệ', 'Email / Website', 'Số liên hệ', 'Ngày thêm', ''].map(h => (
                <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map(org => {
              const contactCount = org.contact_ids.length + (org.primary_contact_id ? 1 : 0)
              return (
                <tr key={org.id} className="hover:bg-gray-50/70 transition-colors group">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-gradient-to-br from-teal-100 to-sky-200 rounded-xl flex items-center justify-center text-xs font-bold text-brand-700 flex-shrink-0">
                        {getInitials(org.name)}
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900">{org.name}</div>
                        <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">
                          {ORG_TYPE_LABELS[org.type]}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-gray-500 font-mono text-xs">{org.tax_code ?? '—'}</td>
                  <td className="px-5 py-3.5">
                    {org.phone
                      ? <div className="flex items-center gap-1.5 text-gray-600 text-xs"><Phone size={12} />{org.phone}</div>
                      : <span className="text-gray-300 text-xs">—</span>}
                    {org.address && <div className="flex items-center gap-1.5 text-gray-400 text-xs mt-0.5 max-w-[180px] truncate"><MapPin size={11} />{org.address}</div>}
                  </td>
                  <td className="px-5 py-3.5">
                    {org.email && <div className="flex items-center gap-1.5 text-gray-600 text-xs"><Mail size={12} />{org.email}</div>}
                    {org.website && <div className="flex items-center gap-1.5 text-sky-600 text-xs mt-0.5"><Globe size={11} />{org.website}</div>}
                    {!org.email && !org.website && <span className="text-gray-300 text-xs">—</span>}
                  </td>
                  <td className="px-5 py-3.5">
                    {contactCount > 0
                      ? <span className="text-xs font-semibold text-brand-700 bg-brand-50 px-2 py-0.5 rounded-full">{contactCount} liên hệ</span>
                      : <span className="text-gray-300 text-xs">—</span>}
                  </td>
                  <td className="px-5 py-3.5 text-gray-400 text-xs whitespace-nowrap">{formatDate(org.created_at)}</td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openEdit(org)} className="p-1.5 rounded-lg hover:bg-sky-50 text-gray-400 hover:text-sky-600 transition-colors" title="Chỉnh sửa">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => setDeleteConfirm(org.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors" title="Xóa">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="px-5 py-14 text-center text-gray-400">
                {orgs.length === 0 ? 'Chưa có tổ chức nào. Nhấn "Thêm tổ chức" để bắt đầu.' : 'Không tìm thấy kết quả'}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add/Edit slide-over */}
      {showForm && (
        <>
          <div className="fixed inset-0 bg-black/30 z-40" onClick={closePanel} />
          <div className="fixed top-0 right-0 h-full w-[440px] bg-white shadow-2xl z-50 flex flex-col">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200 flex-shrink-0">
              <h2 className="text-lg font-bold text-gray-900">{editingOrg ? 'Chỉnh sửa tổ chức' : 'Thêm tổ chức mới'}</h2>
              <button onClick={closePanel} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400"><X size={18} /></button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              <Field label="Mã số thuế">
                <div className="flex gap-2">
                  <input type="text" placeholder="0123456789" value={form.tax_code}
                    onChange={e => { setForm(f => ({ ...f, tax_code: e.target.value })); setLookupError('') }}
                    onKeyDown={e => e.key === 'Enter' && handleTaxLookup()}
                    className={`flex-1 ${inputCls(lookupError ? 'err' : '')}`} />
                  <LookupButton loading={lookupLoading} disabled={!form.tax_code.trim()} onClick={handleTaxLookup} />
                </div>
                {lookupError && <p className="text-xs text-red-500 mt-1">{lookupError}</p>}
              </Field>

              <Field label="Tên tổ chức" required error={errors.name}>
                <input type="text" placeholder="Công ty TNHH ABC" value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={inputCls(errors.name)} />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Khu vực">
                  <input type="text" placeholder="VD: Hà Nội, TP.HCM..." value={form.city}
                    onChange={e => setForm(f => ({ ...f, city: e.target.value }))} className={inputCls()} />
                </Field>
                <Field label="Loại">
                  <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as OrgType }))} className={inputCls()}>
                    {(Object.keys(ORG_TYPE_LABELS) as OrgType[]).map(k => (
                      <option key={k} value={k}>{ORG_TYPE_LABELS[k]}</option>
                    ))}
                  </select>
                </Field>
              </div>

              <Field label="Địa chỉ">
                <input type="text" placeholder="123 Đường ABC, Quận 1, TP.HCM" value={form.address}
                  onChange={e => setForm(f => ({ ...f, address: e.target.value }))} className={inputCls()} />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Số điện thoại">
                  <input type="text" placeholder="024 1234 5678" value={form.phone}
                    onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className={inputCls()} />
                </Field>
                <Field label="Email">
                  <input type="email" placeholder="info@cty.vn" value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className={inputCls()} />
                </Field>
              </div>

              <Field label="Website">
                <input type="text" placeholder="https://cty.vn" value={form.website}
                  onChange={e => setForm(f => ({ ...f, website: e.target.value }))} className={inputCls()} />
              </Field>

              <Field label="Ghi chú">
                <textarea placeholder="Ghi chú thêm..." value={form.note} rows={3}
                  onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                  className={`${inputCls()} resize-none`} />
              </Field>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex gap-3 flex-shrink-0">
              <button onClick={handleSubmit} disabled={submitting}
                className="flex-1 flex items-center justify-center gap-2 bg-accent-500 hover:bg-accent-600 disabled:opacity-60 text-white py-2.5 rounded-xl text-sm font-bold transition-colors">
                {submitting && <Loader2 size={14} className="animate-spin" />}
                {editingOrg ? 'Lưu thay đổi' : 'Tạo tổ chức'}
              </button>
              <button onClick={closePanel}
                className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-500 hover:bg-gray-50 transition-colors">
                Huỷ
              </button>
            </div>
          </div>
        </>
      )}

      {/* Delete confirm */}
      {deleteConfirm && pendingDelete && (
        <>
          <div className="fixed inset-0 bg-black/30 z-50" />
          <div className="fixed inset-0 flex items-center justify-center z-50 px-4">
            <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                <Trash2 size={22} className="text-red-500" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 text-center mb-1">Xóa tổ chức?</h3>
              <p className="text-sm text-gray-500 text-center mb-6">
                <strong>{pendingDelete.name}</strong> sẽ bị xóa. Hành động này không thể hoàn tác.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteConfirm(null)}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50">
                  Hủy
                </button>
                <button onClick={handleDelete}
                  className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-sm font-semibold text-white">
                  Xóa
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

function LookupButton({ loading, disabled, onClick }: { loading: boolean; disabled: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} disabled={loading || disabled}
      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-sky-50 border border-sky-200 text-sky-700 text-xs font-semibold hover:bg-sky-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap">
      {loading ? <Loader2 size={13} className="animate-spin" /> : null}
      Tra cứu
    </button>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">{children}</div>
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
