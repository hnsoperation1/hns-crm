-- =============================================
-- HNS CRM — Supabase Schema
-- =============================================

-- ENUMS
CREATE TYPE base_role AS ENUM (
  'boss',
  'admin',
  'sale_admin',
  'mkt',
  'cskh',
  'sale'
);

CREATE TYPE lead_source AS ENUM (
  'mkt',
  'sale',
  'partner',
  'bod',
  'cskh',
  'referral'
);

CREATE TYPE lead_score AS ENUM ('hot', 'warm', 'cold');

CREATE TYPE lead_channel AS ENUM (
  'facebook_inbox',
  'facebook_comment',
  'facebook_form',
  'google_form',
  'zalo',
  'phone',
  'walk_in',
  'referral',
  'other'
);

CREATE TYPE opp_stage AS ENUM (
  'stage_1',  -- Lấy TT & tư vấn
  'stage_2',  -- Lập CT & báo giá
  'stage_3',  -- Trước tour
  'stage_4',  -- Trong tour
  'stage_5',  -- Sau tour
  'lost',     -- Trượt / hủy
  'cancelled' -- Hủy nội bộ
);

CREATE TYPE campaign_channel AS ENUM (
  'facebook',
  'google',
  'zalo',
  'email',
  'organic',
  'other'
);

CREATE TYPE customer_tier AS ENUM ('vip', 'potential', 'warm', 'cold');

