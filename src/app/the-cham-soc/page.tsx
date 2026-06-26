'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { CheckCircle2, Circle, Clock, Phone, ChevronDown, ChevronUp, Send, Loader2, Heart, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/auth'
import { useTopbar } from '@/contexts/topbar'
import { formatDate } from '@/lib/utils'

type CareCard = {
  id: string
  feedback_id: string | null
  opportunity_id: string | null
  customer_name: string | null
  customer_phone: string | null
  content: string
  contact_date: string | null
  is_done: boolean
  created_at: string
}

type CareLog = {
  id: string
  log_content: string
  created_at: string
}

export default function TheChamsocPage() {
  const supabase = createClient()
  const { user } = useAuth()
  const { setBreadcrumb, setOnRefresh } = useTopbar()

  const [cards, setCards] = useState<CareCard[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'pending' | 'done' | 'all'>('pending')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [logsMap, setLogsMap] = useState<Record<string, CareLog[]>>({})
  const [logInput, setLogInput] = useState<Record<string, string>>({})
  const [submittingLog, setSubmittingLog] = useState<string | null>(null)
  const [togglingDone, setTogglingDone] = useState<string | null>(null)

  const loadCards = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const { data } = await supabase
      .from('care_cards')
      .select('*')
      .is('deleted_at', null)
      .eq('assigned_to', user.id)
      .order('is_done', { ascending: true })
      .order('created_at', { ascending: false })
    setCards((data ?? []) as CareCard[])
    setLoading(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  useEffect(() => {
    setBreadcrumb('Thẻ chăm sóc')
    return () => setBreadcrumb(null)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    loadCards()
    setOnRefresh(loadCards)
    return () => setOnRefresh(null)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadCards])

  async function loadLogs(cardId: string) {
    const { data } = await supabase
      .from('care_card_logs')
      .select('*')
      .eq('care_card_id', cardId)
      .order('created_at')
    setLogsMap(prev => ({ ...prev, [cardId]: (data ?? []) as CareLog[] }))
  }

  async function toggleExpand(cardId: string) {
    if (expandedId === cardId) { setExpandedId(null); return }
    setExpandedId(cardId)
    if (!logsMap[cardId]) await loadLogs(cardId)
  }

  async function submitLog(cardId: string) {
    const text = (logInput[cardId] ?? '').trim()
    if (!text) return
    setSubmittingLog(cardId)
    const { data } = await supabase.from('care_card_logs').insert({
      care_card_id: cardId,
      created_by: user?.id,
      log_content: text,
    }).select('*').single()
    if (data) {
      setLogsMap(prev => ({ ...prev, [cardId]: [...(prev[cardId] ?? []), data as CareLog] }))
      setLogInput(prev => ({ ...prev, [cardId]: '' }))
    }
    setSubmittingLog(null)
  }

  async function toggleDone(card: CareCard) {
    setTogglingDone(card.id)
    await supabase.from('care_cards').update({ is_done: !card.is_done }).eq('id', card.id)
    setCards(prev => prev.map(c => c.id === card.id ? { ...c, is_done: !c.is_done } : c))
    setTogglingDone(null)
  }

  async function deleteCard(card: CareCard) {
    await supabase.from('care_cards').update({ deleted_at: new Date().toISOString() }).eq('id', card.id)
    setCards(prev => prev.filter(c => c.id !== card.id))
  }

  const today = new Date().toISOString().slice(0, 10)

  const filtered = cards.filter(c =>
    filter === 'all' ? true : filter === 'pending' ? !c.is_done : c.is_done
  )

  const pendingCount = cards.filter(c => !c.is_done).length

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-gray-50/80">
      <div className="flex-shrink-0 px-5 pt-5 pb-3 flex items-center gap-3">
        <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-2xl p-1 shadow-sm">
          {([
            { key: 'pending', label: 'Chờ liên hệ' },
            { key: 'all',     label: 'Tất cả' },
            { key: 'done',    label: 'Đã xong' },
          ] as const).map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-1.5 ${filter === f.key ? 'bg-accent-500 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}>
              {f.label}
              {f.key === 'pending' && pendingCount > 0 && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${filter === 'pending' ? 'bg-white/25 text-white' : 'bg-gray-100 text-gray-500'}`}>
                  {pendingCount}
                </span>
              )}
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-400">{filtered.length} thẻ</p>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-5">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={24} className="animate-spin text-gray-300" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-300">
            <Heart size={40} className="mb-3" />
            <p className="text-sm">
              {filter === 'done' ? 'Chưa có thẻ nào hoàn thành'
                : filter === 'pending' ? 'Không có thẻ chờ liên hệ'
                : 'Chưa có thẻ chăm sóc nào'}
            </p>
            <p className="text-xs mt-1">Tạo thẻ từ màn Đánh giá KH</p>
          </div>
        ) : (
          <div className="space-y-3 max-w-2xl mx-auto">
            {filtered.map(card => {
              const isPast = !card.is_done && !!card.contact_date && card.contact_date < today
              const isToday = card.contact_date === today
              const cardLogs = logsMap[card.id]

              return (
                <div key={card.id} className={`rounded-2xl border shadow-sm overflow-hidden transition-all ${
                  card.is_done ? 'bg-emerald-50/60 border-emerald-100' : isPast ? 'bg-white border-red-200' : isToday ? 'bg-white border-amber-200' : 'bg-white border-gray-200'
                }`}>
                  <div className="px-4 py-3 flex items-start gap-3">
                    {/* Tick done */}
                    <button onClick={() => toggleDone(card)} disabled={!!togglingDone} className="mt-0.5 flex-shrink-0 transition-colors">
                      {togglingDone === card.id
                        ? <Loader2 size={18} className="animate-spin text-gray-300" />
                        : card.is_done
                          ? <CheckCircle2 size={18} className="text-emerald-500" />
                          : <Circle size={18} className="text-gray-300 hover:text-brand-500" />
                      }
                    </button>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`font-semibold text-sm ${card.is_done ? 'text-emerald-700' : 'text-gray-900'}`}>
                            {card.customer_name ?? '—'}
                          </span>
                          {card.customer_phone && (
                            <span className="text-xs text-gray-400 flex items-center gap-1">
                              <Phone size={10} />{card.customer_phone}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {card.contact_date && (
                            <span className={`text-[11px] font-semibold flex items-center gap-1 px-2 py-0.5 rounded-full ${
                              card.is_done ? 'bg-gray-50 text-gray-400'
                                : isPast ? 'bg-red-50 text-red-500'
                                : isToday ? 'bg-amber-50 text-amber-600'
                                : 'bg-gray-50 text-gray-500'
                            }`}>
                              <Clock size={10} />
                              {isPast ? `Quá hạn · ${formatDate(card.contact_date)}`
                                : isToday ? 'Hôm nay'
                                : formatDate(card.contact_date)}
                            </span>
                          )}
                        </div>
                      </div>
                      <p className={`text-xs mt-1 leading-relaxed ${card.is_done ? 'text-emerald-600/70' : 'text-gray-600'}`}>
                        {card.content}
                      </p>
                      {cardLogs && cardLogs.length > 0 && (
                        <p className="text-[10px] text-gray-400 mt-1">{cardLogs.length} ghi chú</p>
                      )}
                    </div>

                    {/* Expand + Delete */}
                    <div className="flex items-center gap-0.5 flex-shrink-0 mt-0.5">
                      <button onClick={() => toggleExpand(card.id)}
                        className="p-1 hover:bg-gray-100 rounded-lg text-gray-400 transition-colors">
                        {expandedId === card.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                      <button onClick={() => deleteCard(card)} title="Chuyển vào thùng rác"
                        className="p-1 hover:bg-red-50 rounded-lg text-gray-300 hover:text-red-400 transition-colors">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Logs panel */}
                  {expandedId === card.id && (
                    <div className="border-t border-gray-100 bg-gray-50/60 px-4 py-3 space-y-3">
                      {!cardLogs ? (
                        <div className="flex justify-center py-3">
                          <Loader2 size={14} className="animate-spin text-gray-300" />
                        </div>
                      ) : cardLogs.length === 0 ? (
                        <p className="text-xs text-gray-400 text-center py-1">Chưa có ghi chú — nhập bên dưới để bắt đầu</p>
                      ) : (
                        <div className="space-y-2.5">
                          {cardLogs.map(log => (
                            <div key={log.id} className="flex gap-2.5">
                              <div className="w-1.5 h-1.5 rounded-full bg-brand-400 mt-1.5 flex-shrink-0" />
                              <div className="flex-1">
                                <p className="text-xs text-gray-700 leading-relaxed">{log.log_content}</p>
                                <p className="text-[10px] text-gray-400 mt-0.5">{formatDate(log.created_at)}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="flex gap-2">
                        <input
                          value={logInput[card.id] ?? ''}
                          onChange={e => setLogInput(prev => ({ ...prev, [card.id]: e.target.value }))}
                          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitLog(card.id) } }}
                          placeholder="Ghi lại quá trình tư vấn... (Enter để gửi)"
                          className="flex-1 text-xs border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-400 bg-white"
                        />
                        <button
                          onClick={() => submitLog(card.id)}
                          disabled={submittingLog === card.id || !(logInput[card.id] ?? '').trim()}
                          className="px-3 py-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-40 text-white rounded-xl transition-colors flex-shrink-0">
                          {submittingLog === card.id ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
