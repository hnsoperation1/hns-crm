'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, ArrowRight, Phone, Mail, Building2,
  MessageSquare, Plus, CheckSquare, Square,
  Clock, CalendarDays, DollarSign, User, Pencil, CheckCircle2, X,
  ClipboardList, UserPlus, Loader2, FileText, Save,
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
  const [mainTab, setMainTab] = useState<'activity' | 'tasks' | 'handover'>('handover')

  // Tour handover
  type HandoverForm = {
    ma_doan: string; vat_required: boolean; status: string
    sale_price: string; commission: string
    pax_adults: string; pax_children_under5: string; pax_children_5to10: string
    group_leader_name: string; group_leader_phone: string; group_leader_email: string
    pickup_location: string; pickup_count: string; pickup_quantities: string; pickup_time: string
    trip_days: string; trip_date_range: string; itinerary: string
    hotel_stars: string; hotel_name: string; hotel_persons_per_room: string; hotel_room_details: string
    transport_car_type: string; transport_car_count: string
    flight_depart_time: string; flight_return_time: string
    meals_main_count: string; meals_main_price: string; meals_breakfast: boolean
    guide_gender: string; guide_requirements: string
    tickets_details: string
    event_gala: boolean; event_team_building: boolean; event_meeting: boolean
    event_birthday: boolean; event_anniversary: boolean; event_details: string
    other_services: string
  }
  const EMPTY_HANDOVER: HandoverForm = {
    ma_doan: '', vat_required: false, status: '',
    sale_price: '', commission: '',
    pax_adults: '', pax_children_under5: '', pax_children_5to10: '',
    group_leader_name: '', group_leader_phone: '', group_leader_email: '',
    pickup_location: '', pickup_count: '', pickup_quantities: '', pickup_time: '',
    trip_days: '', trip_date_range: '', itinerary: '',
    hotel_stars: '', hotel_name: '', hotel_persons_per_room: '', hotel_room_details: '',
    transport_car_type: '', transport_car_count: '',
    flight_depart_time: '', flight_return_time: '',
    meals_main_count: '', meals_main_price: '', meals_breakfast: false,
    guide_gender: '', guide_requirements: '',
    tickets_details: '',
    event_gala: false, event_team_building: false, event_meeting: false,
    event_birthday: false, event_anniversary: false, event_details: '',
    other_services: '',
  }
  const [handover, setHandover] = useState<HandoverForm>(EMPTY_HANDOVER)
  const [handoverLoaded, setHandoverLoaded] = useState(false)
  const [savingHandover, setSavingHandover] = useState(false)
  const [handoverSaved, setHandoverSaved] = useState(false)
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

      // Load tour_handover
      const { data: hd } = await supabase.from('tour_handover').select('*').eq('opportunity_id', id).maybeSingle()
      if (hd) {
        setHandover({
          ma_doan: hd.ma_doan ?? '',
          vat_required: hd.vat_required ?? false,
          status: hd.status ?? '',
          sale_price: hd.sale_price?.toString() ?? '',
          commission: hd.commission?.toString() ?? '',
          pax_adults: hd.pax_adults?.toString() ?? '',
          pax_children_under5: hd.pax_children_under5?.toString() ?? '',
          pax_children_5to10: hd.pax_children_5to10?.toString() ?? '',
          group_leader_name: hd.group_leader_name ?? '',
          group_leader_phone: hd.group_leader_phone ?? '',
          group_leader_email: hd.group_leader_email ?? '',
          pickup_location: hd.pickup_location ?? '',
          pickup_count: hd.pickup_count?.toString() ?? '',
          pickup_quantities: hd.pickup_quantities ?? '',
          pickup_time: hd.pickup_time ?? '',
          trip_days: hd.trip_days?.toString() ?? '',
          trip_date_range: hd.trip_date_range ?? '',
          itinerary: hd.itinerary ?? '',
          hotel_stars: hd.hotel_stars ?? '',
          hotel_name: hd.hotel_name ?? '',
          hotel_persons_per_room: hd.hotel_persons_per_room?.toString() ?? '',
          hotel_room_details: hd.hotel_room_details ?? '',
          transport_car_type: hd.transport_car_type ?? '',
          transport_car_count: hd.transport_car_count?.toString() ?? '',
          flight_depart_time: hd.flight_depart_time ?? '',
          flight_return_time: hd.flight_return_time ?? '',
          meals_main_count: hd.meals_main_count?.toString() ?? '',
          meals_main_price: hd.meals_main_price?.toString() ?? '',
          meals_breakfast: hd.meals_breakfast ?? false,
          guide_gender: hd.guide_gender ?? '',
          guide_requirements: hd.guide_requirements ?? '',
          tickets_details: hd.tickets_details ?? '',
          event_gala: hd.event_gala ?? false,
          event_team_building: hd.event_team_building ?? false,
          event_meeting: hd.event_meeting ?? false,
          event_birthday: hd.event_birthday ?? false,
          event_anniversary: hd.event_anniversary ?? false,
          event_details: hd.event_details ?? '',
          other_services: hd.other_services ?? '',
        })
      }
      setHandoverLoaded(true)
    }
    load()
  }, [id])

  async function saveHandover() {
    setSavingHandover(true)
    await supabase.from('tour_handover').upsert({
      opportunity_id: id,
      ma_doan: handover.ma_doan || null,
      vat_required: handover.vat_required,
      status: handover.status || null,
      sale_price: handover.sale_price ? Number(handover.sale_price) : null,
      commission: handover.commission ? Number(handover.commission) : null,
      pax_adults: handover.pax_adults ? Number(handover.pax_adults) : null,
      pax_children_under5: handover.pax_children_under5 ? Number(handover.pax_children_under5) : null,
      pax_children_5to10: handover.pax_children_5to10 ? Number(handover.pax_children_5to10) : null,
      group_leader_name: handover.group_leader_name || null,
      group_leader_phone: handover.group_leader_phone || null,
      group_leader_email: handover.group_leader_email || null,
      pickup_location: handover.pickup_location || null,
      pickup_count: handover.pickup_count ? Number(handover.pickup_count) : null,
      pickup_quantities: handover.pickup_quantities || null,
      pickup_time: handover.pickup_time || null,
      trip_days: handover.trip_days ? Number(handover.trip_days) : null,
      trip_date_range: handover.trip_date_range || null,
      itinerary: handover.itinerary || null,
      hotel_stars: handover.hotel_stars || null,
      hotel_name: handover.hotel_name || null,
      hotel_persons_per_room: handover.hotel_persons_per_room ? Number(handover.hotel_persons_per_room) : null,
      hotel_room_details: handover.hotel_room_details || null,
      transport_car_type: handover.transport_car_type || null,
      transport_car_count: handover.transport_car_count ? Number(handover.transport_car_count) : null,
      flight_depart_time: handover.flight_depart_time || null,
      flight_return_time: handover.flight_return_time || null,
      meals_main_count: handover.meals_main_count ? Number(handover.meals_main_count) : null,
      meals_main_price: handover.meals_main_price ? Number(handover.meals_main_price) : null,
      meals_breakfast: handover.meals_breakfast,
      guide_gender: handover.guide_gender || null,
      guide_requirements: handover.guide_requirements || null,
      tickets_details: handover.tickets_details || null,
      event_gala: handover.event_gala,
      event_team_building: handover.event_team_building,
      event_meeting: handover.event_meeting,
      event_birthday: handover.event_birthday,
      event_anniversary: handover.event_anniversary,
      event_details: handover.event_details || null,
      other_services: handover.other_services || null,
    }, { onConflict: 'opportunity_id' })
    setSavingHandover(false)
    setHandoverSaved(true)
    setTimeout(() => setHandoverSaved(false), 2000)
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
        <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-3">
          <Link href="/" className="hover:text-gray-600">Tổng quan</Link>
          <span>/</span>
          <Link href="/don-hang" className="hover:text-gray-600">Đơn hàng</Link>
          <span>/</span>
          <span className="text-gray-700 font-medium truncate">{opp.title}</span>
        </div>

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
                onClick={() => setMainTab('handover')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  mainTab === 'handover' ? 'bg-accent-500 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-50'
                }`}
              >
                <FileText size={15} /> Bàn giao ĐH
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

            {/* ══════════ BÀN GIAO ĐH TAB ══════════ */}
            {mainTab === 'handover' && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
                <h3 className="font-semibold text-gray-900 text-sm">Phiếu bàn giao điều hành</h3>
                <button onClick={saveHandover} disabled={savingHandover}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-accent-500 hover:bg-accent-600 disabled:opacity-60 text-white text-xs font-semibold rounded-lg transition-colors">
                  {savingHandover ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                  {handoverSaved ? 'Đã lưu ✓' : 'Lưu'}
                </button>
              </div>
              {!handoverLoaded ? (
                <div className="p-8 flex justify-center"><Loader2 size={20} className="animate-spin text-gray-300" /></div>
              ) : (
              <div className="p-5 space-y-5">
                {/* Thông tin chung */}
                <HSection label="Thông tin chung">
                  <div className="grid grid-cols-2 gap-3">
                    <HField label="Mã đoàn"><input value={handover.ma_doan} onChange={e => setHandover(f => ({...f, ma_doan: e.target.value}))} className={hCls} placeholder="VD: HNS-2026-001" /></HField>
                    <HField label="Trạng thái">
                      <select value={handover.status} onChange={e => setHandover(f => ({...f, status: e.target.value}))} className={hCls}>
                        <option value="">— Chọn —</option>
                        <option value="confirmed">Đã xác nhận</option>
                        <option value="pending">Chờ xác nhận</option>
                      </select>
                    </HField>
                  </div>
                  <div className="grid grid-cols-3 gap-3 mt-3">
                    <HField label="Giá bán (VNĐ)"><input type="number" value={handover.sale_price} onChange={e => setHandover(f => ({...f, sale_price: e.target.value}))} className={hCls} placeholder="0" /></HField>
                    <HField label="COM (VNĐ)"><input type="number" value={handover.commission} onChange={e => setHandover(f => ({...f, commission: e.target.value}))} className={hCls} placeholder="0" /></HField>
                    <HField label="">
                      <div className="flex items-center gap-2 mt-5">
                        <input type="checkbox" id="vat_required" checked={handover.vat_required} onChange={e => setHandover(f => ({...f, vat_required: e.target.checked}))} className="accent-accent-500 w-4 h-4" />
                        <label htmlFor="vat_required" className="text-sm cursor-pointer text-gray-700">Xuất VAT</label>
                      </div>
                    </HField>
                  </div>
                </HSection>

                {/* Số khách & Trưởng đoàn */}
                <HSection label="Khách hàng">
                  <div className="grid grid-cols-3 gap-3">
                    <HField label="Người lớn"><input type="number" min={0} value={handover.pax_adults} onChange={e => setHandover(f => ({...f, pax_adults: e.target.value}))} className={hCls} placeholder="0" /></HField>
                    <HField label="Trẻ em dưới 5t"><input type="number" min={0} value={handover.pax_children_under5} onChange={e => setHandover(f => ({...f, pax_children_under5: e.target.value}))} className={hCls} placeholder="0" /></HField>
                    <HField label="Trẻ em 5–10t"><input type="number" min={0} value={handover.pax_children_5to10} onChange={e => setHandover(f => ({...f, pax_children_5to10: e.target.value}))} className={hCls} placeholder="0" /></HField>
                  </div>
                  <div className="grid grid-cols-3 gap-3 mt-3">
                    <HField label="Tên trưởng đoàn"><input value={handover.group_leader_name} onChange={e => setHandover(f => ({...f, group_leader_name: e.target.value}))} className={hCls} placeholder="Nguyễn Văn A" /></HField>
                    <HField label="SĐT trưởng đoàn"><input value={handover.group_leader_phone} onChange={e => setHandover(f => ({...f, group_leader_phone: e.target.value}))} className={hCls} placeholder="0912..." /></HField>
                    <HField label="Email trưởng đoàn"><input value={handover.group_leader_email} onChange={e => setHandover(f => ({...f, group_leader_email: e.target.value}))} className={hCls} placeholder="..." /></HField>
                  </div>
                </HSection>

                {/* Điểm đón */}
                <HSection label="Điểm đón & Thời gian">
                  <div className="grid grid-cols-2 gap-3">
                    <HField label="Điểm đón – trả"><input value={handover.pickup_location} onChange={e => setHandover(f => ({...f, pickup_location: e.target.value}))} className={hCls} placeholder="VD: KCN Tử Đà – Phú Thọ" /></HField>
                    <HField label="Thời gian đón"><input value={handover.pickup_time} onChange={e => setHandover(f => ({...f, pickup_time: e.target.value}))} className={hCls} placeholder="VD: 6h00 ngày 01/08" /></HField>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <HField label="Số điểm đón"><input type="number" min={0} value={handover.pickup_count} onChange={e => setHandover(f => ({...f, pickup_count: e.target.value}))} className={hCls} placeholder="0" /></HField>
                    <HField label="Số lượng mỗi điểm"><input value={handover.pickup_quantities} onChange={e => setHandover(f => ({...f, pickup_quantities: e.target.value}))} className={hCls} placeholder="điểm 1: 20 người, điểm 2: 30 người" /></HField>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <HField label="Số ngày"><input type="number" min={1} value={handover.trip_days} onChange={e => setHandover(f => ({...f, trip_days: e.target.value}))} className={hCls} placeholder="2" /></HField>
                    <HField label="Ngày đi – ngày về"><input value={handover.trip_date_range} onChange={e => setHandover(f => ({...f, trip_date_range: e.target.value}))} className={hCls} placeholder="VD: 01/08 – 02/08/2026" /></HField>
                  </div>
                  <div className="mt-3">
                    <HField label="Lịch trình xác nhận"><textarea value={handover.itinerary} onChange={e => setHandover(f => ({...f, itinerary: e.target.value}))} rows={4} className={`${hCls} resize-none`} placeholder="Ngày 1: 6h00 khởi hành từ... / Ngày 2:..." /></HField>
                  </div>
                </HSection>

                {/* Khách sạn */}
                <HSection label="Khách sạn">
                  <div className="grid grid-cols-2 gap-3">
                    <HField label="Tên khách sạn"><input value={handover.hotel_name} onChange={e => setHandover(f => ({...f, hotel_name: e.target.value}))} className={hCls} placeholder="VD: Mường Thanh Grand Đà Nẵng" /></HField>
                    <HField label="Hạng sao">
                      <select value={handover.hotel_stars} onChange={e => setHandover(f => ({...f, hotel_stars: e.target.value}))} className={hCls}>
                        <option value="">— Chọn —</option>
                        <option value="3">3 sao</option>
                        <option value="4-5">4–5 sao</option>
                      </select>
                    </HField>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <HField label="Số người / phòng"><input type="number" min={1} value={handover.hotel_persons_per_room} onChange={e => setHandover(f => ({...f, hotel_persons_per_room: e.target.value}))} className={hCls} placeholder="2" /></HField>
                    <HField label="Chi tiết loại phòng"><input value={handover.hotel_room_details} onChange={e => setHandover(f => ({...f, hotel_room_details: e.target.value}))} className={hCls} placeholder="VD: 10 phòng đôi, 5 phòng đơn" /></HField>
                  </div>
                </HSection>

                {/* Vận chuyển & Bay */}
                <HSection label="Vận chuyển & Máy bay">
                  <div className="grid grid-cols-2 gap-3">
                    <HField label="Loại xe"><input value={handover.transport_car_type} onChange={e => setHandover(f => ({...f, transport_car_type: e.target.value}))} className={hCls} placeholder="VD: Xe 45 chỗ" /></HField>
                    <HField label="Số lượng xe"><input type="number" min={0} value={handover.transport_car_count} onChange={e => setHandover(f => ({...f, transport_car_count: e.target.value}))} className={hCls} placeholder="0" /></HField>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <HField label="Giờ bay đi"><input value={handover.flight_depart_time} onChange={e => setHandover(f => ({...f, flight_depart_time: e.target.value}))} className={hCls} placeholder="VD: VN123 6h00 01/08" /></HField>
                    <HField label="Giờ bay về"><input value={handover.flight_return_time} onChange={e => setHandover(f => ({...f, flight_return_time: e.target.value}))} className={hCls} placeholder="VD: VN456 20h30 02/08" /></HField>
                  </div>
                </HSection>

                {/* Ăn uống */}
                <HSection label="Ăn uống">
                  <div className="grid grid-cols-2 gap-3">
                    <HField label="Số bữa ăn chính"><input type="number" min={0} value={handover.meals_main_count} onChange={e => setHandover(f => ({...f, meals_main_count: e.target.value}))} className={hCls} placeholder="0" /></HField>
                    <HField label="Giá / bữa (VNĐ)"><input type="number" min={0} value={handover.meals_main_price} onChange={e => setHandover(f => ({...f, meals_main_price: e.target.value}))} className={hCls} placeholder="0" /></HField>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <input type="checkbox" id="meals_breakfast" checked={handover.meals_breakfast} onChange={e => setHandover(f => ({...f, meals_breakfast: e.target.checked}))} className="accent-accent-500 w-4 h-4" />
                    <label htmlFor="meals_breakfast" className="text-sm cursor-pointer text-gray-700">Có ăn sáng</label>
                  </div>
                </HSection>

                {/* HDV */}
                <HSection label="Hướng dẫn viên">
                  <div className="grid grid-cols-2 gap-3">
                    <HField label="Giới tính HDV">
                      <select value={handover.guide_gender} onChange={e => setHandover(f => ({...f, guide_gender: e.target.value}))} className={hCls}>
                        <option value="">— Không yêu cầu —</option>
                        <option value="male">Nam</option>
                        <option value="female">Nữ</option>
                      </select>
                    </HField>
                    <HField label="Yêu cầu HDV"><input value={handover.guide_requirements} onChange={e => setHandover(f => ({...f, guide_requirements: e.target.value}))} className={hCls} placeholder="VD: Giỏi tiếng Anh, có kinh nghiệm..." /></HField>
                  </div>
                </HSection>

                {/* Vé tham quan */}
                <HSection label="Vé tham quan & Dịch vụ khác">
                  <HField label="Vé tham quan"><textarea value={handover.tickets_details} onChange={e => setHandover(f => ({...f, tickets_details: e.target.value}))} rows={2} className={`${hCls} resize-none`} placeholder="VD: Vé Sun World Bà Nà Hills cho 50 người lớn, 5 trẻ em..." /></HField>
                  <div className="mt-3">
                    <label className="block text-xs text-gray-500 mb-2">Sự kiện đặc biệt</label>
                    <div className="flex flex-wrap gap-3 mb-3">
                      {([['event_gala','Gala dinner'],['event_team_building','Team building'],['event_meeting','Hội họp'],['event_birthday','Sinh nhật'],['event_anniversary','Kỷ niệm']] as [keyof typeof handover, string][]).map(([k,l]) => (
                        <label key={k} className="flex items-center gap-2 text-sm cursor-pointer">
                          <input type="checkbox" checked={handover[k] as boolean} onChange={e => setHandover(f => ({...f, [k]: e.target.checked}))} className="accent-accent-500 w-4 h-4" />
                          {l}
                        </label>
                      ))}
                    </div>
                    <HField label="Chi tiết sự kiện"><input value={handover.event_details} onChange={e => setHandover(f => ({...f, event_details: e.target.value}))} className={hCls} placeholder="Mô tả..." /></HField>
                  </div>
                  <div className="mt-3">
                    <HField label="Dịch vụ khác (tàu, thuyền, hoạt động...)"><textarea value={handover.other_services} onChange={e => setHandover(f => ({...f, other_services: e.target.value}))} rows={2} className={`${hCls} resize-none`} placeholder="..." /></HField>
                  </div>
                </HSection>

                <div className="flex justify-end pt-2">
                  <button onClick={saveHandover} disabled={savingHandover}
                    className="flex items-center gap-2 px-5 py-2.5 bg-accent-500 hover:bg-accent-600 disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-colors">
                    {savingHandover ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                    {handoverSaved ? 'Đã lưu ✓' : 'Lưu phiếu bàn giao'}
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

const hCls = 'w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 bg-white'

function HSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">{label}</div>
      <div className="bg-gray-50 rounded-xl p-3">{children}</div>
    </div>
  )
}

function HField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      {label && <label className="block text-xs text-gray-500 mb-1">{label}</label>}
      {children}
    </div>
  )
}

