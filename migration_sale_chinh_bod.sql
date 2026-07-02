-- Thêm 'bod' vào check constraint của cột type trong bảng sale_chinh
-- Constraint cũ chỉ cho phép: nhan_vien, ctv, doi_tac, khac

ALTER TABLE sale_chinh DROP CONSTRAINT IF EXISTS sale_chinh_type_check;
ALTER TABLE sale_chinh DROP CONSTRAINT IF EXISTS sale_chinh_type_c;

ALTER TABLE sale_chinh
  ADD CONSTRAINT sale_chinh_type_check
  CHECK (type IN ('nhan_vien', 'ctv', 'doi_tac', 'bod', 'khac'));
