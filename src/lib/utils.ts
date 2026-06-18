import type { OppStage, LeadSource, LeadScore, CustomerTier } from '@/types'

export function formatVND(amount: number): string {
  if (amount >= 1_000_000_000) return `${(amount / 1_000_000_000).toFixed(1)} tỷ`
  if (amount >= 1_000_000) return `${Math.round(amount / 1_000_000)} triệu`
  return amount.toLocaleString('vi-VN') + ' đ'
}

export function getInitials(name: string): string {
  const parts = name.trim().split(' ')
  if (parts.length === 1) return parts[0][0].toUpperCase()
  return (parts[parts.length - 2][0] + parts[parts.length - 1][0]).toUpperCase()
}

export function formatDate(d: string): string {
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y}`
}

const NOW = new Date('2026-06-08')

export function daysUntil(dateStr: string): number {
  return Math.floor((new Date(dateStr).getTime() - NOW.getTime()) / 86400000)
}

export function daysSince(dateStr: string): number {
  return Math.floor((NOW.getTime() - new Date(dateStr).getTime()) / 86400000)
}

export const STAGE_LABELS: Record<OppStage, string> = {
  stage_1: 'GĐ1 · Tư vấn',
  stage_2: 'GĐ2 · Báo giá',
  stage_3: 'GĐ3 · Trước tour',
  stage_4: 'GĐ4 · Trong tour',
  stage_5: 'GĐ5 · Sau tour',
  lost: 'Mất đơn',
  cancelled: 'Hủy',
}

export const STAGE_SHORT: Record<OppStage, string> = {
  stage_1: 'GĐ1', stage_2: 'GĐ2', stage_3: 'GĐ3',
  stage_4: 'GĐ4', stage_5: 'GĐ5', lost: 'Mất', cancelled: 'Hủy',
}

export const STAGE_COLORS: Record<OppStage, { bg: string; text: string; border: string; dot: string; side: string; col: string }> = {
  stage_1: { bg: 'bg-blue-50',    text: 'text-blue-700',    border: 'border-blue-200',    dot: 'bg-blue-500',    side: 'border-l-blue-500',    col: 'bg-blue-500' },
  stage_2: { bg: 'bg-indigo-50',  text: 'text-indigo-700',  border: 'border-indigo-200',  dot: 'bg-indigo-500',  side: 'border-l-indigo-500',  col: 'bg-indigo-500' },
  stage_3: { bg: 'bg-violet-50',  text: 'text-violet-700',  border: 'border-violet-200',  dot: 'bg-violet-500',  side: 'border-l-violet-500',  col: 'bg-violet-500' },
  stage_4: { bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200',   dot: 'bg-amber-500',   side: 'border-l-amber-500',   col: 'bg-amber-500' },
  stage_5: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500', side: 'border-l-emerald-500', col: 'bg-emerald-500' },
  lost:      { bg: 'bg-red-50',    text: 'text-red-600',     border: 'border-red-200',     dot: 'bg-red-400',     side: 'border-l-red-400',     col: 'bg-red-400' },
  cancelled: { bg: 'bg-gray-50',   text: 'text-gray-500',    border: 'border-gray-200',    dot: 'bg-gray-400',    side: 'border-l-gray-400',    col: 'bg-gray-400' },
}

export const SOURCE_LABELS: Record<LeadSource, string> = {
  mkt: 'Marketing', sale: 'Sale', partner: 'Đối tác',
  bod: 'Ban GĐ', cskh: 'CSKH', referral: 'Giới thiệu', test: 'Test',
}

export const SOURCE_COLORS: Record<LeadSource, string> = {
  mkt: 'bg-pink-100 text-pink-700',
  sale: 'bg-blue-100 text-blue-700',
  partner: 'bg-purple-100 text-purple-700',
  bod: 'bg-amber-100 text-amber-700',
  cskh: 'bg-teal-100 text-teal-700',
  referral: 'bg-green-100 text-green-700',
  test: 'bg-gray-100 text-gray-500',
}

export const SCORE_COLORS: Record<LeadScore, string> = {
  hot: 'bg-red-100 text-red-700',
  warm: 'bg-orange-100 text-orange-700',
  cold: 'bg-slate-100 text-slate-600',
}

export const SCORE_LABELS: Record<LeadScore, string> = {
  hot: '🔥 Hot', warm: '☀️ Warm', cold: '❄️ Cold',
}

export const TIER_COLORS: Record<CustomerTier, string> = {
  vip: 'bg-yellow-100 text-yellow-700',
  potential: 'bg-blue-100 text-blue-700',
  warm: 'bg-orange-100 text-orange-700',
  cold: 'bg-slate-100 text-slate-600',
}

export const TIER_LABELS: Record<CustomerTier, string> = {
  vip: 'VIP', potential: 'Tiềm năng', warm: 'Ấm', cold: 'Lạnh',
}
