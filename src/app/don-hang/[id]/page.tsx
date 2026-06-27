'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, ArrowRight, Phone, Mail, Building2,
  MessageSquare, Plus, CheckSquare, Square,
  Clock, CalendarDays, DollarSign, User, Pencil, CheckCircle2, X,
  ClipboardList, UserPlus, Loader2, FileText, Save, Eye, Printer, Trash2,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import DateInput from '@/components/DateInput'
import {
  STAGE_LABELS, STAGE_COLORS, SOURCE_LABELS, SOURCE_COLORS,
  formatVND, formatDate, getInitials, daysSince, daysUntil,
} from '@/lib/utils'
import type { OppStage, LogType, Opportunity, Contact, ActivityLog } from '@/types'
import { useAuth } from '@/contexts/auth'

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

type LogFilter = 'all' | 'stage_change' | 'sale_update' | 'note'
const LOG_FILTERS: { key: LogFilter; label: string }[] = [
  { key: 'all', label: 'Tất cả' },
  { key: 'stage_change', label: 'Chuyển giai đoạn' },
  { key: 'sale_update', label: 'Cập nhật sale' },
  { key: 'note', label: 'Ghi chú' },
]

// ─── Page ────────────────────────────────────────────────────────────────────

export default function OppDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const supabase = createClient()
  const { user: currentUser } = useAuth()
  const isSaleTV = currentUser?.is_sale_tv === true

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
  const [mainTab, setMainTab] = useState<'activity' | 'tasks' | 'intake' | 'services'>('services')

  // Tour services
  type ServiceRow = {
    id: string; category: string; name: string; quantity: string; unit: string
    unit_price: string; total_price: string; supplier_name: string; details: string
    notes: string; status: string; sort_order: number; include_in_quote: boolean
    requirement_note: string; sale_approved: boolean | null; sale_note: string
    _isNew?: boolean
  }
  const CATEGORY_LABELS: Record<string, string> = {
    xe: 'Xe', ks: 'Khách sạn', an_uong: 'Ăn uống', hdv_mc: 'HDV/MC',
    ve: 'Vé tham quan', gala: 'Gala', team_building: 'Team Building',
    may_bay: 'Máy bay', khac: 'Khác',
  }
  const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
    pending:   { label: 'Chờ',      cls: 'bg-gray-100 text-gray-600' },
    booked:    { label: 'Đã đặt',   cls: 'bg-blue-100 text-blue-700' },
    confirmed: { label: 'Xác nhận', cls: 'bg-emerald-100 text-emerald-700' },
    done:      { label: 'Hoàn tất', cls: 'bg-green-100 text-green-700' },
    cancelled: { label: 'Hủy',      cls: 'bg-red-100 text-red-600' },
  }
  const [services, setServices] = useState<ServiceRow[]>([])
  const [servicesLoaded, setServicesLoaded] = useState(false)
  const [savingServices, setSavingServices] = useState(false)
  const [servicesSaved, setServicesSaved] = useState(false)

  // Tour intake (dùng chung, đọc/ghi tour_intake)
  type IntakeForm = {
    pax_adults: string; pax_children_under5: string; pax_children_5to10: string
    pickup_count: string; pickup_time: string
    trip_days: string; trip_date_range: string; trip_timing: string
    hotel_stars: string; hotel_name: string; hotel_persons_per_room: string
    hotel_room_details: string; hotel_room_count: string; hotel_vip_rooms: string
    event_gala: boolean; event_team_building: boolean; event_meeting: boolean
    event_birthday: boolean; event_anniversary: boolean; event_details: string
    gala_location: string; gala_details: string; team_building_details: string
    destination: string
    group_leader_name: string; group_leader_phone: string; group_leader_email: string
    customer_type: string; flight_preference: string; tour_type: string; budget: string
    flight_depart_time: string; flight_return_time: string
    transport_car_type: string; transport_car_count: string; car_supplier: string
    meals_main_count: string; meals_main_price: string; meals_breakfast: boolean
    guide_name: string; guide_phone: string; guide_gender: string; guide_requirements: string
    itinerary: string; tickets_details: string; other_services: string
    program_goal: string; program_theme: string; improvements: string; other_notes: string
    ma_doan: string; sale_price: string; commission: string; vat_required: boolean
  }
  type MealRow = { day: number; meal: string; menu: string; restaurant: string }
  const EMPTY_INTAKE: IntakeForm = {
    pax_adults: '', pax_children_under5: '', pax_children_5to10: '',
    pickup_count: '', pickup_time: '',
    trip_days: '', trip_date_range: '', trip_timing: '',
    hotel_stars: '', hotel_name: '', hotel_persons_per_room: '',
    hotel_room_details: '', hotel_room_count: '', hotel_vip_rooms: '',
    event_gala: false, event_team_building: false, event_meeting: false,
    event_birthday: false, event_anniversary: false, event_details: '',
    gala_location: '', gala_details: '', team_building_details: '',
    destination: '',
    group_leader_name: '', group_leader_phone: '', group_leader_email: '',
    customer_type: '', flight_preference: '', tour_type: '', budget: '',
    flight_depart_time: '', flight_return_time: '',
    transport_car_type: '', transport_car_count: '', car_supplier: '',
    meals_main_count: '', meals_main_price: '', meals_breakfast: false,
    guide_name: '', guide_phone: '', guide_gender: '', guide_requirements: '',
    itinerary: '', tickets_details: '', other_services: '',
    program_goal: '', program_theme: '', improvements: '', other_notes: '',
    ma_doan: '', sale_price: '', commission: '', vat_required: false,
  }
  const [mealsSchedule, setMealsSchedule] = useState<MealRow[]>([])

  function syncMealsSchedule(days: number, current: MealRow[]) {
    const meals = ['Trưa', 'Tối']
    const rows: MealRow[] = []
    for (let d = 1; d <= days; d++) {
      for (const m of meals) {
        const existing = current.find(r => r.day === d && r.meal === m)
        rows.push(existing ?? { day: d, meal: m, menu: '', restaurant: '' })
      }
    }
    setMealsSchedule(rows)
  }

  const [intake, setIntake] = useState<IntakeForm>(EMPTY_INTAKE)
  const [pickupPoints, setPickupPoints] = useState<{ address: string; count: string }[]>([])
  const [intakeLoaded, setIntakeLoaded] = useState(false)
  const [savingIntake, setSavingIntake] = useState(false)
  const [intakeSaved, setIntakeSaved] = useState(false)
  const [showHandoverPreview, setShowHandoverPreview] = useState(false)
  const [taskDone, setTaskDone] = useState<Record<string, boolean>>({})
  const [addedTasks, setAddedTasks] = useState<{ id: string; title: string; due_date: string; assigned_to: string }[]>([])
  const [showNewTask, setShowNewTask] = useState(false)
  const [newTask, setNewTask] = useState({ title: '', due_date: '', assigned_to: '' })
  const [advancingStage, setAdvancingStage] = useState(false)
  const [markingLost, setMarkingLost] = useState(false)

  // Add log form
  const [newLogText, setNewLogText] = useState('')
  const [newLogDate, setNewLogDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [newLogType, setNewLogType] = useState<'sale_update' | 'note'>('sale_update')
  const [newLogNextStep, setNewLogNextStep] = useState('')
  const [newLogNextDue, setNewLogNextDue] = useState('')
  const [submittingLog, setSubmittingLog] = useState(false)

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
      const { data: d } = await supabase.from('tour_intake').select('*').eq('opportunity_id', id).maybeSingle()
      if (d) {
        const pCount = d.pickup_count ?? 0
        let pts: { address: string; count: string }[] = Array.from({ length: pCount }, () => ({ address: '', count: '' }))
        if (d.pickup_quantities) {
          try {
            const parsed = JSON.parse(d.pickup_quantities)
            if (Array.isArray(parsed)) pts = parsed
          } catch { /* old format */ }
        }
        setPickupPoints(pts)
        let mrows: MealRow[] = []
        if (d.meals_schedule) { try { mrows = JSON.parse(d.meals_schedule) } catch { /* ignore */ } }
        if (mrows.length === 0 && (d.trip_days ?? 0) > 0) syncMealsSchedule(d.trip_days, [])
        else setMealsSchedule(mrows)
        setIntake({
          pax_adults: d.pax_adults?.toString() ?? '',
          pax_children_under5: d.pax_children_under5?.toString() ?? '',
          pax_children_5to10: d.pax_children_5to10?.toString() ?? '',
          pickup_count: pCount.toString(), pickup_time: d.pickup_time ?? '',
          trip_days: d.trip_days?.toString() ?? '',
          trip_date_range: d.trip_date_range ?? '', trip_timing: d.trip_timing ?? '',
          hotel_stars: d.hotel_stars ?? '', hotel_name: d.hotel_name ?? '',
          hotel_persons_per_room: d.hotel_persons_per_room?.toString() ?? '',
          hotel_room_details: d.hotel_room_details ?? '',
          hotel_room_count: d.hotel_room_count?.toString() ?? '',
          hotel_vip_rooms: d.hotel_vip_rooms ?? '',
          event_gala: d.event_gala ?? false, event_team_building: d.event_team_building ?? false,
          event_meeting: d.event_meeting ?? false, event_birthday: d.event_birthday ?? false,
          event_anniversary: d.event_anniversary ?? false, event_details: d.event_details ?? '',
          gala_location: d.gala_location ?? '', gala_details: d.gala_details ?? '',
          team_building_details: d.team_building_details ?? '',
          destination: d.destination ?? '',
          group_leader_name: d.group_leader_name ?? '',
          group_leader_phone: d.group_leader_phone ?? '',
          group_leader_email: d.group_leader_email ?? '',
          customer_type: d.customer_type ?? '', flight_preference: d.flight_preference ?? '',
          tour_type: d.tour_type ?? '', budget: d.budget ?? '',
          flight_depart_time: d.flight_depart_time ?? '', flight_return_time: d.flight_return_time ?? '',
          transport_car_type: d.transport_car_type ?? '',
          transport_car_count: d.transport_car_count?.toString() ?? '',
          car_supplier: d.car_supplier ?? '',
          meals_main_count: d.meals_main_count?.toString() ?? '',
          meals_main_price: d.meals_main_price?.toString() ?? '',
          meals_breakfast: d.meals_breakfast ?? false,
          guide_name: d.guide_name ?? '', guide_phone: d.guide_phone ?? '',
          guide_gender: d.guide_gender ?? '', guide_requirements: d.guide_requirements ?? '',
          itinerary: d.itinerary ?? '', tickets_details: d.tickets_details ?? '',
          other_services: d.other_services ?? '',
          program_goal: d.program_goal ?? '', program_theme: d.program_theme ?? '',
          improvements: d.improvements ?? '', other_notes: d.other_notes ?? '',
          ma_doan: d.ma_doan ?? '', sale_price: d.sale_price?.toString() ?? '',
          commission: d.commission?.toString() ?? '', vat_required: d.vat_required ?? false,
        })
      }
      setIntakeLoaded(true)

      // Load tour_services
      const { data: svcData } = await supabase.from('tour_services')
        .select('*').eq('opportunity_id', id).order('sort_order').order('created_at')
      setServices((svcData ?? []).map((s: Record<string, unknown>) => ({
        id: s.id as string, category: (s.category as string) ?? '', name: (s.name as string) ?? '',
        quantity: s.quantity?.toString() ?? '', unit: (s.unit as string) ?? '',
        unit_price: s.unit_price?.toString() ?? '', total_price: s.total_price?.toString() ?? '',
        supplier_name: (s.supplier_name as string) ?? '', details: (s.details as string) ?? '',
        notes: (s.notes as string) ?? '', status: (s.status as string) ?? 'pending',
        sort_order: (s.sort_order as number) ?? 0, include_in_quote: (s.include_in_quote as boolean) ?? true,
        requirement_note: (s.requirement_note as string) ?? '',
        sale_approved: s.sale_approved as boolean | null ?? null,
        sale_note: (s.sale_note as string) ?? '',
      })))
      setServicesLoaded(true)
    }
    load()
  }, [id])

  function addServiceRow() {
    const newRow: ServiceRow = {
      id: `new-${Date.now()}`, category: '', name: '', quantity: '1', unit: '',
      unit_price: '', total_price: '', supplier_name: '', details: '', notes: '',
      status: 'pending', sort_order: services.length, include_in_quote: true,
      requirement_note: '', sale_approved: null, sale_note: '', _isNew: true,
    }
    setServices(s => [...s, newRow])
  }

  function updateServiceRow(idx: number, field: keyof ServiceRow, value: string | boolean | null) {
    setServices(s => s.map((row, i) => {
      if (i !== idx) return row
      const updated = { ...row, [field]: value }
      // auto-calc total nếu đổi quantity hoặc unit_price
      if (field === 'quantity' || field === 'unit_price') {
        const q = parseFloat(field === 'quantity' ? value as string : updated.quantity) || 0
        const p = parseFloat(field === 'unit_price' ? value as string : updated.unit_price) || 0
        if (q > 0 && p > 0) updated.total_price = (q * p).toString()
      }
      return updated
    }))
  }

  async function deleteServiceRow(idx: number) {
    const row = services[idx]
    if (!row._isNew) {
      await supabase.from('tour_services').delete().eq('id', row.id)
    }
    setServices(s => s.filter((_, i) => i !== idx))
  }

  async function saveServices() {
    setSavingServices(true)
    setServicesSaved(false)
    for (const row of services) {
      const payload = {
        opportunity_id: id,
        category: row.category || null,
        name: row.name,
        quantity: row.quantity ? Number(row.quantity) : null,
        unit: row.unit || null,
        unit_price: row.unit_price ? Number(row.unit_price) : null,
        total_price: row.total_price ? Number(row.total_price) : null,
        supplier_name: row.supplier_name || null,
        details: row.details || null,
        notes: row.notes || null,
        status: row.status,
        sort_order: row.sort_order,
        include_in_quote: row.include_in_quote,
        requirement_note: row.requirement_note || null,
        sale_approved: row.sale_approved,
        sale_note: row.sale_note || null,
      }
      if (row._isNew) {
        const { data, error } = await supabase.from('tour_services').insert(payload).select('id').single()
        if (error) { alert('Lỗi lưu dịch vụ: ' + error.message); setSavingServices(false); return }
        if (data) setServices(s => s.map(r => r.id === row.id ? { ...r, id: data.id, _isNew: false } : r))
      } else {
        const { error } = await supabase.from('tour_services').update(payload).eq('id', row.id)
        if (error) { alert('Lỗi cập nhật dịch vụ: ' + error.message); setSavingServices(false); return }
      }
    }
    setSavingServices(false)
    setServicesSaved(true)
    setTimeout(() => setServicesSaved(false), 2500)
  }

  async function saveIntake() {
    setSavingIntake(true)
    await supabase.from('tour_intake').upsert({
      opportunity_id: id,
      ma_doan: intake.ma_doan || null, vat_required: intake.vat_required,
      sale_price: intake.sale_price ? Number(intake.sale_price) : null,
      commission: intake.commission ? Number(intake.commission) : null,
      pax_adults: intake.pax_adults ? Number(intake.pax_adults) : null,
      pax_children_under5: intake.pax_children_under5 ? Number(intake.pax_children_under5) : null,
      pax_children_5to10: intake.pax_children_5to10 ? Number(intake.pax_children_5to10) : null,
      group_leader_name: intake.group_leader_name || null,
      group_leader_phone: intake.group_leader_phone || null,
      group_leader_email: intake.group_leader_email || null,
      pickup_location: null,
      pickup_count: pickupPoints.length || null,
      pickup_quantities: pickupPoints.length ? JSON.stringify(pickupPoints) : null,
      pickup_time: intake.pickup_time || null,
      trip_days: intake.trip_days ? Number(intake.trip_days) : null,
      trip_date_range: intake.trip_date_range || null, trip_timing: intake.trip_timing || null,
      itinerary: intake.itinerary || null,
      hotel_stars: intake.hotel_stars || null, hotel_name: intake.hotel_name || null,
      hotel_persons_per_room: intake.hotel_persons_per_room ? Number(intake.hotel_persons_per_room) : null,
      hotel_room_count: intake.hotel_room_count ? Number(intake.hotel_room_count) : null,
      hotel_room_details: intake.hotel_room_details || null,
      hotel_vip_rooms: intake.hotel_vip_rooms || null,
      transport_car_type: intake.transport_car_type || null,
      transport_car_count: intake.transport_car_count ? Number(intake.transport_car_count) : null,
      car_supplier: intake.car_supplier || null,
      flight_depart_time: intake.flight_depart_time || null,
      flight_return_time: intake.flight_return_time || null,
      meals_main_count: intake.meals_main_count ? Number(intake.meals_main_count) : null,
      meals_main_price: intake.meals_main_price ? Number(intake.meals_main_price) : null,
      meals_breakfast: intake.meals_breakfast,
      meals_schedule: mealsSchedule.length ? JSON.stringify(mealsSchedule) : null,
      guide_name: intake.guide_name || null, guide_phone: intake.guide_phone || null,
      guide_gender: intake.guide_gender || null, guide_requirements: intake.guide_requirements || null,
      tickets_details: intake.tickets_details || null,
      event_gala: intake.event_gala, event_team_building: intake.event_team_building,
      event_meeting: intake.event_meeting, event_birthday: intake.event_birthday,
      event_anniversary: intake.event_anniversary, event_details: intake.event_details || null,
      gala_location: intake.gala_location || null, gala_details: intake.gala_details || null,
      team_building_details: intake.team_building_details || null,
      destination: intake.destination || null,
      customer_type: intake.customer_type || null, flight_preference: intake.flight_preference || null,
      tour_type: intake.tour_type || null, budget: intake.budget || null,
      program_goal: intake.program_goal || null, program_theme: intake.program_theme || null,
      improvements: intake.improvements || null, other_notes: intake.other_notes || null,
      other_services: intake.other_services || null,
    }, { onConflict: 'opportunity_id' })
    setSavingIntake(false)
    setIntakeSaved(true)
    setTimeout(() => setIntakeSaved(false), 2000)
  }

  async function advanceStage() {
    if (!opp || advancingStage) return
    const nextStage = PIPELINE[PIPELINE.indexOf(opp.stage as OppStage) + 1]
    if (!nextStage) return
    setAdvancingStage(true)
    await supabase.from('opportunities').update({ stage: nextStage, stage_updated_at: new Date().toISOString() }).eq('id', id)
    await supabase.from('activity_logs').insert({
      opportunity_id: id, log_type: 'stage_change',
      stage_from: opp.stage, stage_to: nextStage,
      log_date: new Date().toISOString(), created_by: opp.created_by,
    })
    setAdvancingStage(false)
    if (nextStage === 'stage_5') {
      router.push(`/don-hang-da-xong/${id}`)
    } else {
      setOpp(o => o ? { ...o, stage: nextStage as OppStage, stage_updated_at: new Date().toISOString() } : o)
    }
  }

  async function saveLog() {
    if (!opp || !newLogText.trim() || submittingLog) return
    setSubmittingLog(true)
    const { data: inserted } = await supabase.from('activity_logs').insert({
      opportunity_id: id,
      user_id: currentUser?.id,
      log_type: newLogType,
      log_date: newLogDate || new Date().toISOString().slice(0, 10),
      description: newLogText.trim(),
      next_step: newLogNextStep.trim() || null,
      next_step_due: newLogNextDue || null,
      stage_at_log: opp.stage,
      created_by: currentUser?.id,
    }).select('*, user:users(id,full_name)').single()
    if (inserted) {
      setAllLogs(prev => [inserted as LogDetail, ...prev])
      setNewLogText('')
      setNewLogNextStep('')
      setNewLogNextDue('')
      setNewLogDate(new Date().toISOString().slice(0, 10))
      setNewLogType('sale_update')
    }
    setSubmittingLog(false)
  }

  async function deleteOpp() {
    if (!opp) return
    if (!confirm('Chuyển đơn hàng này vào thùng rác?')) return
    await supabase.from('opportunities').update({ deleted_at: new Date().toISOString() }).eq('id', id)
    router.push('/don-hang')
  }

  async function markLost() {
    if (!opp || markingLost) return
    if (!confirm('Xác nhận đánh dấu đơn hàng này là Mất đơn?')) return
    setMarkingLost(true)
    await supabase.from('opportunities').update({ stage: 'lost', stage_updated_at: new Date().toISOString() }).eq('id', id)
    await supabase.from('activity_logs').insert({
      opportunity_id: id, log_type: 'stage_change',
      stage_from: opp.stage, stage_to: 'lost',
      log_date: new Date().toISOString(), created_by: opp.created_by,
    })
    setMarkingLost(false)
    setOpp(o => o ? { ...o, stage: 'lost' as OppStage } : o)
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
              <button onClick={advanceStage} disabled={advancingStage}
                className="flex items-center gap-1.5 bg-accent-500 hover:bg-accent-600 disabled:opacity-60 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors">
                {advancingStage ? <Loader2 size={14} className="animate-spin" /> : <ArrowRight size={14} />}
                {opp.stage === 'stage_4' ? 'Hoàn thành → Đã xong' : 'Chuyển giai đoạn'}
              </button>
            )}
            {!isLost && (
              <button onClick={markLost} disabled={markingLost}
                className="px-3 py-2 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-60 text-sm font-medium transition-colors">
                {markingLost ? <Loader2 size={13} className="animate-spin inline" /> : 'Mất đơn'}
              </button>
            )}
            <button onClick={deleteOpp} title="Chuyển vào thùng rác"
              className="p-2 rounded-xl border border-gray-200 text-gray-400 hover:border-red-300 hover:text-red-500 hover:bg-red-50 transition-colors">
              <Trash2 size={15} />
            </button>
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
        <div className="p-5 max-w-[1100px] mx-auto">

          <div className="space-y-4">

            <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-2xl p-1 shadow-sm">
              <button
                onClick={() => setMainTab('services')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  mainTab === 'services' ? 'bg-accent-500 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-50'
                }`}
              >
                <DollarSign size={15} /> Dịch vụ
                {services.length > 0 && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${mainTab === 'services' ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-500'}`}>
                    {services.length}
                  </span>
                )}
              </button>
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

            {/* ══════════ DỊCH VỤ TAB ══════════ */}
            {mainTab === 'services' && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
                <div>
                  <h3 className="font-semibold text-gray-900 text-sm">Danh sách dịch vụ</h3>
                  {services.length > 0 && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      Tổng: <span className="font-semibold text-gray-700">
                        {new Intl.NumberFormat('vi-VN').format(
                          services.reduce((s, r) => s + (parseFloat(r.total_price) || 0), 0)
                        )}đ
                      </span>
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={addServiceRow}
                    className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-semibold rounded-lg transition-colors">
                    <Plus size={12} /> Thêm hạng mục
                  </button>
                  <button onClick={saveServices} disabled={savingServices}
                    className={`flex items-center gap-1.5 px-3 py-1.5 disabled:opacity-60 text-white text-xs font-semibold rounded-lg transition-colors ${servicesSaved ? 'bg-emerald-500' : 'bg-accent-500 hover:bg-accent-600'}`}>
                    {savingServices ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                    {servicesSaved ? 'Đã lưu' : 'Lưu dịch vụ'}
                  </button>
                </div>
              </div>

              {!servicesLoaded ? (
                <div className="p-8 flex justify-center"><Loader2 size={20} className="animate-spin text-gray-300" /></div>
              ) : services.length === 0 ? (
                <div className="p-12 text-center">
                  <DollarSign size={32} className="text-gray-200 mx-auto mb-3" />
                  <p className="text-sm text-gray-400">Chưa có dịch vụ nào</p>
                  <button onClick={addServiceRow} className="mt-3 text-xs text-accent-600 hover:underline font-medium">+ Thêm hạng mục đầu tiên</button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="px-3 py-2.5 text-left text-gray-400 font-semibold w-24">Hạng mục</th>
                        <th className="px-3 py-2.5 text-left text-gray-400 font-semibold">Tên dịch vụ</th>
                        <th className="px-3 py-2.5 text-left text-gray-400 font-semibold w-36">Yêu cầu KH</th>
                        <th className="px-3 py-2.5 text-left text-gray-400 font-semibold w-14">SL</th>
                        <th className="px-3 py-2.5 text-left text-gray-400 font-semibold w-16">ĐV</th>
                        <th className="px-3 py-2.5 text-left text-gray-400 font-semibold w-24">Đơn giá</th>
                        <th className="px-3 py-2.5 text-left text-gray-400 font-semibold w-24">Thành tiền</th>
                        <th className="px-3 py-2.5 text-left text-gray-400 font-semibold w-24">NCC</th>
                        <th className="px-3 py-2.5 text-left text-gray-400 font-semibold w-20">TT đặt</th>
                        <th className="px-3 py-2.5 text-center text-gray-400 font-semibold w-16">Sale OK</th>
                        <th className="px-3 py-2.5 w-8"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {services.map((row, i) => (
                        <>
                        <tr key={row.id} className={`hover:bg-gray-50/50 group ${row.sale_approved === false ? 'bg-red-50/40' : ''}`}>
                          <td className="px-2 py-1.5">
                            <select value={row.category} onChange={e => updateServiceRow(i, 'category', e.target.value)}
                              className="w-full border border-gray-200 rounded-lg px-2 py-1 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-brand-400">
                              <option value="">--</option>
                              {Object.entries(CATEGORY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                            </select>
                          </td>
                          <td className="px-2 py-1.5">
                            <input value={row.name} onChange={e => updateServiceRow(i, 'name', e.target.value)}
                              className="w-full border border-gray-200 rounded-lg px-2 py-1 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-brand-400" placeholder="Tên dịch vụ..." />
                          </td>
                          <td className="px-2 py-1.5">
                            <input value={row.requirement_note} onChange={e => updateServiceRow(i, 'requirement_note', e.target.value)}
                              className="w-full border border-amber-200 bg-amber-50 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-amber-400 placeholder:text-amber-300" placeholder="KH yêu cầu..." />
                          </td>
                          <td className="px-2 py-1.5">
                            <input type="number" value={row.quantity} onChange={e => updateServiceRow(i, 'quantity', e.target.value)}
                              className="w-full border border-gray-200 rounded-lg px-2 py-1 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-brand-400" placeholder="0" />
                          </td>
                          <td className="px-2 py-1.5">
                            <input value={row.unit} onChange={e => updateServiceRow(i, 'unit', e.target.value)}
                              className="w-full border border-gray-200 rounded-lg px-2 py-1 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-brand-400" placeholder="xe..." />
                          </td>
                          <td className="px-2 py-1.5">
                            <input type="number" value={row.unit_price} onChange={e => updateServiceRow(i, 'unit_price', e.target.value)}
                              className="w-full border border-gray-200 rounded-lg px-2 py-1 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-brand-400" placeholder="0" />
                          </td>
                          <td className="px-2 py-1.5">
                            <input type="number" value={row.total_price} onChange={e => updateServiceRow(i, 'total_price', e.target.value)}
                              className="w-full border border-gray-200 rounded-lg px-2 py-1 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-brand-400 font-semibold" placeholder="0" />
                          </td>
                          <td className="px-2 py-1.5">
                            <input value={row.supplier_name} onChange={e => updateServiceRow(i, 'supplier_name', e.target.value)}
                              className="w-full border border-gray-200 rounded-lg px-2 py-1 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-brand-400" placeholder="NCC..." />
                          </td>
                          <td className="px-2 py-1.5">
                            <select value={row.status} onChange={e => updateServiceRow(i, 'status', e.target.value)}
                              className={`w-full border border-gray-200 rounded-lg px-2 py-1 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-brand-400 ${STATUS_LABELS[row.status]?.cls ?? ''}`}>
                              {Object.entries(STATUS_LABELS).map(([v, { label }]) => <option key={v} value={v}>{label}</option>)}
                            </select>
                          </td>
                          <td className="px-2 py-1.5 text-center">
                            {isSaleTV ? (
                              <button
                                onClick={() => updateServiceRow(i, 'sale_approved',
                                  row.sale_approved === null ? true : row.sale_approved === true ? false : null
                                )}
                                title={row.sale_approved === null ? 'Chưa review — bấm để OK' : row.sale_approved ? 'Bấm để đánh dấu Sai' : 'Bấm để bỏ đánh giá'}
                                className="text-lg leading-none select-none">
                                {row.sale_approved === null ? '⬜' : row.sale_approved ? '✅' : '❌'}
                              </button>
                            ) : (
                              <span className="text-base leading-none">
                                {row.sale_approved === null ? <span className="text-gray-300 text-xs">—</span> : row.sale_approved ? '✅' : '❌'}
                              </span>
                            )}
                          </td>
                          <td className="px-2 py-1.5">
                            <button onClick={() => deleteServiceRow(i)}
                              className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-all p-1 rounded">
                              <X size={13} />
                            </button>
                          </td>
                        </tr>
                        {row.sale_approved === false && (
                          <tr key={`${row.id}-note`} className="bg-red-50/60">
                            <td colSpan={2} className="pl-3 pb-1.5 pt-0">
                              <span className="text-[10px] font-semibold text-red-500 uppercase tracking-wide">❌ Sale ghi chú:</span>
                            </td>
                            <td colSpan={9} className="pr-3 pb-1.5 pt-0">
                              {isSaleTV ? (
                                <input value={row.sale_note} onChange={e => updateServiceRow(i, 'sale_note', e.target.value)}
                                  className="w-full border border-red-200 bg-white rounded-lg px-2 py-1 text-xs text-red-700 focus:outline-none focus:ring-1 focus:ring-red-400" placeholder="Ghi chú lý do không OK..." />
                              ) : (
                                <span className="text-xs text-red-600 italic">{row.sale_note || '(chưa có ghi chú)'}</span>
                              )}
                            </td>
                          </tr>
                        )}
                        </>
                      ))}
                    </tbody>
                    {services.length > 0 && (
                      <tfoot>
                        <tr className="border-t-2 border-gray-200 bg-gray-50">
                          <td colSpan={6} className="px-3 py-2.5 text-xs font-bold text-gray-500 uppercase tracking-wider">{services.length} hạng mục</td>
                          <td className="px-3 py-2.5 text-xs font-bold text-gray-900">
                            {new Intl.NumberFormat('vi-VN').format(
                              services.reduce((s, r) => s + (parseFloat(r.total_price) || 0), 0)
                            )}đ
                          </td>
                          <td colSpan={4}></td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              )}
            </div>
            )}

            {/* ══════════ THÔNG TIN ĐOÀN TAB ══════════ */}
            {mainTab === 'intake' && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
                <h3 className="font-semibold text-gray-900 text-sm">Thông tin đoàn</h3>
                <div className="flex items-center gap-2">
                  <button onClick={() => setShowHandoverPreview(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-lg transition-colors">
                    <Eye size={12} /> Xem phiếu
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
                {/* Thông tin chung */}
                <HSection label="Thông tin chung">
                  <div className="grid grid-cols-2 gap-3">
                    <HField label="Mã đoàn"><input value={intake.ma_doan} onChange={e => setIntake(f => ({...f, ma_doan: e.target.value}))} className={hCls} placeholder="VD: HNS-2026-001" /></HField>
                    <HField label="VAT">
                      <div className="flex items-center gap-2 mt-5">
                        <input type="checkbox" id="vat_req_h" checked={intake.vat_required} onChange={e => setIntake(f => ({...f, vat_required: e.target.checked}))} className="accent-accent-500 w-4 h-4" />
                        <label htmlFor="vat_req_h" className="text-sm cursor-pointer text-gray-700">Xuất VAT</label>
                      </div>
                    </HField>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <HField label="Giá bán (VNĐ)"><input type="number" value={intake.sale_price} onChange={e => setIntake(f => ({...f, sale_price: e.target.value}))} className={hCls} placeholder="0" /></HField>
                    <HField label="COM (VNĐ)"><input type="number" value={intake.commission} onChange={e => setIntake(f => ({...f, commission: e.target.value}))} className={hCls} placeholder="0" /></HField>
                  </div>
                </HSection>

                {/* Số khách & Trưởng đoàn */}
                <HSection label="Khách hàng">
                  <div className="grid grid-cols-3 gap-3">
                    <HField label="Người lớn"><input type="number" min={0} value={intake.pax_adults} onChange={e => setIntake(f => ({...f, pax_adults: e.target.value}))} className={hCls} placeholder="0" /></HField>
                    <HField label="Trẻ em dưới 5t"><input type="number" min={0} value={intake.pax_children_under5} onChange={e => setIntake(f => ({...f, pax_children_under5: e.target.value}))} className={hCls} placeholder="0" /></HField>
                    <HField label="Trẻ em 5–10t"><input type="number" min={0} value={intake.pax_children_5to10} onChange={e => setIntake(f => ({...f, pax_children_5to10: e.target.value}))} className={hCls} placeholder="0" /></HField>
                  </div>
                  <div className="grid grid-cols-3 gap-3 mt-3">
                    <HField label="Tên trưởng đoàn"><input value={intake.group_leader_name} onChange={e => setIntake(f => ({...f, group_leader_name: e.target.value}))} className={hCls} placeholder="Nguyễn Văn A" /></HField>
                    <HField label="SĐT trưởng đoàn"><input value={intake.group_leader_phone} onChange={e => setIntake(f => ({...f, group_leader_phone: e.target.value}))} className={hCls} placeholder="0912..." /></HField>
                    <HField label="Email trưởng đoàn"><input value={intake.group_leader_email} onChange={e => setIntake(f => ({...f, group_leader_email: e.target.value}))} className={hCls} placeholder="..." /></HField>
                  </div>
                </HSection>

                {/* Điểm đón */}
                <HSection label="Điểm đón & Thời gian">
                  <div className="grid grid-cols-2 gap-3">
                    <HField label="Số điểm đón">
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
                        className={hCls} placeholder="0" />
                    </HField>
                    <HField label="Thời gian đón"><input value={intake.pickup_time} onChange={e => setIntake(f => ({...f, pickup_time: e.target.value}))} className={hCls} placeholder="VD: 6h00 ngày 01/08" /></HField>
                  </div>
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
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <HField label="Số ngày"><input type="number" min={1} value={intake.trip_days} onChange={e => setIntake(f => ({...f, trip_days: e.target.value}))} className={hCls} placeholder="2" /></HField>
                    <HField label="Ngày đi – ngày về"><input value={intake.trip_date_range} onChange={e => setIntake(f => ({...f, trip_date_range: e.target.value}))} className={hCls} placeholder="VD: 01/08 – 02/08/2026" /></HField>
                  </div>
                  <div className="mt-3">
                    <HField label="Lịch trình xác nhận"><textarea value={intake.itinerary} onChange={e => setIntake(f => ({...f, itinerary: e.target.value}))} rows={4} className={`${hCls} resize-none`} placeholder="Ngày 1: 6h00 khởi hành từ... / Ngày 2:..." /></HField>
                  </div>
                </HSection>

                {/* Khách sạn */}
                <HSection label="Khách sạn">
                  <div className="grid grid-cols-2 gap-3">
                    <HField label="Tên khách sạn"><input value={intake.hotel_name} onChange={e => setIntake(f => ({...f, hotel_name: e.target.value}))} className={hCls} placeholder="VD: Mường Thanh Grand Đà Nẵng" /></HField>
                    <HField label="Hạng sao">
                      <select value={intake.hotel_stars} onChange={e => setIntake(f => ({...f, hotel_stars: e.target.value}))} className={hCls}>
                        <option value="">— Chọn —</option>
                        <option value="3">3 sao</option>
                        <option value="4-5">4–5 sao</option>
                      </select>
                    </HField>
                  </div>
                  <div className="grid grid-cols-3 gap-3 mt-3">
                    <HField label="Tổng số phòng"><input type="number" min={0} value={intake.hotel_room_count} onChange={e => setIntake(f => ({...f, hotel_room_count: e.target.value}))} className={hCls} placeholder="0" /></HField>
                    <HField label="Số người / phòng"><input type="number" min={1} value={intake.hotel_persons_per_room} onChange={e => setIntake(f => ({...f, hotel_persons_per_room: e.target.value}))} className={hCls} placeholder="2" /></HField>
                    <HField label="Chi tiết loại phòng"><input value={intake.hotel_room_details} onChange={e => setIntake(f => ({...f, hotel_room_details: e.target.value}))} className={hCls} placeholder="VD: 10 đôi, 5 đơn" /></HField>
                  </div>
                  <div className="mt-3">
                    <HField label="Phòng VIP (nếu có)"><input value={intake.hotel_vip_rooms} onChange={e => setIntake(f => ({...f, hotel_vip_rooms: e.target.value}))} className={hCls} placeholder="VD: 2 phòng suite tầng 10 cho BGĐ" /></HField>
                  </div>
                </HSection>

                {/* Vận chuyển & Bay */}
                <HSection label="Vận chuyển & Máy bay">
                  <div className="grid grid-cols-3 gap-3">
                    <HField label="Loại xe"><input value={intake.transport_car_type} onChange={e => setIntake(f => ({...f, transport_car_type: e.target.value}))} className={hCls} placeholder="VD: Xe 45 chỗ" /></HField>
                    <HField label="Số lượng xe"><input type="number" min={0} value={intake.transport_car_count} onChange={e => setIntake(f => ({...f, transport_car_count: e.target.value}))} className={hCls} placeholder="0" /></HField>
                    <HField label="Đặt xe bên (NCC)"><input value={intake.car_supplier} onChange={e => setIntake(f => ({...f, car_supplier: e.target.value}))} className={hCls} placeholder="VD: Công ty Minh Phú" /></HField>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <HField label="Giờ bay đi"><input value={intake.flight_depart_time} onChange={e => setIntake(f => ({...f, flight_depart_time: e.target.value}))} className={hCls} placeholder="VD: VN123 6h00 01/08" /></HField>
                    <HField label="Giờ bay về"><input value={intake.flight_return_time} onChange={e => setIntake(f => ({...f, flight_return_time: e.target.value}))} className={hCls} placeholder="VD: VN456 20h30 02/08" /></HField>
                  </div>
                </HSection>

                {/* Ăn uống */}
                <HSection label="Ăn uống">
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <HField label="Giá tiêu chuẩn / bữa (VNĐ)"><input type="number" min={0} value={intake.meals_main_price} onChange={e => setIntake(f => ({...f, meals_main_price: e.target.value}))} className={hCls} placeholder="0" /></HField>
                    <HField label="">
                      <div className="flex items-center gap-2 mt-5">
                        <input type="checkbox" id="meals_breakfast" checked={intake.meals_breakfast} onChange={e => setIntake(f => ({...f, meals_breakfast: e.target.checked}))} className="accent-accent-500 w-4 h-4" />
                        <label htmlFor="meals_breakfast" className="text-sm cursor-pointer text-gray-700">Có ăn sáng</label>
                      </div>
                    </HField>
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs text-gray-500">Lịch bữa ăn (thực đơn + nhà hàng)</label>
                    {intake.trip_days && (
                      <button type="button" onClick={() => syncMealsSchedule(Number(intake.trip_days), mealsSchedule)}
                        className="text-xs text-brand-600 hover:underline font-semibold">
                        Tạo lịch {intake.trip_days} ngày
                      </button>
                    )}
                  </div>
                  {mealsSchedule.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="grid grid-cols-[56px_52px_1fr_1fr] gap-2 text-[10px] font-bold text-gray-400 uppercase px-1">
                        <span>Ngày</span><span>Bữa</span><span>Thực đơn</span><span>Nhà hàng</span>
                      </div>
                      {mealsSchedule.map((row, i) => (
                        <div key={i} className="grid grid-cols-[56px_52px_1fr_1fr] gap-2 items-center">
                          <span className="text-xs text-gray-500 text-center">Ngày {row.day}</span>
                          <span className="text-xs font-semibold text-gray-700">{row.meal}</span>
                          <input value={row.menu} onChange={e => setMealsSchedule(prev => prev.map((r,j) => j===i ? {...r, menu: e.target.value} : r))}
                            className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-brand-400 bg-white" placeholder="Thực đơn..." />
                          <input value={row.restaurant} onChange={e => setMealsSchedule(prev => prev.map((r,j) => j===i ? {...r, restaurant: e.target.value} : r))}
                            className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-brand-400 bg-white" placeholder="Nhà hàng..." />
                        </div>
                      ))}
                    </div>
                  )}
                </HSection>

                {/* HDV / MC */}
                <HSection label="Hướng dẫn viên / MC">
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <HField label="Tên HDV / MC"><input value={intake.guide_name} onChange={e => setIntake(f => ({...f, guide_name: e.target.value}))} className={hCls} placeholder="Nguyễn Văn A" /></HField>
                    <HField label="SĐT HDV / MC"><input value={intake.guide_phone} onChange={e => setIntake(f => ({...f, guide_phone: e.target.value}))} className={hCls} placeholder="0912..." /></HField>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <HField label="Giới tính">
                      <select value={intake.guide_gender} onChange={e => setIntake(f => ({...f, guide_gender: e.target.value}))} className={hCls}>
                        <option value="">— Không yêu cầu —</option>
                        <option value="male">Nam</option>
                        <option value="female">Nữ</option>
                      </select>
                    </HField>
                    <HField label="Yêu cầu thêm"><input value={intake.guide_requirements} onChange={e => setIntake(f => ({...f, guide_requirements: e.target.value}))} className={hCls} placeholder="VD: Giỏi tiếng Anh..." /></HField>
                  </div>
                </HSection>

                {/* Vé & Sự kiện */}
                <HSection label="Vé tham quan & Sự kiện">
                  <HField label="Vé tham quan"><textarea value={intake.tickets_details} onChange={e => setIntake(f => ({...f, tickets_details: e.target.value}))} rows={2} className={`${hCls} resize-none`} placeholder="VD: Vé Sun World Bà Nà Hills: 50 NL, 5 TE..." /></HField>
                  <div className="mt-3">
                    <label className="block text-xs text-gray-500 mb-2">Loại sự kiện</label>
                    <div className="flex flex-wrap gap-3">
                      {([['event_gala','Gala dinner'],['event_team_building','Team building'],['event_meeting','Hội họp'],['event_birthday','Sinh nhật'],['event_anniversary','Kỷ niệm']] as [keyof IntakeForm, string][]).map(([k,l]) => (
                        <label key={String(k)} className="flex items-center gap-2 text-sm cursor-pointer">
                          <input type="checkbox" checked={intake[k] as boolean} onChange={e => setIntake(f => ({...f, [k]: e.target.checked}))} className="accent-accent-500 w-4 h-4" />
                          {l}
                        </label>
                      ))}
                    </div>
                  </div>
                  {intake.event_gala && (
                    <div className="mt-3 space-y-2 p-3 bg-amber-50 rounded-xl border border-amber-100">
                      <p className="text-xs font-bold text-amber-700">Chi tiết Gala dinner</p>
                      <HField label="Địa điểm tổ chức"><input value={intake.gala_location} onChange={e => setIntake(f => ({...f, gala_location: e.target.value}))} className={hCls} placeholder="VD: Sân thượng KS Mường Thanh" /></HField>
                      <HField label="Bao gồm (ATAS / Back / Sảnh / Thời gian)"><textarea value={intake.gala_details} onChange={e => setIntake(f => ({...f, gala_details: e.target.value}))} rows={2} className={`${hCls} resize-none`} placeholder="VD: ATAS 1 sân khấu, Back 50m², Sảnh 18h–22h..." /></HField>
                    </div>
                  )}
                  {intake.event_team_building && (
                    <div className="mt-3 p-3 bg-blue-50 rounded-xl border border-blue-100">
                      <p className="text-xs font-bold text-blue-700 mb-2">Chi tiết Team building</p>
                      <HField label="Số game / Kịch bản / Thời gian tổ chức"><textarea value={intake.team_building_details} onChange={e => setIntake(f => ({...f, team_building_details: e.target.value}))} rows={2} className={`${hCls} resize-none`} placeholder="VD: 5 game, kịch bản Biệt đội hành động, 14h–17h ngày 2..." /></HField>
                    </div>
                  )}
                  <div className="mt-3">
                    <HField label="Lưu ý / chi tiết khác"><input value={intake.event_details} onChange={e => setIntake(f => ({...f, event_details: e.target.value}))} className={hCls} placeholder="Mô tả..." /></HField>
                  </div>
                </HSection>

                <HSection label="Dịch vụ khác">
                  <HField label="Tàu / thuyền / hoạt động thêm"><textarea value={intake.other_services} onChange={e => setIntake(f => ({...f, other_services: e.target.value}))} rows={2} className={`${hCls} resize-none`} placeholder="..." /></HField>
                </HSection>

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
                  value={newLogText}
                  onChange={e => setNewLogText(e.target.value)}
                  className="w-full text-sm border border-gray-200 rounded-xl p-3 resize-none focus:outline-none focus:ring-2 focus:ring-brand-400 bg-white placeholder-gray-400 shadow-sm"
                  placeholder="Ghi lại kết quả cuộc gọi, thông tin mới từ khách, vấn đề phát sinh..."
                  rows={3}
                />
                <div className="mt-2 flex items-center gap-2">
                  <input
                    value={newLogNextStep}
                    onChange={e => setNewLogNextStep(e.target.value)}
                    placeholder="Bước tiếp theo (tuỳ chọn)..."
                    className="flex-1 text-sm border border-amber-200 bg-amber-50 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-300 placeholder-amber-300"
                  />
                  {newLogNextStep && (
                    <div className="w-40">
                      <DateInput value={newLogNextDue} onChange={setNewLogNextDue} placeholder="Hạn chót" />
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between mt-3 gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <div className="w-40">
                      <DateInput value={newLogDate} onChange={setNewLogDate} />
                    </div>
                    <select
                      value={newLogType}
                      onChange={e => setNewLogType(e.target.value as 'sale_update' | 'note')}
                      className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-400 bg-white text-gray-600 shadow-sm">
                      <option value="sale_update">Cập nhật sale</option>
                      <option value="note">Ghi chú</option>
                    </select>
                  </div>
                  <button
                    onClick={saveLog}
                    disabled={!newLogText.trim() || submittingLog}
                    className="bg-accent-500 hover:bg-accent-600 disabled:opacity-50 text-white px-5 py-1.5 rounded-lg text-sm font-semibold transition-colors shadow-sm flex items-center gap-2">
                    {submittingLog ? <Loader2 size={13} className="animate-spin" /> : null}
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

        </div>
      </div>

      {/* ══ MODAL XEM PHIẾU BÀN GIAO ══ */}
      {showHandoverPreview && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 overflow-y-auto py-8 px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 print:hidden">
              <h2 className="font-bold text-gray-900">Xem phiếu bàn giao điều hành</h2>
              <div className="flex items-center gap-2">
                <button onClick={() => window.print()}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-lg transition-colors">
                  <Printer size={13} /> In / Xuất PDF
                </button>
                <button onClick={() => setShowHandoverPreview(false)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Phiếu */}
            <div id="handover-print" className="p-8 space-y-5 text-sm text-gray-800">
              {/* Tiêu đề */}
              <div className="text-center border-b-2 border-gray-800 pb-4">
                <div className="font-black text-xl uppercase tracking-wide">HNS TRAVEL</div>
                <div className="font-bold text-base mt-1">PHIẾU BÀN GIAO ĐIỀU HÀNH</div>
                {intake.ma_doan && <div className="text-xs text-gray-500 mt-1">Mã đoàn: {intake.ma_doan}</div>}
              </div>

              {/* Thông tin chung */}
              <PRow2 a={['Tên đoàn', opp.title]} b={['Mã đoàn', intake.ma_doan || '—']} />
              <PRow2 a={['Giá bán', intake.sale_price ? formatVND(Number(intake.sale_price)) : '—']} b={['COM', intake.commission ? formatVND(Number(intake.commission)) : '—']} />
              <PRow2 a={['VAT', intake.vat_required ? 'Có xuất VAT' : 'Không xuất VAT']} b={['Ngày đi – về', intake.trip_date_range || '—']} />

              <div className="border-t border-gray-200 pt-4">
                <PSectionTitle>Số lượng khách</PSectionTitle>
                <PRow3
                  a={['Người lớn', intake.pax_adults || '—']}
                  b={['Trẻ em dưới 5t', intake.pax_children_under5 || '—']}
                  c={['Trẻ em 5–10t', intake.pax_children_5to10 || '—']}
                />
              </div>

              <div className="border-t border-gray-200 pt-4">
                <PSectionTitle>Trưởng đoàn</PSectionTitle>
                <PRow3
                  a={['Họ tên', intake.group_leader_name || '—']}
                  b={['SĐT', intake.group_leader_phone || '—']}
                  c={['Email', intake.group_leader_email || '—']}
                />
              </div>

              {pickupPoints.length > 0 && (
                <div className="border-t border-gray-200 pt-4">
                  <PSectionTitle>Điểm đón</PSectionTitle>
                  {intake.pickup_time && <PField label="Thời gian đón" value={intake.pickup_time} />}
                  <table className="w-full mt-2 text-xs border border-gray-200">
                    <thead><tr className="bg-gray-50"><th className="px-3 py-2 text-left border-b border-gray-200 font-semibold">Điểm</th><th className="px-3 py-2 text-left border-b border-gray-200 font-semibold">Địa chỉ</th><th className="px-3 py-2 text-right border-b border-gray-200 font-semibold">Số người</th></tr></thead>
                    <tbody>{pickupPoints.map((p, i) => (
                      <tr key={i} className="border-b border-gray-100 last:border-0">
                        <td className="px-3 py-1.5 font-semibold text-gray-500">Điểm {i+1}</td>
                        <td className="px-3 py-1.5">{p.address || '—'}</td>
                        <td className="px-3 py-1.5 text-right">{p.count || '—'}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              )}

              <div className="border-t border-gray-200 pt-4">
                <PSectionTitle>Khách sạn</PSectionTitle>
                <PRow2 a={['Tên KS', intake.hotel_name || '—']} b={['Hạng', intake.hotel_stars ? `${intake.hotel_stars} sao` : '—']} />
                <PRow3 a={['Tổng phòng', intake.hotel_room_count || '—']} b={['Người/phòng', intake.hotel_persons_per_room || '—']} c={['Loại phòng', intake.hotel_room_details || '—']} />
                {intake.hotel_vip_rooms && <PField label="Phòng VIP" value={intake.hotel_vip_rooms} />}
              </div>

              <div className="border-t border-gray-200 pt-4">
                <PSectionTitle>Vận chuyển</PSectionTitle>
                <PRow3 a={['Loại xe', intake.transport_car_type || '—']} b={['Số lượng', intake.transport_car_count || '—']} c={['NCC xe', intake.car_supplier || '—']} />
                {(intake.flight_depart_time || intake.flight_return_time) && (
                  <PRow2 a={['Bay đi', intake.flight_depart_time || '—']} b={['Bay về', intake.flight_return_time || '—']} />
                )}
              </div>

              {mealsSchedule.length > 0 && (
                <div className="border-t border-gray-200 pt-4">
                  <PSectionTitle>Bữa ăn</PSectionTitle>
                  {intake.meals_main_price && <PField label="Giá tiêu chuẩn / bữa" value={formatVND(Number(intake.meals_main_price))} />}
                  {intake.meals_breakfast && <PField label="Ăn sáng" value="Có" />}
                  <table className="w-full mt-2 text-xs border border-gray-200">
                    <thead><tr className="bg-gray-50">
                      <th className="px-3 py-2 text-left border-b border-gray-200 font-semibold">Ngày</th>
                      <th className="px-3 py-2 text-left border-b border-gray-200 font-semibold">Bữa</th>
                      <th className="px-3 py-2 text-left border-b border-gray-200 font-semibold">Thực đơn</th>
                      <th className="px-3 py-2 text-left border-b border-gray-200 font-semibold">Nhà hàng</th>
                    </tr></thead>
                    <tbody>{mealsSchedule.map((r, i) => (
                      <tr key={i} className="border-b border-gray-100 last:border-0">
                        <td className="px-3 py-1.5 text-gray-500">Ngày {r.day}</td>
                        <td className="px-3 py-1.5 font-semibold">{r.meal}</td>
                        <td className="px-3 py-1.5">{r.menu || '—'}</td>
                        <td className="px-3 py-1.5">{r.restaurant || '—'}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              )}

              <div className="border-t border-gray-200 pt-4">
                <PSectionTitle>Hướng dẫn viên / MC</PSectionTitle>
                <PRow3 a={['Tên HDV/MC', intake.guide_name || '—']} b={['SĐT', intake.guide_phone || '—']} c={['Giới tính', intake.guide_gender === 'male' ? 'Nam' : intake.guide_gender === 'female' ? 'Nữ' : 'Không yêu cầu']} />
                {intake.guide_requirements && <PField label="Yêu cầu thêm" value={intake.guide_requirements} />}
              </div>

              {intake.tickets_details && (
                <div className="border-t border-gray-200 pt-4">
                  <PSectionTitle>Vé tham quan</PSectionTitle>
                  <div className="text-sm whitespace-pre-wrap">{intake.tickets_details}</div>
                </div>
              )}

              {(intake.event_gala || intake.event_team_building || intake.event_meeting || intake.event_birthday || intake.event_anniversary) && (
                <div className="border-t border-gray-200 pt-4">
                  <PSectionTitle>Sự kiện đặc biệt</PSectionTitle>
                  <div className="flex gap-2 flex-wrap mb-2">
                    {intake.event_gala && <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded text-xs font-semibold">Gala dinner</span>}
                    {intake.event_team_building && <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs font-semibold">Team building</span>}
                    {intake.event_meeting && <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs font-semibold">Hội họp</span>}
                    {intake.event_birthday && <span className="px-2 py-0.5 bg-pink-100 text-pink-700 rounded text-xs font-semibold">Sinh nhật</span>}
                    {intake.event_anniversary && <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs font-semibold">Kỷ niệm</span>}
                  </div>
                  {intake.gala_location && <PField label="Địa điểm Gala" value={intake.gala_location} />}
                  {intake.gala_details && <PField label="Gala bao gồm" value={intake.gala_details} />}
                  {intake.team_building_details && <PField label="Team building" value={intake.team_building_details} />}
                  {intake.event_details && <PField label="Lưu ý" value={intake.event_details} />}
                </div>
              )}

              {intake.itinerary && (
                <div className="border-t border-gray-200 pt-4">
                  <PSectionTitle>Lịch trình xác nhận</PSectionTitle>
                  <div className="text-sm whitespace-pre-wrap bg-gray-50 rounded-xl p-3">{intake.itinerary}</div>
                </div>
              )}

              {intake.other_services && (
                <div className="border-t border-gray-200 pt-4">
                  <PSectionTitle>Dịch vụ khác</PSectionTitle>
                  <div className="text-sm whitespace-pre-wrap">{intake.other_services}</div>
                </div>
              )}

              {/* Ký tên */}
              <div className="border-t-2 border-gray-800 pt-6 mt-6 grid grid-cols-2 gap-8 text-center text-xs">
                <div>
                  <p className="font-semibold mb-12">Sale phụ trách</p>
                  <p className="font-semibold">{opp.assigned_user?.full_name ?? '_______________'}</p>
                </div>
                <div>
                  <p className="font-semibold mb-12">Điều hành xác nhận</p>
                  <p className="font-semibold">_______________</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
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

// ── Print helpers ──────────────────────────────────────────────────────────────
function PSectionTitle({ children }: { children: React.ReactNode }) {
  return <div className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">{children}</div>
}
function PField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2 mb-1">
      <span className="text-gray-500 w-36 flex-shrink-0">{label}:</span>
      <span className="font-medium">{value}</span>
    </div>
  )
}
function PRow2({ a, b }: { a: [string, string]; b: [string, string] }) {
  return (
    <div className="grid grid-cols-2 gap-4 mb-1">
      <PField label={a[0]} value={a[1]} />
      <PField label={b[0]} value={b[1]} />
    </div>
  )
}
function PRow3({ a, b, c }: { a: [string, string]; b: [string, string]; c: [string, string] }) {
  return (
    <div className="grid grid-cols-3 gap-3 mb-1">
      <PField label={a[0]} value={a[1]} />
      <PField label={b[0]} value={b[1]} />
      <PField label={c[0]} value={c[1]} />
    </div>
  )
}

