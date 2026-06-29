-- RLS policies cho bảng tasks
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Xóa policies cũ nếu có
DROP POLICY IF EXISTS "tasks_select" ON tasks;
DROP POLICY IF EXISTS "tasks_insert" ON tasks;
DROP POLICY IF EXISTS "tasks_update" ON tasks;
DROP POLICY IF EXISTS "tasks_delete" ON tasks;

-- SELECT: manager thấy tất cả; user thường thấy task được giao cho mình
CREATE POLICY "tasks_select" ON tasks FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role IN ('boss', 'admin', 'sale_admin')
  )
  OR assigned_to = auth.uid()
);

-- INSERT: mọi user đang active đều có thể tạo task
CREATE POLICY "tasks_insert" ON tasks FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.is_active = true
  )
);

-- UPDATE: manager hoặc người được giao
CREATE POLICY "tasks_update" ON tasks FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role IN ('boss', 'admin', 'sale_admin')
  )
  OR assigned_to = auth.uid()
);

-- DELETE: chỉ manager
CREATE POLICY "tasks_delete" ON tasks FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role IN ('boss', 'admin', 'sale_admin')
  )
);
