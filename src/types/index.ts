export type Role = 'boss' | 'admin' | 'sale_admin' | 'mkt' | 'cskh' | 'sale'
export type OppStage = 'stage_1' | 'stage_2' | 'stage_3' | 'stage_4' | 'stage_5' | 'lost' | 'cancelled'
export type LeadSource = 'mkt' | 'sale' | 'partner' | 'bod' | 'cskh' | 'referral'
export type LeadScore = 'hot' | 'warm' | 'cold'
export type LogType = 'sale_update' | 'stage_change' | 'cskh_care' | 'note'
export type CustomerTier = 'vip' | 'potential' | 'warm' | 'cold'

export interface User {
  id: string
  full_name: string
  email: string
  phone?: string
  role: Role
  is_sale_tv: boolean
  can_manage_campaign: boolean
  can_qualify_lead: boolean
  can_cskh_post: boolean
  is_active: boolean
}

export interface Contact {
  id: string
  name: string
  phone?: string
  email?: string
  company?: string
  source: LeadSource
  lead_score?: LeadScore
  campaign_id?: string
  customer_tier?: CustomerTier
  created_by: string
  created_at: string
}

export interface Opportunity {
  id: string
  title: string
  description?: string
  contact_id: string
  contact?: Contact
  assigned_to: string
  assigned_user?: User
  created_by: string
  source: LeadSource
  campaign_id?: string
  stage: OppStage
  stage_updated_at: string
  lost_reason?: string
  estimated_value?: number
  actual_value?: number
  tour_date?: string
  deadline?: string
  created_at: string
  updated_at: string
}

export interface Task {
  id: string
  opportunity_id: string
  stage: number
  title: string
  is_done: boolean
  done_at?: string
  due_date?: string
  assigned_to?: string
}

export interface ActivityLog {
  id: string
  opportunity_id: string
  user_id: string
  user?: User
  log_type: LogType
  log_date: string
  description: string
  next_step?: string
  next_step_due?: string
  stage_at_log: OppStage
  stage_from?: OppStage
  stage_to?: OppStage
  created_at: string
}
