'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import ChecklistTab from './ChecklistTab'
import {
  ArrowLeft, ArrowRight, Phone, Mail, Building2,
  MessageSquare, Plus, CheckSquare, Square,
  Clock, CalendarDays, DollarSign, User, Pencil, CheckCircle2, X,
  ClipboardList, UserPlus, Loader2, QrCode, Copy, Check,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useTopbar } from '@/contexts/topbar'
import {
  STAGE_LABELS, STAGE_COLORS, SOURCE_LABELS, SOURCE_COLORS,
  formatVND, formatDate, getInitials, daysSince, daysUntil,
} from '@/lib/utils'
import { AlertCircle, Clock as ClockIcon, CheckCircle, PlusCircle } from 'lucide-react'
import type { OppStage, LogType, Opportunity, Contact, ActivityLog, IssueStatus } from '@/types'

// ─── Local types for Supabase joins ──────────────────────────────────────────

type UserMin = { id: string; full_name: string; is_sale_tv?: boolean; is_active?: boolean }

type OppDetail = Opportunity & {
  contact: (Contact & { id: string }) | null
  assigned_user: UserMin | null
  creator: UserMin | null
}

type LogDetail = ActivityLog & {
  user: UserMin | null
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PIPELINE: OppStage[] = ['stage_1', 'stage_2', 'stage_3', 'stage_4', 'stage_5']

type LogFilter = 'all' | 'stage_change' | 'sale_update'
const LOG_FILTERS: { key: LogFilter; label: string }[] = [
  { key: 'all', label: 'Tất cả' },
  { key: 'stage_change', label: 'Chuyển giai đoạn' },
  { key: 'sale_update', label: 'Cập nhật sale' },
]

// ─── Page ────────────────────────────────────────────────────────────────────

export default function OppDetailPage() {
  const { id } = useParams<{ id: string }>()
  const supabase = createClient()

  const { setBreadcrumb } = useTopbar()

  const [opp, setOpp] = useState<OppDetail | null>(null)
  const [allLogs, setAllLogs] = useState<LogDetail[]>([])
  const [tasks, setTasks] = useState<{ id: string; title: string; due_date?: string; assigned_to?: string; is_done: boolean; stage: number }[]>([])
  const [saleUsers, setSaleUsers] = useState<UserMin[]>([])
  const [allUsers, setAllUsers] = useState<UserMin[]>([])
  const [issues, setIssues] = useState<{ id: string; description: string; status: IssueStatus; assigned_user: { full_name: string } | null; created_at: string }[]>([])
  const [showIssueForm, setShowIssueForm] = useState(false)
  const [issueDesc, setIssueDesc] = useState('')
  const [issueSaving, setIssueSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  const [logFilter, setLogFilter] = useState<LogFilter>('all')
  const [logForm, setLogForm] = useState({ description: '', log_date: new Date().toISOString().slice(0, 10), log_type: 'note' as LogType, next_step: '', next_step_due: '' })
  const [logSaving, setLogSaving] = useState(false)
  const [showReassign, setShowReassign] = useState(false)
  const [reassignTarget, setReassignTarget] = useState('')
  const [reassignSuccess, setReassignSuccess] = useState(false)
  const [taskAssignees, setTaskAssignees] = useState<Record<string, string>>({})
  const [openTaskAssign, setOpenTaskAssign] = useState<string | null>(null)
  const [taskAssignSelect, setTaskAssignSelect] = useState<string>('')
  const [mainTab, setMainTab] = useState<'activity' | 'tasks' | 'cskh' | 'info' | 'checklist'>('info')
  const [infoForm, setInfoForm] = useState({ title: '', description: '', tour_date: '', tour_end_date: '', estimated_value: '', actual_value: '', source: '' as string, lost_reason: '' })
  const [infoSaving, setInfoSaving] = useState(false)
  const [infoSaved, setInfoSaved] = useState(false)
  const [showQR, setShowQR] = useState(false)
  const [qrCopied, setQrCopied] = useState(false)
  const [qrExporting, setQrExporting] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)
  const [taskDone, setTaskDone] = useState<Record<string, boolean>>({})
  const [addedTasks, setAddedTasks] = useState<{ id: string; title: string; due_date: string; assigned_to: string }[]>([])
  const [showNewTask, setShowNewTask] = useState(false)
  const [newTask, setNewTask] = useState({ title: '', due_date: '', assigned_to: '' })

  useEffect(() => {
    async function load() {
      const [{ data: oppData }, { data: logsData }, { data: tasksData }, { data: usersData }, { data: issuesData }] = await Promise.all([
        supabase.from('opportunities')
          .select('*, contact:contacts(id,name,phone,email,company,tax_code,organization_ids,source,lead_score,created_by,created_at), assigned_user:users!assigned_to(id,full_name), creator:users!created_by(id,full_name)')
          .eq('id', id)
          .single(),
        supabase.from('activity_logs')
          .select('*, user:users(id,full_name)')
          .eq('opportunity_id', id)
          .order('log_date', { ascending: false }),
        supabase.from('tasks')
          .select('*')
          .eq('opportunity_id', id)
          .order('created_at', { ascending: true }),
        supabase.from('users')
          .select('id, full_name, is_sale_tv, is_active')
          .eq('is_active', true),
        supabase.from('issues')
          .select('id, description, status, assigned_user:users!assigned_to(full_name), created_at')
          .eq('opportunity_id', id)
          .order('created_at', { ascending: false }),
      ])
      const o = oppData as OppDetail | null
      setOpp(o)
      if (o) setInfoForm({
        title: o.title ?? '',
        description: o.description ?? '',
        tour_date: o.tour_date ?? '',
        tour_end_date: (o as any).tour_end_date ?? '',
        estimated_value: o.estimated_value ? String(o.estimated_value) : '',
        actual_value: o.actual_value ? String(o.actual_value) : '',
        source: o.source ?? '',
        lost_reason: o.lost_reason ?? '',
      })
      setAllLogs((logsData ?? []) as LogDetail[])
      setTasks(tasksData ?? [])
      const users = (usersData ?? []) as UserMin[]
      setAllUsers(users)
      setSaleUsers(users.filter(u => u.is_sale_tv))
      setIssues((issuesData ?? []) as unknown as typeof issues)
      setLoading(false)
    }
    load()
  }, [id])

  useEffect(() => {
    if (!opp) return
    setBreadcrumb(
      <div className="flex items-center gap-1.5 text-xs text-gray-500">
        <Link href="/" className="hover:text-gray-700">Tổng quan</Link>
        <span className="text-gray-300">/</span>
        <Link href="/don-hang" className="hover:text-gray-700">Đơn hàng</Link>
        <span className="text-gray-300">/</span>
        <span className="text-gray-700 font-semibold truncate max-w-xs">{opp.title}</span>
      </div>
    )
    return () => setBreadcrumb(null)
  }, [opp?.title])

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="animate-spin text-gray-300" size={28} />
      </div>
    )
  }

  if (!opp) {
    return (
      <div className="p-12 text-center">
        <div className="text-5xl mb-4">🔍</div>
        <div className="text-lg font-semibold text-gray-700 mb-2">Không tìm thấy đơn hàng</div>
        <Link href="/don-hang" className="text-accent-500 hover:underline text-sm">← Quay lại Đơn hàng</Link>
      </div>
    )
  }

  const contact = opp.contact
  const assignedUser = opp.assigned_user
  const createdByUser = opp.creator
  const sc = STAGE_COLORS[opp.stage]
  const isLost = opp.stage === 'lost' || opp.stage === 'cancelled'
  const stageIndex = PIPELINE.indexOf(opp.stage as OppStage)

  const filteredLogs = logFilter === 'all'
    ? allLogs
    : allLogs.filter(l => l.log_type === (logFilter as LogType))

  const stageChanges = allLogs
    .filter(l => l.log_type === 'stage_change' && l.stage_from && l.stage_to)
    .sort((a, b) => new Date(a.log_date).getTime() - new Date(b.log_date).getTime())

  const stageHistory: { stage: OppStage; startDate: string; endDate: string | null; isCurrent: boolean }[] = []
  let cursor = opp.created_at
  let curStage: OppStage = 'stage_1'
  for (const chg of stageChanges) {
    stageHistory.push({ stage: curStage, startDate: cursor, endDate: chg.log_date, isCurrent: false })
    cursor = chg.log_date
    curStage = chg.stage_to!
  }
  stageHistory.push({ stage: curStage, startDate: cursor, endDate: null, isCurrent: true })

  const doneTasks = tasks.filter(t => taskDone[t.id] !== undefined ? taskDone[t.id] : t.is_done).length
  const daysInStage = daysSince(opp.stage_updated_at)
  const daysToTour = opp.tour_date ? daysUntil(opp.tour_date) : null
  const daysToDeadline = opp.deadline ? daysUntil(opp.deadline) : null

  const effectiveAssigneeId = reassignSuccess && reassignTarget ? reassignTarget : (opp.assigned_to ?? '')
  const effectiveAssignedUser = reassignTarget && reassignSuccess
    ? allUsers.find(u => u.id === effectiveAssigneeId) ?? assignedUser
    : assignedUser

  return (
    <div className="flex flex-col h-screen overflow-hidden">

      {/* ─── HEADER ───────────────────────────────────────────── */}
      <div className="px-6 py-4 border-b border-gray-200 bg-white flex-shrink-0">
        <div className="flex items-start gap-3">
          <Link href="/don-hang" className="mt-1 p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors flex-shrink-0">
            <ArrowLeft size={18} />
          </Link>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap mb-1.5">
              <h1 className="text-xl font-bold text-gray-900">{opp.title}</h1>
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${sc.bg} ${sc.text}`}>
                {STAGE_LABELS[opp.stage]}
              </span>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${SOURCE_COLORS[opp.source]}`}>
                {SOURCE_LABELS[opp.source]}
              </span>
            </div>
            {opp.description && (
              <p className="text-sm text-gray-500 max-w-2xl line-clamp-1">{opp.description}</p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {!isLost && stageIndex >= 0 && stageIndex < PIPELINE.length - 1 && (
              <button className="flex items-center gap-1.5 bg-accent-500 hover:bg-accent-600 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors">
                Chuyển giai đoạn <ArrowRight size={14} />
              </button>
            )}
            {!isLost && (
              <button className="px-3 py-2 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-sm font-medium transition-colors">
                Mất đơn
              </button>
            )}
          </div>
        </div>

        {/* Stage progress bar */}
        {!isLost ? (
          <div className="flex items-center mt-4 ml-10">
            {PIPELINE.map((s, i) => {
              const isActive = i === stageIndex
              const isDone = i < stageIndex
              const ss = STAGE_COLORS[s]
              return (
                <div key={s} className="flex items-center">
                  <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                    isActive ? `${ss.bg} ${ss.text} ring-2 ring-current ring-offset-1 shadow-sm`
                    : isDone ? 'bg-emerald-50 text-emerald-600'
                    : 'bg-gray-50 text-gray-300'
                  }`}>
                    {isDone ? <span className="text-emerald-500">✓</span> : (
                      <span className={`w-1.5 h-1.5 rounded-full ${isActive ? ss.dot : 'bg-gray-300'}`} />
                    )}
                    {STAGE_LABELS[s]}
                  </div>
                  {i < PIPELINE.length - 1 && (
                    <div className={`w-6 h-0.5 ${isDone ? 'bg-emerald-300' : 'bg-gray-200'}`} />
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          <div className="mt-4 ml-10">
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-semibold">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              Đã mất đơn · {opp.lost_reason ? 'có ghi lý do' : 'không rõ lý do'}
            </span>
          </div>
        )}

        {/* Key stats strip */}
        <div className="flex items-center gap-4 mt-4 ml-10 flex-wrap">
          {effectiveAssignedUser && (
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <User size={12} className="text-gray-400" />
              <span>Sale TV: <span className="font-semibold text-gray-700">{effectiveAssignedUser.full_name}</span></span>
            </div>
          )}
          {opp.estimated_value && (
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <DollarSign size={12} className="text-gray-400" />
              <span>Giá trị: <span className="font-bold text-gray-800">{formatVND(opp.estimated_value)}</span></span>
            </div>
          )}
          {daysToTour !== null && (
            <div className={`flex items-center gap-1.5 text-xs font-medium ${daysToTour <= 0 ? 'text-emerald-600' : daysToTour <= 14 ? 'text-amber-600' : 'text-gray-500'}`}>
              <CalendarDays size={12} />
              Tour {formatDate(opp.tour_date!)}
              {daysToTour > 0 ? <span className="opacity-70">· còn {daysToTour} ngày</span> : <span className="text-emerald-600">· đang diễn ra</span>}
            </div>
          )}
          {daysToDeadline !== null && (
            <div className={`flex items-center gap-1.5 text-xs font-medium ${daysToDeadline < 0 ? 'text-red-600' : daysToDeadline <= 5 ? 'text-red-500' : daysToDeadline <= 14 ? 'text-amber-500' : 'text-gray-500'}`}>
              <Clock size={12} />
              Deadline {formatDate(opp.deadline!)}
              {daysToDeadline >= 0
                ? <span className="opacity-80">· còn {daysToDeadline} ngày</span>
                : <span>· quá hạn {Math.abs(daysToDeadline)} ngày</span>}
            </div>
          )}
        </div>
      </div>

      {/* ─── BODY ─────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto bg-gray-50/80">
        <div className="p-5 grid grid-cols-3 gap-5 max-w-[1400px] mx-auto">

          {/* ── LEFT: Tabbed (Activity / Tasks) ───────── */}
          <div className="col-span-2 space-y-4">

            <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-2xl p-1 shadow-sm">
              <button
                onClick={() => setMainTab('info')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  mainTab === 'info' ? 'bg-accent-500 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-50'
                }`}
              >
                <DollarSign size={15} /> Thông tin đơn
              </button>
              <button
                onClick={() => setMainTab('activity')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  mainTab === 'activity' ? 'bg-accent-500 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-50'
                }`}
              >
                <MessageSquare size={15} /> Hoạt động
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${mainTab === 'activity' ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-500'}`}>
                  {allLogs.length}
                </span>
              </button>
              <button
                onClick={() => setMainTab('tasks')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  mainTab === 'tasks' ? 'bg-accent-500 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-50'
                }`}
              >
                <ClipboardList size={15} /> Công việc & Giao việc
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${mainTab === 'tasks' ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-500'}`}>
                  {tasks.length + addedTasks.length}
                </span>
              </button>
              <button
                onClick={() => setMainTab('cskh')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  mainTab === 'cskh' ? 'bg-accent-500 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-50'
                }`}
              >
                <AlertCircle size={15} /> CSKH
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${mainTab === 'cskh' ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-500'}`}>
                  {issues.length}
                </span>
              </button>
            </div>

            {/* ══════════ HOẠT ĐỘNG TAB ══════════ */}
            {mainTab === 'activity' && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
                <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
                  {LOG_FILTERS.map(({ key, label }) => (
                    <button key={key} onClick={() => setLogFilter(key)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        logFilter === key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                      }`}>
                      {label}
                      {key !== 'all' && (
                        <span className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full ${
                          logFilter === key ? 'bg-brand-100 text-accent-500' : 'bg-gray-200 text-gray-500'
                        }`}>
                          {allLogs.filter(l => l.log_type === key).length}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
                <span className="text-xs text-gray-400">{filteredLogs.length} / {allLogs.length} log</span>
              </div>

              <div className="p-5">
                {filteredLogs.length === 0 && (
                  <div className="text-center text-gray-400 py-8 text-sm">Chưa có hoạt động nào</div>
                )}
                {filteredLogs.map((log, i) => {
                  const logUser = log.user
                  const logSc = STAGE_COLORS[log.stage_at_log]
                  const isStageChange = log.log_type === 'stage_change'
                  return (
                    <div key={log.id} className="flex gap-4 group">
                      <div className="flex flex-col items-center flex-shrink-0">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center mt-1 flex-shrink-0 transition-transform group-hover:scale-110 ${
                          isStageChange ? `${logSc.dot} text-white` : 'bg-gray-100 text-gray-400'
                        }`}>
                          {isStageChange ? <ArrowRight size={13} strokeWidth={2.5} /> : <MessageSquare size={12} />}
                        </div>
                        {i < filteredLogs.length - 1 && (
                          <div className="w-0.5 bg-gray-100 flex-1 my-1 min-h-[20px]" />
                        )}
                      </div>
                      <div className={`flex-1 ${i < filteredLogs.length - 1 ? 'pb-5' : 'pb-2'}`}>
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          {logUser && (
                            <div className="flex items-center gap-1.5">
                              <div className="w-5 h-5 bg-slate-200 rounded-full flex items-center justify-center text-[10px] font-bold text-slate-600">
                                {getInitials(logUser.full_name)}
                              </div>
                              <span className="text-sm font-semibold text-gray-800">{logUser.full_name}</span>
                            </div>
                          )}
                          <span className="text-xs text-gray-400">·</span>
                          <span className="text-xs text-gray-400">{formatDate(log.log_date)}</span>
                          {isStageChange && log.stage_from && log.stage_to && (
                            <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full ${logSc.bg} ${logSc.text}`}>
                              {STAGE_LABELS[log.stage_from].split(' · ')[0]}
                              <ArrowRight size={10} />
                              {STAGE_LABELS[log.stage_to].split(' · ')[0]}
                            </span>
                          )}
                        </div>
                        <div className={`text-sm text-gray-700 leading-relaxed rounded-xl p-3.5 ${
                          isStageChange ? `${logSc.bg} border ${logSc.border}` : 'bg-gray-50 border border-gray-100'
                        }`}>
                          {log.description}
                        </div>
                        {log.next_step && (
                          <div className="flex items-start gap-2 mt-2 text-xs">
                            <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold whitespace-nowrap flex-shrink-0">Bước tiếp</span>
                            <span className="text-gray-600">
                              {log.next_step}
                              {log.next_step_due && <span className="text-gray-400"> · trước {formatDate(log.next_step_due)}</span>}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              {(() => {
                async function handleSaveLog() {
                  if (!logForm.description.trim()) return
                  setLogSaving(true)
                  const { data: { user: authUser } } = await supabase.auth.getUser()
                  if (!authUser) { setLogSaving(false); return }
                  const { data } = await supabase.from('activity_logs').insert({
                    opportunity_id: id,
                    user_id: authUser.id,
                    log_type: logForm.log_type,
                    log_date: logForm.log_date || new Date().toISOString().slice(0, 10),
                    description: logForm.description.trim(),
                    next_step: logForm.next_step.trim() || null,
                    next_step_due: logForm.next_step_due || null,
                    stage_at_log: opp?.stage ?? 'stage_1',
                  }).select('*, user:users(id,full_name)').single()
                  setLogSaving(false)
                  if (data) {
                    setAllLogs(prev => [data as LogDetail, ...prev])
                    setLogForm({ description: '', log_date: new Date().toISOString().slice(0, 10), log_type: 'note', next_step: '', next_step_due: '' })
                  }
                }
                return (
                  <div className="mx-5 mb-5 rounded-xl border border-dashed border-brand-200 bg-brand-50/40 p-4">
                    <div className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                      <Plus size={14} className="text-accent-500" />
                      Thêm log hoạt động
                    </div>
                    <textarea
                      value={logForm.description}
                      onChange={e => setLogForm(f => ({ ...f, description: e.target.value }))}
                      className="w-full text-sm border border-gray-200 rounded-xl p-3 resize-none focus:outline-none focus:ring-2 focus:ring-brand-400 bg-white placeholder-gray-400 shadow-sm"
                      placeholder="Ghi lại kết quả cuộc gọi, thông tin mới từ khách, vấn đề phát sinh..."
                      rows={3}
                    />
                    <input
                      type="text"
                      value={logForm.next_step}
                      onChange={e => setLogForm(f => ({ ...f, next_step: e.target.value }))}
                      placeholder="Bước tiếp theo (tuỳ chọn)..."
                      className="w-full mt-2 text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-400 bg-white placeholder-gray-400 shadow-sm"
                    />
                    <div className="flex items-center justify-between mt-3 gap-2 flex-wrap">
                      <div className="flex items-center gap-2 flex-wrap">
                        <input
                          type="date"
                          value={logForm.log_date}
                          onChange={e => setLogForm(f => ({ ...f, log_date: e.target.value }))}
                          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-400 bg-white shadow-sm"
                        />
                        <select
                          value={logForm.log_type}
                          onChange={e => setLogForm(f => ({ ...f, log_type: e.target.value as LogType }))}
                          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-400 bg-white text-gray-600 shadow-sm"
                        >
                          <option value="note">Ghi chú</option>
                          <option value="sale_update">Cập nhật sale</option>
                          <option value="cskh_care">Chăm sóc KH</option>
                        </select>
                        {logForm.next_step && (
                          <input
                            type="date"
                            value={logForm.next_step_due}
                            onChange={e => setLogForm(f => ({ ...f, next_step_due: e.target.value }))}
                            placeholder="Deadline bước tiếp"
                            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-400 bg-white shadow-sm"
                          />
                        )}
                      </div>
                      <button
                        onClick={handleSaveLog}
                        disabled={!logForm.description.trim() || logSaving}
                        className="bg-accent-500 hover:bg-accent-600 text-white px-5 py-1.5 rounded-lg text-sm font-semibold transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {logSaving ? 'Đang lưu...' : 'Lưu log'}
                      </button>
                    </div>
                  </div>
                )
              })()}
            </div>
            )}

            {/* ══════════ CÔNG VIỆC TAB ══════════ */}
            {mainTab === 'tasks' && (() => {
              const allTasksCombined = [
                ...tasks.map(t => ({
                  id: t.id, title: t.title, due_date: t.due_date ?? '',
                  assigned_to: taskAssignees[t.id] ?? t.assigned_to ?? '',
                  is_done: taskDone[t.id] !== undefined ? taskDone[t.id] : t.is_done,
                  stage: t.stage, isNew: false,
                })),
                ...addedTasks.map(t => ({
                  id: t.id, title: t.title, due_date: t.due_date,
                  assigned_to: t.assigned_to, is_done: taskDone[t.id] ?? false,
                  stage: 99, isNew: true,
                })),
              ]
              const doneCount = allTasksCombined.filter(t => t.is_done).length
              const pct = allTasksCombined.length > 0 ? Math.round((doneCount / allTasksCombined.length) * 100) : 0

              return (
                <div className="space-y-4">
                  <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <span className="text-sm font-bold text-gray-900">{doneCount}/{allTasksCombined.length} nhiệm vụ hoàn thành</span>
                        <span className="text-xs text-gray-400 ml-2">({pct}%)</span>
                      </div>
                      <button onClick={() => setShowNewTask(true)}
                        className="flex items-center gap-1.5 bg-accent-500 hover:bg-accent-600 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors">
                        <Plus size={14} /> Thêm nhiệm vụ
                      </button>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-2 bg-brand-500 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                    </div>
                  </div>

                  {showNewTask && (
                    <div className="bg-white rounded-2xl border-2 border-brand-200 shadow-sm p-5">
                      <div className="flex items-center justify-between mb-4">
                        <span className="font-bold text-brand-700 text-sm">Thêm nhiệm vụ mới</span>
                        <button onClick={() => setShowNewTask(false)}><X size={16} className="text-gray-400" /></button>
                      </div>
                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <div className="col-span-2">
                          <label className="block text-xs font-semibold text-gray-500 mb-1">Tên nhiệm vụ <span className="text-red-400">*</span></label>
                          <input type="text" placeholder="VD: Liên hệ xác nhận danh sách khách"
                            value={newTask.title} onChange={e => setNewTask(t => ({ ...t, title: e.target.value }))}
                            className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-400 bg-white" />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 mb-1">Deadline</label>
                          <input type="date" value={newTask.due_date} onChange={e => setNewTask(t => ({ ...t, due_date: e.target.value }))}
                            className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-400 bg-white" />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 mb-1">Giao cho</label>
                          <select value={newTask.assigned_to} onChange={e => setNewTask(t => ({ ...t, assigned_to: e.target.value }))}
                            className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-400 bg-white text-gray-700">
                            <option value="">— Chưa giao —</option>
                            {allUsers.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
                          </select>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => {
                          if (!newTask.title.trim()) return
                          setAddedTasks(prev => [...prev, { id: `local-${Date.now()}`, ...newTask }])
                          setNewTask({ title: '', due_date: '', assigned_to: '' })
                          setShowNewTask(false)
                        }} className="flex-1 bg-accent-500 hover:bg-accent-600 text-white py-2 rounded-xl text-sm font-bold transition-colors">
                          Thêm nhiệm vụ
                        </button>
                        <button onClick={() => setShowNewTask(false)} className="px-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-500 hover:bg-gray-50">Huỷ</button>
                      </div>
                    </div>
                  )}

                  {allTasksCombined.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-10 text-center">
                      <ClipboardList size={32} className="text-gray-200 mx-auto mb-3" />
                      <div className="text-sm font-semibold text-gray-400 mb-1">Chưa có nhiệm vụ nào</div>
                      <button onClick={() => setShowNewTask(true)}
                        className="inline-flex items-center gap-2 bg-accent-500 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-accent-600 transition-colors mt-4">
                        <Plus size={14} /> Thêm nhiệm vụ đầu tiên
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {allTasksCombined.map(task => {
                        const assigneeUser = task.assigned_to ? allUsers.find(u => u.id === task.assigned_to) : null
                        const isAssigning = openTaskAssign === task.id
                        return (
                          <div key={task.id} className={`bg-white rounded-2xl border shadow-sm transition-all ${
                            task.is_done ? 'border-gray-100 opacity-70' : 'border-gray-200 hover:border-brand-200 hover:shadow-md'
                          }`}>
                            <div className="p-4">
                              <div className="flex items-start gap-3 mb-3">
                                <button onClick={() => setTaskDone(prev => ({ ...prev, [task.id]: !task.is_done }))}
                                  className="mt-0.5 flex-shrink-0 transition-transform hover:scale-110">
                                  {task.is_done
                                    ? <CheckSquare size={18} className="text-emerald-500" />
                                    : <Square size={18} className="text-gray-300 hover:text-brand-400" />}
                                </button>
                                <div className="flex-1 min-w-0">
                                  <span className={`text-sm font-semibold ${task.is_done ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                                    {task.title}
                                  </span>
                                  {task.due_date && (
                                    <span className={`ml-2 text-xs font-medium ${task.is_done ? 'text-gray-300' : 'text-amber-500'}`}>
                                      · Hạn {formatDate(task.due_date)}
                                    </span>
                                  )}
                                </div>
                              </div>
                              {!task.is_done && (
                                <div className="ml-9 flex items-center gap-2">
                                  <span className="text-xs text-gray-400 font-medium flex-shrink-0">Người thực hiện:</span>
                                  {isAssigning ? (
                                    <div className="flex items-center gap-2 flex-1">
                                      <select value={taskAssignSelect} onChange={e => setTaskAssignSelect(e.target.value)}
                                        className="flex-1 text-xs border border-brand-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-400 bg-white text-gray-700">
                                        <option value="">— Chưa giao —</option>
                                        {allUsers.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
                                      </select>
                                      <button onClick={() => { setTaskAssignees(prev => ({ ...prev, [task.id]: taskAssignSelect })); setOpenTaskAssign(null) }}
                                        className="flex items-center gap-1 bg-accent-500 hover:bg-accent-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex-shrink-0">
                                        <CheckCircle2 size={12} /> Lưu
                                      </button>
                                      <button onClick={() => setOpenTaskAssign(null)} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 flex-shrink-0">
                                        <X size={12} />
                                      </button>
                                    </div>
                                  ) : assigneeUser ? (
                                    <button onClick={() => { setOpenTaskAssign(task.id); setTaskAssignSelect(task.assigned_to) }}
                                      className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-brand-50 border border-brand-200 hover:bg-brand-100 transition-colors">
                                      <div className="w-5 h-5 rounded-full bg-brand-500 flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0">
                                        {getInitials(assigneeUser.full_name)}
                                      </div>
                                      <span className="text-xs font-semibold text-brand-700">{assigneeUser.full_name}</span>
                                      <Pencil size={11} className="text-brand-400" />
                                    </button>
                                  ) : (
                                    <button onClick={() => { setOpenTaskAssign(task.id); setTaskAssignSelect('') }}
                                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border-2 border-dashed border-brand-300 hover:border-indigo-400 hover:bg-brand-50 text-brand-500 hover:text-brand-700 text-xs font-bold transition-all">
                                      <UserPlus size={13} /> Giao việc cho nhân viên
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })()}

            {/* ══════════ CSKH TAB ══════════ */}
            {mainTab === 'cskh' && (() => {
              async function handleCreateIssue() {
                if (!issueDesc.trim()) return
                setIssueSaving(true)
                const { data: { user: authUser } } = await supabase.auth.getUser()
                if (!authUser) { setIssueSaving(false); return }
                const { data } = await supabase.from('issues').insert({
                  opportunity_id: id,
                  description: issueDesc.trim(),
                  status: 'open',
                  created_by: authUser.id,
                }).select('id, description, status, assigned_user:users!assigned_to(full_name), created_at').single()
                setIssueSaving(false)
                if (data) {
                  setIssues(prev => [data as any, ...prev])
                  setIssueDesc('')
                  setShowIssueForm(false)
                }
              }
              return (
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900 text-sm">Issues CSKH</h3>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => { setShowIssueForm(v => !v); setIssueDesc('') }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-semibold transition-colors"
                      >
                        <PlusCircle size={13} /> Tạo issue
                      </button>
                      <button
                        onClick={() => setShowQR(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-brand-300 text-brand-600 hover:bg-brand-50 text-sm font-semibold transition-colors"
                      >
                        <QrCode size={13} /> QR phản hồi
                      </button>
                      <Link href="/cskh" className="text-xs text-brand-600 hover:underline font-medium">Xem tất cả →</Link>
                    </div>
                  </div>

                  {showIssueForm && (
                    <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/60">
                      <textarea
                        value={issueDesc}
                        onChange={e => setIssueDesc(e.target.value)}
                        placeholder="Mô tả issue..."
                        rows={3}
                        autoFocus
                        className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 resize-none bg-white"
                      />
                      <div className="flex justify-end gap-2 mt-2">
                        <button onClick={() => { setShowIssueForm(false); setIssueDesc('') }}
                          className="px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-100 rounded-lg transition-colors">Huỷ</button>
                        <button onClick={handleCreateIssue} disabled={!issueDesc.trim() || issueSaving}
                          className="px-4 py-1.5 text-sm font-semibold bg-accent-500 text-white rounded-lg hover:bg-accent-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                          {issueSaving ? 'Đang lưu...' : 'Tạo issue'}
                        </button>
                      </div>
                    </div>
                  )}

                  {issues.length === 0 && !showIssueForm ? (
                    <div className="py-12 text-center">
                      <AlertCircle size={32} className="text-gray-200 mx-auto mb-3" />
                      <p className="text-sm text-gray-400">Chưa có issue nào cho đơn hàng này</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {issues.map(issue => {
                        const cfg = issue.status === 'resolved'
                          ? { icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50', label: 'Đã giải quyết' }
                          : issue.status === 'processing'
                            ? { icon: ClockIcon, color: 'text-blue-600', bg: 'bg-blue-50', label: 'Đang xử lý' }
                            : { icon: AlertCircle, color: 'text-amber-600', bg: 'bg-amber-50', label: 'Mở' }
                        const Icon = cfg.icon
                        return (
                          <div key={issue.id} className="px-5 py-4 hover:bg-gray-50 transition-colors">
                            <div className="flex items-start gap-3">
                              <Icon size={16} className={`${cfg.color} flex-shrink-0 mt-0.5`} />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-gray-800 leading-relaxed">{issue.description}</p>
                                <div className="flex items-center gap-2 mt-2">
                                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
                                  {issue.assigned_user && (
                                    <span className="text-xs text-gray-400">→ {issue.assigned_user.full_name}</span>
                                  )}
                                  <span className="text-xs text-gray-300">{formatDate(issue.created_at)}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })()}

            {/* ══════════ THÔNG TIN ĐƠN TAB ══════════ */}
            {mainTab === 'info' && (() => {
              async function handleInfoSave() {
                setInfoSaving(true)
                await supabase.from('opportunities').update({
                  title: infoForm.title.trim() || undefined,
                  description: infoForm.description.trim() || null,
                  tour_date: infoForm.tour_date || null,
                  tour_end_date: infoForm.tour_end_date || null,
                  estimated_value: infoForm.estimated_value ? Number(infoForm.estimated_value) : null,
                  actual_value: infoForm.actual_value ? Number(infoForm.actual_value) : null,
                  source: infoForm.source || undefined,
                  lost_reason: infoForm.lost_reason.trim() || null,
                }).eq('id', id)
                setInfoSaving(false)
                setInfoSaved(true)
                setOpp(prev => prev ? { ...prev, ...infoForm, estimated_value: infoForm.estimated_value ? Number(infoForm.estimated_value) : undefined, actual_value: infoForm.actual_value ? Number(infoForm.actual_value) : undefined } as OppDetail : prev)
                setTimeout(() => setInfoSaved(false), 2000)
              }
              const iField = 'w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-400'
              const SOURCES_LIST = [
                { value: 'mkt', label: 'Marketing' }, { value: 'sale', label: 'Sale' },
                { value: 'partner', label: 'Đối tác' }, { value: 'bod', label: 'Ban GĐ' },
                { value: 'cskh', label: 'CSKH' }, { value: 'referral', label: 'Giới thiệu' }, { value: 'test', label: 'Test' },
              ]
              return (
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900 text-sm">Thông tin đơn hàng</h3>
                    <button
                      onClick={handleInfoSave}
                      disabled={infoSaving}
                      className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-accent-500 hover:bg-accent-600 disabled:opacity-60 text-white text-sm font-semibold transition-colors"
                    >
                      {infoSaving ? <Loader2 size={13} className="animate-spin" /> : infoSaved ? <CheckCircle2 size={13} /> : <Pencil size={13} />}
                      {infoSaved ? 'Đã lưu!' : 'Cập nhật'}
                    </button>
                  </div>
                  <div className="px-5 py-4 space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Tên đơn hàng</label>
                      <input value={infoForm.title} onChange={e => setInfoForm(f => ({ ...f, title: e.target.value }))} className={iField} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Điểm đến</label>
                      <input value={infoForm.description} onChange={e => setInfoForm(f => ({ ...f, description: e.target.value }))} placeholder="VD: Đà Nẵng, Nhật Bản..." className={iField} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Ngày đi</label>
                        <input type="date" value={infoForm.tour_date} onChange={e => setInfoForm(f => ({ ...f, tour_date: e.target.value }))} className={iField} />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Ngày về</label>
                        <input type="date" value={infoForm.tour_end_date} onChange={e => setInfoForm(f => ({ ...f, tour_end_date: e.target.value }))} className={iField} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Giá trị ước tính (VNĐ)</label>
                        <input type="number" value={infoForm.estimated_value} onChange={e => setInfoForm(f => ({ ...f, estimated_value: e.target.value }))} placeholder="0" className={iField} />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Doanh thu thực tế (VNĐ)</label>
                        <input type="number" value={infoForm.actual_value} onChange={e => setInfoForm(f => ({ ...f, actual_value: e.target.value }))} placeholder="0" className={iField} />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Nguồn</label>
                      <select value={infoForm.source} onChange={e => setInfoForm(f => ({ ...f, source: e.target.value }))} className={iField}>
                        {SOURCES_LIST.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                      </select>
                    </div>
                    {(opp.stage === 'lost' || opp.stage === 'cancelled') && (
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Lý do mất / hủy</label>
                        <textarea rows={3} value={infoForm.lost_reason} onChange={e => setInfoForm(f => ({ ...f, lost_reason: e.target.value }))} placeholder="Mô tả lý do..." className={`${iField} resize-none`} />
                      </div>
                    )}
                  </div>
                </div>
              )
            })()}

          </div>

          {/* ── RIGHT: Info sidebar ────────────── */}
          <div className="space-y-4">

            {/* Status Card */}
            <div className={`rounded-2xl border shadow-sm overflow-hidden ${sc.border} ${sc.bg}`}>
              <div className={`px-5 py-4 border-b ${sc.border}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-xs font-bold uppercase tracking-wider ${sc.text} opacity-70`}>Trạng thái hiện tại</span>
                  {!isLost && <span className={`text-xs ${sc.text} opacity-60`}>GĐ {stageIndex + 1}/5</span>}
                </div>
                <div className={`text-lg font-black ${sc.text}`}>{STAGE_LABELS[opp.stage]}</div>
                <div className={`text-xs mt-0.5 ${sc.text} opacity-70`}>
                  Đã ở giai đoạn này {Math.abs(daysInStage)} ngày
                  {opp.stage_updated_at && ` · từ ${formatDate(opp.stage_updated_at.split('T')[0])}`}
                </div>
              </div>
              <div className="px-5 py-4 space-y-2.5">
                {daysToTour !== null && (
                  <div className="flex items-center justify-between text-sm">
                    <span className={`${sc.text} opacity-80 flex items-center gap-1.5 text-xs`}><CalendarDays size={13} /> Ngày tour</span>
                    <span className={`font-bold text-sm ${sc.text}`}>{daysToTour <= 0 ? '🟢 Đang diễn ra' : `${daysToTour} ngày nữa`}</span>
                  </div>
                )}
                {daysToDeadline !== null && (
                  <div className="flex items-center justify-between">
                    <span className={`${sc.text} opacity-80 flex items-center gap-1.5 text-xs`}><Clock size={13} /> Deadline</span>
                    <span className={`font-bold text-sm ${daysToDeadline < 0 ? 'text-red-600' : daysToDeadline <= 5 ? 'text-red-500' : sc.text}`}>
                      {daysToDeadline < 0 ? `⚠ Quá hạn ${Math.abs(daysToDeadline)}N` : daysToDeadline <= 5 ? `⏰ Còn ${daysToDeadline} ngày` : `Còn ${daysToDeadline} ngày`}
                    </span>
                  </div>
                )}
                {opp.estimated_value && (
                  <div className="flex items-center justify-between pt-2 border-t" style={{ borderColor: 'rgba(0,0,0,0.08)' }}>
                    <span className={`${sc.text} opacity-80 flex items-center gap-1.5 text-xs`}><DollarSign size={13} /> Giá trị</span>
                    <span className={`font-black text-sm ${sc.text}`}>{formatVND(opp.estimated_value)}</span>
                  </div>
                )}
              </div>
              {isLost && opp.lost_reason && (
                <div className="px-5 pb-4">
                  <div className="text-xs font-bold text-red-600 mb-1">Lý do mất đơn</div>
                  <div className="text-xs text-red-700 bg-white/60 rounded-lg p-3 leading-relaxed border border-red-200">{opp.lost_reason}</div>
                </div>
              )}
            </div>

            {/* Stage History */}
            {stageHistory.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-5 py-3.5 border-b border-gray-100">
                  <h3 className="font-semibold text-gray-900 text-sm">Lịch sử giai đoạn</h3>
                </div>
                <div className="p-4 space-y-0">
                  {stageHistory.map(({ stage, startDate, endDate, isCurrent }, i) => {
                    const hSc = STAGE_COLORS[stage]
                    const durationDays = endDate
                      ? Math.round((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000)
                      : daysSince(startDate)
                    return (
                      <div key={i} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <div className={`w-3 h-3 rounded-full mt-1 flex-shrink-0 ${isCurrent ? hSc.dot : 'bg-emerald-400'}`} />
                          {i < stageHistory.length - 1 && <div className="w-0.5 bg-gray-200 flex-1 my-1 min-h-[14px]" />}
                        </div>
                        <div className={`flex-1 pb-3 ${i === stageHistory.length - 1 ? 'pb-1' : ''}`}>
                          <div className="flex items-center justify-between">
                            <span className={`text-xs font-semibold ${isCurrent ? hSc.text : 'text-gray-500'}`}>
                              {STAGE_LABELS[stage]}
                              {isCurrent && <span className="ml-1.5 text-[10px] font-bold bg-current text-white px-1.5 py-0.5 rounded-full opacity-80">Hiện tại</span>}
                            </span>
                            <span className="text-[11px] text-gray-400">{durationDays} ngày</span>
                          </div>
                          <div className="text-[11px] text-gray-400 mt-0.5">
                            {formatDate(startDate.split('T')[0])}{endDate ? ` → ${formatDate(endDate.split('T')[0])}` : ' → nay'}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Contact */}
            {contact && (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-5 py-3.5 border-b border-gray-100">
                  <h3 className="font-semibold text-gray-900 text-sm">Khách hàng</h3>
                </div>
                <div className="p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-brand-100 rounded-full flex items-center justify-center text-sm font-bold text-brand-700 flex-shrink-0">
                      {getInitials(contact.name)}
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900 text-sm">{contact.name}</div>
                      {contact.company && <div className="text-xs text-gray-400">{contact.company}</div>}
                    </div>
                  </div>
                  <div className="space-y-2 text-sm">
                    {contact.phone && (
                      <div className="flex items-center gap-2.5 text-gray-600">
                        <Phone size={13} className="text-gray-400 flex-shrink-0" /><span>{contact.phone}</span>
                      </div>
                    )}
                    {contact.email && (
                      <div className="flex items-center gap-2.5 text-gray-600 min-w-0">
                        <Mail size={13} className="text-gray-400 flex-shrink-0" />
                        <span className="truncate text-xs">{contact.email}</span>
                      </div>
                    )}
                    {contact.company && (
                      <div className="flex items-center gap-2.5 text-gray-600">
                        <Building2 size={13} className="text-gray-400 flex-shrink-0" />
                        <span className="text-xs">{contact.company}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Deal Info */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-semibold text-gray-900 text-sm">Thông tin đơn hàng</h3>
                {reassignSuccess && (
                  <span className="flex items-center gap-1 text-xs text-emerald-600 font-semibold">
                    <CheckCircle2 size={12} /> Đã cập nhật
                  </span>
                )}
              </div>
              <div className="p-5 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-gray-400 text-xs whitespace-nowrap">Sale phụ trách</span>
                  {showReassign ? (
                    <div className="flex items-center gap-1.5">
                      <select value={reassignTarget || effectiveAssigneeId}
                        onChange={e => setReassignTarget(e.target.value)}
                        className="text-xs border border-brand-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-brand-400 bg-white text-gray-700">
                        {saleUsers.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
                      </select>
                      <button onClick={() => {
                        if (reassignTarget) { setReassignSuccess(true); setTimeout(() => setReassignSuccess(false), 3000) }
                        setShowReassign(false); setReassignTarget('')
                      }} className="p-1 rounded-lg bg-accent-500 text-white hover:bg-accent-600 transition-colors">
                        <CheckCircle2 size={13} />
                      </button>
                      <button onClick={() => { setShowReassign(false); setReassignTarget('') }}
                        className="p-1 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors">
                        <X size={13} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-xs text-gray-800">{effectiveAssignedUser?.full_name ?? '—'}</span>
                      <button onClick={() => { setShowReassign(true); setReassignTarget(effectiveAssigneeId) }}
                        className="p-1 rounded-md text-gray-300 hover:text-accent-500 hover:bg-brand-50 transition-colors" title="Đổi Sale TV">
                        <Pencil size={11} />
                      </button>
                    </div>
                  )}
                </div>
                <InfoRow label="Người tạo" value={createdByUser?.full_name} />
                <InfoRow label="Ngày tạo" value={formatDate(opp.created_at)} />
                {opp.tour_date && <InfoRow label="Ngày tour" value={formatDate(opp.tour_date)} highlight />}
                {opp.deadline && <InfoRow label="Deadline" value={formatDate(opp.deadline)} warn />}
                <div className="border-t border-gray-100 pt-2.5 space-y-2.5">
                  <InfoRow label="Giá trị ước tính" value={opp.estimated_value ? formatVND(opp.estimated_value) : '—'} />
                  {opp.actual_value && <InfoRow label="Doanh thu thực tế" value={formatVND(opp.actual_value)} highlight />}
                </div>
              </div>
            </div>

            {tasks.length > 0 && (
              <button onClick={() => setMainTab('tasks')}
                className="w-full flex items-center justify-between px-4 py-3 bg-brand-50 border border-brand-200 rounded-2xl hover:bg-brand-100 transition-colors">
                <div className="flex items-center gap-2 text-brand-700">
                  <ClipboardList size={14} />
                  <span className="text-xs font-semibold">{doneTasks}/{tasks.length} nhiệm vụ hoàn thành</span>
                </div>
                <span className="text-xs text-brand-500 font-semibold">Xem & giao việc →</span>
              </button>
            )}

            {/* Issues liên quan */}
            {issues.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900 text-sm">Issues liên quan</h3>
                  <button onClick={() => setMainTab('cskh')} className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 hover:bg-amber-100 transition-colors">{issues.length}</button>
                </div>
                <div className="divide-y divide-gray-100">
                  {issues.map(issue => {
                    const cfg = issue.status === 'resolved'
                      ? { icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-50', label: 'Đã giải quyết' }
                      : issue.status === 'processing'
                        ? { icon: ClockIcon, color: 'text-blue-500', bg: 'bg-blue-50', label: 'Đang xử lý' }
                        : { icon: AlertCircle, color: 'text-amber-500', bg: 'bg-amber-50', label: 'Mở' }
                    const Icon = cfg.icon
                    return (
                      <div key={issue.id} className="px-4 py-3 hover:bg-gray-50 transition-colors">
                        <div className="flex items-start gap-2.5">
                          <Icon size={14} className={`${cfg.color} flex-shrink-0 mt-0.5`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-gray-700 leading-relaxed line-clamp-2">{issue.description}</p>
                            <div className="flex items-center gap-2 mt-1.5">
                              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
                              {issue.assigned_user && (
                                <span className="text-[10px] text-gray-400">{issue.assigned_user.full_name}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* ── QR Modal ────────────────────────────────── */}
      {showQR && (() => {
        const FORM_BASE = 'https://docs.google.com/forms/d/e/1FAIpQLSeUYq35cA5hKdlaVXfd-WtVsz6OFeuowhFooDpSFbz_9Eod6g/viewform'
        const prefillUrl = `${FORM_BASE}?usp=pp_url&entry.1268900434=${encodeURIComponent(opp.title)}&entry.892405342=${encodeURIComponent(opp.description ?? '')}`
        const qrImgUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=0&data=${encodeURIComponent(prefillUrl)}`

        async function handleExport() {
          if (!cardRef.current) return
          setQrExporting(true)
          const html2canvas = (await import('html2canvas')).default
          const canvas = await html2canvas(cardRef.current, { scale: 3, useCORS: true, backgroundColor: '#ffffff' })
          const link = document.createElement('a')
          link.download = `Phieu-danh-gia-${opp?.title ?? ''}.png`
          link.href = canvas.toDataURL('image/png')
          link.click()
          setQrExporting(false)
        }

        return (
          <>
            <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowQR(false)} />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
                {/* Modal header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                  <h2 className="font-bold text-gray-900">Phiếu đánh giá</h2>
                  <button onClick={() => setShowQR(false)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 transition-colors">
                    <X size={16} />
                  </button>
                </div>

                {/* Card preview — đây là phần sẽ được export */}
                <div className="px-5 pt-5">
                  <div ref={cardRef} className="bg-white rounded-xl border-2 border-gray-100 overflow-hidden" style={{ fontFamily: 'Arial, sans-serif' }}>
                    {/* Logo */}
                    <div className="flex justify-center pt-6 pb-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src="/logo.png" alt="Hanoi Sun Travel" className="h-16 object-contain" crossOrigin="anonymous" />
                    </div>
                    {/* Title */}
                    <div className="text-center px-4 pb-4">
                      <p className="font-bold text-base leading-tight" style={{ color: '#ef5e2f' }}>
                        Phiếu đánh giá
                      </p>
                      <p className="font-bold text-base leading-tight" style={{ color: '#ef5e2f' }}>
                        chất lượng dịch vụ
                      </p>
                    </div>
                    {/* Tour name */}
                    <div className="mx-4 mb-4 px-3 py-2 rounded-lg text-center" style={{ backgroundColor: '#f0f9ff' }}>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-0.5">Đoàn</p>
                      <p className="font-bold text-sm text-gray-800 leading-snug">{opp.title}</p>
                    </div>
                    {/* QR */}
                    <div className="flex justify-center pb-6">
                      <div className="overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={qrImgUrl} alt="QR Code" width={180} height={180} crossOrigin="anonymous" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="px-5 py-4 flex flex-col gap-2">
                  <button
                    onClick={handleExport}
                    disabled={qrExporting}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold bg-accent-500 hover:bg-accent-600 disabled:opacity-60 text-white transition-colors"
                  >
                    {qrExporting ? <Loader2 size={14} className="animate-spin" /> : <QrCode size={14} />}
                    {qrExporting ? 'Đang xuất...' : 'Tải phiếu PNG'}
                  </button>
                  <button
                    onClick={() => { navigator.clipboard.writeText(prefillUrl); setQrCopied(true); setTimeout(() => setQrCopied(false), 2000) }}
                    className={`w-full flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-semibold transition-colors border ${qrCopied ? 'border-emerald-300 bg-emerald-50 text-emerald-600' : 'border-gray-200 hover:bg-gray-50 text-gray-600'}`}
                  >
                    {qrCopied ? <Check size={14} /> : <Copy size={14} />}
                    {qrCopied ? 'Đã copy link!' : 'Copy link'}
                  </button>
                </div>
              </div>
            </div>
          </>
        )
      })()}

    </div>
  )
}

function InfoRow({ label, value, highlight, warn }: {
  label: string; value?: string | null; highlight?: boolean; warn?: boolean
}) {
  if (!value) return null
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-gray-400 text-xs whitespace-nowrap">{label}</span>
      <span className={`font-semibold text-xs text-right ${highlight ? 'text-brand-700' : warn ? 'text-amber-600' : 'text-gray-800'}`}>
        {value}
      </span>
    </div>
  )
}
