'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, CheckCircle2, AlertTriangle, CalendarDays,
  DollarSign, User, Building2, FileText, Tag, ChevronRight,
} from 'lucide-react'
import { USERS, CONTACTS } from '@/lib/mock-data'
import {
  STAGE_LABELS, STAGE_COLORS, SOURCE_LABELS, formatVND, getInitials,
} from '@/lib/utils'
import type { OppStage, LeadSource } from '@/types'

const SALE_TV = USERS.filter(u => u.is_sale_tv && u.is_active)
const STAGES: OppStage[] = ['stage_1', 'stage_2', 'stage_3', 'stage_4', 'stage_5']
const SOURCES: { value: LeadSource; label: string; desc: string }[] = [
  { value: 'mkt', label: 'Marketing', desc: 'Từ chiến dịch quảng cáo, form online' },
  { value: 'sale', label: 'Sale', desc: 'Sale tự tìm kiếm, cold call' },
  { value: 'referral', label: 'Giới thiệu', desc: 'Khách hàng cũ giới thiệu' },
  { value: 'partner', label: 'Đối tác', desc: 'Qua kênh đại lý, đối tác' },
  { value: 'bod', label: 'Ban Giám đốc', desc: 'BGĐ giới thiệu trực tiếp' },
  { value: 'cskh', label: 'CSKH', desc: 'Tái mua từ khách hàng cũ' },
]

interface FormData {
  title: string
  description: string
  contact_id: string
  source: LeadSource
  assigned_to: string
  stage: OppStage
  estimated_value: string
  tour_date: string
  deadline: string
}

const EMPTY: FormData = {
  title: '', description: '', contact_id: '', source: 'mkt',
  assigned_to: '', stage: 'stage_1', estimated_value: '', tour_date: '', deadline: '',
}

type Errors = Partial<Record<keyof FormData, string>>

