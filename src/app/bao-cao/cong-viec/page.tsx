'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  CheckCircle2, Clock, AlertCircle, User, ShoppingBag,
  ChevronDown, ChevronRight, Loader2, ClipboardList, X,
} from 'lucide-react'
import DateInput from '@/components/DateInput'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/auth'
import { useTopbar } from '@/contexts/topbar'
import { formatDate, getInitials, daysUntil } from '@/lib/utils'

type TaskStatus = 'todo' | 'in_progress' | 'done'

type ReportTask = {
  id: string
  title: string
  status: TaskStatus | null
  is_done: boolean
  done_at: string | null
  due_date: string | null
  assigned_to: string | null
  created_by: string | null
  opportunity: { id: string; title: string } | null
}

type Employee = {
  id: string
  full_name: string
  role: string
}

type EmployeeGroup = {
  employee: Employee
  tasks: ReportTask[]
}

const STATUS_MAP: Record<TaskStatus, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  todo:        { label: 'Cần thực hiện', color: 'text-blue-700',   bg: 'bg-blue-50',   icon: Clock },
  in_progress: { label: 'Đang thực hiện', color: 'text-amber-700', bg: 'bg-amber-50',  icon: Clock },
  done:        { label: 'Hoàn thành',    color: 'text-emerald-700', bg: 'bg-emerald-50', icon: CheckCircle2 },
}

function getStatus(t: ReportTask): TaskStatus {
  return t.status ?? (t.is_done ? 'done' : 'todo')
}

function toDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function BaoCaoCongViecPage() {
  const { user: currentUser } = useAuth()
  const { setOnRefresh, setBreadcrumb } = useTopbar()
  const supabase = createClient()

  const [selectedDate, setSelectedDate] = useState(() => toDateStr(new Date()))
  const [groups, setGroups] = useState<EmployeeGroup[]>([])
  const [allUsers, setAllUsers] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [filterEmployee, setFilterEmployee] = useState('')
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const [tomorrowPlan, setTomorrowPlan] = useState<Record<string, string>>({})

  const isManager = ['boss', 'admin', 'sale_admin'].includes(currentUser?.role ?? '')

  useEffect(() => {
    setBreadcrumb('Báo cáo công việc')
    return () => setBreadcrumb(null)
  }, [setBreadcrumb])

  const loadData = useCallback(async () => {
    if (!currentUser?.id) { setLoading(false); return }
    setLoading(true)

    const [tasksRes, usersRes] = await Promise.all([
      supabase
        .from('tasks')
        .select('id,title,status,is_done,done_at,due_date,assigned_to,created_by,opportunity:opportunities!left(id,title)')
        .is('parent_id', null)
        .or(`due_date.eq.${selectedDate},and(is_done.eq.true,done_at.gte.${selectedDate}T00:00:00,done_at.lte.${selectedDate}T23:59:59)`),
      isManager
        ? supabase.from('users').select('id,full_name,role').eq('is_active', true).order('full_name')
        : Promise.resolve({ data: null }),
    ])

    const tasks = (tasksRes.data ?? []) as unknown as ReportTask[]
    const users = (usersRes.data ?? []) as Employee[]
    if (isManager) setAllUsers(users)

    // Build employee groups
    const empMap = new Map<string, EmployeeGroup>()

    // Pre-fill from users list (manager view)
    if (isManager) {
      for (const u of users) {
        empMap.set(u.id, { employee: u, tasks: [] })
      }
    }

    for (const task of tasks) {
      const uid = task.assigned_to ?? task.created_by
      if (!uid) continue
      if (!empMap.has(uid)) {
        const emp = users.find(u => u.id === uid) ?? { id: uid, full_name: 'Chưa xác định', role: '' }
        empMap.set(uid, { employee: emp, tasks: [] })
      }
      empMap.get(uid)!.tasks.push(task)
    }

    // Only keep groups with tasks (unless manager and filtering)
    const result = Array.from(empMap.values()).filter(g => g.tasks.length > 0)
    result.sort((a, b) => b.tasks.length - a.tasks.length)
    setGroups(result)
    setLoading(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id, selectedDate, isManager])

  useEffect(() => { loadData() }, [loadData])
  useEffect(() => {
    setOnRefresh(() => loadData)
    return () => setOnRefresh(null)
  }, [loadData, setOnRefresh])

  const displayGroups = filterEmployee
    ? groups.filter(g => g.employee.id === filterEmployee)
    : groups

  const totalTasks = displayGroups.reduce((s, g) => s + g.tasks.length, 0)
  const doneTasks  = displayGroups.reduce((s, g) => s + g.tasks.filter(t => t.is_done).length, 0)
  const pendingTasks = totalTasks - doneTasks
  const lateTasks  = displayGroups.reduce((s, g) =>
    s + g.tasks.filter(t => !t.is_done && t.due_date && daysUntil(t.due_date)! < 0).length, 0)

  function toggleCollapse(id: string) {
    setCollapsed(prev => ({ ...prev, [id]: !prev[id] }))
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* ── Toolbar ── */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200 px-5 h-12 flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 font-medium">Ngày:</span>
          <DateInput
            value={selectedDate}
            onChange={v => setSelectedDate(v)}
            className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-400 bg-gray-50 w-36"
          />
          {selectedDate !== toDateStr(new Date()) && (
            <button onClick={() => setSelectedDate(toDateStr(new Date()))}
              className="text-xs text-brand-600 hover:underline">Hôm nay</button>
          )}
        </div>
        {isManager && (
          <div className="flex items-center gap-2 ml-4">
            <User size={13} className="text-gray-400" />
            <select value={filterEmployee} onChange={e => setFilterEmployee(e.target.value)}
              className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand-400 text-gray-600">
              <option value="">Tất cả nhân viên</option>
              {allUsers.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
            </select>
            {filterEmployee && (
              <button onClick={() => setFilterEmployee('')} className="text-gray-400 hover:text-gray-600">
                <X size={13} />
              </button>
            )}
          </div>
        )}
        <div className="ml-auto flex items-center gap-4 text-xs">
          <span className="text-gray-500">{totalTasks} công việc</span>
          <span className="text-emerald-600 font-medium">{doneTasks} xong</span>
          <span className="text-amber-600 font-medium">{pendingTasks} chờ</span>
          {lateTasks > 0 && <span className="text-red-600 font-medium">{lateTasks} trễ hạn</span>}
        </div>
      </div>

      {/* ── Content ── */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 size={24} className="animate-spin text-gray-300" />
        </div>
      ) : displayGroups.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-gray-400">
          <ClipboardList size={40} className="text-gray-200" />
          <p className="text-sm">Không có công việc nào trong ngày này</p>
        </div>
      ) : (
        <div className="flex-1 overflow-auto p-5 space-y-4">
          {displayGroups.map(({ employee, tasks }) => {
            const doneCount = tasks.filter(t => t.is_done).length
            const pct = tasks.length > 0 ? Math.round(doneCount / tasks.length * 100) : 0
            const isOpen = !collapsed[employee.id]
            return (
              <div key={employee.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                {/* Employee header */}
                <button
                  onClick={() => toggleCollapse(employee.id)}
                  className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50/70 transition-colors text-left"
                >
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                    style={{ background: 'linear-gradient(135deg,#0e6a95,#052f43)' }}>
                    {getInitials(employee.full_name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-800">{employee.full_name}</span>
                      <span className="text-[10px] text-gray-400 font-medium">{tasks.length} công việc</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 max-w-[180px] h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-1.5 rounded-full transition-all duration-500"
                          style={{ width: `${pct}%`, background: pct === 100 ? '#10b981' : '#3b82f6' }} />
                      </div>
                      <span className="text-[10px] font-bold text-gray-500">{doneCount}/{tasks.length} · {pct}%</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mr-2">
                    {doneCount > 0 && (
                      <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                        {doneCount} xong
                      </span>
                    )}
                    {tasks.filter(t => !t.is_done).length > 0 && (
                      <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                        {tasks.filter(t => !t.is_done).length} chờ
                      </span>
                    )}
                    {tasks.filter(t => !t.is_done && t.due_date && daysUntil(t.due_date)! < 0).length > 0 && (
                      <span className="text-[10px] font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-full flex items-center gap-0.5">
                        <AlertCircle size={9} />
                        {tasks.filter(t => !t.is_done && t.due_date && daysUntil(t.due_date)! < 0).length} trễ
                      </span>
                    )}
                  </div>
                  {isOpen ? <ChevronDown size={15} className="text-gray-400 flex-shrink-0" /> : <ChevronRight size={15} className="text-gray-400 flex-shrink-0" />}
                </button>

                {/* Task list */}
                {isOpen && (
                  <div className="border-t border-gray-100 overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-100">
                          <th className="px-5 py-2 text-left font-semibold text-gray-400 w-44">Đơn hàng</th>
                          <th className="px-4 py-2 text-left font-semibold text-gray-400">Nội dung công việc</th>
                          <th className="px-4 py-2 text-left font-semibold text-gray-400 w-36">Tình trạng</th>
                          <th className="px-4 py-2 text-left font-semibold text-gray-400 w-60">Kế hoạch ngày mai</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {tasks.map(task => {
                          const st = getStatus(task)
                          const cfg = STATUS_MAP[st]
                          const td = task.due_date ? daysUntil(task.due_date) : null
                          const isLate = !task.is_done && td !== null && td < 0
                          return (
                            <tr key={task.id} className="hover:bg-gray-50/60">
                              <td className="px-5 py-2.5">
                                {task.opportunity ? (
                                  <Link href={`/don-hang/${task.opportunity.id}`}
                                    className="flex items-center gap-1 text-gray-500 hover:text-accent-600 truncate max-w-[160px]">
                                    <ShoppingBag size={9} className="flex-shrink-0" />
                                    <span className="truncate">{task.opportunity.title}</span>
                                  </Link>
                                ) : (
                                  <span className="text-gray-300">—</span>
                                )}
                              </td>
                              <td className="px-4 py-2.5">
                                <Link href={`/cong-viec/${task.id}`}
                                  className={`font-medium hover:underline ${task.is_done ? 'line-through text-gray-400' : 'text-gray-800 hover:text-accent-600'}`}>
                                  {task.title}
                                </Link>
                                {task.due_date && (
                                  <div className={`text-[10px] mt-0.5 ${isLate ? 'text-red-500' : td !== null && td <= 3 ? 'text-amber-500' : 'text-gray-400'}`}>
                                    {isLate ? `Trễ ${Math.abs(td!)} ngày` : `Hạn ${formatDate(task.due_date)}`}
                                  </div>
                                )}
                              </td>
                              <td className="px-4 py-2.5">
                                <span className={`inline-flex items-center gap-1 font-semibold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>
                                  {task.is_done
                                    ? <CheckCircle2 size={9} />
                                    : isLate ? <AlertCircle size={9} /> : <Clock size={9} />}
                                  {cfg.label}
                                </span>
                              </td>
                              <td className="px-4 py-2">
                                <input
                                  type="text"
                                  value={tomorrowPlan[task.id] ?? ''}
                                  onChange={e => setTomorrowPlan(prev => ({ ...prev, [task.id]: e.target.value }))}
                                  placeholder="Nhập kế hoạch..."
                                  className="w-full text-xs text-gray-700 placeholder-gray-300 bg-transparent border-b border-dashed border-gray-200 focus:border-brand-400 focus:outline-none py-0.5 transition-colors"
                                />
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
