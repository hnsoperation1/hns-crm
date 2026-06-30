-- Fix: cho phép mọi user đang active đều có thể tạo công việc
DROP POLICY IF EXISTS "tasks_insert" ON tasks;
DROP POLICY IF EXISTS "tasks_insert_manager" ON tasks;
DROP POLICY IF EXISTS "tasks_insert_policy" ON tasks;

CREATE POLICY "tasks_insert" ON tasks
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_active = true)
  );
