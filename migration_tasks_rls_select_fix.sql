-- Fix SELECT policy: cho phép xem task được giao HOẶC do mình tạo
DROP POLICY IF EXISTS "tasks_select" ON tasks;

CREATE POLICY "tasks_select" ON tasks FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('boss','admin','sale_admin'))
    OR assigned_to = auth.uid()
    OR created_by = auth.uid()
  );
