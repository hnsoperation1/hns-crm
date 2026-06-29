-- Thêm status column cho tasks (kanban stages)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'todo';

-- Đồng bộ tasks đã done
UPDATE tasks SET status = 'done' WHERE is_done = true AND status = 'todo';
