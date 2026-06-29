-- Thêm role sale_op (Điều hành) vào enum base_role
-- Chạy lần 1 riêng:
-- ALTER TYPE base_role ADD VALUE IF NOT EXISTS 'sale_op' AFTER 'sale_admin';

-- Chạy lần 2 (sau khi lần 1 đã commit):

-- sale_op KHÔNG thấy tất cả đơn — chỉ thấy đơn có tên mình (dùng policy involved_users_see_opps)
-- Giữ nguyên boss_admin_see_all_opps chỉ cho boss/admin/sale_admin
DROP POLICY IF EXISTS "boss_admin_see_all_opps" ON opportunities;

CREATE POLICY "boss_admin_see_all_opps"
ON opportunities
FOR SELECT
TO authenticated
USING (
  current_user_role() = ANY (ARRAY['boss'::base_role, 'admin'::base_role, 'sale_admin'::base_role])
);

-- UPDATE: boss/admin/sale_admin update được tất cả
DROP POLICY IF EXISTS "sale_admin_update_opportunities" ON opportunities;

CREATE POLICY "sale_admin_update_opportunities"
ON opportunities
FOR UPDATE
TO authenticated
USING (
  current_user_role() = ANY (ARRAY['boss'::base_role, 'admin'::base_role, 'sale_admin'::base_role])
)
WITH CHECK (
  current_user_role() = ANY (ARRAY['boss'::base_role, 'admin'::base_role, 'sale_admin'::base_role])
);

-- SELECT: ai có tên trong đơn (assigned_to, operator_id, support_ids) thì thấy
-- Áp dụng cho sale_op, sale_tv và mọi role khác
DROP POLICY IF EXISTS "involved_users_see_opps" ON opportunities;

CREATE POLICY "involved_users_see_opps"
ON opportunities
FOR SELECT
TO authenticated
USING (
  assigned_to = auth.uid()
  OR operator_id = auth.uid()
  OR auth.uid() = ANY(COALESCE(support_ids, '{}'))
);

-- UPDATE: ai có tên trong đơn thì update được
DROP POLICY IF EXISTS "involved_users_update_opps" ON opportunities;

CREATE POLICY "involved_users_update_opps"
ON opportunities
FOR UPDATE
TO authenticated
USING (
  assigned_to = auth.uid()
  OR operator_id = auth.uid()
  OR auth.uid() = ANY(COALESCE(support_ids, '{}'))
)
WITH CHECK (
  assigned_to = auth.uid()
  OR operator_id = auth.uid()
  OR auth.uid() = ANY(COALESCE(support_ids, '{}'))
);
