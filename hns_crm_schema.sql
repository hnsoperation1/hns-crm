-- =============================================
-- HNS CRM — Supabase Schema (idempotent)
-- =============================================

-- ENUMS (safe to re-run)
DO $$ BEGIN CREATE TYPE base_role AS ENUM ('boss','admin','sale_admin','mkt','cskh','sale');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE lead_source AS ENUM ('mkt','sale','partner','bod','cskh','referral');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE lead_score AS ENUM ('hot','warm','cold');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE lead_channel AS ENUM (
  'facebook_inbox','facebook_comment','facebook_form','google_form',
  'zalo','phone','walk_in','referral','other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE opp_stage AS ENUM (
  'stage_1',   -- Lấy TT & tư vấn
  'stage_2',   -- Lập CT & báo giá
  'stage_3',   -- Trước tour
  'stage_4',   -- Trong tour
  'stage_5',   -- Sau tour
  'lost',      -- Trượt / hủy
  'cancelled'  -- Hủy nội bộ
);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE campaign_channel AS ENUM ('facebook','google','zalo','email','organic','other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE customer_tier AS ENUM ('vip','potential','warm','cold');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE log_type AS ENUM ('sale_update','stage_change','cskh_care','note');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =============================================
-- 1. TEAMS (tạo trước, chưa có leader_id)
-- =============================================
CREATE TABLE IF NOT EXISTS teams (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- 2. USERS
-- =============================================
CREATE TABLE IF NOT EXISTS users (
  id                  UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name           TEXT NOT NULL,
  email               TEXT UNIQUE NOT NULL,
  phone               TEXT,
  avatar_url          TEXT,

  role                base_role NOT NULL DEFAULT 'sale',

  is_sale_tv          BOOLEAN NOT NULL DEFAULT false,
  can_manage_campaign BOOLEAN NOT NULL DEFAULT false,
  can_qualify_lead    BOOLEAN NOT NULL DEFAULT false,
  can_cskh_post       BOOLEAN NOT NULL DEFAULT false,

  team_id             UUID REFERENCES teams(id) ON DELETE SET NULL,

  is_super_admin      BOOLEAN NOT NULL DEFAULT false,
  is_active           BOOLEAN NOT NULL DEFAULT true,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Thêm leader_id sau khi users đã tồn tại
ALTER TABLE teams ADD COLUMN IF NOT EXISTS leader_id UUID REFERENCES users(id) ON DELETE SET NULL;

-- =============================================
-- 3. CAMPAIGNS
-- =============================================
CREATE TABLE IF NOT EXISTS campaigns (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  channel    campaign_channel NOT NULL,
  budget     NUMERIC(15,2),
  started_at DATE,
  ended_at   DATE,
  is_active  BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- 4. CONTACTS
-- =============================================
CREATE TABLE IF NOT EXISTS contacts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  phone         TEXT,
  email         TEXT,
  company       TEXT,

  source        lead_source NOT NULL DEFAULT 'sale',
  lead_score    lead_score DEFAULT 'warm',
  lead_channel  lead_channel,
  campaign_id   UUID REFERENCES campaigns(id) ON DELETE SET NULL,

  customer_tier customer_tier,
  tier_note     TEXT,
  tier_set_at   TIMESTAMPTZ,
  tier_set_by   UUID REFERENCES users(id),

  created_by    UUID NOT NULL REFERENCES users(id),
  qualified_by  UUID REFERENCES users(id),
  qualified_at  TIMESTAMPTZ,

  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- 4b. ORGANIZATIONS
-- =============================================
CREATE TABLE IF NOT EXISTS organizations (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name               TEXT NOT NULL,
  tax_code           TEXT UNIQUE,
  type               TEXT NOT NULL DEFAULT 'company' CHECK (type IN ('company','government','ngo')),
  address            TEXT,
  phone              TEXT,
  email              TEXT,
  website            TEXT,
  note               TEXT,

  primary_contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  contact_ids        UUID[] NOT NULL DEFAULT '{}',

  created_by         UUID NOT NULL REFERENCES users(id),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Thêm organization_ids vào contacts (chiều ngược)
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS organization_ids UUID[] NOT NULL DEFAULT '{}';
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS tax_code TEXT;

-- Thêm organization_id vào opportunities (bảng đã tồn tại)
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;

-- =============================================
-- 5. OPPORTUNITIES
-- =============================================
CREATE TABLE IF NOT EXISTS opportunities (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title            TEXT NOT NULL,
  description      TEXT,

  contact_id       UUID NOT NULL REFERENCES contacts(id) ON DELETE RESTRICT,
  organization_id  UUID REFERENCES organizations(id) ON DELETE SET NULL,
  assigned_to      UUID REFERENCES users(id) ON DELETE SET NULL,
  created_by       UUID NOT NULL REFERENCES users(id),
  team_id          UUID REFERENCES teams(id) ON DELETE SET NULL,

  source           lead_source NOT NULL DEFAULT 'sale',
  campaign_id      UUID REFERENCES campaigns(id) ON DELETE SET NULL,

  stage            opp_stage NOT NULL DEFAULT 'stage_1',
  stage_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  stage_updated_by UUID REFERENCES users(id),

  lost_reason      TEXT,
  lost_at          TIMESTAMPTZ,

  estimated_value  NUMERIC(15,2),
  actual_value     NUMERIC(15,2),

  tour_date        DATE,
  deadline         DATE,

  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- 6. TASKS
-- =============================================
CREATE TABLE IF NOT EXISTS tasks (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id UUID NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  stage          INT NOT NULL CHECK (stage BETWEEN 1 AND 5),
  title          TEXT NOT NULL,
  is_done        BOOLEAN NOT NULL DEFAULT false,
  done_at        TIMESTAMPTZ,
  done_by        UUID REFERENCES users(id),
  due_date       DATE,
  created_by     UUID NOT NULL REFERENCES users(id),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- 7. ACTIVITY LOGS
-- =============================================
CREATE TABLE IF NOT EXISTS activity_logs (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id UUID NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  user_id        UUID NOT NULL REFERENCES users(id),

  log_type       log_type NOT NULL DEFAULT 'sale_update',
  log_date       DATE NOT NULL DEFAULT CURRENT_DATE,
  description    TEXT NOT NULL,
  next_step      TEXT,
  next_step_due  DATE,

  stage_at_log   opp_stage NOT NULL,
  stage_from     opp_stage,
  stage_to       opp_stage,
  rollback_reason TEXT,

  input_source   TEXT NOT NULL DEFAULT 'web',

  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- 8. CSKH CARE LOGS
-- =============================================
CREATE TABLE IF NOT EXISTS cskh_care_logs (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id     UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  opportunity_id UUID REFERENCES opportunities(id) ON DELETE SET NULL,
  cskh_id        UUID NOT NULL REFERENCES users(id),

  care_date      DATE NOT NULL DEFAULT CURRENT_DATE,
  care_type      TEXT NOT NULL,
  summary        TEXT NOT NULL,
  feedback_score INT CHECK (feedback_score BETWEEN 1 AND 5),
  feedback_note  TEXT,
  tier_suggested customer_tier,

  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- INDEXES
-- =============================================
CREATE INDEX IF NOT EXISTS idx_opp_assigned    ON opportunities(assigned_to);
CREATE INDEX IF NOT EXISTS idx_opp_stage       ON opportunities(stage);
CREATE INDEX IF NOT EXISTS idx_opp_source      ON opportunities(source);
CREATE INDEX IF NOT EXISTS idx_opp_campaign    ON opportunities(campaign_id);
CREATE INDEX IF NOT EXISTS idx_opp_contact     ON opportunities(contact_id);
CREATE INDEX IF NOT EXISTS idx_opp_team        ON opportunities(team_id);
CREATE INDEX IF NOT EXISTS idx_opp_created_by  ON opportunities(created_by);

CREATE INDEX IF NOT EXISTS idx_logs_opp        ON activity_logs(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_logs_user       ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_logs_date       ON activity_logs(log_date);
CREATE INDEX IF NOT EXISTS idx_logs_type       ON activity_logs(log_type);

CREATE INDEX IF NOT EXISTS idx_orgs_tax_code     ON organizations(tax_code);
CREATE INDEX IF NOT EXISTS idx_orgs_type         ON organizations(type);
CREATE INDEX IF NOT EXISTS idx_opp_org           ON opportunities(organization_id);

CREATE INDEX IF NOT EXISTS idx_contacts_source   ON contacts(source);
CREATE INDEX IF NOT EXISTS idx_contacts_campaign ON contacts(campaign_id);
CREATE INDEX IF NOT EXISTS idx_contacts_tier     ON contacts(customer_tier);

CREATE INDEX IF NOT EXISTS idx_cskh_contact    ON cskh_care_logs(contact_id);
CREATE INDEX IF NOT EXISTS idx_cskh_date       ON cskh_care_logs(care_date);

-- =============================================
-- RLS
-- =============================================
ALTER TABLE users          ENABLE ROW LEVEL SECURITY;
ALTER TABLE opportunities  ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs  ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts       ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns      ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks          ENABLE ROW LEVEL SECURITY;
ALTER TABLE cskh_care_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations  ENABLE ROW LEVEL SECURITY;

-- Helper functions
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN AS $$
  SELECT COALESCE(is_super_admin, false) FROM users WHERE id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

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

-- USERS policies
DROP POLICY IF EXISTS "users_read_own"          ON users;
DROP POLICY IF EXISTS "admins_read_all_users"   ON users;
DROP POLICY IF EXISTS "cskh_read_all_users"     ON users;
DROP POLICY IF EXISTS "super_admin_insert_user" ON users;
DROP POLICY IF EXISTS "super_admin_update_user" ON users;
DROP POLICY IF EXISTS "super_admin_delete_user" ON users;

CREATE POLICY "users_read_own"          ON users FOR SELECT USING (id = auth.uid());
CREATE POLICY "admins_read_all_users"   ON users FOR SELECT USING (current_user_role() IN ('boss','admin','sale_admin'));
CREATE POLICY "cskh_read_all_users"     ON users FOR SELECT USING (current_user_role() = 'cskh');
CREATE POLICY "super_admin_insert_user" ON users FOR INSERT WITH CHECK (is_super_admin());
CREATE POLICY "super_admin_update_user" ON users FOR UPDATE USING (is_super_admin() OR id = auth.uid());
CREATE POLICY "super_admin_delete_user" ON users FOR DELETE USING (is_super_admin());

-- OPPORTUNITIES policies
DROP POLICY IF EXISTS "boss_admin_see_all_opps" ON opportunities;
DROP POLICY IF EXISTS "sale_tv_own_opps"        ON opportunities;
DROP POLICY IF EXISTS "mkt_own_source_opps"     ON opportunities;
DROP POLICY IF EXISTS "cskh_post_opps"          ON opportunities;
DROP POLICY IF EXISTS "cskh_see_all_opps"       ON opportunities;
DROP POLICY IF EXISTS "cskh_insert_opp"         ON opportunities;
DROP POLICY IF EXISTS "sale_admin_insert_opp"   ON opportunities;
DROP POLICY IF EXISTS "sale_tv_update_own_opp"  ON opportunities;

CREATE POLICY "boss_admin_see_all_opps" ON opportunities FOR SELECT USING (current_user_role() IN ('boss','admin','sale_admin'));
CREATE POLICY "cskh_see_all_opps"       ON opportunities FOR SELECT USING (current_user_role() = 'cskh');
CREATE POLICY "sale_tv_own_opps"        ON opportunities FOR SELECT USING (assigned_to = auth.uid() AND current_user_flag('is_sale_tv'));
CREATE POLICY "mkt_own_source_opps"     ON opportunities FOR SELECT USING (source = 'mkt' AND current_user_role() = 'mkt');
CREATE POLICY "sale_admin_insert_opp"   ON opportunities FOR INSERT WITH CHECK (current_user_role() IN ('admin','sale_admin') OR (current_user_role() = 'mkt' AND source = 'mkt'));
CREATE POLICY "cskh_insert_opp"         ON opportunities FOR INSERT WITH CHECK (current_user_role() = 'cskh');
CREATE POLICY "sale_tv_update_own_opp"  ON opportunities FOR UPDATE USING (assigned_to = auth.uid() AND current_user_flag('is_sale_tv'));

-- ACTIVITY LOGS policies
DROP POLICY IF EXISTS "boss_admin_see_all_logs"  ON activity_logs;
DROP POLICY IF EXISTS "sale_tv_own_logs"         ON activity_logs;
DROP POLICY IF EXISTS "sale_tv_insert_log"       ON activity_logs;
DROP POLICY IF EXISTS "sale_tv_update_log_24h"   ON activity_logs;
DROP POLICY IF EXISTS "admin_update_any_log"     ON activity_logs;

CREATE POLICY "boss_admin_see_all_logs" ON activity_logs FOR SELECT USING (current_user_role() IN ('boss','admin','sale_admin'));
CREATE POLICY "sale_tv_own_logs"        ON activity_logs FOR SELECT USING (EXISTS (SELECT 1 FROM opportunities WHERE id = activity_logs.opportunity_id AND assigned_to = auth.uid()) AND current_user_flag('is_sale_tv'));
CREATE POLICY "sale_tv_insert_log"      ON activity_logs FOR INSERT WITH CHECK (current_user_flag('is_sale_tv') AND user_id = auth.uid());
CREATE POLICY "sale_tv_update_log_24h"  ON activity_logs FOR UPDATE USING (user_id = auth.uid() AND current_user_flag('is_sale_tv') AND created_at > NOW() - INTERVAL '24 hours');
CREATE POLICY "admin_update_any_log"    ON activity_logs FOR UPDATE USING (current_user_role() IN ('admin','sale_admin'));

-- CAMPAIGNS policies
DROP POLICY IF EXISTS "mkt_manage_campaigns"    ON campaigns;
DROP POLICY IF EXISTS "boss_admin_see_campaigns" ON campaigns;

CREATE POLICY "mkt_manage_campaigns"     ON campaigns FOR ALL    USING (current_user_flag('can_manage_campaign'));
CREATE POLICY "boss_admin_see_campaigns" ON campaigns FOR SELECT USING (current_user_role() IN ('boss','admin','sale_admin'));

-- CONTACTS policies
DROP POLICY IF EXISTS "boss_admin_see_all_contacts" ON contacts;
DROP POLICY IF EXISTS "sale_tv_own_contacts"        ON contacts;
DROP POLICY IF EXISTS "mkt_cskh_insert_contact"     ON contacts;
DROP POLICY IF EXISTS "cskh_see_all_contacts"       ON contacts;

CREATE POLICY "boss_admin_see_all_contacts" ON contacts FOR SELECT USING (current_user_role() IN ('boss','admin','sale_admin'));
CREATE POLICY "cskh_see_all_contacts"       ON contacts FOR SELECT USING (current_user_role() = 'cskh');
CREATE POLICY "sale_tv_own_contacts"        ON contacts FOR SELECT USING (EXISTS (SELECT 1 FROM opportunities WHERE contact_id = contacts.id AND assigned_to = auth.uid()));
CREATE POLICY "mkt_cskh_insert_contact"     ON contacts FOR INSERT WITH CHECK (current_user_role() IN ('mkt','cskh','admin','sale_admin') OR current_user_flag('can_qualify_lead'));

-- ORGANIZATIONS policies
DROP POLICY IF EXISTS "boss_admin_see_all_orgs" ON organizations;
DROP POLICY IF EXISTS "all_authenticated_see_orgs" ON organizations;
DROP POLICY IF EXISTS "admin_manage_orgs" ON organizations;
DROP POLICY IF EXISTS "cskh_manage_orgs" ON organizations;

CREATE POLICY "all_authenticated_see_orgs" ON organizations FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "cskh_manage_orgs"           ON organizations FOR ALL USING (current_user_role() = 'cskh') WITH CHECK (current_user_role() = 'cskh');
CREATE POLICY "admin_manage_orgs"           ON organizations FOR ALL    USING (current_user_role() IN ('boss','admin','sale_admin'));

-- CSKH CARE LOGS policies
DROP POLICY IF EXISTS "cskh_manage_care_logs" ON cskh_care_logs;

CREATE POLICY "cskh_manage_care_logs" ON cskh_care_logs FOR ALL USING (current_user_flag('can_cskh_post') OR current_user_role() IN ('boss','admin'));

-- =============================================
-- TRIGGERS: updated_at
-- =============================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_users_updated_at         ON users;
DROP TRIGGER IF EXISTS trg_opportunities_updated_at ON opportunities;
DROP TRIGGER IF EXISTS trg_contacts_updated_at      ON contacts;
DROP TRIGGER IF EXISTS trg_campaigns_updated_at      ON campaigns;
DROP TRIGGER IF EXISTS trg_organizations_updated_at  ON organizations;

CREATE TRIGGER trg_users_updated_at          BEFORE UPDATE ON users          FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_opportunities_updated_at  BEFORE UPDATE ON opportunities   FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_contacts_updated_at       BEFORE UPDATE ON contacts        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_campaigns_updated_at      BEFORE UPDATE ON campaigns       FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_organizations_updated_at  BEFORE UPDATE ON organizations   FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================
-- TRIGGER: log stage change tự động
-- =============================================
CREATE OR REPLACE FUNCTION log_stage_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.stage IS DISTINCT FROM NEW.stage THEN
    INSERT INTO activity_logs (opportunity_id, user_id, log_type, description, stage_at_log, stage_from, stage_to, input_source)
    VALUES (NEW.id, auth.uid(), 'stage_change', 'Chuyển giai đoạn: ' || OLD.stage || ' → ' || NEW.stage, NEW.stage, OLD.stage, NEW.stage, 'system');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_opp_stage_change ON opportunities;
CREATE TRIGGER trg_opp_stage_change AFTER UPDATE ON opportunities FOR EACH ROW EXECUTE FUNCTION log_stage_change();

-- =============================================
-- TRIGGER: tự tạo users row khi auth sign up
-- =============================================
CREATE OR REPLACE FUNCTION handle_new_auth_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, full_name, email, role)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), NEW.email, 'sale')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_auth_user();