-- =============================================
-- 1. USERS
-- =============================================
CREATE TABLE users (
  id                  UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name           TEXT NOT NULL,
  email               TEXT UNIQUE NOT NULL,
  phone               TEXT,
  avatar_url          TEXT,

  -- Base role
  role                base_role NOT NULL DEFAULT 'sale',

  -- Capability flags (độc lập với base_role)
  is_sale_tv          BOOLEAN NOT NULL DEFAULT false,
  can_manage_campaign BOOLEAN NOT NULL DEFAULT false,  -- MKT: tạo/sửa campaign
  can_qualify_lead    BOOLEAN NOT NULL DEFAULT false,  -- CSKH đầu luồng: nhập/qualify lead
  can_cskh_post       BOOLEAN NOT NULL DEFAULT false,  -- CSKH cuối luồng: chăm sóc sau tour

  -- Team
  team_id             UUID REFERENCES teams(id) ON DELETE SET NULL,

  is_active           BOOLEAN NOT NULL DEFAULT true,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- 2. TEAMS
-- =============================================
CREATE TABLE teams (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,           -- "Team Event", "Team Tour"
  leader_id   UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- 3. CAMPAIGNS (MKT)
-- =============================================
CREATE TABLE campaigns (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  channel     campaign_channel NOT NULL,
  budget      NUMERIC(15,2),
  started_at  DATE,
  ended_at    DATE,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_by  UUID NOT NULL REFERENCES users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- 4. CONTACTS (Khách hàng / Lead)
-- =============================================
CREATE TABLE contacts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  phone         TEXT,
  email         TEXT,
  company       TEXT,

  -- Lead tracking
  source        lead_source NOT NULL DEFAULT 'sale',
  lead_score    lead_score DEFAULT 'warm',
  lead_channel  lead_channel,
  campaign_id   UUID REFERENCES campaigns(id) ON DELETE SET NULL,

  -- Sau tour: phân loại khách hàng
  customer_tier customer_tier,
  tier_note     TEXT,                 -- Ghi chú phân loại
  tier_set_at   TIMESTAMPTZ,
  tier_set_by   UUID REFERENCES users(id),

  -- Tracking
  created_by    UUID NOT NULL REFERENCES users(id),
  qualified_by  UUID REFERENCES users(id),  -- CSKH đã qualify lead này
  qualified_at  TIMESTAMPTZ,

  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- 5. OPPORTUNITIES (Cơ hội / Đơn hàng)
-- =============================================
CREATE TABLE opportunities (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title           TEXT NOT NULL,
  description     TEXT,

  -- Quan hệ
  contact_id      UUID NOT NULL REFERENCES contacts(id) ON DELETE RESTRICT,
  assigned_to     UUID REFERENCES users(id) ON DELETE SET NULL,  -- Sale TV phụ trách
  created_by      UUID NOT NULL REFERENCES users(id),
  team_id         UUID REFERENCES teams(id) ON DELETE SET NULL,

  -- Nguồn & campaign
  source          lead_source NOT NULL DEFAULT 'sale',
  campaign_id     UUID REFERENCES campaigns(id) ON DELETE SET NULL,

  -- Pipeline
  stage           opp_stage NOT NULL DEFAULT 'stage_1',
  stage_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  stage_updated_by UUID REFERENCES users(id),

  -- Kết quả (khi lost/cancelled)
  lost_reason     TEXT,
  lost_at         TIMESTAMPTZ,

  -- Tài chính
  estimated_value NUMERIC(15,2),
  actual_value    NUMERIC(15,2),      -- Điền khi GĐ5 hoàn thành

  -- Timeline
  tour_date       DATE,               -- Ngày đi tour
  deadline        DATE,               -- Deadline chốt đơn

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- 6. TASKS (Công việc theo giai đoạn)
-- =============================================
CREATE TABLE tasks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id  UUID NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  stage           INT NOT NULL CHECK (stage BETWEEN 1 AND 5),
  title           TEXT NOT NULL,
  is_done         BOOLEAN NOT NULL DEFAULT false,
  done_at         TIMESTAMPTZ,
  done_by         UUID REFERENCES users(id),
  due_date        DATE,
  created_by      UUID NOT NULL REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- 7. ACTIVITY LOGS (Nhật ký — TRUNG TÂM)
-- =============================================
CREATE TYPE log_type AS ENUM (
  'sale_update',    -- Sale TV cập nhật nhật ký
  'stage_change',   -- Chuyển giai đoạn
  'cskh_care',      -- CSKH chăm sóc sau tour
  'note'            -- Ghi chú nội bộ
);

CREATE TABLE activity_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id  UUID NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES users(id),

  -- Nội dung
  log_type        log_type NOT NULL DEFAULT 'sale_update',
  log_date        DATE NOT NULL DEFAULT CURRENT_DATE,
  description     TEXT NOT NULL,
  next_step       TEXT,
  next_step_due   DATE,

  -- Context tại thời điểm log
  stage_at_log    opp_stage NOT NULL,

  -- Stage change metadata
  stage_from      opp_stage,          -- Chỉ dùng khi log_type = stage_change
  stage_to        opp_stage,
  rollback_reason TEXT,               -- Bắt buộc khi rollback GĐ4→3

  -- Nguồn nhập
  input_source    TEXT NOT NULL DEFAULT 'web',  -- 'web' | 'telegram'

  -- Lock sau 24h (enforce bằng RLS policy)
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- 8. CSKH CARE LOGS (Chăm sóc sau tour)
-- =============================================
CREATE TABLE cskh_care_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id      UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  opportunity_id  UUID REFERENCES opportunities(id) ON DELETE SET NULL,
  cskh_id         UUID NOT NULL REFERENCES users(id),

  care_date       DATE NOT NULL DEFAULT CURRENT_DATE,
  care_type       TEXT NOT NULL,      -- 'call', 'zalo', 'email', 'meeting'
  summary         TEXT NOT NULL,      -- Tóm tắt cuộc gọi / trao đổi
  feedback_score  INT CHECK (feedback_score BETWEEN 1 AND 5),
  feedback_note   TEXT,

  -- Kết quả phân loại
  tier_suggested  customer_tier,      -- CSKH đề xuất tier

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- INDEXES
-- =============================================
CREATE INDEX idx_opp_assigned     ON opportunities(assigned_to);
CREATE INDEX idx_opp_stage        ON opportunities(stage);
CREATE INDEX idx_opp_source       ON opportunities(source);
CREATE INDEX idx_opp_campaign     ON opportunities(campaign_id);
CREATE INDEX idx_opp_contact      ON opportunities(contact_id);
CREATE INDEX idx_opp_team         ON opportunities(team_id);
CREATE INDEX idx_opp_created_by   ON opportunities(created_by);

CREATE INDEX idx_logs_opp         ON activity_logs(opportunity_id);
CREATE INDEX idx_logs_user        ON activity_logs(user_id);
CREATE INDEX idx_logs_date        ON activity_logs(log_date);
CREATE INDEX idx_logs_type        ON activity_logs(log_type);

CREATE INDEX idx_contacts_source  ON contacts(source);
CREATE INDEX idx_contacts_campaign ON contacts(campaign_id);
CREATE INDEX idx_contacts_tier    ON contacts(customer_tier);

CREATE INDEX idx_cskh_contact     ON cskh_care_logs(contact_id);
CREATE INDEX idx_cskh_date        ON cskh_care_logs(care_date);

-- =============================================
-- RLS POLICIES
-- =============================================

-- Enable RLS
ALTER TABLE users           ENABLE ROW LEVEL SECURITY;
ALTER TABLE opportunities   ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs   ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts        ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns       ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks           ENABLE ROW LEVEL SECURITY;
ALTER TABLE cskh_care_logs  ENABLE ROW LEVEL SECURITY;

-- Helper function: lấy role của current user
CREATE OR REPLACE FUNCTION current_user_role()
RETURNS base_role AS $$
  SELECT role FROM users WHERE id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION current_user_flag(flag TEXT)
RETURNS BOOLEAN AS $$
  SELECT CASE flag
    WHEN 'is_sale_tv'          THEN is_sale_tv
    WHEN 'can_manage_campaign' THEN can_manage_campaign
    WHEN 'can_qualify_lead'    THEN can_qualify_lead
    WHEN 'can_cskh_post'       THEN can_cskh_post
    ELSE false
  END
  FROM users WHERE id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- OPPORTUNITIES policies
CREATE POLICY "boss_admin_see_all_opps" ON opportunities
  FOR SELECT USING (
    current_user_role() IN ('boss', 'admin', 'sale_admin')
  );

CREATE POLICY "sale_tv_own_opps" ON opportunities
  FOR SELECT USING (
    assigned_to = auth.uid()
    AND current_user_flag('is_sale_tv')
  );

CREATE POLICY "mkt_own_source_opps" ON opportunities
  FOR SELECT USING (
    source = 'mkt'
    AND current_user_role() = 'mkt'
  );

CREATE POLICY "cskh_post_opps" ON opportunities
  FOR SELECT USING (
    stage IN ('stage_5', 'lost')
    AND current_user_flag('can_cskh_post')
  );

CREATE POLICY "sale_admin_insert_opp" ON opportunities
  FOR INSERT WITH CHECK (
    current_user_role() IN ('admin', 'sale_admin')
    OR (current_user_role() = 'mkt' AND source = 'mkt')
  );

CREATE POLICY "sale_tv_update_own_opp" ON opportunities
  FOR UPDATE USING (
    assigned_to = auth.uid()
    AND current_user_flag('is_sale_tv')
  );

-- ACTIVITY LOGS policies
CREATE POLICY "boss_admin_see_all_logs" ON activity_logs
  FOR SELECT USING (
    current_user_role() IN ('boss', 'admin', 'sale_admin')
  );

CREATE POLICY "sale_tv_own_logs" ON activity_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM opportunities
      WHERE id = activity_logs.opportunity_id
      AND assigned_to = auth.uid()
    )
    AND current_user_flag('is_sale_tv')
  );

CREATE POLICY "sale_tv_insert_log" ON activity_logs
  FOR INSERT WITH CHECK (
    current_user_flag('is_sale_tv')
    AND user_id = auth.uid()
  );

CREATE POLICY "sale_tv_update_log_24h" ON activity_logs
  FOR UPDATE USING (
    user_id = auth.uid()
    AND current_user_flag('is_sale_tv')
    AND created_at > NOW() - INTERVAL '24 hours'
  );

CREATE POLICY "admin_update_any_log" ON activity_logs
  FOR UPDATE USING (
    current_user_role() IN ('admin', 'sale_admin')
  );

-- CAMPAIGNS policies
CREATE POLICY "mkt_manage_campaigns" ON campaigns
  FOR ALL USING (
    current_user_flag('can_manage_campaign')
  );

CREATE POLICY "boss_admin_see_campaigns" ON campaigns
  FOR SELECT USING (
    current_user_role() IN ('boss', 'admin', 'sale_admin')
  );

-- CONTACTS policies
CREATE POLICY "boss_admin_see_all_contacts" ON contacts
  FOR SELECT USING (
    current_user_role() IN ('boss', 'admin', 'sale_admin')
  );

CREATE POLICY "sale_tv_own_contacts" ON contacts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM opportunities
      WHERE contact_id = contacts.id
      AND assigned_to = auth.uid()
    )
  );

