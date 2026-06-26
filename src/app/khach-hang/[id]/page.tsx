'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ChevronRight, Phone, Mail, Building2, MapPin, Loader2, ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useTopbar } from '@/contexts/topbar'
import {
  SOURCE_LABELS, SOURCE_COLORS, SCORE_LABELS, SCORE_COLORS,
  STAGE_LABELS, STAGE_COLORS, formatDate, formatVND, getInitials,
} from '@/lib/utils'
import type { Contact, Opportunity, LeadScore } from '@/types'

type OppWithUser = Opportunity & {
  assigned_user: { full_name: string } | null
}

export default function ContactDetailPage() {
  const { id } = useParams<{ id: string }>()
  const supabase = createClient()
  const { setBreadcrumb, setOnRefresh } = useTopbar()

  const [contact, setContact] = useState<Contact | null>(null)
  const [opps, setOpps] = useState<OppWithUser[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    setLoading(true)
    const [{ data: c }, { data: o }] = await Promise.all([
      supabase.from('contacts').select('*').eq('id', id).single(),
      supabase.from('opportunities')
        .select('*, assigned_user:users!assigned_to(full_name)')
        .is('deleted_at', null)
        .eq('contact_id', id)
        .order('created_at', { ascending: false }),
    ])
    setContact(c as Contact | null)
    setOpps((o ?? []) as OppWithUser[])
    setLoading(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  useEffect(() => {
    loadData()
    setOnRefresh(loadData)
    return () => setOnRefresh(null)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadData])

  useEffect(() => {
    if (!contact) return
    setBreadcrumb(
      <div className="flex items-center gap-1.5 text-xs text-gray-500">
        <Link href="/khach-hang" className="hover:text-gray-700">Khách hàng</Link>
        <ChevronRight size={11} className="text-gray-300" />
        <span className="text-gray-700 font-semibold">{contact.name}</span>
      </div>
    )
    return () => setBreadcrumb(null)
  }, [contact?.name])

  if (loading) {
    return <div className="flex h-full items-center justify-center"><Loader2 className="animate-spin text-gray-300" size={28} /></div>
  }

  if (!contact) {
    return (
      <div className="p-12 text-center">
        <div className="text-5xl mb-4">🔍</div>
        <div className="text-lg font-semibold text-gray-700 mb-2">Không tìm thấy liên hệ</div>
        <Link href="/khach-hang" className="text-accent-500 hover:underline text-sm">← Quay lại Khách hàng</Link>
      </div>
    )
  }

  const activeOpps = opps.filter(o => !['lost', 'cancelled'].includes(o.stage))
  const closedOpps = opps.filter(o => ['lost', 'cancelled', 'stage_5'].includes(o.stage))
  const scoreColor = contact.lead_score ? SCORE_COLORS[contact.lead_score as LeadScore] : ''
  const scoreLabel = contact.lead_score ? SCORE_LABELS[contact.lead_score as LeadScore] : null

  return (
    <div className="p-6 max-w-[1200px] mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/khach-hang" className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
          <ArrowLeft size={18} />
        </Link>

        {/* Contact header card */}
        <div className="flex-1 bg-white rounded-2xl border border-gray-200 shadow-sm px-6 py-5 flex items-center gap-5">
          <div className="w-14 h-14 bg-gradient-to-br from-blue-100 to-indigo-200 rounded-2xl flex items-center justify-center text-lg font-bold text-brand-700 flex-shrink-0">
            {getInitials(contact.name)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap mb-1">
              <h1 className="text-xl font-bold text-gray-900">{contact.name}</h1>
              {scoreLabel && (
                <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${scoreColor}`}>{scoreLabel}</span>
              )}
              <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${SOURCE_COLORS[contact.source]}`}>
                {SOURCE_LABELS[contact.source]}
              </span>
            </div>
            <div className="flex items-center gap-4 flex-wrap text-sm text-gray-500">
              {contact.phone && (
                <span className="flex items-center gap-1.5"><Phone size={13} className="text-gray-400" />{contact.phone}</span>
              )}
              {contact.email && (
                <span className="flex items-center gap-1.5"><Mail size={13} className="text-gray-400" />{contact.email}</span>
              )}
              {contact.company && (
                <span className="flex items-center gap-1.5"><Building2 size={13} className="text-gray-400" />{contact.company}</span>
              )}
              {contact.city && (
                <span className="flex items-center gap-1.5"><MapPin size={13} className="text-gray-400" />{contact.city}</span>
              )}
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <div className="text-xs text-gray-400">Ngày thêm</div>
            <div className="text-sm font-semibold text-gray-700">{formatDate(contact.created_at)}</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-5">
        {/* Đơn hàng đang xử lý */}
        <div className="col-span-2 space-y-4">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-bold text-gray-900 text-sm">Đơn hàng đang xử lý</h2>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-brand-50 text-brand-600">{activeOpps.length}</span>
            </div>
            {activeOpps.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-gray-400">Không có đơn hàng nào đang xử lý</div>
            ) : (
              <div className="divide-y divide-gray-100">
                {activeOpps.map(opp => {
                  const sc = STAGE_COLORS[opp.stage]
                  return (
                    <Link key={opp.id} href={`/don-hang/${opp.id}`}
                      className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors group">
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-gray-900 group-hover:text-brand-700 transition-colors truncate">{opp.title}</div>
                        <div className="text-xs text-gray-400 mt-0.5">
                          {opp.assigned_user?.full_name ?? 'Chưa phân công'}
                          {opp.tour_date && <span className="ml-2">· Tour {formatDate(opp.tour_date)}</span>}
                        </div>
                      </div>
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0 ${sc.bg} ${sc.text}`}>
                        {STAGE_LABELS[opp.stage]}
                      </span>
                      {opp.estimated_value && (
                        <span className="text-sm font-bold text-gray-900 flex-shrink-0">{formatVND(opp.estimated_value)}</span>
                      )}
                      <ChevronRight size={14} className="text-gray-300 flex-shrink-0" />
                    </Link>
                  )
                })}
              </div>
            )}
          </div>

          {/* Lịch sử đơn hàng */}
          {closedOpps.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
                <h2 className="font-bold text-gray-900 text-sm">Lịch sử đơn hàng</h2>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">{closedOpps.length}</span>
              </div>
              <div className="divide-y divide-gray-100">
                {closedOpps.map(opp => {
                  const sc = STAGE_COLORS[opp.stage]
                  return (
                    <Link key={opp.id} href={`/don-hang/${opp.id}`}
                      className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 transition-colors group opacity-70 hover:opacity-100">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-700 group-hover:text-brand-700 transition-colors truncate text-sm">{opp.title}</div>
                        <div className="text-xs text-gray-400 mt-0.5">{formatDate(opp.created_at)}</div>
                      </div>
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0 ${sc.bg} ${sc.text}`}>
                        {STAGE_LABELS[opp.stage]}
                      </span>
                      {opp.actual_value && (
                        <span className="text-sm font-bold text-emerald-600 flex-shrink-0">{formatVND(opp.actual_value)}</span>
                      )}
                      <ChevronRight size={14} className="text-gray-300 flex-shrink-0" />
                    </Link>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar thông tin */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
            <h3 className="font-bold text-gray-900 text-sm mb-4">Thông tin liên hệ</h3>
            <div className="space-y-3 text-sm">
              <InfoRow label="Họ tên" value={contact.name} />
              <InfoRow label="Điện thoại" value={contact.phone} />
              <InfoRow label="Email" value={contact.email} />
              <InfoRow label="Công ty" value={contact.company} />
              <InfoRow label="Mã số thuế" value={contact.tax_code} mono />
              <InfoRow label="Khu vực" value={contact.city} />
              {contact.company_address && <InfoRow label="Địa chỉ" value={contact.company_address} />}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
            <h3 className="font-bold text-gray-900 text-sm mb-4">Phân loại</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-xs">Nguồn</span>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${SOURCE_COLORS[contact.source]}`}>
                  {SOURCE_LABELS[contact.source]}
                </span>
              </div>
              {scoreLabel && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 text-xs">Lead score</span>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${scoreColor}`}>{scoreLabel}</span>
                </div>
              )}
              <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                <span className="text-gray-400 text-xs">Tổng đơn hàng</span>
                <span className="font-bold text-gray-900">{opps.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-xs">Đang xử lý</span>
                <span className="font-semibold text-brand-600">{activeOpps.length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function InfoRow({ label, value, mono }: { label: string; value?: string | null; mono?: boolean }) {
  if (!value) return null
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-gray-400 text-xs flex-shrink-0">{label}</span>
      <span className={`text-gray-800 text-xs text-right ${mono ? 'font-mono' : 'font-medium'}`}>{value}</span>
    </div>
  )
}
