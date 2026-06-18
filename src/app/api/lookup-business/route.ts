import { NextRequest, NextResponse } from 'next/server'
import { lookupBusiness } from '@/lib/business-lookup'

export async function GET(req: NextRequest) {
  const mst = req.nextUrl.searchParams.get('mst')?.trim()
  if (!mst) return NextResponse.json({ error: 'Thiếu mã số thuế' }, { status: 400 })
  if (!/^\d{10,14}$/.test(mst)) return NextResponse.json({ error: 'Mã số thuế không hợp lệ' }, { status: 400 })

  const result = await lookupBusiness(mst)
  if (!result) return NextResponse.json({ error: 'Không tìm thấy doanh nghiệp' }, { status: 404 })

  return NextResponse.json(result)
}
