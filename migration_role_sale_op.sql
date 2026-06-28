-- Thêm role sale_op (Sale Điều hành) vào enum base_role
-- Chạy trong Supabase SQL Editor

ALTER TYPE base_role ADD VALUE IF NOT EXISTS 'sale_op' AFTER 'sale_admin';

-- Cập nhật RLS policy để sale_op có thể thấy tất cả đơn (như sale_admin)
-- sale_op thường cần thấy toàn bộ để điều phối
DROP POLICY IF EXISTS "boss_admin_see_all_opps" ON opportunities;

CREATE POLICY "boss_admin_see_all_opps"
ON opportunities
FOR SELECT
TO authenticated
USING (
  current_user_role() = ANY (ARRAY['boss'::base_role, 'admin'::base_role, 'sale_admin'::base_role, 'sale_op'::base_role])
);

-- sale_op cũng update được tất cả đơn
DROP POLICY IF EXISTS "sale_admin_update_opportunities" ON opportunities;

CREATE POLICY "sale_admin_update_opportunities"
ON opportunities
FOR UPDATE
TO authenticated
USING (
  current_user_role() = ANY (ARRAY['boss'::base_role, 'admin'::base_role, 'sale_admin'::base_role, 'sale_op'::base_role])
)
WITH CHECK (
  current_user_role() = ANY (ARRAY['boss'::base_role, 'admin'::base_role, 'sale_admin'::base_role, 'sale_op'::base_role])
);
