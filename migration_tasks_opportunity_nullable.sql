-- opportunity_id không bắt buộc: task có thể tồn tại độc lập, không gắn với đơn hàng
ALTER TABLE tasks ALTER COLUMN opportunity_id DROP NOT NULL;
