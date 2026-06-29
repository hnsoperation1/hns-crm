-- Thêm parent_id để hỗ trợ công việc con
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES tasks(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS tasks_parent_id_idx ON tasks(parent_id);
