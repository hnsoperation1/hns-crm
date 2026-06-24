'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  CheckCircle2, ChevronRight, AlertTriangle, Zap,
  User, DollarSign, CalendarDays, Clock, FileText,
  Building2, TrendingUp, ArrowRight,
} from 'lucide-react'
import { USERS, OPPORTUNITIES, CONTACTS, getContactById, getUserById, mockFetch } from '@/lib/mock-data'
import { useTopbar } from '@/contexts/topbar'
import {
  STAGE_LABELS, STAGE_COLORS, SOURCE_LABELS, SOURCE_COLORS,
  formatVND, formatDate, getInitials, daysUntil,
} from '@/lib/utils'
import type { OppStage, LeadSource } from '@/types'
import DateInput from '@/components/DateInput'

const ACTIVE_STAGES: OppStage[] = ['stage_1', 'stage_2', 'stage_3', 'stage_4', 'stage_5']
const SALE_TV = USERS.filter(u => u.is_sale_tv && u.is_active)

const SOURCES: { value: LeadSource; label: string }[] = [
  { value: 'mkt', label: 'Marketing' },
  { value: 'sale', label: 'Sale' },
  { value: 'partner', label: 'Đối tác' },
  { value: 'bod', label: 'Ban Giám đốc' },
  { value: 'referral', label: 'Giới thiệu' },
  { value: 'cskh', label: 'CSKH' },
]

const EMPTY: {
  title: string; contact_id: string; source: LeadSource
  assigned_to: string; estimated_value: string
  tour_date: string; deadline: string; description: string
} = {
  title: '', contact_id: '', source: 'mkt', assigned_to: '',
  estimated_value: '', tour_date: '', deadline: '', description: '',
}

