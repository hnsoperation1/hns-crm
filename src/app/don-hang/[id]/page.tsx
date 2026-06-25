'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useTopbar } from '@/contexts/topbar'
import { useAuth } from '@/contexts/auth'
import {
  STAGE_LABELS, STAGE_COLORS, SOURCE_LABELS, SOURCE_COLORS,
  formatDate, formatVND, getInitials,
} from '@/lib/utils'
import type { OppStage, LeadSource, LogType, ServiceType } from '@/types'
import DateInput from '@/components/DateInput'
import ServiceTypeSelect from '@/components/ServiceTypeSelect'
import { Pencil, ChevronRight, X, Loader2, AlertTriangle, Plus, MessageSquare, ArrowRightLeft } from 'lucide-react'

type Opp = {
  id: string
  title: string
  description: string | null
  stage: OppStage
  source: LeadSource
  estimated_value: number | null
  actual_value: number | null
  service_type_id: string | null
  tour_date: string | null
  tour_end_date: string | null
  deadline: string | null
  lost_reason: string | null
  created_at: string
  updated_at: string
  contact: { id: string; name: string; company?: string; phone?: string } | null
  assigned_user: { id: string; full_name: string } | null
}

type Log = {
  id: string
  log_type: LogType
  log_date: string
  description: string
  next_step: string | null
  next_step_due: string | null
  stage_at_log: OppStage
  stage_from: OppStage | null
  stage_to: OppStage | null
  user: { full_name: string } | null
  created_at: string
}

type UserOpt = { id: string; full_name: string }

const SOURCES: { value: LeadSource; label: string }[] = [
  { value: 'mkt', label: 'Marketing' }, { value: 'sale', label: 'Sale' },
  { value: 'partner', label: 'Đối tác' }, { value: 'bod', label: 'Ban GĐ' },
  { value: 'cskh', label: 'CSKH' }, { value: 'referral', label: 'Giới thiệu' },
  { value: 'test', label: 'Test' },
]

const STAGES: OppStage[] = ['stage_1', 'stage_2', 'stage_3', 'stage_4', 'stage_5', 'lost', 'cancelled']

const LOG_TYPE_LABELS: Record<LogType, string> = {
  sale_update: 'Cập nhật Sale',
  stage_change: 'Chuyển giai đoạn',
  cskh_care: 'Chăm sóc KH',
  note: 'Ghi chú',
}

