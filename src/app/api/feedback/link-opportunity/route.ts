import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { feedbackIds, opportunityId } = await req.json()
  if (!Array.isArray(feedbackIds) || feedbackIds.length === 0 || !opportunityId) {
    return NextResponse.json({ error: 'Thiếu dữ liệu' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { error } = await admin
    .from('feedback')
    .update({ opportunity_id: opportunityId })
    .in('id', feedbackIds)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ updated: feedbackIds.length })
}