export default function AssignPage() {
  const { setOnRefresh } = useTopbar()
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ ...EMPTY })
  const [submitted, setSubmitted] = useState<{ title: string; userName: string } | null>(null)
  const [errors, setErrors] = useState<Partial<typeof EMPTY>>({})

  const loadData = useCallback(async () => {
    setLoading(true)
    await mockFetch(null, 2000)
    setLoading(false)
  }, [])

  useEffect(() => {
    loadData()
    setOnRefresh(loadData)
    return () => setOnRefresh(null)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Compute workload for each sale TV person
  const workload = SALE_TV.map(u => {
    const active = OPPORTUNITIES.filter(o =>
      o.assigned_to === u.id && ACTIVE_STAGES.includes(o.stage as OppStage)
    )
    const byStage = ACTIVE_STAGES.map(s => ({
      stage: s,
      count: active.filter(o => o.stage === s).length,
    })).filter(g => g.count > 0)
    const totalValue = active.reduce((s, o) => s + (o.estimated_value ?? 0), 0)
    const hasInTour = active.some(o => o.stage === 'stage_4')
    return { user: u, active, byStage, totalValue, hasInTour }
  }).sort((a, b) => a.active.length - b.active.length)

  const leastLoadedId = workload[0]?.user.id

  function set(field: keyof typeof EMPTY, val: string) {
    setForm(f => ({ ...f, [field]: val }))
    if (errors[field]) setErrors(e => ({ ...e, [field]: '' }))
  }

  function validate() {
    const e: Partial<typeof EMPTY> = {}
    if (!form.title.trim()) e.title = 'Vui lòng nhập tên đơn hàng'
    if (!form.contact_id) e.contact_id = 'Vui lòng chọn khách hàng'
    if (!form.assigned_to) e.assigned_to = 'Vui lòng chọn nhân viên'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function handleSubmit() {
    if (!validate()) return
    const user = getUserById(form.assigned_to)
    setSubmitted({ title: form.title, userName: user?.full_name ?? '' })
    setForm({ ...EMPTY })
    setErrors({})
    setTimeout(() => setSubmitted(null), 6000)
  }

  if (loading) return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6 animate-pulse">
      <div className="h-8 bg-gray-100 rounded w-32" />
      <div className="grid grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <div key={i} className="h-36 bg-gray-100 rounded-2xl" />)}
      </div>
      <div className="grid grid-cols-5 gap-5">
        <div className="col-span-2 h-[480px] bg-gray-100 rounded-2xl" />
        <div className="col-span-3 h-[480px] bg-gray-100 rounded-2xl" />
      </div>
    </div>
  )

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">

      {/* ─── HEADER ─── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Giao việc</h1>
          <p className="text-sm text-gray-400 mt-0.5">Phân bổ đơn hàng cho nhân viên Sale TV</p>
        </div>
        <Link href="/don-hang"
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-accent-500 transition-colors">
          Xem toàn bộ Pipeline <ChevronRight size={14} />
        </Link>
      </div>

      {/* ─── SUCCESS BANNER ─── */}
      {submitted && (
        <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-2xl px-5 py-4">
          <CheckCircle2 size={20} className="text-emerald-500 flex-shrink-0" />
          <div>
            <div className="font-semibold text-emerald-800 text-sm">
              Đã giao việc thành công!
            </div>
            <div className="text-xs text-emerald-600 mt-0.5">
              Đơn hàng <span className="font-bold">"{submitted.title}"</span> đã được giao cho <span className="font-bold">{submitted.userName}</span>. Nhân viên sẽ nhận được thông báo.
            </div>
          </div>
        </div>
      )}

      {/* ─── WORKLOAD OVERVIEW ─── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Phân bổ công việc hiện tại</h2>
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-xs text-gray-400">
            {OPPORTUNITIES.filter(o => ACTIVE_STAGES.includes(o.stage as OppStage)).length} đơn đang xử lý
          </span>
        </div>
        <div className="grid grid-cols-4 gap-4">
          {workload.map(({ user, active, byStage, totalValue, hasInTour }, idx) => {
            const isLeast = user.id === leastLoadedId
            const isSelected = form.assigned_to === user.id
            return (
              <button
                key={user.id}
                onClick={() => set('assigned_to', user.id)}
                className={`text-left rounded-2xl border p-4 transition-all hover:shadow-md ${
                  isSelected
                    ? 'border-blue-500 bg-brand-50 shadow-md ring-2 ring-brand-200'
                    : isLeast
                    ? 'border-emerald-300 bg-emerald-50/50 hover:border-emerald-400'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                {/* Top row */}
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0 ${
                    ['bg-brand-500', 'bg-brand-500', 'bg-violet-500', 'bg-amber-500'][idx % 4]
                  }`}>
                    {getInitials(user.full_name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-900 text-sm truncate">{user.full_name}</div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {isLeast && !isSelected && (
                        <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                          <Zap size={9} /> Đề xuất
                        </span>
                      )}
                      {isSelected && (
                        <span className="text-[10px] font-bold bg-brand-100 text-brand-700 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                          ✓ Đã chọn
                        </span>
                      )}
                      {hasInTour && (
                        <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-medium">
                          Trong tour
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className={`text-2xl font-black ${
                      isSelected ? 'text-brand-700' : active.length >= 3 ? 'text-amber-600' : 'text-gray-900'
                    }`}>{active.length}</div>
                    <div className="text-[10px] text-gray-400">đơn</div>
                  </div>
                </div>

                {/* Stage breakdown */}
                {byStage.length > 0 ? (
                  <div className="flex flex-wrap gap-1 mb-2.5">
                    {byStage.map(({ stage, count }) => {
                      const sc = STAGE_COLORS[stage]
                      return (
                        <span key={stage} className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${sc.bg} ${sc.text}`}>
                          {STAGE_LABELS[stage].split(' · ')[0]}: {count}
                        </span>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-xs text-gray-400 mb-2.5 italic">Chưa có đơn</div>
                )}

                {/* Value */}
                {totalValue > 0 && (
                  <div className={`text-xs font-semibold border-t pt-2 ${
                    isSelected ? 'border-brand-200 text-brand-700' : 'border-gray-100 text-gray-500'
                  }`}>
                    <TrendingUp size={10} className="inline mr-1" />
                    {formatVND(totalValue)}
                  </div>
                )}
              </button>
            )
          })}
        </div>
        {!form.assigned_to && (
          <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
            <Zap size={11} className="text-emerald-500" />
            Nhân viên <span className="font-semibold text-emerald-600">{workload[0]?.user.full_name}</span> đang ít việc nhất — được đề xuất cho đơn tiếp theo.
          </p>
        )}
      </div>

      {/* ─── MAIN CONTENT ─── */}
      <div className="grid grid-cols-5 gap-5">

        {/* ── FORM (2/5) ── */}
        <div className="col-span-2">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden sticky top-5">
            <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
              <h2 className="font-bold text-gray-900">Giao đơn hàng mới</h2>
              <p className="text-xs text-gray-500 mt-0.5">Điền thông tin và chọn nhân viên phụ trách</p>
            </div>

            <div className="p-5 space-y-4">
              {/* Title */}
              <Field label="Tên đơn hàng" required error={errors.title}>
                <input
                  type="text"
                  placeholder="VD: Honda VN – Phòng Kinh doanh"
                  value={form.title}
                  onChange={e => set('title', e.target.value)}
                  className={inputCls(!!errors.title)}
                />
              </Field>

              {/* Contact */}
              <Field label="Khách hàng" required error={errors.contact_id}>
                <select
                  value={form.contact_id}
                  onChange={e => set('contact_id', e.target.value)}
                  className={inputCls(!!errors.contact_id)}
                >
                  <option value="">— Chọn liên hệ —</option>
                  {CONTACTS.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name}{c.company ? ` · ${c.company}` : ''}
                    </option>
                  ))}
                </select>
              </Field>

              {/* Source */}
              <Field label="Nguồn đơn">
                <select
                  value={form.source}
                  onChange={e => set('source', e.target.value as LeadSource)}
                  className={inputCls(false)}
                >
                  {SOURCES.map(s => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </Field>

              {/* Assign to */}
              <Field label="Giao cho" required error={errors.assigned_to}>
                <select
                  value={form.assigned_to}
                  onChange={e => set('assigned_to', e.target.value)}
                  className={inputCls(!!errors.assigned_to)}
                >
                  <option value="">— Chọn nhân viên —</option>
                  {workload.map(({ user, active }) => (
                    <option key={user.id} value={user.id}>
                      {user.full_name} · {active.length} đơn đang xử lý
                      {user.id === leastLoadedId ? ' ⭐ Đề xuất' : ''}
                    </option>
                  ))}
                </select>
              </Field>

              {/* Show selected person preview */}
              {form.assigned_to && (() => {
                const w = workload.find(w => w.user.id === form.assigned_to)
                if (!w) return null
                return (
                  <div className={`flex items-center gap-3 rounded-xl p-3 border ${
                    w.user.id === leastLoadedId ? 'bg-emerald-50 border-emerald-200' : 'bg-brand-50 border-brand-200'
                  }`}>
                    <div className="w-8 h-8 bg-brand-500 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                      {getInitials(w.user.full_name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-gray-900">{w.user.full_name}</div>
                      <div className="text-xs text-gray-500">
                        Hiện có {w.active.length} đơn · {w.totalValue > 0 ? formatVND(w.totalValue) : 'chưa có giá trị'}
                      </div>
                    </div>
                    {w.user.id === leastLoadedId && (
                      <span className="text-xs bg-emerald-100 text-emerald-700 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Zap size={10} /> Đề xuất
                      </span>
                    )}
                  </div>
                )
              })()}

              {/* Two columns: value + tour date */}
              <div className="grid grid-cols-2 gap-3">
                <Field label="Giá trị ước tính">
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">VNĐ</span>
                    <input
                      type="number"
                      placeholder="450000000"
                      value={form.estimated_value}
                      onChange={e => set('estimated_value', e.target.value)}
                      className={`${inputCls(false)} pl-11`}
                    />
                  </div>
                </Field>
                <Field label="Ngày tour">
                  <DateInput value={form.tour_date} onChange={v => set('tour_date', v)} className="w-full" />
                </Field>
              </div>

              {/* Deadline */}
              <Field label="Deadline chốt đơn">
                <DateInput value={form.deadline} onChange={v => set('deadline', v)} className="w-full" />
              </Field>

              {/* Description */}
              <Field label="Mô tả & yêu cầu đặc biệt">
                <textarea
                  placeholder="Số lượng người, loại hình tour, yêu cầu đặc biệt từ khách..."
                  value={form.description}
                  onChange={e => set('description', e.target.value)}
                  rows={3}
                  className={`${inputCls(false)} resize-none`}
                />
              </Field>

              {/* Submit */}
              <button
                onClick={handleSubmit}
                className="w-full bg-accent-500 hover:bg-accent-600 active:scale-95 text-white py-3 rounded-xl font-bold text-sm transition-all shadow-sm flex items-center justify-center gap-2"
              >
                Xác nhận giao việc
                <ArrowRight size={16} />
              </button>

              {Object.keys(errors).length > 0 && (
                <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">
                  <AlertTriangle size={12} />
                  Vui lòng điền đầy đủ thông tin bắt buộc
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── HISTORY TABLE (3/5) ── */}
        <div className="col-span-3">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-gray-900">Lịch sử giao việc</h2>
            <span className="text-xs text-gray-400">{OPPORTUNITIES.length} đơn</span>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  {['Đơn hàng', 'Giao cho', 'Người giao', 'Nguồn', 'Giai đoạn', 'Ngày tạo', ''].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {[...OPPORTUNITIES]
                  .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                  .map(opp => {
                    const contact = getContactById(opp.contact_id)
                    const assigned = getUserById(opp.assigned_to)
                    const creator = getUserById(opp.created_by)
                    const sc = STAGE_COLORS[opp.stage]
                    return (
                      <tr key={opp.id} className="hover:bg-gray-50/70 transition-colors group">
                        <td className="px-4 py-3">
                          <div className="font-semibold text-gray-900 text-xs leading-snug group-hover:text-brand-700 transition-colors">
                            {opp.title}
                          </div>
                          <div className="text-[11px] text-gray-400 mt-0.5">
                            {contact?.company ?? contact?.name}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {assigned && (
                            <div className="flex items-center gap-1.5">
                              <div className="w-5 h-5 bg-brand-100 rounded-full flex items-center justify-center text-[9px] font-bold text-brand-700 flex-shrink-0">
                                {getInitials(assigned.full_name)}
                              </div>
                              <span className="text-xs text-gray-700 whitespace-nowrap">
                                {assigned.full_name.split(' ').pop()}
                              </span>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {creator && (
                            <span className="text-xs text-gray-500">
                              {creator.full_name.split(' ').pop()}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${SOURCE_COLORS[opp.source]}`}>
                            {SOURCE_LABELS[opp.source]}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${sc.bg} ${sc.text}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                            {STAGE_LABELS[opp.stage].split(' · ')[0]}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                          {formatDate(opp.created_at)}
                        </td>
                        <td className="px-4 py-3">
                          <Link href={`/co-hoi/${opp.id}`}
                            className="text-gray-300 hover:text-accent-500 transition-colors p-1 rounded-lg hover:bg-brand-50 inline-flex">
                            <ChevronRight size={14} />
                          </Link>
                        </td>
                      </tr>
                    )
                  })}
              </tbody>
            </table>
          </div>

          {/* Quick stats row */}
          <div className="grid grid-cols-3 gap-3 mt-4">
            {workload.map(({ user, active, totalValue }) => (
              <div key={user.id} className="bg-white rounded-xl border border-gray-200 p-3.5 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 bg-slate-200 rounded-full flex items-center justify-center text-xs font-bold text-slate-600">
                    {getInitials(user.full_name)}
                  </div>
                  <span className="text-xs font-semibold text-gray-800 truncate">{user.full_name.split(' ').pop()}</span>
                  <span className={`ml-auto text-xs font-bold ${active.length >= 3 ? 'text-amber-600' : 'text-emerald-600'}`}>
                    {active.length} đơn
                  </span>
                </div>
                {totalValue > 0 && (
                  <div className="text-[11px] text-gray-400">
                    <TrendingUp size={9} className="inline mr-1" />
                    {formatVND(totalValue)}
                  </div>
                )}
                {active.length === 0 && (
                  <div className="text-[11px] text-emerald-500 font-medium">Sẵn sàng nhận việc</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function Field({ label, required, error, children }: {
  label: string; required?: boolean; error?: string; children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-600 mb-1.5">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {error && (
        <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
          <AlertTriangle size={10} /> {error}
        </p>
      )}
    </div>
  )
}

function inputCls(hasError: boolean) {
  return `w-full text-sm border rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-400 bg-white transition-colors ${
    hasError ? 'border-red-300 bg-red-50' : 'border-gray-200 hover:border-gray-300'
  }`
}
