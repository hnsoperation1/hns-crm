'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Plus, X, Search, Loader2, CheckCircle2, Circle, Clock, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/auth'
import { useTopbar } from '@/contexts/topbar'
import { formatDate, getInitials } from '@/lib/utils'
import type { Issue, IssueStatus, User, Opportunity } from '@/types'

// ─── Constants ───────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<IssueStatus, { label: string; icon: React.ElementType; bg: string; text: string; border: string }> = {
  open:       { label: 'Mở',           icon: AlertCircle,   bg: 'bg-amber-50',   text: 'text-amber-700',  border: 'border-amber-200' },
  processing: { label: 'Đang xử lý',   icon: Clock,         bg: 'bg-blue-50',    text: 'text-blue-700',   border: 'border-blue-200' },
  resolved:   { label: 'Đã giải quyết', icon: CheckCircle2, bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
}

const EMPTY_FORM = {
  opportunity_id: '',
  description: '',
  assigned_to: '',
  status: 'open' as IssueStatus,
}

// ─── Page ────────────────────────────────────────────────────────────────────

type IssueRow = Issue & {
  opportunity: { id: string; title: string } | null
  assigned_user: { id: string; full_name: string } | null
  creator: { id: string; full_name: string } | null
}

export default function CSKHPage() {
  const supabase = createClient()
  const { user } = useAuth()
  const { setOnRefresh } = useTopbar()

  const [issues, setIssues] = useState<IssueRow[]>([])
  const [opps, setOpps] = useState<Pick<Opportunity, 'id' | 'title'>[]>([])
  const [users, setUsers] = useState<Pick<User, 'id' | 'full_name'>[]>([])
  const [loading, setLoading] = useState(true)
  const [showPanel, setShowPanel] = useState(false)
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [oppSearch, setOppSearch] = useState('')
  const [showOppDrop, setShowOppDrop] = useState(false)
  const oppRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (oppRef.current && !oppRef.current.contains(e.target as Node)) setShowOppDrop(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])
  const [submitting, setSubmitting] = useState(false)
  const [filterStatus, setFilterStatus] = useState<IssueStatus | 'all'>('all')
  const [search, setSearch] = useState('')
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [openStatusId, setOpenStatusId] = useState<string | null>(null)
  const [dropPos, setDropPos] = useState<{ top: number; left: number } | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClickOutsideStatus() { setOpenStatusId(null); setDropPos(null) }
    if (openStatusId) {
      document.addEventListener('mousedown', onClickOutsideStatus)
      return () => document.removeEventListener('mousedown', onClickOutsideStatus)
    }
  }, [openStatusId])

  function openDrop(e: React.MouseEvent<HTMLButtonElement>, id: string) {
    if (openStatusId === id) { setOpenStatusId(null); setDropPos(null); return }
    const rect = e.currentTarget.getBoundingClientRect()
    setDropPos({ top: rect.bottom + 6, left: rect.left })
    setOpenStatusId(id)
  }

  const loadAll = useCallback(async () => {
    const [{ data: i }, { data: o }, { data: u }] = await Promise.all([
      supabase
        .from('issues')
        .select('*, opportunity:opportunities(id,title), assigned_user:users!assigned_to(id,full_name), creator:users!created_by(id,full_name)')
        .order('created_at', { ascending: false }),
      supabase.from('opportunities').select('id, title').order('created_at', { ascending: false }),
      supabase.from('users').select('id, full_name').eq('is_active', true).order('full_name'),
    ])
    setIssues((i ?? []) as IssueRow[])
    setOpps((o ?? []) as Pick<Opportunity, 'id' | 'title'>[])
    setUsers((u ?? []) as Pick<User, 'id' | 'full_name'>[])
    setLoading(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    loadAll()
    setOnRefresh(loadAll)
    return () => setOnRefresh(null)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleSubmit() {
    if (!form.description.trim() || submitting) return
    setSubmitting(true)
    try {
      await supabase.from('issues').insert({
        opportunity_id: form.opportunity_id || null,
        description: form.description.trim(),
        assigned_to: form.assigned_to || null,
        status: form.status,
        created_by: user!.id,
      })
      await loadAll()
      setForm({ ...EMPTY_FORM })
      setOppSearch('')
      setShowPanel(false)
    } catch (err) {
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleStatusChange(id: string, status: IssueStatus) {
    setUpdatingId(id)
    await supabase.from('issues').update({ status, updated_at: new Date().toISOString() }).eq('id', id)
    setIssues(prev => prev.map(i => i.id === id ? { ...i, status } : i))
    setUpdatingId(null)
  }

  const filteredOpps = opps.filter(o =>
    !oppSearch || o.title.toLowerCase().includes(oppSearch.toLowerCase())
  )

  const filtered = issues.filter(i => {
    if (filterStatus !== 'all' && i.status !== filterStatus) return false
    if (search) {
      const q = search.toLowerCase()
      if (!i.description.toLowerCase().includes(q) &&
          !(i.opportunity?.title ?? '').toLowerCase().includes(q) &&
          !(i.assigned_user?.full_name ?? '').toLowerCase().includes(q)) return false
    }
    return true
  })

  const counts = {
    all: issues.length,
    open: issues.filter(i => i.status === 'open').length,
    processing: issues.filter(i => i.status === 'processing').length,
    resolved: issues.filter(i => i.status === 'resolved').length,
  }

  return (
    <div className="p-6 max-w-[1200px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex gap-2">
          {([
            { key: 'all', label: 'Tất cả', count: counts.all },
            { key: 'open', label: 'Mở', count: counts.open },
            { key: 'processing', label: 'Đang xử lý', count: counts.processing },
            { key: 'resolved', label: 'Đã giải quyết', count: counts.resolved },
          ] as { key: IssueStatus | 'all'; label: string; count: number }[]).map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => setFilterStatus(key)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all border ${
                filterStatus === key
                  ? 'bg-white text-gray-900 shadow-sm border-gray-200'
                  : 'text-gray-500 border-transparent hover:text-gray-700'
              }`}
            >
              {label}
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${filterStatus === key ? 'bg-brand-50 text-brand-600' : 'bg-gray-100 text-gray-400'}`}>
                {count}
              </span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Tìm issue..."
              className="pl-9 pr-4 py-2 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-400 shadow-sm w-52"
            />
          </div>
          <button
            onClick={() => setShowPanel(true)}
            className="flex items-center gap-2 bg-accent-500 hover:bg-accent-600 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors shadow-sm"
          >
            <Plus size={16} strokeWidth={2.5} />
            Tạo issue
          </button>
        </div>
      </div>

      {/* Issues list */}
      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-gray-300" size={28} /></div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm py-16 text-center">
          <Circle size={36} className="text-gray-200 mx-auto mb-3" />
          <div className="text-gray-400 text-sm">Không có issue nào</div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {['Trạng thái', 'Đơn hàng liên quan', 'Mô tả vấn đề', 'Giao cho', 'Người tạo', 'Ngày tạo'].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(issue => {
                const cfg = STATUS_CONFIG[issue.status]
                const Icon = cfg.icon
                return (
                  <tr key={issue.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3.5">
                      <button
                        onClick={e => openDrop(e, issue.id)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.bg} ${cfg.text} ${cfg.border} cursor-pointer hover:opacity-80 transition-opacity`}
                      >
                        {updatingId === issue.id ? <Loader2 size={11} className="animate-spin" /> : <Icon size={11} />}
                        {cfg.label}
                      </button>
                    </td>
                    <td className="px-5 py-3.5">
                      {issue.opportunity ? (
                        <a href={`/don-hang/${issue.opportunity.id}`} className="text-brand-600 hover:underline font-medium truncate max-w-[200px] block">
                          {issue.opportunity.title}
                        </a>
                      ) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-5 py-3.5 max-w-xs">
                      <div className="text-gray-800 line-clamp-2 leading-relaxed">{issue.description}</div>
                    </td>
                    <td className="px-5 py-3.5">
                      {issue.assigned_user ? (
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600 flex-shrink-0">
                            {getInitials(issue.assigned_user.full_name)}
                          </div>
                          <span className="text-gray-700 text-xs">{issue.assigned_user.full_name}</span>
                        </div>
                      ) : <span className="text-gray-300 text-xs">Chưa giao</span>}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-gray-500">
                      {issue.creator?.full_name ?? '—'}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-gray-400 whitespace-nowrap">
                      {formatDate(issue.created_at)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Right-side panel + backdrop */}
      {showPanel && (
        <>
          <div
            className="fixed inset-0 bg-black/30 z-30 backdrop-blur-[1px]"
            onClick={() => setShowPanel(false)}
          />
          <div ref={panelRef} className="fixed right-0 top-0 h-full w-[420px] bg-white shadow-2xl z-40 flex flex-col">
            {/* Panel header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="font-bold text-gray-900">Tạo issue mới</h2>
              <button onClick={() => setShowPanel(false)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 transition-colors">
                <X size={16} />
              </button>
            </div>

            {/* Panel body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              {/* Đơn hàng */}
              <div ref={oppRef}>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Đơn hàng liên quan</label>
                <input
                  value={oppSearch}
                  onChange={e => { setOppSearch(e.target.value); setForm(f => ({ ...f, opportunity_id: '' })); setShowOppDrop(true) }}
                  onFocus={() => setShowOppDrop(true)}
                  placeholder="Tìm tên đơn hàng..."
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                />
                {showOppDrop && !form.opportunity_id && filteredOpps.length > 0 && (
                  <div className="mt-1 border border-gray-200 rounded-xl bg-white shadow-md max-h-48 overflow-y-auto">
                    {filteredOpps.slice(0, 10).map(o => (
                      <button key={o.id} onMouseDown={e => e.preventDefault()} onClick={() => { setForm(f => ({ ...f, opportunity_id: o.id })); setOppSearch(o.title); setShowOppDrop(false) }}
                        className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0">
                        {o.title}
                      </button>
                    ))}
                  </div>
                )}
                {form.opportunity_id && (
                  <div className="mt-1.5 flex items-center gap-2 text-xs text-brand-600 font-medium">
                    <CheckCircle2 size={13} />
                    Đã chọn đơn hàng
                  </div>
                )}
              </div>

              {/* Mô tả */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Mô tả vấn đề <span className="text-red-400">*</span>
                </label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Mô tả chi tiết vấn đề phát sinh..."
                  rows={5}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 resize-none"
                />
              </div>

              {/* Giao cho */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Giao cho</label>
                <select
                  value={form.assigned_to}
                  onChange={e => setForm(f => ({ ...f, assigned_to: e.target.value }))}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 bg-white"
                >
                  <option value="">— Chưa giao —</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.full_name}</option>
                  ))}
                </select>
              </div>

              {/* Trạng thái */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Trạng thái</label>
                <div className="flex gap-2">
                  {(Object.entries(STATUS_CONFIG) as [IssueStatus, typeof STATUS_CONFIG[IssueStatus]][]).map(([s, c]) => {
                    const SI = c.icon
                    return (
                      <button
                        key={s}
                        onClick={() => setForm(f => ({ ...f, status: s }))}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                          form.status === s ? `${c.bg} ${c.text} ${c.border}` : 'border-gray-200 text-gray-400 hover:border-gray-300'
                        }`}
                      >
                        <SI size={11} />
                        {c.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Panel footer */}
            <div className="px-6 py-4 border-t border-gray-200 flex gap-3">
              <button
                onClick={() => setShowPanel(false)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={handleSubmit}
                disabled={!form.description.trim() || submitting}
                className="flex-1 px-4 py-2.5 rounded-xl bg-accent-500 hover:bg-accent-600 disabled:opacity-40 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2"
              >
                {submitting && <Loader2 size={14} className="animate-spin" />}
                Tạo issue
              </button>
            </div>
          </div>
        </>
      )}

      {/* Status dropdown — fixed position để thoát overflow */}
      {openStatusId && dropPos && (
        <div
          style={{ position: 'fixed', top: dropPos.top, left: dropPos.left, zIndex: 9999 }}
          className="bg-white rounded-xl shadow-xl border border-gray-100 py-1 min-w-[160px]"
          onMouseDown={e => e.stopPropagation()}
        >
          {(Object.entries(STATUS_CONFIG) as [IssueStatus, typeof STATUS_CONFIG[IssueStatus]][]).map(([s, c]) => {
            const SI = c.icon
            const currentIssue = issues.find(i => i.id === openStatusId)
            return (
              <button
                key={s}
                onClick={() => { handleStatusChange(openStatusId, s); setOpenStatusId(null); setDropPos(null) }}
                className={`w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-gray-50 transition-colors ${currentIssue?.status === s ? 'font-bold' : ''}`}
              >
                <SI size={13} className={c.text} />
                <span>{c.label}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
