'use client'

import { useState, useEffect, useCallback } from 'react'
import { Trash2, RotateCcw, X, Building2, Users, ShoppingBag, Heart, Loader2, AlertTriangle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useTopbar } from '@/contexts/topbar'
import { formatDate } from '@/lib/utils'

type Tab = 'organizations' | 'contacts' | 'opportunities' | 'care_cards'

type DeletedOrg = { id: string; name: string; tax_code: string | null; city: string | null; deleted_at: string }
type DeletedContact = { id: string; name: string; phone: string | null; company: string | null; deleted_at: string }
type DeletedOpp = { id: string; title: string; stage: string; deleted_at: string }
type DeletedCard = { id: string; content: string; customer_name: string | null; contact_date: string | null; deleted_at: string }

const TABS: { key: Tab; label: string; icon: React.ElementType; table: string }[] = [
  { key: 'organizations', label: 'Công ty', icon: Building2, table: 'organizations' },
  { key: 'contacts',      label: 'Liên hệ', icon: Users,     table: 'contacts' },
  { key: 'opportunities', label: 'Đơn hàng', icon: ShoppingBag, table: 'opportunities' },
  { key: 'care_cards',   label: 'Thẻ CS',   icon: Heart,     table: 'care_cards' },
]

const STAGE_LABELS: Record<string, string> = {
  stage_1: 'Tiềm năng', stage_2: 'Đang tư vấn',
  stage_3: 'Chốt tour', stage_4: 'Đang thực hiện',
  stage_5: 'Hoàn thành', lost: 'Mất đơn',
}

