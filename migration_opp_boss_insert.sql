-- Fix: boss role bị thiếu permission INSERT/UPDATE trên opportunities và contacts

-- 1. Opportunities INSERT: thêm 'boss'
DROP POLICY IF EXISTS "sale_admin_insert_opp" ON opportunities;
CREATE POLICY "sale_admin_insert_opp" ON opportunities FOR INSERT
  WITH CHECK (
    current_user_role() IN ('boss', 'admin', 'sale_admin')
    OR (current_user_role() = 'mkt' AND source = 'mkt')
  );

-- 2. Opportunities UPDATE: boss + admin có thể update tất cả đơn
DROP POLICY IF EXISTS "boss_admin_update_opp" ON opportunities;
CREATE POLICY "boss_admin_update_opp" ON opportunities FOR UPDATE
  USING (current_user_role() IN ('boss', 'admin', 'sale_admin'));

-- 3. Contacts INSERT: thêm 'boss'
DROP POLICY IF EXISTS "mkt_cskh_insert_contact" ON contacts;
CREATE POLICY "mkt_cskh_insert_contact" ON contacts FOR INSERT
  WITH CHECK (
    current_user_role() IN ('boss', 'mkt', 'cskh', 'admin', 'sale_admin')
    OR current_user_flag('can_qualify_lead')
  );
