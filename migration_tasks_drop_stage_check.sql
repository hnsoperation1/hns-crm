-- 1. Drop tất cả check constraints trên bảng tasks
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'tasks'::regclass AND contype = 'c'
  LOOP
    EXECUTE 'ALTER TABLE tasks DROP CONSTRAINT IF EXISTS ' || quote_ident(r.conname);
  END LOOP;
END $$;

-- 2. Cho phép stage = 0 và có default
ALTER TABLE tasks ALTER COLUMN stage SET DEFAULT 0;
ALTER TABLE tasks ALTER COLUMN stage DROP NOT NULL;
