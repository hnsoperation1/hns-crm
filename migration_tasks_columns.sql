-- Thêm các cột còn thiếu vào bảng tasks
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS opportunity_id UUID REFERENCES opportunities(id) ON DELETE SET NULL;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS due_date DATE;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS done_at TIMESTAMPTZ;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'todo';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS stage INT DEFAULT 0;

-- Đồng bộ tasks đã done
UPDATE tasks SET status = 'done' WHERE is_done = true;

-- Reload schema cache (chạy sau ALTER TABLE)
NOTIFY pgrst, 'reload schema';
