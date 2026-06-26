-- =============================================
-- HNS CRM — Tour Services
-- Danh sách dịch vụ để lên báo giá / hóa đơn
-- =============================================

CREATE TABLE IF NOT EXISTS tour_services (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id   UUID NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  created_by       UUID REFERENCES users(id),
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW(),

  category         TEXT,     -- 'xe' | 'ks' | 'an_uong' | 'hdv_mc' | 've' | 'gala' | 'team_building' | 'may_bay' | 'khac'
  name             TEXT NOT NULL,
  quantity         NUMERIC,
  unit             TEXT,     -- người, xe, phòng, bữa, vé, đêm...
  unit_price       NUMERIC,
  total_price      NUMERIC,  -- quantity * unit_price, hoặc nhập tay

  supplier_name    TEXT,
  details          TEXT,
  notes            TEXT,

  status           TEXT DEFAULT 'pending',  -- 'pending' | 'booked' | 'confirmed' | 'done' | 'cancelled'
  sort_order       INTEGER DEFAULT 0,
  include_in_quote BOOLEAN DEFAULT TRUE
);

ALTER TABLE tour_services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth users can do all on tour_services"
  ON tour_services FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at ON tour_services;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON tour_services
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
