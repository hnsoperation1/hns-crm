'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, ArrowRight, Phone, Mail, Building2,
  MessageSquare, Plus, CheckSquare, Square,
  Clock, CalendarDays, DollarSign, User, Pencil, CheckCircle2, X,
  ClipboardList, UserPlus, Loader2, FileText, Save, ClipboardCheck,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import {
  STAGE_LABELS, STAGE_COLORS, SOURCE_LABELS, SOURCE_COLORS,
  formatVND, formatDate, getInitials, daysSince, daysUntil,
} from '@/lib/utils'
import type { OppStage, LogType, Opportunity, Contact, ActivityLog } from '@/types'

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

  const [opp, setOpp] = useState<OppDetail | null>(null)
  const [allLogs, setAllLogs] = useState<LogDetail[]>([])
  const [tasks, setTasks] = useState<{ id: string; title: string; due_date?: string; assigned_to?: string; is_done: boolean; stage: number }[]>([])
  const [saleUsers, setSaleUsers] = useState<UserMin[]>([])
  const [allUsers, setAllUsers] = useState<UserMin[]>([])
  const [loading, setLoading] = useState(true)

  const [logFilter, setLogFilter] = useState<LogFilter>('all')
  const [showReassign, setShowReassign] = useState(false)
  const [reassignTarget, setReassignTarget] = useState('')
  const [reassignSuccess, setReassignSuccess] = useState(false)
  const [taskAssignees, setTaskAssignees] = useState<Record<string, string>>({})
  const [openTaskAssign, setOpenTaskAssign] = useState<string | null>(null)
  const [taskAssignSelect, setTaskAssignSelect] = useState<string>('')
  const [mainTab, setMainTab] = useState<'activity' | 'tasks' | 'intake'>('activity')

  // Tour intake
  type IntakeForm = {
    pax_adults: string; pax_children_under5: string; pax_children_5to10: string
    pickup_count: string
    trip_days: string; trip_date_range: string; trip_timing: string
    hotel_stars: string
    event_gala: boolean; event_team_building: boolean; event_meeting: boolean
    event_birthday: boolean; event_anniversary: boolean; event_details: string
    destination: string
    group_leader_name: string; group_leader_phone: string; group_leader_email: string
    customer_type: string; flight_preference: string; tour_type: string
    budget: string; program_goal: string; program_theme: string
    improvements: string; other_notes: string
  }
  const EMPTY_INTAKE: IntakeForm = {
    pax_adults: '', pax_children_under5: '', pax_children_5to10: '',
    pickup_count: '',
    trip_days: '', trip_date_range: '', trip_timing: '',
    hotel_stars: '',
    event_gala: false, event_team_building: false, event_meeting: false,
    event_birthday: false, event_anniversary: false, event_details: '',
    destination: '',
    group_leader_name: '', group_leader_phone: '', group_leader_email: '',
    customer_type: '', flight_preference: '', tour_type: '',
    budget: '', program_goal: '', program_theme: '',
    improvements: '', other_notes: '',
  }
  const [intake, setIntake] = useState<IntakeForm>(EMPTY_INTAKE)
  const [pickupPoints, setPickupPoints] = useState<{ address: string; count: string }[]>([])
  const [intakeLoaded, setIntakeLoaded] = useState(false)
  const [savingIntake, setSavingIntake] = useState(false)
  const [intakeSaved, setIntakeSaved] = useState(false)
  const [creatingHandover, setCreatingHandover] = useState(false)
  const [handoverCreated, setHandoverCreated] = useState(false)

  type LeaderContact = { id: string; name: string; phone: string | null; email: string | null; company: string | null }
  const [leaderSearch, setLeaderSearch] = useState('')
  const [leaderResults, setLeaderResults] = useState<LeaderContact[]>([])
  const [leaderDropOpen, setLeaderDropOpen] = useState(false)

  async function searchLeader(q: string) {
    if (!q.trim()) { setLeaderResults([]); return }
    const { data } = await supabase.from('contacts').select('id,name,phone,email,company')
      .or(`name.ilike.%${q}%,phone.ilike.%${q}%`).limit(8)
    setLeaderResults((data ?? []) as LeaderContact[])
  }
  const [taskDone, setTaskDone] = useState<Record<string, boolean>>({})
  const [addedTasks, setAddedTasks] = useState<{ id: string; title: string; due_date: string; assigned_to: string }[]>([])
  const [showNewTask, setShowNewTask] = useState(false)
  const [newTask, setNewTask] = useState({ title: '', due_date: '', assigned_to: '' })

  useEffect(() => {
    async function load() {
      const [{ data: oppData }, { data: logsData }, { data: tasksData }, { data: usersData }] = await Promise.all([
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
      ])
      setOpp(oppData as OppDetail | null)
      setAllLogs((logsData ?? []) as LogDetail[])
      setTasks(tasksData ?? [])
      const users = (usersData ?? []) as UserMin[]
      setAllUsers(users)
      setSaleUsers(users.filter(u => u.is_sale_tv))
      setLoading(false)

      // Load tour_intake
      const { data: intakeData } = await supabase.from('tour_intake').select('*').eq('opportunity_id', id).maybeSingle()
      if (intakeData) {
        const pCount = intakeData.pickup_count ?? 0
        let pts: { address: string; count: string }[] = Array.from({ length: pCount }, () => ({ address: '', count: '' }))
        if (intakeData.pickup_quantities) {
          try {
            const parsed = JSON.parse(intakeData.pickup_quantities)
            if (Array.isArray(parsed)) pts = parsed
          } catch { /* old plain-text format, ignore */ }
        }
        setPickupPoints(pts)
        setIntake({
          pax_adults: intakeData.pax_adults?.toString() ?? '',
          pax_children_under5: intakeData.pax_children_under5?.toString() ?? '',
          pax_children_5to10: intakeData.pax_children_5to10?.toString() ?? '',
          pickup_count: pCount.toString(),
          trip_days: intakeData.trip_days?.toString() ?? '',
          trip_date_range: intakeData.trip_date_range ?? '',
          trip_timing: intakeData.trip_timing ?? '',
          hotel_stars: intakeData.hotel_stars ?? '',
          event_gala: intakeData.event_gala ?? false,
          event_team_building: intakeData.event_team_building ?? false,
          event_meeting: intakeData.event_meeting ?? false,
          event_birthday: intakeData.event_birthday ?? false,
          event_anniversary: intakeData.event_anniversary ?? false,
          event_details: intakeData.event_details ?? '',
          destination: intakeData.destination ?? '',
          group_leader_name: intakeData.group_leader_name ?? '',
          group_leader_phone: intakeData.group_leader_phone ?? '',
          group_leader_email: intakeData.group_leader_email ?? '',
          customer_type: intakeData.customer_type ?? '',
          flight_preference: intakeData.flight_preference ?? '',
          tour_type: intakeData.tour_type ?? '',
          budget: intakeData.budget ?? '',
          program_goal: intakeData.program_goal ?? '',
          program_theme: intakeData.program_theme ?? '',
          improvements: intakeData.improvements ?? '',
          other_notes: intakeData.other_notes ?? '',
        })
      }
      setIntakeLoaded(true)
    }
    load()
  }, [id])

  async function saveIntake() {
    setSavingIntake(true)
    await supabase.from('tour_intake').upsert({
      opportunity_id: id,
      pax_adults: intake.pax_adults ? Number(intake.pax_adults) : null,
      pax_children_under5: intake.pax_children_under5 ? Number(intake.pax_children_under5) : null,
      pax_children_5to10: intake.pax_children_5to10 ? Number(intake.pax_children_5to10) : null,
      pickup_location: null,
      pickup_count: pickupPoints.length || null,
      pickup_quantities: pickupPoints.length ? JSON.stringify(pickupPoints) : null,
      trip_days: intake.trip_days ? Number(intake.trip_days) : null,
      trip_date_range: intake.trip_date_range || null,
      trip_timing: intake.trip_timing || null,
      hotel_stars: intake.hotel_stars || null,
      event_gala: intake.event_gala,
      event_team_building: intake.event_team_building,
      event_meeting: intake.event_meeting,
      event_birthday: intake.event_birthday,
      event_anniversary: intake.event_anniversary,
      event_details: intake.event_details || null,
      destination: intake.destination || null,
      group_leader_name: intake.group_leader_name || null,
      group_leader_phone: intake.group_leader_phone || null,
      group_leader_email: intake.group_leader_email || null,
      customer_type: intake.customer_type || null,
      flight_preference: intake.flight_preference || null,
      tour_type: intake.tour_type || null,
      budget: intake.budget || null,
      program_goal: intake.program_goal || null,
      program_theme: intake.program_theme || null,
      improvements: intake.improvements || null,
      other_notes: intake.other_notes || null,
    }, { onConflict: 'opportunity_id' })
    setSavingIntake(false)
    setIntakeSaved(true)
    setTimeout(() => setIntakeSaved(false), 2000)
  }

  async function createHandover() {
    setCreatingHandover(true)
    // Lưu intake trước
    await supabase.from('tour_intake').upsert({
      opportunity_id: id,
      pax_adults: intake.pax_adults ? Number(intake.pax_adults) : null,
      pax_children_under5: intake.pax_children_under5 ? Number(intake.pax_children_under5) : null,
      pax_children_5to10: intake.pax_children_5to10 ? Number(intake.pax_children_5to10) : null,
      pickup_location: null,
      pickup_count: pickupPoints.length || null,
      pickup_quantities: pickupPoints.length ? JSON.stringify(pickupPoints) : null,
      trip_days: intake.trip_days ? Number(intake.trip_days) : null,
      trip_date_range: intake.trip_date_range || null,
      trip_timing: intake.trip_timing || null,
      hotel_stars: intake.hotel_stars || null,
      event_gala: intake.event_gala, event_team_building: intake.event_team_building,
      event_meeting: intake.event_meeting, event_birthday: intake.event_birthday,
      event_anniversary: intake.event_anniversary, event_details: intake.event_details || null,
      destination: intake.destination || null,
      group_leader_name: intake.group_leader_name || null,
      group_leader_phone: intake.group_leader_phone || null,
      group_leader_email: intake.group_leader_email || null,
      customer_type: intake.customer_type || null,
      flight_preference: intake.flight_preference || null,
      tour_type: intake.tour_type || null,
      budget: intake.budget || null,
      program_goal: intake.program_goal || null,
      program_theme: intake.program_theme || null,
      improvements: intake.improvements || null,
      other_notes: intake.other_notes || null,
    }, { onConflict: 'opportunity_id' })
    // Copy các field chung sang handover (không ghi đè field riêng của handover nếu đã có)
    const { data: existingHandover } = await supabase.from('tour_handover')
      .select('id').eq('opportunity_id', id).maybeSingle()
    if (!existingHandover) {
      await supabase.from('tour_handover').insert({
        opportunity_id: id,
        pax_adults: intake.pax_adults ? Number(intake.pax_adults) : null,
        pax_children_under5: intake.pax_children_under5 ? Number(intake.pax_children_under5) : null,
        pax_children_5to10: intake.pax_children_5to10 ? Number(intake.pax_children_5to10) : null,
        pickup_location: null,
        pickup_count: pickupPoints.length || null,
        pickup_quantities: pickupPoints.length ? JSON.stringify(pickupPoints) : null,
        trip_days: intake.trip_days ? Number(intake.trip_days) : null,
        trip_date_range: intake.trip_date_range || null,
        hotel_stars: intake.hotel_stars || null,
        event_gala: intake.event_gala, event_team_building: intake.event_team_building,
        event_meeting: intake.event_meeting, event_birthday: intake.event_birthday,
        event_anniversary: intake.event_anniversary, event_details: intake.event_details || null,
        group_leader_name: intake.group_leader_name || null,
        group_leader_phone: intake.group_leader_phone || null,
        group_leader_email: intake.group_leader_email || null,
      })
    } else {
      await supabase.from('tour_handover').update({
        pax_adults: intake.pax_adults ? Number(intake.pax_adults) : null,
        pax_children_under5: intake.pax_children_under5 ? Number(intake.pax_children_under5) : null,
        pax_children_5to10: intake.pax_children_5to10 ? Number(intake.pax_children_5to10) : null,
        pickup_location: null,
        pickup_count: pickupPoints.length || null,
        pickup_quantities: pickupPoints.length ? JSON.stringify(pickupPoints) : null,
        trip_days: intake.trip_days ? Number(intake.trip_days) : null,
        trip_date_range: intake.trip_date_range || null,
        hotel_stars: intake.hotel_stars || null,
        event_gala: intake.event_gala, event_team_building: intake.event_team_building,
        event_meeting: intake.event_meeting, event_birthday: intake.event_birthday,
        event_anniversary: intake.event_anniversary, event_details: intake.event_details || null,
        group_leader_name: intake.group_leader_name || null,
        group_leader_phone: intake.group_leader_phone || null,
        group_leader_email: intake.group_leader_email || null,
      }).eq('opportunity_id', id)
    }
    setCreatingHandover(false)
    setHandoverCreated(true)
    setTimeout(() => setHandoverCreated(false), 3000)
  }

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
        <Link href="/don-hang-moi" className="text-accent-500 hover:underline text-sm">← Quay lại Đơn hàng</Link>
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
        <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-3">
          <Link href="/" className="hover:text-gray-600">Tổng quan</Link>
          <span>/</span>
          <Link href="/don-hang-moi" className="hover:text-gray-600">Đơn hàng</Link>
          <span>/</span>
          <span className="text-gray-700 font-medium truncate">{opp.title}</span>
        </div>

        <div className="flex items-start gap-3">
          <Link href="/don-hang-moi" className="mt-1 p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors flex-shrink-0">
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
                    {STAGE_LABELS[s].split(' · ')[0]}
                    {isActive && <span className="opacity-70">· {daysInStage}N</span>}
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
              <span>Sale TV: <span className="font-semibold text-gray-700">{effectiveAssignedUser.full_name.split(' ').slice(-2).join(' ')}</span></span>
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
                onClick={() => setMainTab('intake')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  mainTab === 'intake' ? 'bg-accent-500 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-50'
                }`}
              >
                <FileText size={15} /> Thông tin đoàn
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
                <ClipboardList size={15} /> Công việc
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${mainTab === 'tasks' ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-500'}`}>
                  {tasks.length + addedTasks.length}
                </span>
              </button>
            </div>

            {/* ══════════ THÔNG TIN ĐOÀN TAB ══════════ */}
            {mainTab === 'intake' && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
                <h3 className="font-semibold text-gray-900 text-sm">Phiếu thông tin đoàn</h3>
                <div className="flex items-center gap-2">
                  <button onClick={createHandover} disabled={creatingHandover || savingIntake}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-white text-xs font-semibold rounded-lg transition-colors">
                    {creatingHandover ? <Loader2 size={12} className="animate-spin" /> : <ClipboardCheck size={12} />}
                    {handoverCreated ? 'Đã lập phiếu ✓' : 'Lập phiếu bàn giao'}
                  </button>
                  <button onClick={saveIntake} disabled={savingIntake}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-accent-500 hover:bg-accent-600 disabled:opacity-60 text-white text-xs font-semibold rounded-lg transition-colors">
                    {savingIntake ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                    {intakeSaved ? 'Đã lưu ✓' : 'Lưu'}
                  </button>
                </div>
              </div>
              {!intakeLoaded ? (
                <div className="p-8 flex justify-center"><Loader2 size={20} className="animate-spin text-gray-300" /></div>
              ) : (
              <div className="p-5 space-y-5">
                {/* Số lượng khách */}
                <ISection label="Số lượng khách">
                  <div className="grid grid-cols-3 gap-3">
                    <IField label="Người lớn"><input type="number" min={0} value={intake.pax_adults} onChange={e => setIntake(f => ({...f, pax_adults: e.target.value}))} className={iCls} placeholder="0" /></IField>
                    <IField label="Trẻ em dưới 5 tuổi"><input type="number" min={0} value={intake.pax_children_under5} onChange={e => setIntake(f => ({...f, pax_children_under5: e.target.value}))} className={iCls} placeholder="0" /></IField>
                    <IField label="Trẻ em 5–10 tuổi"><input type="number" min={0} value={intake.pax_children_5to10} onChange={e => setIntake(f => ({...f, pax_children_5to10: e.target.value}))} className={iCls} placeholder="0" /></IField>
                  </div>
                </ISection>

                {/* Điểm đón */}
                <ISection label="Điểm đón">
                  <IField label="Số điểm đón">
                    <input type="number" min={0} max={20} value={intake.pickup_count}
                      onChange={e => {
                        const n = Math.max(0, Math.min(20, parseInt(e.target.value) || 0))
                        setIntake(f => ({...f, pickup_count: e.target.value}))
                        setPickupPoints(prev => {
                          if (prev.length === n) return prev
                          if (prev.length < n) return [...prev, ...Array.from({length: n - prev.length}, () => ({address: '', count: ''}))]
                          return prev.slice(0, n)
                        })
                      }}
                      className={iCls} placeholder="0" />
                  </IField>
                  {pickupPoints.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {pickupPoints.map((pt, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <span className="text-xs font-bold text-gray-400 w-14 flex-shrink-0">Điểm {i + 1}</span>
                          <input value={pt.address} onChange={e => setPickupPoints(prev => prev.map((p, j) => j === i ? {...p, address: e.target.value} : p))}
                            className="flex-1 min-w-0 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 bg-white" placeholder="Địa chỉ điểm đón..." />
                          <input type="number" min={0} value={pt.count} onChange={e => setPickupPoints(prev => prev.map((p, j) => j === i ? {...p, count: e.target.value} : p))}
                            className="w-28 flex-shrink-0 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 bg-white" placeholder="Số người" />
                        </div>
                      ))}
                    </div>
                  )}
                </ISection>

                {/* Thời gian */}
                <ISection label="Thời gian đi">
                  <div className="grid grid-cols-2 gap-3">
                    <IField label="Số ngày"><input type="number" min={1} value={intake.trip_days} onChange={e => setIntake(f => ({...f, trip_days: e.target.value}))} className={iCls} placeholder="2" /></IField>
                    <IField label="Khoảng ngày dự kiến"><input value={intake.trip_date_range} onChange={e => setIntake(f => ({...f, trip_date_range: e.target.value}))} className={iCls} placeholder="VD: cuối tháng 7/2026" /></IField>
                  </div>
                  <div className="mt-3">
                    <IField label="Thời gian mong muốn">
                      <div className="flex gap-4">
                        {[{v:'weekend_fri',l:'Cuối tuần (T6–CN)'},{v:'weekend_sat',l:'Cuối tuần (T7–T2)'},{v:'weekday',l:'Đầu tuần'}].map(({v,l}) => (
                          <label key={v} className="flex items-center gap-2 text-sm cursor-pointer">
                            <input type="radio" name="trip_timing" value={v} checked={intake.trip_timing===v} onChange={() => setIntake(f => ({...f, trip_timing: v}))} className="accent-accent-500" />
                            {l}
                          </label>
                        ))}
                      </div>
                    </IField>
                  </div>
                </ISection>

                {/* Tiêu chuẩn KS */}
                <ISection label="Tiêu chuẩn khách sạn">
                  <div className="flex gap-4">
                    {[{v:'3',l:'3 sao'},{v:'4',l:'4 sao'},{v:'5',l:'5 sao'}].map(({v,l}) => (
                      <label key={v} className="flex items-center gap-2 text-sm cursor-pointer">
                        <input type="radio" name="hotel_stars" value={v} checked={intake.hotel_stars===v} onChange={() => setIntake(f => ({...f, hotel_stars: v}))} className="accent-accent-500" />
                        {l}
                      </label>
                    ))}
                  </div>
                </ISection>

                {/* Yêu cầu sự kiện */}
                <ISection label="Yêu cầu sự kiện">
                  <div className="flex flex-wrap gap-3 mb-3">
                    {([['event_gala','Gala dinner'],['event_team_building','Team building'],['event_meeting','Hội họp'],['event_birthday','Sinh nhật'],['event_anniversary','Kỷ niệm']] as [keyof typeof intake, string][]).map(([k,l]) => (
                      <label key={k} className="flex items-center gap-2 text-sm cursor-pointer">
                        <input type="checkbox" checked={intake[k] as boolean} onChange={e => setIntake(f => ({...f, [k]: e.target.checked}))} className="accent-accent-500 w-4 h-4" />
                        {l}
                      </label>
                    ))}
                  </div>
                  <IField label="Chi tiết thêm"><input value={intake.event_details} onChange={e => setIntake(f => ({...f, event_details: e.target.value}))} className={iCls} placeholder="Mô tả yêu cầu sự kiện..." /></IField>
                </ISection>

                {/* Điểm đến */}
                <ISection label="Điểm đến mong muốn">
                  <IField label=""><input value={intake.destination} onChange={e => setIntake(f => ({...f, destination: e.target.value}))} className={iCls} placeholder="VD: Sầm Sơn, Đà Nẵng, Phú Quốc..." /></IField>
                </ISection>

                {/* Trưởng đoàn */}
                <ISection label="Thông tin trưởng đoàn">
                  <div className="relative mb-3">
                    <label className="block text-xs text-gray-500 mb-1">Tìm từ danh sách liên hệ</label>
                    <input value={leaderSearch}
                      onChange={e => { setLeaderSearch(e.target.value); searchLeader(e.target.value) }}
                      onFocus={() => setLeaderDropOpen(true)}
                      onBlur={() => setTimeout(() => setLeaderDropOpen(false), 150)}
                      className={iCls} placeholder="Tìm tên hoặc số điện thoại..." />
                    {leaderDropOpen && leaderResults.length > 0 && (
                      <div className="absolute top-full left-0 right-0 z-20 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                        {leaderResults.map(c => (
                          <div key={c.id} onMouseDown={() => {
                            setIntake(f => ({...f, group_leader_name: c.name, group_leader_phone: c.phone ?? '', group_leader_email: c.email ?? ''}))
                            setLeaderSearch(c.name)
                            setLeaderDropOpen(false)
                            setLeaderResults([])
                          }} className="px-4 py-2.5 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-0">
                            <div className="font-semibold text-sm text-gray-900">{c.name}</div>
                            {(c.phone || c.company) && <div className="text-xs text-gray-400">{[c.phone, c.company].filter(Boolean).join(' · ')}</div>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <IField label="Họ tên"><input value={intake.group_leader_name} onChange={e => setIntake(f => ({...f, group_leader_name: e.target.value}))} className={iCls} placeholder="Nguyễn Văn A" /></IField>
                    <IField label="Số điện thoại"><input value={intake.group_leader_phone} onChange={e => setIntake(f => ({...f, group_leader_phone: e.target.value}))} className={iCls} placeholder="0912..." /></IField>
                    <IField label="Email"><input value={intake.group_leader_email} onChange={e => setIntake(f => ({...f, group_leader_email: e.target.value}))} className={iCls} placeholder="..." /></IField>
                  </div>
                </ISection>

                {/* Đối tượng / Vé / Định hướng / Ngân sách */}
                <ISection label="Định hướng">
                  <div className="grid grid-cols-2 gap-4">
                    <IField label="Đối tượng khách hàng"><input value={intake.customer_type} onChange={e => setIntake(f => ({...f, customer_type: e.target.value}))} className={iCls} placeholder="VD: Công chức, giáo viên, VIP..." /></IField>
                    <IField label="Ngân sách mong muốn"><input value={intake.budget} onChange={e => setIntake(f => ({...f, budget: e.target.value}))} className={iCls} placeholder="VD: 1.5 triệu/người" /></IField>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-3">
                    <IField label="Vé máy bay">
                      <div className="flex gap-4">
                        {[{v:'budget',l:'Hãng giá rẻ'},{v:'quality',l:'Hãng chất lượng'}].map(({v,l}) => (
                          <label key={v} className="flex items-center gap-2 text-sm cursor-pointer">
                            <input type="radio" name="flight_preference" value={v} checked={intake.flight_preference===v} onChange={() => setIntake(f => ({...f, flight_preference: v}))} className="accent-accent-500" />
                            {l}
                          </label>
                        ))}
                      </div>
                    </IField>
                    <IField label="Định hướng tour">
                      <div className="flex gap-4">
                        {[{v:'budget',l:'Tour giá rẻ'},{v:'quality',l:'Tour chất lượng cao'}].map(({v,l}) => (
                          <label key={v} className="flex items-center gap-2 text-sm cursor-pointer">
                            <input type="radio" name="tour_type" value={v} checked={intake.tour_type===v} onChange={() => setIntake(f => ({...f, tour_type: v}))} className="accent-accent-500" />
                            {l}
                          </label>
                        ))}
                      </div>
                    </IField>
                  </div>
                </ISection>

                {/* Mục tiêu / Chủ đề / Cải thiện / Lưu ý */}
                <ISection label="Mục tiêu & Lưu ý">
                  <div className="space-y-3">
                    <IField label="Mục tiêu chương trình"><textarea value={intake.program_goal} onChange={e => setIntake(f => ({...f, program_goal: e.target.value}))} rows={2} className={`${iCls} resize-none`} placeholder="Mong muốn đạt được gì sau chương trình?" /></IField>
                    <IField label="Chủ đề chương trình"><textarea value={intake.program_theme} onChange={e => setIntake(f => ({...f, program_theme: e.target.value}))} rows={2} className={`${iCls} resize-none`} placeholder="Để lên ý tưởng, thiết kế theo..." /></IField>
                    <IField label="Vấn đề cần cải thiện (so với các năm trước)"><textarea value={intake.improvements} onChange={e => setIntake(f => ({...f, improvements: e.target.value}))} rows={2} className={`${iCls} resize-none`} placeholder="..." /></IField>
                    <IField label="Lưu ý khác"><textarea value={intake.other_notes} onChange={e => setIntake(f => ({...f, other_notes: e.target.value}))} rows={2} className={`${iCls} resize-none`} placeholder="..." /></IField>
                  </div>
                </ISection>

                <div className="flex justify-end pt-2">
                  <button onClick={saveIntake} disabled={savingIntake}
                    className="flex items-center gap-2 px-5 py-2.5 bg-accent-500 hover:bg-accent-600 disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-colors">
                    {savingIntake ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                    {intakeSaved ? 'Đã lưu ✓' : 'Lưu thông tin đoàn'}
                  </button>
                </div>
              </div>
              )}
            </div>
            )}

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

              <div className="mx-5 mb-5 rounded-xl border border-dashed border-brand-200 bg-brand-50/40 p-4">
                <div className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <Plus size={14} className="text-accent-500" />
                  Thêm log hoạt động
                </div>
                <textarea
                  className="w-full text-sm border border-gray-200 rounded-xl p-3 resize-none focus:outline-none focus:ring-2 focus:ring-brand-400 bg-white placeholder-gray-400 shadow-sm"
                  placeholder="Ghi lại kết quả cuộc gọi, thông tin mới từ khách, vấn đề phát sinh..."
                  rows={3}
                />
                <div className="flex items-center justify-between mt-3 gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <input type="date" className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-400 bg-white shadow-sm" />
                    <select className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-400 bg-white text-gray-600 shadow-sm">
                      <option value="sale_update">Cập nhật sale</option>
                      <option value="stage_change">Chuyển giai đoạn</option>
                      <option value="note">Ghi chú</option>
                    </select>
                  </div>
                  <button className="bg-accent-500 hover:bg-accent-600 text-white px-5 py-1.5 rounded-lg text-sm font-semibold transition-colors shadow-sm">
                    Lưu log
                  </button>
                </div>
              </div>
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
                  Đã ở giai đoạn này {daysInStage} ngày
                  {opp.stage_updated_at && ` · từ ${formatDate(opp.stage_updated_at)}`}
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
                            {formatDate(startDate)}{endDate ? ` → ${formatDate(endDate)}` : ' → nay'}
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
                        {saleUsers.map(u => <option key={u.id} value={u.id}>{u.full_name.split(' ').slice(-2).join(' ')}</option>)}
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

          </div>
        </div>
      </div>
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

const iCls = 'w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 bg-white'

function ISection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">{label}</div>
      <div className="bg-gray-50 rounded-xl p-3">{children}</div>
    </div>
  )
}

function IField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      {label && <label className="block text-xs text-gray-500 mb-1">{label}</label>}
      {children}
    </div>
  )
}