export default function DonHangDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { setBreadcrumb, setOnRefresh } = useTopbar()
  const { user } = useAuth()
  const supabase = createClient()

  const [opp, setOpp] = useState<Opp | null>(null)
  const [logs, setLogs] = useState<Log[]>([])
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([])
  const [users, setUsers] = useState<UserOpt[]>([])
  const [loading, setLoading] = useState(true)
  const [mainTab, setMainTab] = useState<'info' | 'log'>('info')

  // Modal sửa info
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState<{
    title: string; stage: OppStage; source: LeadSource; assigned_to: string
    estimated_value: string; actual_value: string; service_type_id: string
    tour_date: string; tour_end_date: string; deadline: string; description: string; lost_reason: string
  } | null>(null)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Modal thêm nhật ký
  const [showLogModal, setShowLogModal] = useState(false)
  const [logForm, setLogForm] = useState({ log_type: 'note' as LogType, description: '', next_step: '', next_step_due: '' })
  const [savingLog, setSavingLog] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    const [{ data: oppData }, { data: logData }, { data: stData }, { data: usersData }] = await Promise.all([
      supabase.from('opportunities')
        .select('id, title, description, stage, source, estimated_value, actual_value, service_type_id, tour_date, tour_end_date, deadline, lost_reason, created_at, updated_at, contact:contacts(id, name, company, phone), assigned_user:users!assigned_to(id, full_name)')
        .eq('id', id).single(),
      supabase.from('activity_logs')
        .select('id, log_type, log_date, description, next_step, next_step_due, stage_at_log, stage_from, stage_to, user:users(full_name), created_at')
        .eq('opportunity_id', id).order('created_at', { ascending: false }),
      supabase.from('service_types').select('*').order('sort_order'),
      supabase.from('users').select('id, full_name').eq('is_sale_tv', true).eq('is_active', true).order('full_name'),
    ])
    if (!oppData) { router.push('/don-hang/co-hoi'); return }
    setOpp(oppData as unknown as Opp)
    setLogs((logData ?? []) as unknown as Log[])
    setServiceTypes((stData ?? []) as ServiceType[])
    setUsers((usersData ?? []) as UserOpt[])
    setLoading(false)
  }, [id])

  useEffect(() => {
    loadData()
    setOnRefresh(loadData)
    return () => setOnRefresh(null)
  }, [])

  useEffect(() => {
    if (!opp) return
    setBreadcrumb(
      <div className="flex items-center gap-1.5 text-xs text-gray-500">
        <Link href="/don-hang/co-hoi" className="hover:text-gray-700">Đơn hàng</Link>
        <ChevronRight size={11} className="text-gray-300" />
        <span className="text-gray-700 font-semibold truncate max-w-[200px]">{opp.title}</span>
      </div>
    )
    return () => setBreadcrumb(null)
  }, [opp])

  function openModal() {
    if (!opp) return
    setForm({
      title: opp.title,
      stage: opp.stage,
      source: opp.source,
      assigned_to: opp.assigned_user?.id ?? '',
      estimated_value: opp.estimated_value?.toString() ?? '',
      actual_value: opp.actual_value?.toString() ?? '',
      service_type_id: opp.service_type_id ?? '',
      tour_date: opp.tour_date ?? '',
      tour_end_date: opp.tour_end_date ?? '',
      deadline: opp.deadline ?? '',
      description: opp.description ?? '',
      lost_reason: opp.lost_reason ?? '',
    })
    setErrors({})
    setShowModal(true)
  }

  async function handleSave() {
    if (!form) return
    const e: Record<string, string> = {}
    if (!form.title.trim()) e.title = 'Bắt buộc'
    setErrors(e)
    if (Object.keys(e).length) return

    setSaving(true)
    const { error } = await supabase.from('opportunities').update({
      title: form.title.trim(),
      stage: form.stage,
      source: form.source,
      assigned_to: form.assigned_to || null,
      estimated_value: form.estimated_value ? Number(form.estimated_value) : null,
      actual_value: form.actual_value ? Number(form.actual_value) : null,
      service_type_id: form.service_type_id || null,
      tour_date: form.tour_date || null,
      tour_end_date: form.tour_end_date || null,
      deadline: form.deadline || null,
      description: form.description.trim() || null,
      lost_reason: form.lost_reason.trim() || null,
    }).eq('id', id)
    setSaving(false)
    if (!error) {
      setShowModal(false)
      loadData()
    }
  }

  async function handleSaveLog() {
    if (!logForm.description.trim()) return
    setSavingLog(true)
    await supabase.from('activity_logs').insert({
      opportunity_id: id,
      user_id: user!.id,
      log_type: logForm.log_type,
      log_date: new Date().toISOString(),
      description: logForm.description.trim(),
      next_step: logForm.next_step.trim() || null,
      next_step_due: logForm.next_step_due || null,
      stage_at_log: opp?.stage ?? 'stage_1',
    })
    setSavingLog(false)
    setShowLogModal(false)
    setLogForm({ log_type: 'note', description: '', next_step: '', next_step_due: '' })
    loadData()
  }

  const iField = 'w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 bg-white'

  function getServiceTypeLabel(id: string | null): string {
    if (!id) return '—'
    const st = serviceTypes.find(t => t.id === id)
    if (!st) return '—'
    if (st.parent_id) {
      const parent = serviceTypes.find(t => t.id === st.parent_id)
      return parent ? `${parent.name} › ${st.name}` : st.name
    }
    return st.name
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={24} className="animate-spin text-brand-400" />
      </div>
    )
  }

  if (!opp) return null
  const sc = STAGE_COLORS[opp.stage]

  return (
    <>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="bg-white border-b border-gray-100 px-6 py-3 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <h1 className="text-base font-bold text-gray-900 truncate">{opp.title}</h1>
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold flex-shrink-0 ${sc.bg} ${sc.text}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
              {STAGE_LABELS[opp.stage]}
            </span>
          </div>
          <button onClick={openModal}
            className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold rounded-xl transition-colors flex-shrink-0">
            <Pencil size={13} /> Sửa
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 bg-white flex-shrink-0">
          {(['info', 'log'] as const).map(tab => (
            <button key={tab} onClick={() => setMainTab(tab)}
              className={`px-5 py-2.5 text-sm font-semibold transition-colors border-b-2 -mb-px ${mainTab === tab ? 'border-brand-500 text-brand-700' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
              {tab === 'info' ? 'Thông tin' : 'Nhật ký'}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto bg-gray-50">
          {mainTab === 'info' && (
            <div className="max-w-3xl mx-auto px-6 py-5 space-y-4">
              <Card title="Thông tin chung">
                <Row label="Liên hệ" value={
                  opp.contact ? (
                    <Link href={`/khach-hang`} className="flex items-center gap-2 group">
                      <div className="w-7 h-7 bg-brand-100 rounded-full flex items-center justify-center text-[10px] font-bold text-brand-700">
                        {getInitials(opp.contact.name)}
                      </div>
                      <div>
                        <div className="font-semibold text-brand-700 group-hover:underline text-sm">{opp.contact.name}</div>
                        {opp.contact.company && <div className="text-xs text-gray-400">{opp.contact.company}</div>}
                      </div>
                    </Link>
                  ) : <span className="text-gray-300">—</span>
                } />
                <Row label="Sale phụ trách" value={
                  opp.assigned_user ? (
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-slate-200 rounded-full flex items-center justify-center text-[10px] font-bold text-slate-600">
                        {getInitials(opp.assigned_user.full_name)}
                      </div>
                      <span className="text-sm text-gray-800">{opp.assigned_user.full_name}</span>
                    </div>
                  ) : <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Chưa phân công</span>
                } />
                <Row label="Nguồn" value={
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${SOURCE_COLORS[opp.source]}`}>{SOURCE_LABELS[opp.source]}</span>
                } />
                <Row label="Loại dịch vụ" value={<span className="text-sm text-gray-700">{getServiceTypeLabel(opp.service_type_id)}</span>} />
              </Card>

              <Card title="Tài chính & Thời gian">
                <Row label="Giá trị ước tính" value={<span className="text-sm font-bold text-gray-800">{opp.estimated_value ? formatVND(opp.estimated_value) : '—'}</span>} />
                <Row label="Doanh thu thực tế" value={<span className="text-sm font-bold text-emerald-700">{opp.actual_value ? formatVND(opp.actual_value) : '—'}</span>} />
                <Row label="Ngày đi" value={<span className="text-sm text-gray-700">{formatDate(opp.tour_date)}</span>} />
                <Row label="Ngày về" value={<span className="text-sm text-gray-700">{formatDate(opp.tour_end_date)}</span>} />
                <Row label="Deadline" value={<span className="text-sm text-gray-700">{formatDate(opp.deadline)}</span>} />
              </Card>

              {(opp.description || opp.lost_reason) && (
                <Card title="Mô tả">
                  {opp.description && <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{opp.description}</p>}
                  {opp.lost_reason && (
                    <div className="mt-2 p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700">
                      <span className="font-semibold">Lý do mất đơn:</span> {opp.lost_reason}
                    </div>
                  )}
                </Card>
              )}

              <div className="text-xs text-gray-400 text-center pb-4">
                Tạo lúc {formatDate(opp.created_at)} · Cập nhật {formatDate(opp.updated_at)}
              </div>
            </div>
          )}

          {mainTab === 'log' && (
            <div className="max-w-3xl mx-auto px-6 py-5">
              <div className="flex justify-end mb-4">
                <button onClick={() => setShowLogModal(true)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-accent-500 hover:bg-accent-600 text-white text-sm font-semibold rounded-xl transition-colors">
                  <Plus size={14} /> Thêm nhật ký
                </button>
              </div>
              {logs.length === 0 ? (
                <div className="text-center py-16 text-gray-400 text-sm">Chưa có nhật ký nào</div>
              ) : (
                <div className="space-y-3">
                  {logs.map(log => (
                    <div key={log.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex items-center gap-2">
                          {log.log_type === 'stage_change'
                            ? <span className="p-1.5 bg-indigo-100 rounded-lg"><ArrowRightLeft size={13} className="text-indigo-600" /></span>
                            : <span className="p-1.5 bg-brand-100 rounded-lg"><MessageSquare size={13} className="text-brand-600" /></span>
                          }
                          <span className="text-xs font-bold text-gray-600">{LOG_TYPE_LABELS[log.log_type]}</span>
                          {log.log_type === 'stage_change' && log.stage_from && log.stage_to && (
                            <span className="text-xs text-gray-400">
                              {STAGE_LABELS[log.stage_from]} → {STAGE_LABELS[log.stage_to]}
                            </span>
                          )}
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="text-xs text-gray-400">{formatDate(log.log_date)}</div>
                          {log.user && <div className="text-xs font-semibold text-gray-600">{log.user.full_name}</div>}
                        </div>
                      </div>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{log.description}</p>
                      {log.next_step && (
                        <div className="mt-2 pt-2 border-t border-gray-100">
                          <span className="text-xs font-semibold text-gray-500">Bước tiếp theo: </span>
                          <span className="text-xs text-gray-600">{log.next_step}</span>
                          {log.next_step_due && <span className="text-xs text-amber-600 ml-2">· {formatDate(log.next_step_due)}</span>}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal sửa */}
      {showModal && form && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-900">Cập nhật đơn hàng</h3>
              <button onClick={() => setShowModal(false)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400"><X size={16} /></button>
            </div>
            <div className="px-5 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Tên */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Tên đơn hàng <span className="text-red-500">*</span></label>
                <input value={form.title} onChange={e => { setForm(f => f && ({ ...f, title: e.target.value })); setErrors(er => ({ ...er, title: '' })) }}
                  className={`${iField} ${errors.title ? 'border-red-300 bg-red-50' : ''}`} />
                {errors.title && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertTriangle size={11} /> {errors.title}</p>}
              </div>

              {/* Giai đoạn + Sale + Nguồn */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Giai đoạn</label>
                  <select value={form.stage} onChange={e => setForm(f => f && ({ ...f, stage: e.target.value as OppStage }))} className={iField}>
                    {STAGES.map(s => <option key={s} value={s}>{STAGE_LABELS[s]}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Sale phụ trách</label>
                  <select value={form.assigned_to} onChange={e => setForm(f => f && ({ ...f, assigned_to: e.target.value }))} className={iField}>
                    <option value="">— Chưa phân công —</option>
                    {users.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Nguồn</label>
                  <select value={form.source} onChange={e => setForm(f => f && ({ ...f, source: e.target.value as LeadSource }))} className={iField}>
                    {SOURCES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
              </div>

              {/* Loại dịch vụ */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Loại dịch vụ</label>
                <ServiceTypeSelect value={form.service_type_id || null} onChange={v => setForm(f => f && ({ ...f, service_type_id: v ?? '' }))} />
              </div>

              {/* Tài chính */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Giá trị ước tính (VNĐ)</label>
                  <input type="number" value={form.estimated_value} onChange={e => setForm(f => f && ({ ...f, estimated_value: e.target.value }))}
                    placeholder="0" className={iField} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Doanh thu thực tế (VNĐ)</label>
                  <input type="number" value={form.actual_value} onChange={e => setForm(f => f && ({ ...f, actual_value: e.target.value }))}
                    placeholder="0" className={iField} />
                </div>
              </div>

              {/* Ngày */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Ngày đi</label>
                  <DateInput value={form.tour_date} onChange={v => setForm(f => f && ({ ...f, tour_date: v }))} className="w-full" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Ngày về</label>
                  <DateInput value={form.tour_end_date} onChange={v => setForm(f => f && ({ ...f, tour_end_date: v }))} className="w-full" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Deadline</label>
                  <DateInput value={form.deadline} onChange={v => setForm(f => f && ({ ...f, deadline: v }))} className="w-full" />
                </div>
              </div>

              {/* Mô tả */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Mô tả</label>
                <textarea value={form.description} onChange={e => setForm(f => f && ({ ...f, description: e.target.value }))}
                  rows={3} className={`${iField} resize-none`} />
              </div>

              {/* Lý do mất đơn (chỉ show khi stage là lost/cancelled) */}
              {(form.stage === 'lost' || form.stage === 'cancelled') && (
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Lý do mất / huỷ</label>
                  <textarea value={form.lost_reason} onChange={e => setForm(f => f && ({ ...f, lost_reason: e.target.value }))}
                    rows={2} className={`${iField} resize-none`} />
                </div>
              )}
            </div>
            <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-gray-100">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-gray-500 hover:bg-gray-50 rounded-xl transition-colors">Huỷ</button>
              <button onClick={handleSave} disabled={saving}
                className="flex items-center gap-1.5 px-5 py-2 bg-accent-500 hover:bg-accent-600 disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-colors">
                {saving && <Loader2 size={13} className="animate-spin" />}
                Lưu thay đổi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal thêm nhật ký */}
      {showLogModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm" onClick={() => setShowLogModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-900">Thêm nhật ký</h3>
              <button onClick={() => setShowLogModal(false)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400"><X size={16} /></button>
            </div>
            <div className="px-5 py-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Loại</label>
                <select value={logForm.log_type} onChange={e => setLogForm(f => ({ ...f, log_type: e.target.value as LogType }))} className={iField}>
                  {(Object.entries(LOG_TYPE_LABELS) as [LogType, string][]).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Nội dung <span className="text-red-500">*</span></label>
                <textarea value={logForm.description} onChange={e => setLogForm(f => ({ ...f, description: e.target.value }))}
                  rows={4} placeholder="Ghi chú nội dung trao đổi, kết quả cuộc gặp..." autoFocus className={`${iField} resize-none`} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Bước tiếp theo</label>
                <input value={logForm.next_step} onChange={e => setLogForm(f => ({ ...f, next_step: e.target.value }))}
                  placeholder="VD: Gửi báo giá, Gọi lại xác nhận..." className={iField} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Hạn thực hiện</label>
                <DateInput value={logForm.next_step_due} onChange={v => setLogForm(f => ({ ...f, next_step_due: v }))} className="w-full" />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-gray-100">
              <button onClick={() => setShowLogModal(false)} className="px-4 py-2 text-sm text-gray-500 hover:bg-gray-50 rounded-xl transition-colors">Huỷ</button>
              <button onClick={handleSaveLog} disabled={savingLog || !logForm.description.trim()}
                className="flex items-center gap-1.5 px-5 py-2 bg-accent-500 hover:bg-accent-600 disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-colors">
                {savingLog && <Loader2 size={13} className="animate-spin" />}
                Lưu
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-100">
        <h3 className="text-sm font-bold text-gray-700">{title}</h3>
      </div>
      <div className="divide-y divide-gray-50">{children}</div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-4 px-5 py-3">
      <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide w-36 flex-shrink-0 pt-0.5">{label}</span>
      <div className="flex-1 min-w-0">{value}</div>
    </div>
  )
}