export default function NewOpportunityPage() {
  const [form, setForm] = useState<FormData>({ ...EMPTY })
  const [errors, setErrors] = useState<Errors>({})
  const [submitted, setSubmitted] = useState(false)
  const [fakeId] = useState(() => `opp-${Date.now()}`)

  function set<K extends keyof FormData>(field: K, value: FormData[K]) {
    setForm(f => ({ ...f, [field]: value }))
    setErrors(e => ({ ...e, [field]: '' }))
  }

  function validate(): boolean {
    const e: Errors = {}
    if (!form.title.trim()) e.title = 'Vui lòng nhập tên đơn hàng'
    if (!form.contact_id) e.contact_id = 'Vui lòng chọn khách hàng'
    if (!form.assigned_to) e.assigned_to = 'Vui lòng chọn nhân viên phụ trách'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function handleSubmit() {
    if (!validate()) return
    setSubmitted(true)
  }

  const selectedContact = CONTACTS.find(c => c.id === form.contact_id)
  const selectedUser = USERS.find(u => u.id === form.assigned_to)
  const stageSc = STAGE_COLORS[form.stage]
  const hasErrors = Object.values(errors).some(Boolean)

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl border border-gray-200 shadow-lg p-10 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={32} className="text-emerald-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Tạo đơn hàng thành công!</h2>
          <p className="text-sm text-gray-500 mb-1">
            <span className="font-semibold text-gray-800">"{form.title}"</span>
          </p>
          <p className="text-xs text-gray-400 mb-6">
            Đã giao cho{' '}
            <span className="font-semibold text-gray-700">{selectedUser?.full_name}</span>
            {' · '}
            <span className={`font-semibold ${stageSc.text}`}>{STAGE_LABELS[form.stage]}</span>
          </p>

          <div className="flex flex-col gap-2.5">
            <Link
              href="/don-hang"
              className="w-full bg-accent-500 hover:bg-accent-600 text-white py-3 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2"
            >
              Xem Pipeline <ChevronRight size={15} />
            </Link>
            <button
              onClick={() => { setForm({ ...EMPTY }); setSubmitted(false); setErrors({}) }}
              className="w-full border border-gray-200 hover:bg-gray-50 text-gray-600 py-3 rounded-xl text-sm font-semibold transition-colors"
            >
              + Tạo đơn hàng khác
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-[1100px] mx-auto flex items-center gap-3">
          <Link href="/don-hang" className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 transition-colors">
            <ArrowLeft size={18} />
          </Link>
          <div className="flex-1">
            <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-0.5">
              <Link href="/don-hang" className="hover:text-gray-600">Đơn hàng</Link>
              <ChevronRight size={12} />
              <span className="text-gray-700 font-medium">Tạo đơn mới</span>
            </div>
            <h1 className="text-lg font-bold text-gray-900">Thêm đơn hàng mới</h1>
          </div>
          <button
            onClick={handleSubmit}
            className="bg-accent-500 hover:bg-accent-600 active:scale-95 text-white px-6 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm"
          >
            Tạo đơn hàng
          </button>
        </div>
      </div>

      <div className="max-w-[1100px] mx-auto px-6 py-6 grid grid-cols-3 gap-6">

        {/* ── LEFT: Form (2 cols) ── */}
        <div className="col-span-2 space-y-5">

          {/* Error summary */}
          {hasErrors && (
            <div className="flex items-center gap-2.5 bg-red-50 border border-red-200 rounded-2xl px-4 py-3">
              <AlertTriangle size={16} className="text-red-500 flex-shrink-0" />
              <span className="text-sm text-red-700">Vui lòng điền đầy đủ các trường bắt buộc</span>
            </div>
          )}

          {/* Section 1: Thông tin đơn */}
          <Section title="Thông tin đơn hàng" icon={<FileText size={15} />}>
            <Field label="Tên đơn hàng" required error={errors.title}>
              <input
                type="text"
                placeholder="VD: Honda VN – Team Kinh doanh Q3/2026"
                value={form.title}
                onChange={e => set('title', e.target.value)}
                className={input(!!errors.title)}
                autoFocus
              />
            </Field>
            <Field label="Mô tả chi tiết">
              <textarea
                placeholder="Số lượng người, loại hình tour, yêu cầu đặc biệt từ khách hàng..."
                value={form.description}
                onChange={e => set('description', e.target.value)}
                rows={3}
                className={`${input(false)} resize-none`}
              />
            </Field>
          </Section>

          {/* Section 2: Khách hàng */}
          <Section title="Khách hàng" icon={<Building2 size={15} />}>
            <Field label="Chọn khách hàng" required error={errors.contact_id}>
              <select
                value={form.contact_id}
                onChange={e => set('contact_id', e.target.value)}
                className={input(!!errors.contact_id)}
              >
                <option value="">— Chọn từ danh sách —</option>
                {CONTACTS.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name}{c.company ? ` · ${c.company}` : ''}
                  </option>
                ))}
              </select>
            </Field>

            {selectedContact && (
              <div className="flex items-center gap-3 bg-brand-50 border border-brand-100 rounded-xl px-4 py-3">
                <div className="w-9 h-9 bg-brand-500 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                  {getInitials(selectedContact.name)}
                </div>
                <div>
                  <div className="font-semibold text-gray-900 text-sm">{selectedContact.name}</div>
                  {selectedContact.company && (
                    <div className="text-xs text-gray-500">{selectedContact.company}</div>
                  )}
                  {selectedContact.phone && (
                    <div className="text-xs text-gray-400">{selectedContact.phone}</div>
                  )}
                </div>
              </div>
            )}

            <Field label="Nguồn đơn" required>
              <div className="grid grid-cols-3 gap-2">
                {SOURCES.map(s => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => set('source', s.value)}
                    className={`text-left px-3 py-2.5 rounded-xl border text-xs font-semibold transition-all ${
                      form.source === s.value
                        ? 'border-brand-400 bg-brand-50 text-brand-700 shadow-sm'
                        : 'border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="font-bold mb-0.5">{s.label}</div>
                    <div className={`text-[10px] font-normal leading-snug ${form.source === s.value ? 'text-brand-500' : 'text-gray-400'}`}>
                      {s.desc}
                    </div>
                  </button>
                ))}
              </div>
            </Field>
          </Section>

          {/* Section 3: Phân bổ */}
          <Section title="Phân bổ & Giai đoạn" icon={<User size={15} />}>
            <Field label="Nhân viên phụ trách" required error={errors.assigned_to}>
              <select
                value={form.assigned_to}
                onChange={e => set('assigned_to', e.target.value)}
                className={input(!!errors.assigned_to)}
              >
                <option value="">— Chọn Sale TV —</option>
                {SALE_TV.map(u => (
                  <option key={u.id} value={u.id}>{u.full_name}</option>
                ))}
              </select>
            </Field>

            {selectedUser && (
              <div className="flex items-center gap-3 bg-brand-50 border border-brand-100 rounded-xl px-4 py-2.5">
                <div className="w-8 h-8 bg-brand-500 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                  {getInitials(selectedUser.full_name)}
                </div>
                <div className="text-sm font-semibold text-gray-900">{selectedUser.full_name}</div>
                <span className="ml-auto text-xs text-brand-500 font-medium">Sale TV</span>
              </div>
            )}

            <Field label="Giai đoạn khởi đầu">
              <div className="flex gap-2 flex-wrap">
                {STAGES.map(s => {
                  const sc = STAGE_COLORS[s]
                  const isSelected = form.stage === s
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => set('stage', s)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                        isSelected
                          ? `${sc.bg} ${sc.text} ${sc.border} shadow-sm`
                          : 'border-gray-200 text-gray-400 hover:border-gray-300'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? sc.dot : 'bg-gray-300'}`} />
                      {STAGE_LABELS[s].split(' · ')[0]}
                    </button>
                  )
                })}
              </div>
            </Field>
          </Section>

          {/* Section 4: Tài chính & Thời gian */}
          <Section title="Tài chính & Thời gian" icon={<DollarSign size={15} />}>
            <div className="grid grid-cols-3 gap-4">
              <Field label="Giá trị ước tính (VNĐ)">
                <div className="relative">
                  <input
                    type="number"
                    placeholder="450000000"
                    value={form.estimated_value}
                    onChange={e => set('estimated_value', e.target.value)}
                    className={`${input(false)} pr-3`}
                  />
                </div>
                {form.estimated_value && Number(form.estimated_value) > 0 && (
                  <div className="text-xs text-accent-500 font-semibold mt-1">
                    = {formatVND(Number(form.estimated_value))}
                  </div>
                )}
              </Field>
              <Field label="Ngày tour" icon={<CalendarDays size={13} />}>
                <input
                  type="date"
                  value={form.tour_date}
                  onChange={e => set('tour_date', e.target.value)}
                  className={input(false)}
                />
              </Field>
              <Field label="Deadline chốt đơn" icon={<CalendarDays size={13} />}>
                <input
                  type="date"
                  value={form.deadline}
                  onChange={e => set('deadline', e.target.value)}
                  className={input(false)}
                />
              </Field>
            </div>
          </Section>

          {/* Submit button (bottom) */}
          <div className="flex gap-3 pb-6">
            <button
              onClick={handleSubmit}
              className="flex-1 bg-accent-500 hover:bg-accent-600 active:scale-95 text-white py-3.5 rounded-2xl text-sm font-bold transition-all shadow-sm"
            >
              Tạo đơn hàng
            </button>
            <Link
              href="/don-hang"
              className="px-6 py-3.5 rounded-2xl border border-gray-200 text-sm font-semibold text-gray-500 hover:bg-gray-50 transition-colors"
            >
              Huỷ
            </Link>
          </div>
        </div>

        {/* ── RIGHT: Preview sidebar ── */}
        <div className="space-y-4 sticky top-[73px] self-start">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3.5 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900 text-sm">Xem trước đơn hàng</h3>
            </div>
            <div className="p-4 space-y-3">
              {/* Title */}
              <div>
                <div className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide mb-1">Tên đơn</div>
                <div className={`text-sm font-bold ${form.title ? 'text-gray-900' : 'text-gray-300 italic'}`}>
                  {form.title || 'Chưa nhập tên đơn hàng'}
                </div>
              </div>

              {/* Contact */}
              <div>
                <div className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide mb-1">Khách hàng</div>
                {selectedContact ? (
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-brand-100 rounded-full flex items-center justify-center text-[9px] font-bold text-brand-700 flex-shrink-0">
                      {getInitials(selectedContact.name)}
                    </div>
                    <span className="text-sm text-gray-700 font-medium">{selectedContact.name}</span>
                  </div>
                ) : (
                  <div className="text-sm text-gray-300 italic">Chưa chọn</div>
                )}
              </div>

              {/* Stage */}
              <div>
                <div className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide mb-1">Giai đoạn</div>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${stageSc.bg} ${stageSc.text}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${stageSc.dot}`} />
                  {STAGE_LABELS[form.stage]}
                </span>
              </div>

              {/* Assigned to */}
              <div>
                <div className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide mb-1">Phụ trách</div>
                {selectedUser ? (
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-brand-400 rounded-full flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0">
                      {getInitials(selectedUser.full_name)}
                    </div>
                    <span className="text-sm text-gray-700 font-medium">{selectedUser.full_name}</span>
                  </div>
                ) : (
                  <div className="text-sm text-gray-300 italic">Chưa chọn</div>
                )}
              </div>

              {/* Source */}
              <div>
                <div className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide mb-1">Nguồn</div>
                <span className="text-xs font-semibold text-gray-600">{SOURCE_LABELS[form.source]}</span>
              </div>

              {/* Value */}
              {form.estimated_value && Number(form.estimated_value) > 0 && (
                <div>
                  <div className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide mb-1">Giá trị</div>
                  <span className="text-sm font-black text-brand-700">{formatVND(Number(form.estimated_value))}</span>
                </div>
              )}

              {/* Dates */}
              {(form.tour_date || form.deadline) && (
                <div className="pt-2 border-t border-gray-100 space-y-1.5">
                  {form.tour_date && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-400">Ngày tour</span>
                      <span className="font-semibold text-gray-700">{form.tour_date}</span>
                    </div>
                  )}
                  {form.deadline && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-400">Deadline</span>
                      <span className="font-semibold text-amber-600">{form.deadline}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Completeness indicator */}
            <div className="px-4 pb-4">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] text-gray-400 font-medium">Độ hoàn thiện</span>
                <span className="text-[10px] font-bold text-gray-600">
                  {[form.title, form.contact_id, form.assigned_to, form.estimated_value, form.tour_date, form.deadline].filter(Boolean).length}/6
                </span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-1.5 bg-brand-500 rounded-full transition-all duration-300"
                  style={{
                    width: `${([form.title, form.contact_id, form.assigned_to, form.estimated_value, form.tour_date, form.deadline].filter(Boolean).length / 6) * 100}%`
                  }}
                />
              </div>
            </div>
          </div>

          {/* Stage guide */}
          <div className={`rounded-2xl border p-4 ${stageSc.bg} ${stageSc.border}`}>
            <div className={`text-xs font-bold mb-1.5 ${stageSc.text}`}>
              {STAGE_LABELS[form.stage]}
            </div>
            <div className={`text-[11px] leading-relaxed ${stageSc.text} opacity-80`}>
              {stageDescriptions[form.stage]}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

