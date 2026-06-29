-- Activity log cho từng công việc
CREATE TABLE IF NOT EXISTS task_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  type TEXT NOT NULL,
  content TEXT,
  meta JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS task_logs_task_id_idx ON task_logs(task_id);
CREATE INDEX IF NOT EXISTS task_logs_created_at_idx ON task_logs(created_at);

ALTER TABLE task_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "task_logs_select" ON task_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "task_logs_insert" ON task_logs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "task_logs_delete" ON task_logs FOR DELETE TO authenticated USING (user_id = auth.uid());
