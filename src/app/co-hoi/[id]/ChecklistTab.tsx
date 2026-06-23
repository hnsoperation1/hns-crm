'use client'

import { useState, useEffect } from 'react'
import { Plus, Trash2, Save, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

// ─── Types ───────────────────────────────────────────────────────────────────

type ChecklistRow = {
  _key: string       // local unique key (UUID or temp)
  id?: string        // DB id if saved
  hang_muc: string
  so_luong: string
  don_gia: string
  ten_ncc: string
  chi_tiet: string
  ghi_chu: string
  sort_order: number
}

type MealRow = {
  _key: string
  hang_muc: string
  meals: Record<string, string> // key: "d1_trua", "d1_toi", etc.
}

const DEFAULT_CHECKLIST: Omit<ChecklistRow, '_key' | 'id'>[] = [
  { hang_muc: 'Xe di chuyển', so_luong: '', don_gia: '', ten_ncc: 'Xe đặt bên nào', chi_tiet: 'Bao nhiêu xe xx chỗ', ghi_chu: '', sort_order: 0 },
  { hang_muc: 'Khách sạn',    so_luong: '', don_gia: '', ten_ncc: 'Khách sạn nào/ tiêu chuẩn', chi_tiet: 'Bao nhiêu phòng ngủ 2-3-4 - Phòng vip', ghi_chu: '', sort_order: 1 },
  { hang_muc: 'Gala',         so_luong: '', don_gia: '', ten_ncc: 'Địa điểm', chi_tiet: 'Bao gồm gì (thời gian tổ chức/ATAS/Back/sảnh)', ghi_chu: '', sort_order: 2 },
  { hang_muc: 'Team',         so_luong: '', don_gia: '', ten_ncc: '', chi_tiet: 'Số lượng game/kịch bản/thời gian tổ chức', ghi_chu: '', sort_order: 3 },
  { hang_muc: 'Vé tham quan', so_luong: '', don_gia: '', ten_ncc: '', chi_tiet: '', ghi_chu: '', sort_order: 4 },
  { hang_muc: 'HDV / MC',     so_luong: '', don_gia: '', ten_ncc: '(tên + sđt)', chi_tiet: '', ghi_chu: '', sort_order: 5 },
]

function uid() { return Math.random().toString(36).slice(2) }

function mealKey(day: number, meal: 'trua' | 'toi') { return `d${day}_${meal}` }

function mealLabel(day: number, meal: 'trua' | 'toi') {
  return `${meal === 'trua' ? 'Trưa' : 'Tối'} ngày ${day}`
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function ChecklistTab({ oppId, oppTitle, tourDate }: { oppId: string; oppTitle: string; tourDate?: string }) {
  const supabase = createClient()

  // Check List Tour
  const [rows, setRows] = useState<ChecklistRow[]>([])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Tiêu Chuẩn Ăn
  const [soNgay, setSoNgay] = useState(1)
  const [mealRows, setMealRows] = useState<MealRow[]>([
    { _key: uid(), hang_muc: 'Thực đơn', meals: {} },
    { _key: uid(), hang_muc: 'Nhà Hàng',  meals: {} },
  ])
  const [mealSaving, setMealSaving] = useState(false)
  const [mealSaved, setMealSaved] = useState(false)
  const [mealId, setMealId] = useState<string | null>(null)

  // Load
  useEffect(() => {
    async function load() {
      const [{ data: cl }, { data: ms }] = await Promise.all([
        supabase.from('tour_checklist').select('*').eq('opportunity_id', oppId).order('sort_order'),
        supabase.from('meal_standard').select('*').eq('opportunity_id', oppId).maybeSingle(),
      ])

      if (cl && cl.length > 0) {
        setRows(cl.map(r => ({
          _key: r.id,
          id: r.id,
          hang_muc: r.hang_muc ?? '',
          so_luong: r.so_luong != null ? String(r.so_luong) : '',
          don_gia: r.don_gia != null ? String(r.don_gia) : '',
          ten_ncc: r.ten_ncc ?? '',
          chi_tiet: r.chi_tiet ?? '',
          ghi_chu: r.ghi_chu ?? '',
          sort_order: r.sort_order ?? 0,
        })))
      } else {
        setRows(DEFAULT_CHECKLIST.map(r => ({ ...r, _key: uid() })))
      }

      if (ms) {
        setMealId(ms.id)
        setSoNgay(ms.so_ngay ?? 1)
        const loaded = (ms.rows ?? []) as any[]
        if (loaded.length > 0) {
          setMealRows(loaded.map((r: any) => ({ _key: uid(), hang_muc: r.hang_muc, meals: r.meals ?? {} })))
        }
      }
    }
    load()
  }, [oppId])

  // ── Checklist handlers ──────────────────────────────────────────────────────

  function updateRow(key: string, field: keyof ChecklistRow, value: string) {
    setRows(prev => prev.map(r => r._key === key ? { ...r, [field]: value } : r))
  }

  function addRow() {
    setRows(prev => [...prev, {
      _key: uid(), hang_muc: '', so_luong: '', don_gia: '',
      ten_ncc: '', chi_tiet: '', ghi_chu: '', sort_order: prev.length,
    }])
  }

  function deleteRow(key: string) {
    setRows(prev => prev.filter(r => r._key !== key))
  }

  async function saveChecklist() {
    setSaving(true)
    // Delete all existing rows for this opp, re-insert
    await supabase.from('tour_checklist').delete().eq('opportunity_id', oppId)
    const toInsert = rows.map((r, i) => ({
      opportunity_id: oppId,
      hang_muc: r.hang_muc,
      so_luong: r.so_luong ? Number(r.so_luong) : null,
      don_gia: r.don_gia ? Number(r.don_gia) : null,
      ten_ncc: r.ten_ncc || null,
      chi_tiet: r.chi_tiet || null,
      ghi_chu: r.ghi_chu || null,
      sort_order: i,
    }))
    const { data } = await supabase.from('tour_checklist').insert(toInsert).select()
    if (data) {
      setRows(prev => prev.map((r, i) => ({ ...r, id: data[i]?.id ?? r.id, _key: data[i]?.id ?? r._key })))
    }
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const total = rows.reduce((s, r) => {
    const qty = parseFloat(r.so_luong) || 0
    const price = parseFloat(r.don_gia) || 0
    return s + qty * price
  }, 0)

  // ── Meal handlers ───────────────────────────────────────────────────────────

  function updateMealRow(key: string, field: string, value: string) {
    setMealRows(prev => prev.map(r => {
      if (r._key !== key) return r
      if (field === 'hang_muc') return { ...r, hang_muc: value }
      return { ...r, meals: { ...r.meals, [field]: value } }
    }))
  }

  function addMealRow() {
    setMealRows(prev => [...prev, { _key: uid(), hang_muc: '', meals: {} }])
  }

  function deleteMealRow(key: string) {
    setMealRows(prev => prev.filter(r => r._key !== key))
  }

  async function saveMeal() {
    setMealSaving(true)
    const payload = {
      opportunity_id: oppId,
      so_ngay: soNgay,
      rows: mealRows.map(r => ({ hang_muc: r.hang_muc, meals: r.meals })),
      updated_at: new Date().toISOString(),
    }
    if (mealId) {
      await supabase.from('meal_standard').update(payload).eq('id', mealId)
    } else {
      const { data } = await supabase.from('meal_standard').insert(payload).select('id').single()
      if (data) setMealId(data.id)
    }
    setMealSaving(false)
    setMealSaved(true)
    setTimeout(() => setMealSaved(false), 2000)
  }

  // ── Meal columns ────────────────────────────────────────────────────────────

  const mealCols: { key: string; label: string }[] = []
  for (let d = 1; d <= soNgay; d++) {
    mealCols.push({ key: mealKey(d, 'trua'), label: mealLabel(d, 'trua') })
    mealCols.push({ key: mealKey(d, 'toi'), label: mealLabel(d, 'toi') })
  }

  const cellClass = 'border border-gray-200 px-2 py-1.5 text-sm focus:outline-none focus:bg-brand-50/40 bg-white w-full'
  const thClass = 'border border-gray-200 px-3 py-2 text-xs font-bold text-left bg-[#00cc00] text-white whitespace-nowrap'
  const headerThClass = 'border border-gray-200 px-3 py-2 text-xs font-bold text-left bg-[#ff9900] text-white whitespace-nowrap'

  return (
    <div className="space-y-6">

      {/* ══ CHECK LIST TOUR ══ */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-gray-900 text-sm">CHECK LIST TOUR</h3>
            <p className="text-xs text-gray-400 mt-0.5">{oppTitle}{tourDate ? ` · Tour ${tourDate}` : ''}</p>
          </div>
          <div className="flex items-center gap-2">
            {total > 0 && (
              <span className="text-sm font-bold text-brand-700">
                Tổng: {total.toLocaleString('vi-VN')}đ
              </span>
            )}
            <button onClick={saveChecklist} disabled={saving}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-accent-500 hover:bg-accent-600 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50">
              {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
              {saved ? 'Đã lưu!' : 'Lưu'}
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                {['Hạng mục', 'Số lượng', 'Đơn giá', 'Tên NCC', 'Chi tiết', 'Ghi chú', ''].map(h => (
                  <th key={h} className={headerThClass}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(row => {
                const lineTotal = (parseFloat(row.so_luong) || 0) * (parseFloat(row.don_gia) || 0)
                return (
                  <tr key={row._key} className="group hover:bg-gray-50/50 transition-colors">
                    <td className="border border-gray-200 p-0 min-w-[130px]">
                      <input value={row.hang_muc} onChange={e => updateRow(row._key, 'hang_muc', e.target.value)}
                        className={cellClass} placeholder="Hạng mục..." />
                    </td>
                    <td className="border border-gray-200 p-0 w-24">
                      <input type="number" value={row.so_luong} onChange={e => updateRow(row._key, 'so_luong', e.target.value)}
                        className={cellClass + ' text-right'} placeholder="0" />
                    </td>
                    <td className="border border-gray-200 p-0 w-32">
                      <div className="relative">
                        <input type="number" value={row.don_gia} onChange={e => updateRow(row._key, 'don_gia', e.target.value)}
                          className={cellClass + ' text-right'} placeholder="0" />
                        {lineTotal > 0 && (
                          <div className="text-[10px] text-gray-400 px-2 pb-0.5 text-right">= {lineTotal.toLocaleString('vi-VN')}đ</div>
                        )}
                      </div>
                    </td>
                    <td className="border border-gray-200 p-0 min-w-[160px]">
                      <input value={row.ten_ncc} onChange={e => updateRow(row._key, 'ten_ncc', e.target.value)}
                        className={cellClass} placeholder="Tên NCC..." />
                    </td>
                    <td className="border border-gray-200 p-0 min-w-[220px]">
                      <input value={row.chi_tiet} onChange={e => updateRow(row._key, 'chi_tiet', e.target.value)}
                        className={cellClass} placeholder="Chi tiết..." />
                    </td>
                    <td className="border border-gray-200 p-0 min-w-[160px]">
                      <input value={row.ghi_chu} onChange={e => updateRow(row._key, 'ghi_chu', e.target.value)}
                        className={cellClass} placeholder="Ghi chú..." />
                    </td>
                    <td className="border border-gray-200 px-2 w-8">
                      <button onClick={() => deleteRow(row._key)} className="text-gray-300 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100">
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                )
              })}
              {/* Total row */}
              <tr className="bg-orange-50 font-bold">
                <td className="border border-gray-200 px-3 py-2 text-sm">TỔNG</td>
                <td className="border border-gray-200" />
                <td className="border border-gray-200" />
                <td className="border border-gray-200" />
                <td className="border border-gray-200" />
                <td colSpan={2} className="border border-gray-200 px-3 py-2 text-sm text-right text-brand-700">
                  {total > 0 ? total.toLocaleString('vi-VN') + 'đ' : '—'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="px-4 py-3 border-t border-gray-100">
          <button onClick={addRow} className="flex items-center gap-1.5 text-sm text-brand-600 hover:text-brand-700 font-semibold transition-colors">
            <Plus size={14} /> Thêm hạng mục
          </button>
        </div>
      </div>

      {/* ══ TIÊU CHUẨN ĂN ══ */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h3 className="font-bold text-gray-900 text-sm">TIÊU CHUẨN ĂN</h3>
            <p className="text-xs text-gray-400 mt-0.5">Yêu cầu: Note rõ bữa GALA + Thực phẩm vàng bữa GALA</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 font-medium">Số ngày:</span>
              <input type="number" min={1} max={14} value={soNgay}
                onChange={e => setSoNgay(Math.max(1, Math.min(14, Number(e.target.value))))}
                className="w-16 border border-gray-200 rounded-lg px-2 py-1 text-sm text-center focus:outline-none focus:ring-2 focus:ring-brand-400" />
            </div>
            <button onClick={saveMeal} disabled={mealSaving}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-accent-500 hover:bg-accent-600 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50">
              {mealSaving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
              {mealSaved ? 'Đã lưu!' : 'Lưu'}
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className={thClass} style={{ minWidth: 120 }}>Hạng mục</th>
                {mealCols.map(c => (
                  <th key={c.key} className={thClass} style={{ minWidth: 140 }}>{c.label}</th>
                ))}
                <th className={thClass} style={{ minWidth: 160 }}>Note</th>
                <th className={thClass + ' w-8'}></th>
              </tr>
            </thead>
            <tbody>
              {mealRows.map(row => (
                <tr key={row._key} className="group hover:bg-gray-50/50 transition-colors">
                  <td className="border border-gray-200 p-0">
                    <input value={row.hang_muc} onChange={e => updateMealRow(row._key, 'hang_muc', e.target.value)}
                      className={cellClass} placeholder="Hạng mục..." />
                  </td>
                  {mealCols.map(c => (
                    <td key={c.key} className="border border-gray-200 p-0">
                      <textarea value={row.meals[c.key] ?? ''} onChange={e => updateMealRow(row._key, c.key, e.target.value)}
                        className={cellClass + ' resize-none'} rows={2} placeholder="..." />
                    </td>
                  ))}
                  <td className="border border-gray-200 p-0">
                    <textarea value={row.meals['note'] ?? ''} onChange={e => updateMealRow(row._key, 'note', e.target.value)}
                      className={cellClass + ' resize-none'} rows={2} placeholder="Ghi chú..." />
                  </td>
                  <td className="border border-gray-200 px-2 w-8">
                    <button onClick={() => deleteMealRow(row._key)} className="text-gray-300 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100">
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="px-4 py-3 border-t border-gray-100">
          <button onClick={addMealRow} className="flex items-center gap-1.5 text-sm text-brand-600 hover:text-brand-700 font-semibold transition-colors">
            <Plus size={14} /> Thêm hàng
          </button>
        </div>
      </div>

    </div>
  )
}
