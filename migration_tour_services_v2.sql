-- Thêm cột phối hợp sale ↔ điều hành vào tour_services
ALTER TABLE tour_services
  ADD COLUMN IF NOT EXISTS requirement_note TEXT,  -- yêu cầu/tiêu chuẩn KH mong muốn
  ADD COLUMN IF NOT EXISTS sale_approved    BOOLEAN DEFAULT NULL,  -- null=chưa review, true=OK, false=Sai
  ADD COLUMN IF NOT EXISTS sale_note        TEXT;  -- ghi chú của sale khi không OK
