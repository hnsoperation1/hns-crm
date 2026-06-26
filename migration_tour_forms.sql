-- =============================================
-- HNS CRM — Tour Forms Migration
-- Bảng 1: tour_intake    (Phiếu thông tin đoàn)
-- Bảng 2: tour_handover  (Phiếu bàn giao điều hành)
-- Cả 2 bảng có đầy đủ fields, UI ẩn/hiện theo luồng
-- =============================================

-- ─── BẢNG 1: PHIẾU THÔNG TIN ĐOÀN ─────────────────────────────────────────
-- Dùng ở stage 1-2 (don-hang-moi), sale thu thập nhu cầu từ khách
CREATE TABLE IF NOT EXISTS tour_intake (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id          UUID NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  created_by              UUID REFERENCES users(id),
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW(),

  -- 1. Thông tin chung
  ma_doan                 TEXT,
  vat_required            BOOLEAN,
  status                  TEXT,             -- 'confirmed' | 'pending' | null [ẩn ở intake]
  sale_price              NUMERIC,          -- [ẩn ở intake]
  commission              NUMERIC,          -- [ẩn ở intake]

  -- 2. Điểm đón
  pickup_location         TEXT,             -- điểm đón từ đâu / điểm đón-trả
  pickup_count            INTEGER,          -- số điểm đón
  pickup_quantities       TEXT,             -- số lượng mỗi điểm (free text)
  pickup_time             TEXT,             -- thời gian đón khách [ẩn ở intake]

  -- 3. Số lượng khách
  pax_adults              INTEGER,
  pax_children_under5     INTEGER,
  pax_children_5to10      INTEGER,

  -- 4. Thời gian đi
  trip_days               INTEGER,
  trip_date_range         TEXT,             -- khoảng ngày dự kiến
  trip_timing             TEXT,             -- 'weekend' | 'weekday'
  itinerary               TEXT,             -- lịch trình xác nhận [ẩn ở intake, hiện ở handover]

  -- 5. Tiêu chuẩn khách sạn
  hotel_stars             TEXT,             -- '3' | '4-5'
  hotel_name              TEXT,             -- [ẩn ở intake]
  hotel_persons_per_room  INTEGER,          -- [ẩn ở intake]
  hotel_room_details      TEXT,             -- loại phòng chi tiết [ẩn ở intake]

  -- 6. Yêu cầu sự kiện
  event_gala              BOOLEAN DEFAULT FALSE,
  event_team_building     BOOLEAN DEFAULT FALSE,
  event_meeting           BOOLEAN DEFAULT FALSE,
  event_birthday          BOOLEAN DEFAULT FALSE,
  event_anniversary       BOOLEAN DEFAULT FALSE,
  event_details           TEXT,

  -- 7. Điểm đến
  destination             TEXT,

  -- 8. Thông tin trưởng đoàn
  group_leader_name       TEXT,
  group_leader_phone      TEXT,
  group_leader_email      TEXT,

  -- 9. Đối tượng khách hàng
  customer_type           TEXT,             -- công chức, giáo viên, vip...

  -- 10. Vé máy bay
  flight_preference       TEXT,             -- 'budget' | 'quality'
  flight_depart_time      TEXT,             -- [ẩn ở intake]
  flight_return_time      TEXT,             -- [ẩn ở intake]

  -- 11. Định hướng tour
  tour_type               TEXT,             -- 'budget' | 'quality'

  -- 12. Ngân sách
  budget                  TEXT,

  -- 13-16. Mục tiêu / Chủ đề / Cải thiện / Lưu ý
  program_goal            TEXT,
  program_theme           TEXT,
  improvements            TEXT,
  other_notes             TEXT,

  -- Vận chuyển [ẩn ở intake]
  transport_car_type      TEXT,             -- loại xe, số chỗ
  transport_car_count     INTEGER,

  -- Ăn uống [ẩn ở intake]
  meals_main_count        INTEGER,
  meals_main_price        NUMERIC,
  meals_breakfast         BOOLEAN,

  -- HDV [ẩn ở intake]
  guide_gender            TEXT,
  guide_requirements      TEXT,

  -- Vé & dịch vụ khác [ẩn ở intake]
  tickets_details         TEXT,
  other_services          TEXT,

  UNIQUE(opportunity_id)
);

