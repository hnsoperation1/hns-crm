'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Building2, Phone, Mail, CalendarDays, DollarSign, FileText, Star } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useTopbar } from '@/contexts/topbar'
import { formatVND, formatDate, getInitials } from '@/lib/utils'

type OppInfo = {
  id: string; title: string; description: string | null
  tour_date: string | null; tour_end_date: string | null
  estimated_value: number | null; actual_value: number | null
  contact: { name: string; company?: string; phone?: string; email?: string } | null
  assigned_user: { full_name: string } | null
}

type IntakeInfo = {
  ma_doan: string | null; trip_days: number | null; trip_date_range: string | null
  pax_adults: number | null; pax_children_under5: number | null; pax_children_5to10: number | null
  destination: string | null; group_leader_name: string | null; group_leader_phone: string | null
  hotel_stars: string | null; hotel_name: string | null
  transport_car_type: string | null; transport_car_count: number | null
  guide_name: string | null; guide_phone: string | null
  itinerary: string | null; other_notes: string | null
  sale_price: number | null; commission: number | null; vat_required: boolean | null
}

type FeedbackRow = {
  id: string; respondent_name: string | null; phone: string | null
  group_name: string | null; submitted_at: string
  overall_comment: string | null; is_satisfied: boolean | null
  will_return: boolean | null; next_destination: string | null
  rating_guide_attitude: string | null; rating_guide_skill: string | null
  rating_hotel: string | null; rating_transport_quality: string | null
  rating_staff_attitude: string | null; rating_restaurant_food: string | null
}

const RATING_CLS: Record<string, string> = {
  'Rất tốt': 'bg-emerald-100 text-emerald-700',
  'Tốt': 'bg-blue-100 text-blue-700',
  'Trung bình': 'bg-amber-100 text-amber-700',
  'Kém': 'bg-red-100 text-red-500',
}

type ServiceRow = {
  id: string; category: string | null; name: string
  quantity: number | null; unit: string | null
  unit_price: number | null; total_price: number | null
  supplier_name: string | null; status: string
}

const CATEGORY_LABELS: Record<string, string> = {
  xe: 'Xe', ks: 'Khách sạn', an_uong: 'Ăn uống', hdv_mc: 'HDV/MC',
  ve: 'Vé tham quan', gala: 'Gala', team_building: 'Team Building',
  may_bay: 'Máy bay', khac: 'Khác',
}

const STATUS_CLS: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-600', booked: 'bg-blue-100 text-blue-700',
  confirmed: 'bg-emerald-100 text-emerald-700', done: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-500',
}
const STATUS_LABEL: Record<string, string> = {
  pending: 'Chờ', booked: 'Đã đặt', confirmed: 'Xác nhận', done: 'Hoàn tất', cancelled: 'Hủy',
}

