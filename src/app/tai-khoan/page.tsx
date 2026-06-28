'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/auth'
import { createClient } from '@/lib/supabase/client'
import { useTopbar } from '@/contexts/topbar'
import { Check, Loader2 } from 'lucide-react'

export default function TaiKhoanPage() {
  const { user, refreshUser } = useAuth()
  const { setBreadcrumb } = useTopbar()
  const supabase = createClient()

  const [fullName, setFullName] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setBreadcrumb('Tài khoản')
    return () => setBreadcrumb(null)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (user) setFullName(user.full_name ?? '')
  }, [user])

  async function handleSave() {
    if (!user || !fullName.trim()) return
    setSaving(true)
    setError(null)
    setSaved(false)
    const { error: err } = await supabase
      .from('users')
      .update({ full_name: fullName.trim() })
      .eq('id', user.id)
    if (err) {
      setError('Không thể lưu. Vui lòng thử lại.')
      setSaving(false)
      return
    }
    await refreshUser()
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  if (!user) return null

  return (
    <div className="max-w-lg mx-auto px-6 py-10">
      <h1 className="text-xl font-bold text-gray-900 mb-8">Tài khoản</h1>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-5">
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Email</label>
          <div className="text-sm text-gray-700 px-3 py-2 bg-gray-50 rounded-xl border border-gray-100 select-all">
            {user.email ?? '—'}
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Họ và tên</label>
          <input
            type="text"
            value={fullName}
            onChange={e => { setFullName(e.target.value); setSaved(false) }}
            onKeyDown={e => e.key === 'Enter' && handleSave()}
            className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-400 text-gray-900"
            placeholder="Nhập họ và tên..."
          />
        </div>

        {error && <p className="text-xs text-red-500">{error}</p>}

        <div className="flex items-center gap-3 pt-1">
          <button
            onClick={handleSave}
            disabled={saving || !fullName.trim() || fullName.trim() === (user.full_name ?? '')}
            className="flex items-center gap-2 px-5 py-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : null}
            Lưu thay đổi
          </button>
          {saved && (
            <span className="flex items-center gap-1.5 text-sm text-emerald-600 font-medium">
              <Check size={14} /> Đã lưu
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
