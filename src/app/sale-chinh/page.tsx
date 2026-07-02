'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, X, Loader2, Pencil, AlertTriangle, Users2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/auth'
import { useTopbar } from '@/contexts/topbar'

type SaleChinhRow = {
  id: string
  name: string
  type: string
  phone: string | null
  email: string | null
  note: string | null
  commission_rate: number
  is_active: boolean
  created_at: string
}

const TYPE_LABELS: Record<string, string> = {
  nhan_vien: 'Nhân viên',
  ctv: 'CTV',
  doi_tac: 'Đối tác',
  bod: 'BOD',
  khac: 'Khác',
}

const TYPE_COLORS: Record<string, string> = {
  nhan_vien: 'bg-blue-100 text-blue-700',
  ctv: 'bg-violet-100 text-violet-700',
  doi_tac: 'bg-emerald-100 text-emerald-700',
  bod: 'bg-amber-100 text-amber-700',
  khac: 'bg-gray-100 text-gray-600',
}

const EMPTY_FORM = {
  name: '', type: 'ctv', phone: '', email: '', note: '', commission_rate: '',
}

export default function SaleChinhPage() {
  const supabase = createClient()
  const { user } = useAuth()
  const { setBreadcrumb, setOnRefresh } = useTopbar()

  const [rows, setRows] = useState<SaleChinhRow[]>([])
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState('')
  const [filterActive, setFilterActive] = useState<'active' | 'all' | 'inactive'>('active')
  const [showModal, setShowModal] = useState(false)
  const [editRow, setEditRow] = useState<SaleChinhRow | null>(null)
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [errors, setErrors] = useState<{ name?: string }>({})
  const [saving, setSaving] = useState(false)

  const isManager = ['boss', 'admin', 'sale_admin'].includes(user?.role ?? '')

  const loadData = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('sale_chinh').select('*').order('name')
    setRows((data ?? []) as SaleChinhRow[])
    setLoading(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    setBreadcrumb('Sale chính')
    return () => setBreadcrumb(null)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    loadData()
    setOnRefresh(loadData)
    return () => setOnRefresh(null)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadData])

  function openAdd() {
    setEditRow(null)
    setForm({ ...EMPTY_FORM })
    setErrors({})
    setShowModal(true)
  }

  function openEdit(row: SaleChinhRow) {
    setEditRow(row)
    setForm({
      name: row.name,
      type: row.type,
      phone: row.phone ?? '',
      email: row.email ?? '',
      note: row.note ?? '',
      commission_rate: String(row.commission_rate),
    })
    setErrors({})
    setShowModal(true)
  }

  async function handleSave() {
    if (!form.name.trim()) { setErrors({ name: 'Bắt buộc' }); return }
    setSaving(true)
    const payload = {
      name: form.name.trim(),
      type: form.type,
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      note: form.note.trim() || null,
      commission_rate: parseFloat(form.commission_rate) || 0,
    }
    if (editRow) {
      await supabase.from('sale_chinh').update(payload).eq('id', editRow.id)
    } else {
      await supabase.from('sale_chinh').insert({ ...payload, created_by: user!.id })
    }
    setSaving(false)
    setShowModal(false)
    loadData()
  }

  async function toggleActive(row: SaleChinhRow) {
    await supabase.from('sale_chinh').update({ is_active: !row.is_active }).eq('id', row.id)
    setRows(prev => prev.map(r => r.id === row.id ? { ...r, is_active: !r.is_active } : r))
  }

  const filtered = rows.filter(r => {
    if (filterType && r.type !== filterType) return false
    if (filterActive === 'active' && !r.is_active) return false
    if (filterActive === 'inactive' && r.is_active) return false
    return true
  })

  const iField = 'w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400'

  return (
    <>
      <div className="flex flex-col h-full">
        <div className="flex-shrink-0 px-5 py-3 border-b border-gray-100 bg-white flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
            {([
              { key: 'active',   label: 'Đang hoạt động' },
              { key: 'all',      label: 'Tất cả' },
              { key: 'inactive', label: 'Ngừng' },
            ] as const).map(f => (
              <button key={f.key} onClick={() => setFilterActive(f.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${filterActive === f.key ? 'bg-white shadow-sm text-gray-800' : 'text-gray-400 hover:text-gray-600'}`}>
                {f.label}
              </button>
            ))}
          </div>
          <select value={filterType} onChange={e => setFilterType(e.target.value)}
            className="text-xs border border-gray-200 rounded-xl px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-400">
            <option value="">Tất cả loại</option>
            {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <span className="text-xs text-gray-400">{filtered.length} người</span>
          {isManager && (
            <button onClick={openAdd}
              className="ml-auto flex items-center gap-1.5 px-3 py-2 bg-accent-500 hover:bg-accent-600 text-white text-xs font-semibold rounded-xl transition-colors">
              <Plus size={13} strokeWidth={2.5} /> Thêm
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto bg-white">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10">
              <tr className="bg-gray-50 border-b border-gray-200">
                {['Tên', 'Loại', 'Liên hệ', 'Hoa hồng (%)', 'Ghi chú', 'Trạng thái', ''].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {[28, 12, 18, 10, 22, 10, 6].map((w, j) => (
                      <td key={j} className="px-5 py-4"><div className="h-3 bg-gray-100 rounded" style={{ width: `${w + (i % 3) * 4}%` }} /></td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-16 text-center">
                    <Users2 size={32} className="text-gray-200 mx-auto mb-2" />
                    <p className="text-sm text-gray-400">Chưa có Sale chính nào</p>
                  </td>
                </tr>
              ) : filtered.map(r => (
                <tr key={r.id} className={`hover:bg-gray-50/60 transition-colors ${!r.is_active ? 'opacity-50' : ''}`}>
                  <td className="px-5 py-3.5 font-semibold text-gray-900">{r.name}</td>
                  <td className="px-5 py-3.5">
                    <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${TYPE_COLORS[r.type] ?? 'bg-gray-100 text-gray-600'}`}>
                      {TYPE_LABELS[r.type] ?? r.type}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-xs text-gray-600 space-y-0.5">
                    {r.phone && <div>{r.phone}</div>}
                    {r.email && <div className="text-gray-400">{r.email}</div>}
                    {!r.phone && !r.email && <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-5 py-3.5">
                    {r.commission_rate > 0
                      ? <span className="text-sm font-semibold text-emerald-700">{r.commission_rate}%</span>
                      : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-5 py-3.5 text-xs text-gray-500 max-w-[200px]">
                    {r.note
                      ? <span className="truncate block" title={r.note}>{r.note}</span>
                      : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-5 py-3.5">
                    {isManager ? (
                      <button onClick={() => toggleActive(r)}
                        className={`text-[11px] font-semibold px-2.5 py-1 rounded-full cursor-pointer transition-colors ${r.is_active ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}>
                        {r.is_active ? 'Hoạt động' : 'Ngừng'}
                      </button>
                    ) : (
                      <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${r.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-400'}`}>
                        {r.is_active ? 'Hoạt động' : 'Ngừng'}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3.5">
                    {isManager && (
                      <button onClick={() => openEdit(r)}
                        className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-700 transition-colors">
                        <Pencil size={13} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-900">{editRow ? 'Sửa Sale chính' : 'Thêm Sale chính'}</h3>
              <button onClick={() => setShowModal(false)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400"><X size={16} /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  Tên <span className="text-red-500">*</span>
                </label>
                <input value={form.name} onChange={e => { setForm(f => ({ ...f, name: e.target.value })); setErrors({}) }}
                  placeholder="Nguyễn Văn A / CTV Bình..." autoFocus
                  className={`${iField} ${errors.name ? 'border-red-300 bg-red-50' : ''}`} />
                {errors.name && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertTriangle size={11} />{errors.name}</p>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Loại</label>
                  <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} className={iField}>
                    {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Hoa hồng mặc định (%)</label>
                  <input type="number" min="0" max="100" step="0.1"
                    value={form.commission_rate} onChange={e => setForm(f => ({ ...f, commission_rate: e.target.value }))}
                    placeholder="VD: 3.5" className={iField} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Số điện thoại</label>
                  <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                    placeholder="09x..." className={iField} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Email</label>
                  <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="abc@email.com" className={iField} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Ghi chú</label>
                <textarea value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                  rows={2} placeholder="Mối quan hệ, kênh giới thiệu..." className={`${iField} resize-none`} />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 rounded-xl text-sm text-gray-500 hover:bg-gray-100 font-medium">Huỷ</button>
              <button onClick={handleSave} disabled={saving}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-accent-500 hover:bg-accent-600 disabled:opacity-60 text-white text-sm font-semibold">
                {saving && <Loader2 size={13} className="animate-spin" />}
                {editRow ? 'Lưu thay đổi' : 'Thêm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