const stageDescriptions: Record<OppStage, string> = {
  stage_1: 'Giai đoạn tư vấn ban đầu — thu thập yêu cầu, khảo sát nhu cầu, xác định ngân sách.',
  stage_2: 'Đang lập phương án và báo giá chi tiết cho khách hàng.',
  stage_3: 'Đã chốt hợp đồng, đang chuẩn bị trước tour: đặt dịch vụ, thu cọc, gửi thông tin.',
  stage_4: 'Đoàn đang thực hiện tour. Theo dõi và hỗ trợ kịp thời.',
  stage_5: 'Tour đã hoàn thành. Quyết toán, CSKH, ghi nhận doanh thu.',
  lost: 'Đơn đã mất hoặc khách huỷ.',
  cancelled: 'Đơn đã bị huỷ.',
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-5 py-3.5 border-b border-gray-100 flex items-center gap-2">
        <span className="text-gray-400">{icon}</span>
        <h2 className="font-semibold text-gray-900 text-sm">{title}</h2>
      </div>
      <div className="p-5 space-y-4">{children}</div>
    </div>
  )
}

function Field({ label, required, error, icon, children }: {
  label: string; required?: boolean; error?: string; icon?: React.ReactNode; children: React.ReactNode
}) {
  return (
    <div>
      <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 mb-1.5">
        {icon}
        {label}
        {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {error && (
        <p className="flex items-center gap-1 text-xs text-red-500 mt-1.5">
          <AlertTriangle size={11} /> {error}
        </p>
      )}
    </div>
  )
}

function input(hasError: boolean) {
  return `w-full text-sm border rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-400 bg-white transition-all ${
    hasError ? 'border-red-300 bg-red-50 focus:ring-red-400' : 'border-gray-200 hover:border-gray-300'
  }`
}
