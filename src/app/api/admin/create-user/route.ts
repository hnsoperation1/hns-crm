import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('users').select('is_super_admin').eq('id', user.id).single()
  if (!profile?.is_super_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { email, password, full_name, phone, role, is_sale_tv, can_manage_campaign, can_qualify_lead, can_cskh_post } = body

  if (!email || !password || !full_name) {
    return NextResponse.json({ error: 'Thiếu thông tin bắt buộc' }, { status: 400 })
  }

  const admin = createAdminClient()

  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (authError) return NextResponse.json({ error: authError.message }, { status: 400 })

  // Upsert profile (trigger may or may not have run yet)
  const { error: profileError } = await admin.from('users').upsert({
    id: authData.user.id,
    email,
    full_name: full_name.trim(),
    phone: phone?.trim() || null,
    role,
    is_sale_tv: is_sale_tv ?? false,
    can_manage_campaign: can_manage_campaign ?? false,
    can_qualify_lead: can_qualify_lead ?? false,
    can_cskh_post: can_cskh_post ?? false,
    is_active: true,
  })

  if (profileError) {
    // Clean up the auth user if profile creation fails
    await admin.auth.admin.deleteUser(authData.user.id)
    return NextResponse.json({ error: profileError.message }, { status: 400 })
  }

  const { data: newUser } = await admin.from('users').select('*').eq('id', authData.user.id).single()

  return NextResponse.json({ user: newUser })
}
