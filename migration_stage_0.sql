-- Thêm stage_0 (Mới tạo) vào enum opp_stage
-- Chạy trong Supabase SQL Editor

ALTER TYPE opp_stage ADD VALUE IF NOT EXISTS 'stage_0' BEFORE 'stage_1';
