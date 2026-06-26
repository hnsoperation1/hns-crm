-- =============================================
-- HNS CRM — Tour Forms Migration v3
-- Gộp tất cả field vào tour_intake, tour_handover tạm thời không dùng
-- =============================================

ALTER TABLE tour_intake
  ADD COLUMN IF NOT EXISTS hotel_room_count      INTEGER,
  ADD COLUMN IF NOT EXISTS hotel_vip_rooms       TEXT,
  ADD COLUMN IF NOT EXISTS car_supplier          TEXT,
  ADD COLUMN IF NOT EXISTS gala_location         TEXT,
  ADD COLUMN IF NOT EXISTS gala_details          TEXT,
  ADD COLUMN IF NOT EXISTS team_building_details TEXT,
  ADD COLUMN IF NOT EXISTS meals_schedule        TEXT;   -- JSON: [{day,meal,menu,restaurant}]
