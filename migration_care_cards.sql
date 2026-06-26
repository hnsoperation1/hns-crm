-- Thẻ chăm sóc khách hàng (tạo từ đánh giá)
CREATE TABLE IF NOT EXISTS care_cards (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feedback_id      UUID REFERENCES feedback(id) ON DELETE SET NULL,
  opportunity_id   UUID REFERENCES opportunities(id) ON DELETE SET NULL,
  assigned_to      UUID REFERENCES users(id),
  created_by       UUID REFERENCES users(id),
  customer_name    TEXT,
  customer_phone   TEXT,
  content          TEXT NOT NULL,
  contact_date     DATE,
  is_done          BOOLEAN DEFAULT FALSE,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Log quá trình tư vấn theo từng thẻ
CREATE TABLE IF NOT EXISTS care_card_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  care_card_id  UUID NOT NULL REFERENCES care_cards(id) ON DELETE CASCADE,
  created_by    UUID REFERENCES users(id),
  log_content   TEXT NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE care_cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth users can do all on care_cards"
  ON care_cards FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE care_card_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth users can do all on care_card_logs"
  ON care_card_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP TRIGGER IF EXISTS set_updated_at ON care_cards;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON care_cards
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
