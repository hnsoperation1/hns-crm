-- Cho phép user đã đăng nhập insert log
CREATE POLICY "Users can insert activity logs"
  ON activity_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Cho phép user đã đăng nhập đọc log
CREATE POLICY "Users can read activity logs"
  ON activity_logs FOR SELECT
  TO authenticated
  USING (true);

-- Cho phép user đã đăng nhập xóa log của chính mình
CREATE POLICY "Users can delete own activity logs"
  ON activity_logs FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());
