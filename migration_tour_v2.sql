-- =============================================
-- HNS CRM — Tour Forms Migration v2
-- Bổ sung field còn thiếu từ "Check list sau chốt.xlsx"
-- =============================================

-- ─── tour_handover: thêm các field còn thiếu ────────────────────────────────
ALTER TABLE tour_handover
  ADD COLUMN IF NOT EXISTS guide_name        TEXT,           -- Tên HDV / MC
  ADD COLUMN IF NOT EXISTS guide_phone       TEXT,           -- SĐT HDV / MC
  ADD COLUMN IF NOT EXISTS car_supplier      TEXT,           -- Xe đặt bên nào (NCC xe)
  ADD COLUMN IF NOT EXISTS hotel_room_count  INTEGER,        -- Tổng số phòng
  ADD COLUMN IF NOT EXISTS hotel_vip_rooms   TEXT,           -- Chi tiết phòng VIP
  ADD COLUMN IF NOT EXISTS gala_location     TEXT,           -- Địa điểm tổ chức Gala
  ADD COLUMN IF NOT EXISTS gala_details      TEXT,           -- Gồm gì: ATAS/Back/sảnh/thời gian
  ADD COLUMN IF NOT EXISTS team_building_details TEXT,       -- Số game, kịch bản, thời gian tổ chức
  ADD COLUMN IF NOT EXISTS meals_schedule    TEXT;           -- JSON: [{day,meal,menu,restaurant}]

-- ─── tour_intake: HDV / MC nếu KH có yêu cầu sẵn ───────────────────────────
ALTER TABLE tour_intake
  ADD COLUMN IF NOT EXISTS guide_name        TEXT,
  ADD COLUMN IF NOT EXISTS guide_phone       TEXT;
