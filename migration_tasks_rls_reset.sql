-- Drop toàn bộ policy hiện có trên bảng tasks
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'tasks' AND schemaname = 'public'
  LOOP
    EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON tasks';
  END LOOP;
END $$;

-- SELECT: manager xem tất cả; user thường xem task được giao hoặc do mình tạo
CREATE POLICY "tasks_select" ON tasks FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('boss','admin','sale_admin'))
    OR assigned_to = auth.uid()
    OR created_by = auth.uid()
  );

-- INSERT: mọi user đã đăng nhập đều tạo được
CREATE POLICY "tasks_insert" ON tasks FOR INSERT TO authenticated
  WITH CHECK (true);

-- UPDATE: manager sửa tất cả; user thường sửa task của mình
CREATE POLICY "tasks_update" ON tasks FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('boss','admin','sale_admin'))
    OR assigned_to = auth.uid()
    OR created_by = auth.uid()
  );

-- DELETE: chỉ manager
CREATE POLICY "tasks_delete" ON tasks FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('boss','admin','sale_admin'))
  );
