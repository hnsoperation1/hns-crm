-- Bảng ghi lại yêu cầu dịch vụ của khách hàng (trước khi book)
CREATE TABLE IF NOT EXISTS service_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  opportunity_id UUID NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  category TEXT DEFAULT '',
  name TEXT DEFAULT '',
  quantity NUMERIC,
  unit TEXT DEFAULT '',
  unit_price NUMERIC DEFAULT 0,
  total_price NUMERIC DEFAULT 0,
  supplier_name TEXT DEFAULT '',
  details TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  status TEXT DEFAULT 'pending',
  sort_order INT DEFAULT 0,
  include_in_quote BOOLEAN DEFAULT true,
  requirement_note TEXT DEFAULT '',
  sale_approved BOOLEAN,
  sale_note TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE service_requests ENABLE ROW LEVEL SECURITY;

-- Ai thấy đơn thì thấy yêu cầu dịch vụ
CREATE POLICY "view_service_requests"
ON service_requests FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM opportunities o
    WHERE o.id = opportunity_id
    AND (
      current_user_role() = ANY (ARRAY['boss'::base_role, 'admin'::base_role, 'sale_admin'::base_role])
      OR o.assigned_to = auth.uid()
      OR o.operator_id = auth.uid()
      OR auth.uid() = ANY(COALESCE(o.support_ids, '{}'))
    )
  )
);

CREATE POLICY "manage_service_requests"
ON service_requests FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM opportunities o
    WHERE o.id = opportunity_id
    AND (
      current_user_role() = ANY (ARRAY['boss'::base_role, 'admin'::base_role, 'sale_admin'::base_role])
      OR o.assigned_to = auth.uid()
      OR o.operator_id = auth.uid()
      OR auth.uid() = ANY(COALESCE(o.support_ids, '{}'))
    )
  )
);