CREATE POLICY "mkt_cskh_insert_contact" ON contacts
  FOR INSERT WITH CHECK (
    current_user_role() IN ('mkt', 'cskh', 'admin', 'sale_admin')
    OR current_user_flag('can_qualify_lead')
  );

-- CSKH CARE LOGS policies
CREATE POLICY "cskh_manage_care_logs" ON cskh_care_logs
  FOR ALL USING (
    current_user_flag('can_cskh_post')
    OR current_user_role() IN ('boss', 'admin')
  );

-- =============================================
-- TRIGGERS: updated_at tự động
-- =============================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_opportunities_updated_at
  BEFORE UPDATE ON opportunities
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_contacts_updated_at
  BEFORE UPDATE ON contacts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_campaigns_updated_at
  BEFORE UPDATE ON campaigns
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================
-- TRIGGER: log stage change tự động
-- =============================================
CREATE OR REPLACE FUNCTION log_stage_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.stage IS DISTINCT FROM NEW.stage THEN
    INSERT INTO activity_logs (
      opportunity_id, user_id, log_type,
      description, stage_at_log,
      stage_from, stage_to, input_source
    ) VALUES (
      NEW.id, auth.uid(), 'stage_change',
      'Chuyển giai đoạn: ' || OLD.stage || ' → ' || NEW.stage,
      NEW.stage, OLD.stage, NEW.stage, 'system'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_opp_stage_change
  AFTER UPDATE ON opportunities
  FOR EACH ROW EXECUTE FUNCTION log_stage_change();