-- ─── BẢNG 2: PHIẾU BÀN GIAO ĐIỀU HÀNH ─────────────────────────────────────
-- Dùng ở stage 3+ (don-hang/[id]), bàn giao từ sale sang điều hành
CREATE TABLE IF NOT EXISTS tour_handover (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id          UUID NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  created_by              UUID REFERENCES users(id),
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW(),

  -- 1. Thông tin chung
  ma_doan                 TEXT,
  vat_required            BOOLEAN,
  status                  TEXT,             -- 'confirmed' | 'pending'
  sale_price              NUMERIC,
  commission              NUMERIC,

  -- 2. Điểm đón
  pickup_location         TEXT,
  pickup_count            INTEGER,
  pickup_quantities       TEXT,
  pickup_time             TEXT,

  -- 3. Số lượng khách
  pax_adults              INTEGER,
  pax_children_under5     INTEGER,
  pax_children_5to10      INTEGER,

  -- 4. Thời gian đi
  trip_days               INTEGER,
  trip_date_range         TEXT,
  trip_timing             TEXT,             -- [ẩn ở handover]
  itinerary               TEXT,             -- lịch trình xác nhận

  -- 5. Khách sạn
  hotel_stars             TEXT,
  hotel_name              TEXT,
  hotel_persons_per_room  INTEGER,
  hotel_room_details      TEXT,

  -- 6. Yêu cầu sự kiện
  event_gala              BOOLEAN DEFAULT FALSE,
  event_team_building     BOOLEAN DEFAULT FALSE,
  event_meeting           BOOLEAN DEFAULT FALSE,
  event_birthday          BOOLEAN DEFAULT FALSE,
  event_anniversary       BOOLEAN DEFAULT FALSE,
  event_details           TEXT,

  -- 7. Điểm đến / Lịch trình
  destination             TEXT,             -- [ẩn ở handover, dùng itinerary]

  -- 8. Thông tin trưởng đoàn
  group_leader_name       TEXT,
  group_leader_phone      TEXT,
  group_leader_email      TEXT,

  -- 9. Đối tượng khách hàng [ẩn ở handover]
  customer_type           TEXT,

  -- 10. Vé máy bay
  flight_preference       TEXT,             -- [ẩn ở handover]
  flight_depart_time      TEXT,
  flight_return_time      TEXT,

  -- 11. Định hướng tour [ẩn ở handover]
  tour_type               TEXT,

  -- 12. Ngân sách [ẩn ở handover]
  budget                  TEXT,

  -- 13-16. Mục tiêu / Chủ đề / Cải thiện / Lưu ý [ẩn ở handover]
  program_goal            TEXT,
  program_theme           TEXT,
  improvements            TEXT,
  other_notes             TEXT,

  -- Vận chuyển
  transport_car_type      TEXT,
  transport_car_count     INTEGER,

  -- Ăn uống
  meals_main_count        INTEGER,
  meals_main_price        NUMERIC,
  meals_breakfast         BOOLEAN,

  -- HDV
  guide_gender            TEXT,
  guide_requirements      TEXT,

  -- Vé & dịch vụ khác
  tickets_details         TEXT,
  other_services          TEXT,

  UNIQUE(opportunity_id)
);

-- ─── RLS ────────────────────────────────────────────────────────────────────
ALTER TABLE tour_intake    ENABLE ROW LEVEL SECURITY;
ALTER TABLE tour_handover  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth users can do all on tour_intake"
  ON tour_intake FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "auth users can do all on tour_handover"
  ON tour_handover FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ─── TRIGGER updated_at ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at ON tour_intake;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON tour_intake
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON tour_handover;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON tour_handover
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
