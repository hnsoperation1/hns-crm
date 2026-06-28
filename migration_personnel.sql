-- Thêm sale điều hành và nhân sự hỗ trợ vào opportunities
-- Chạy trong Supabase SQL Editor

ALTER TABLE opportunities
  ADD COLUMN IF NOT EXISTS operator_id UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS support_ids UUID[] DEFAULT '{}';