export default function DaXongDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { setBreadcrumb } = useTopbar()
  const supabase = createClient()

  const [opp, setOpp] = useState<OppInfo | null>(null)
  const [intake, setIntake] = useState<IntakeInfo | null>(null)
  const [services, setServices] = useState<ServiceRow[]>([])
  const [feedbacks, setFeedbacks] = useState<FeedbackRow[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'services' | 'info' | 'feedback'>('services')

  useEffect(() => {
    setBreadcrumb('Chi tiết đơn đã xong')
    async function load() {
      const [{ data: oppData }, { data: intakeData }, { data: svcData }, { data: fbData }] = await Promise.all([
        supabase.from('opportunities')
          .select('id, title, description, tour_date, tour_end_date, estimated_value, actual_value, contact:contacts(name, company, phone, email), assigned_user:users!assigned_to(full_name)')
          .eq('id', id).single(),
        supabase.from('tour_intake').select('*').eq('opportunity_id', id).maybeSingle(),
        supabase.from('tour_services').select('*').eq('opportunity_id', id).order('sort_order').order('created_at'),
        supabase.from('feedback').select('id, respondent_name, phone, group_name, submitted_at, overall_comment, is_satisfied, will_return, next_destination, rating_guide_attitude, rating_guide_skill, rating_hotel, rating_transport_quality, rating_staff_attitude, rating_restaurant_food').eq('opportunity_id', id).order('submitted_at', { ascending: false }),
      ])
      setOpp(oppData as OppInfo | null)
      setIntake(intakeData as IntakeInfo | null)
      setServices((svcData ?? []) as ServiceRow[])
      setFeedbacks((fbData ?? []) as FeedbackRow[])
      setLoading(false)
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (loading) return <div className="flex h-full items-center justify-center"><div className="w-6 h-6 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" /></div>
  if (!opp) return <div className="p-8 text-center text-gray-400">Không tìm thấy đơn hàng</div>

  const totalServices = services.reduce((s, r) => s + (r.total_price ?? 0), 0)
  const paxTotal = (intake?.pax_adults ?? 0) + (intake?.pax_children_under5 ?? 0) + (intake?.pax_children_5to10 ?? 0)

  return (
    <div className="overflow-y-auto bg-gray-50/50" style={{ height: 'calc(100vh - 40px)' }}>
      <div className="max-w-5xl mx-auto px-6 py-6 space-y-5">

        {/* Header */}
        <div className="flex items-start gap-4">
          <Link href="/don-hang-da-xong" className="p-2 rounded-xl hover:bg-white border border-transparent hover:border-gray-200 transition-all text-gray-400 hover:text-gray-700 mt-0.5">
            <ArrowLeft size={18} />
          </Link>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-green-100 text-green-700">Đã xong</span>
              {intake?.ma_doan && <span className="text-xs text-gray-400 font-medium">{intake.ma_doan}</span>}
            </div>
            <h1 className="text-xl font-bold text-gray-900 truncate">{opp.title}</h1>
            <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
              {opp.contact && (
                <span className="flex items-center gap-1.5">
                  <Building2 size={13} /> {opp.contact.company ?? opp.contact.name}
                </span>
              )}
              {intake?.destination && (
                <span className="flex items-center gap-1.5">
                  <CalendarDays size={13} /> {intake.destination}
                </span>
              )}
              {opp.assigned_user && (
                <span className="flex items-center gap-1.5">
                  <div className="w-5 h-5 bg-slate-200 rounded-full flex items-center justify-center text-[10px] font-bold text-slate-600">{getInitials(opp.assigned_user.full_name)}</div>
                  {opp.assigned_user.full_name}
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-3 flex-shrink-0">
            <div className="text-right bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-sm">
              <p className="text-xs text-gray-400 mb-0.5">Doanh thu TT</p>
              <p className="text-base font-bold text-emerald-700">{opp.actual_value ? formatVND(opp.actual_value) : '—'}</p>
            </div>
            <div className="text-right bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-sm">
              <p className="text-xs text-gray-400 mb-0.5">Tổng dịch vụ</p>
              <p className="text-base font-bold text-gray-800">{totalServices ? formatVND(totalServices) : '—'}</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-2xl p-1 shadow-sm w-fit">
          <button onClick={() => setTab('services')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${tab === 'services' ? 'bg-accent-500 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}>
            <DollarSign size={14} /> Dịch vụ đã dùng
            {services.length > 0 && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${tab === 'services' ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-500'}`}>
                {services.length}
              </span>
            )}
          </button>
          <button onClick={() => setTab('info')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${tab === 'info' ? 'bg-accent-500 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}>
            <FileText size={14} /> Thông tin đoàn
          </button>
          <button onClick={() => setTab('feedback')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${tab === 'feedback' ? 'bg-accent-500 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}>
            <Star size={14} /> Đánh giá của KH
            {feedbacks.length > 0 && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${tab === 'feedback' ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-500'}`}>
                {feedbacks.length}
              </span>
            )}
          </button>
        </div>

        {/* Dịch vụ */}
        {tab === 'services' && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          {services.length === 0 ? (
            <div className="p-12 text-center text-gray-400 text-sm">Chưa có dịch vụ nào được ghi lại</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  {['Hạng mục','Tên dịch vụ','SL','Đơn giá','Thành tiền','NCC','TT'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {services.map(s => (
                  <tr key={s.id} className="hover:bg-gray-50/60">
                    <td className="px-4 py-3">
                      {s.category
                        ? <span className="text-xs font-semibold px-2 py-1 rounded-full bg-brand-50 text-brand-700">{CATEGORY_LABELS[s.category] ?? s.category}</span>
                        : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">{s.name}</td>
                    <td className="px-4 py-3 text-gray-600">{s.quantity != null ? `${s.quantity}${s.unit ? ' ' + s.unit : ''}` : '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{s.unit_price != null ? formatVND(s.unit_price) : '—'}</td>
                    <td className="px-4 py-3 font-semibold text-gray-900">{s.total_price != null ? formatVND(s.total_price) : '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{s.supplier_name ?? <span className="text-gray-300">—</span>}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_CLS[s.status] ?? 'bg-gray-100 text-gray-500'}`}>
                        {STATUS_LABEL[s.status] ?? s.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-200 bg-gray-50">
                  <td colSpan={4} className="px-4 py-3 text-xs font-bold text-gray-500 uppercase">{services.length} hạng mục</td>
                  <td className="px-4 py-3 font-bold text-gray-900">{formatVND(totalServices)}</td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
        )}

        {/* Thông tin đoàn */}
        {tab === 'info' && (
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-3">
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Thông tin chung</h4>
            <InfoRow label="Ngày đi" value={formatDate(opp.tour_date)} />
            <InfoRow label="Ngày về" value={formatDate(opp.tour_end_date)} />
            <InfoRow label="Số ngày" value={intake?.trip_days ? `${intake.trip_days} ngày` : null} />
            <InfoRow label="Lịch đi" value={intake?.trip_date_range} />
            <InfoRow label="Điểm đến" value={intake?.destination} />
            <InfoRow label="Số khách" value={paxTotal > 0 ? `${paxTotal} người` : null} />
            <InfoRow label="Tiêu chuẩn KS" value={intake?.hotel_stars ? `${intake.hotel_stars} sao` : null} />
            <InfoRow label="Tên KS" value={intake?.hotel_name} />
            <InfoRow label="Xe" value={intake?.transport_car_type ? `${intake.transport_car_count ?? ''} ${intake.transport_car_type}`.trim() : null} />
            <InfoRow label="HDV/MC" value={intake?.guide_name} />
          </div>

          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-3">
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Khách hàng</h4>
              {opp.contact && (
                <>
                  <InfoRow label="Tên" value={opp.contact.name} />
                  {opp.contact.company && <InfoRow label="Công ty" value={opp.contact.company} />}
                  {opp.contact.phone && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">SĐT</span>
                      <a href={`tel:${opp.contact.phone}`} className="font-medium text-brand-600 flex items-center gap-1"><Phone size={12} />{opp.contact.phone}</a>
                    </div>
                  )}
                  {opp.contact.email && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">Email</span>
                      <a href={`mailto:${opp.contact.email}`} className="font-medium text-brand-600 flex items-center gap-1"><Mail size={12} />{opp.contact.email}</a>
                    </div>
                  )}
                </>
              )}
            </div>

            {intake?.group_leader_name && (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-3">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Trưởng đoàn</h4>
                <InfoRow label="Tên" value={intake.group_leader_name} />
                <InfoRow label="SĐT" value={intake.group_leader_phone} />
              </div>
            )}

            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-3">
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Tài chính</h4>
              <InfoRow label="Giá bán" value={intake?.sale_price ? formatVND(intake.sale_price) : null} />
              <InfoRow label="Doanh thu TT" value={opp.actual_value ? formatVND(opp.actual_value) : null} />
              <InfoRow label="COM" value={intake?.commission ? formatVND(intake.commission) : null} />
              <InfoRow label="VAT" value={intake?.vat_required ? 'Có xuất VAT' : 'Không'} />
            </div>
          </div>

          {intake?.itinerary && (
            <div className="col-span-2 bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Lịch trình</h4>
              <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">{intake.itinerary}</pre>
            </div>
          )}

          {intake?.other_notes && (
            <div className="col-span-2 bg-amber-50 border border-amber-100 rounded-2xl p-5">
              <h4 className="text-xs font-bold text-amber-600 uppercase tracking-wider mb-2">Lưu ý</h4>
              <p className="text-sm text-gray-700">{intake.other_notes}</p>
            </div>
          )}
        </div>
        )}

        {/* Đánh giá của KH */}
        {tab === 'feedback' && (
          feedbacks.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-12 text-center text-gray-400 text-sm">
              Chưa có đánh giá nào từ khách hàng
            </div>
          ) : (
            <div className="space-y-3">
              {feedbacks.map(fb => {
                const ratings = [
                  fb.rating_restaurant_food, fb.rating_guide_attitude, fb.rating_guide_skill,
                  fb.rating_hotel, fb.rating_transport_quality, fb.rating_staff_attitude,
                ].filter(Boolean) as string[]
                const scoreMap: Record<string, number> = { 'Kém': 1, 'Trung bình': 2, 'Tốt': 3, 'Rất tốt': 4 }
                const avg = ratings.length ? ratings.reduce((s, r) => s + (scoreMap[r] ?? 0), 0) / ratings.length : null
                const overall = avg === null ? null : avg >= 3.5 ? 'Rất tốt' : avg >= 2.5 ? 'Tốt' : avg >= 1.5 ? 'Trung bình' : 'Kém'
                return (
                  <div key={fb.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <div className="font-semibold text-gray-900">{fb.respondent_name ?? 'Ẩn danh'}</div>
                        <div className="text-xs text-gray-400 mt-0.5 flex items-center gap-2">
                          {fb.phone && <span><Phone size={10} className="inline mr-1" />{fb.phone}</span>}
                          {fb.group_name && <span>· Đoàn: {fb.group_name}</span>}
                          <span>· {new Date(fb.submitted_at).toLocaleDateString('vi-VN')}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {overall && <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${RATING_CLS[overall]}`}>{overall}</span>}
                        {fb.is_satisfied !== null && (
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${fb.is_satisfied ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                            {fb.is_satisfied ? '✓ Hài lòng' : '✗ Không hài lòng'}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 mb-3">
                      {[
                        { label: 'Ẩm thực', val: fb.rating_restaurant_food },
                        { label: 'HDV thái độ', val: fb.rating_guide_attitude },
                        { label: 'HDV nghiệp vụ', val: fb.rating_guide_skill },
                        { label: 'Khách sạn', val: fb.rating_hotel },
                        { label: 'Phương tiện', val: fb.rating_transport_quality },
                        { label: 'Nhân viên TV', val: fb.rating_staff_attitude },
                      ].filter(x => x.val).map(({ label, val }) => (
                        <div key={label} className="flex items-center justify-between text-xs bg-gray-50 rounded-lg px-2.5 py-1.5">
                          <span className="text-gray-500">{label}</span>
                          <span className={`font-semibold px-1.5 py-0.5 rounded-full text-[11px] ${RATING_CLS[val!] ?? ''}`}>{val}</span>
                        </div>
                      ))}
                    </div>

                    {fb.overall_comment && (
                      <p className="text-sm text-gray-700 italic bg-gray-50 rounded-xl px-3 py-2 mb-2">"{fb.overall_comment}"</p>
                    )}

                    <div className="flex items-center gap-3 text-xs text-gray-400 mt-1">
                      {fb.will_return !== null && (
                        <span className={fb.will_return ? 'text-emerald-600 font-medium' : 'text-gray-400'}>
                          {fb.will_return ? '↩ Sẽ quay lại' : '↩ Không quay lại'}
                        </span>
                      )}
                      {fb.next_destination && (
                        <span className="text-brand-600 font-medium">· Quan tâm: {fb.next_destination}</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )
        )}

      </div>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null
  return (
    <div className="flex items-start justify-between text-sm gap-4">
      <span className="text-gray-400 flex-shrink-0">{label}</span>
      <span className="font-medium text-gray-800 text-right">{value}</span>
    </div>
  )
}
