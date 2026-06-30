-- Bảng lưu thông tin file đính kèm (dùng chung cho task và đơn hàng)
CREATE TABLE IF NOT EXISTS attachments (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id       UUID REFERENCES tasks(id) ON DELETE CASCADE,
  opportunity_id UUID REFERENCES opportunities(id) ON DELETE CASCADE,
  file_name     TEXT NOT NULL,
  file_path     TEXT NOT NULL,
  file_size     BIGINT,
  mime_type     TEXT,
  uploaded_by   UUID REFERENCES users(id),
  created_at    TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT chk_one_parent CHECK (
    (task_id IS NOT NULL)::int + (opportunity_id IS NOT NULL)::int = 1
  )
);

CREATE INDEX IF NOT EXISTS attachments_task_id_idx ON attachments(task_id);
CREATE INDEX IF NOT EXISTS attachments_opportunity_id_idx ON attachments(opportunity_id);

ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;

-- Mọi user đã đăng nhập đều xem được
CREATE POLICY "attachments_select" ON attachments FOR SELECT TO authenticated USING (true);

-- Upload: mọi user đã đăng nhập
CREATE POLICY "attachments_insert" ON attachments FOR INSERT TO authenticated WITH CHECK (true);

-- Xóa: chỉ người upload hoặc manager
CREATE POLICY "attachments_delete" ON attachments FOR DELETE TO authenticated
  USING (
    uploaded_by = auth.uid()
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('boss','admin','sale_admin'))
  );

-- ── Supabase Storage bucket ──
-- Vào Supabase Dashboard → Storage → New bucket
-- Name: attachments
-- Public: true (để dùng getPublicUrl, không cần signed URL)
-- Allowed MIME types: image/*, application/pdf, application/msword,
--   application/vnd.openxmlformats-officedocument.*, text/csv
-- Max file size: 10485760 (10MB)
--
-- Sau đó thêm Storage Policy:
-- INSERT (authenticated): true
-- SELECT (public hoặc authenticated): true
-- DELETE: auth.uid() = owner (hoặc để authenticated)
