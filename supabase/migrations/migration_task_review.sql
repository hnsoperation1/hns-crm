-- ── 1. Thêm cột review vào bảng tasks ─────────────────────────────────────────
alter table tasks
  add column if not exists review_status text check (review_status in ('approved', 'rejected')),
  add column if not exists review_note   text,
  add column if not exists reviewed_by   uuid references users(id),
  add column if not exists reviewed_at   timestamptz;

-- ── 2. Tạo bảng task_logs (nếu chưa có) ──────────────────────────────────────
-- Schema dùng chung cho cả activity log (detail page) và review log
create table if not exists task_logs (
  id         uuid primary key default gen_random_uuid(),
  task_id    uuid not null references tasks(id) on delete cascade,
  type       text not null,
  -- type values:
  --   Activity (nhân viên):
  --     'status_change'   đổi tình trạng
  --     'done_toggle'     đánh dấu/bỏ hoàn thành
  --     'assignee_change' đổi người thực hiện
  --     'title_change'    đổi tên
  --     'due_date_change' đổi deadline
  --     'subtask_add'     thêm nhiệm vụ
  --     'subtask_done'    hoàn thành nhiệm vụ
  --     'comment'         ghi chú
  --   Review (quản lí):
  --     'submitted'       nhân viên báo xong (gửi xét duyệt)
  --     'approved'        quản lí duyệt đạt
  --     'rejected'        quản lí trả về (content = lí do)
  user_id    uuid references users(id),
  content    text,   -- comment text hoặc lí do reject
  meta       jsonb,  -- metadata tuỳ type (old/new values, names...)
  created_at timestamptz default now()
);

create index if not exists idx_task_logs_task_id    on task_logs(task_id);
create index if not exists idx_task_logs_created_at on task_logs(created_at desc);

-- ── 3. RLS cho task_logs ───────────────────────────────────────────────────────
alter table task_logs enable row level security;

drop policy if exists "task_logs_select" on task_logs;
drop policy if exists "task_logs_insert" on task_logs;

create policy "task_logs_select" on task_logs for select using (
  exists (
    select 1 from tasks t
    where t.id = task_logs.task_id
      and (
        t.assigned_to = auth.uid()
        or t.created_by = auth.uid()
        or exists (
          select 1 from users u
          where u.id = auth.uid()
            and (u.role in ('boss', 'admin', 'sale_admin') or u.is_super_admin = true)
        )
      )
  )
);

create policy "task_logs_insert" on task_logs for insert with check (
  user_id = auth.uid()
);