export default function ThungRacPage() {
  const supabase = createClient()
  const { setBreadcrumb, setOnRefresh } = useTopbar()
  const [tab, setTab] = useState<Tab>('organizations')
  const [orgs, setOrgs] = useState<DeletedOrg[]>([])
  const [contacts, setContacts] = useState<DeletedContact[]>([])
  const [opps, setOpps] = useState<DeletedOpp[]>([])
  const [cards, setCards] = useState<DeletedCard[]>([])
  const [loading, setLoading] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; table: string; label: string } | null>(null)
  const [actioning, setActioning] = useState<string | null>(null)

  const loadTab = useCallback(async (t: Tab) => {
    setLoading(true)
    const tableInfo = TABS.find(x => x.key === t)!
    const { data } = await supabase
      .from(tableInfo.table)
      .select('*')
      .not('deleted_at', 'is', null)
      .order('deleted_at', { ascending: false })
    if (t === 'organizations') setOrgs((data ?? []) as DeletedOrg[])
    else if (t === 'contacts') setContacts((data ?? []) as DeletedContact[])
    else if (t === 'opportunities') setOpps((data ?? []) as DeletedOpp[])
    else if (t === 'care_cards') setCards((data ?? []) as DeletedCard[])
    setLoading(false)
  }, [])

  useEffect(() => {
    setBreadcrumb('Thùng rác')
    return () => setBreadcrumb(null)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const refresh = () => loadTab(tab)
    loadTab(tab)
    setOnRefresh(refresh)
    return () => setOnRefresh(null)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab])

  async function restore(id: string, table: string) {
    setActioning(id)
    await supabase.from(table).update({ deleted_at: null }).eq('id', id)
    await loadTab(tab)
    setActioning(null)
  }

  async function permanentDelete() {
    if (!confirmDelete) return
    setActioning(confirmDelete.id)
    await supabase.from(confirmDelete.table).delete().eq('id', confirmDelete.id)
    setConfirmDelete(null)
    await loadTab(tab)
    setActioning(null)
  }

  const currentCount = tab === 'organizations' ? orgs.length
    : tab === 'contacts' ? contacts.length
    : tab === 'opportunities' ? opps.length
    : cards.length

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 px-6 pt-5 pb-3">
        <div className="flex items-center gap-3 flex-wrap">
          {TABS.map(t => {
            const count = t.key === 'organizations' ? orgs.length
              : t.key === 'contacts' ? contacts.length
              : t.key === 'opportunities' ? opps.length
              : cards.length
            return (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all border ${
                  tab === t.key
                    ? 'bg-red-50 border-red-200 text-red-700'
                    : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                }`}>
                <t.icon size={14} />
                {t.label}
                {count > 0 && (
                  <span className={`text-[10px] px-1.5 rounded-full font-bold ${tab === t.key ? 'bg-red-200 text-red-700' : 'bg-gray-100 text-gray-500'}`}>
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
        <p className="text-xs text-gray-400 mt-3">
          {currentCount} mục trong thùng rác · Khôi phục hoặc xóa vĩnh viễn
        </p>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-6 pb-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={24} className="animate-spin text-gray-300" />
          </div>
        ) : currentCount === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-300">
            <Trash2 size={40} className="mb-3" />
            <p className="text-sm">Thùng rác trống</p>
          </div>
        ) : (
          <div className="space-y-2 max-w-2xl">
            {tab === 'organizations' && orgs.map(item => (
              <TrashRow key={item.id}
                icon={<Building2 size={16} className="text-gray-400" />}
                title={item.name}
                sub={[item.tax_code, item.city].filter(Boolean).join(' · ')}
                deletedAt={item.deleted_at}
                actioning={actioning === item.id}
                onRestore={() => restore(item.id, 'organizations')}
                onDelete={() => setConfirmDelete({ id: item.id, table: 'organizations', label: item.name })}
              />
            ))}
            {tab === 'contacts' && contacts.map(item => (
              <TrashRow key={item.id}
                icon={<Users size={16} className="text-gray-400" />}
                title={item.name}
                sub={[item.phone, item.company].filter(Boolean).join(' · ')}
                deletedAt={item.deleted_at}
                actioning={actioning === item.id}
                onRestore={() => restore(item.id, 'contacts')}
                onDelete={() => setConfirmDelete({ id: item.id, table: 'contacts', label: item.name })}
              />
            ))}
            {tab === 'opportunities' && opps.map(item => (
              <TrashRow key={item.id}
                icon={<ShoppingBag size={16} className="text-gray-400" />}
                title={item.title}
                sub={STAGE_LABELS[item.stage] ?? item.stage}
                deletedAt={item.deleted_at}
                actioning={actioning === item.id}
                onRestore={() => restore(item.id, 'opportunities')}
                onDelete={() => setConfirmDelete({ id: item.id, table: 'opportunities', label: item.title })}
              />
            ))}
            {tab === 'care_cards' && cards.map(item => (
              <TrashRow key={item.id}
                icon={<Heart size={16} className="text-pink-300" />}
                title={item.customer_name ?? '—'}
                sub={item.content}
                deletedAt={item.deleted_at}
                actioning={actioning === item.id}
                onRestore={() => restore(item.id, 'care_cards')}
                onDelete={() => setConfirmDelete({ id: item.id, table: 'care_cards', label: item.customer_name ?? item.content })}
              />
            ))}
          </div>
        )}
      </div>

      {/* Confirm permanent delete modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <AlertTriangle size={18} className="text-red-500" />
              </div>
              <div>
                <p className="font-bold text-gray-900 text-sm">Xóa vĩnh viễn?</p>
                <p className="text-xs text-gray-500 mt-0.5">Không thể khôi phục sau khi xóa</p>
              </div>
            </div>
            <p className="text-sm text-gray-700 bg-gray-50 rounded-xl px-3 py-2 mb-5 line-clamp-2">"{confirmDelete.label}"</p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmDelete(null)}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-500 hover:bg-gray-50 transition-colors">
                Hủy
              </button>
              <button onClick={permanentDelete} disabled={!!actioning}
                className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5">
                {actioning ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                Xóa vĩnh viễn
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function TrashRow({ icon, title, sub, deletedAt, actioning, onRestore, onDelete }: {
  icon: React.ReactNode; title: string; sub: string
  deletedAt: string; actioning: boolean
  onRestore: () => void; onDelete: () => void
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3 flex items-center gap-3 hover:border-gray-300 transition-colors">
      <div className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center flex-shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-700 truncate">{title}</p>
        {sub && <p className="text-xs text-gray-400 truncate mt-0.5">{sub}</p>}
        <p className="text-[10px] text-gray-300 mt-0.5">Xóa lúc {formatDate(deletedAt)}</p>
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <button onClick={onRestore} disabled={actioning} title="Khôi phục"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold transition-colors disabled:opacity-50">
          {actioning ? <Loader2 size={12} className="animate-spin" /> : <RotateCcw size={12} />}
          Khôi phục
        </button>
        <button onClick={onDelete} disabled={actioning} title="Xóa vĩnh viễn"
          className="p-1.5 rounded-xl hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors disabled:opacity-50">
          <X size={14} />
        </button>
      </div>
    </div>
  )
}
