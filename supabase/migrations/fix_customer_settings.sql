-- 完整重建 customer_settings 表（安全版本）
-- 如果表已存在但有問題，先刪除再重建

-- 步驟 1: 刪除舊的觸發器（如果存在）
DROP TRIGGER IF EXISTS trigger_update_customer_settings_updated_at ON customer_settings;

-- 步驟 2: 刪除觸發器函數（如果存在）
DROP FUNCTION IF EXISTS update_customer_settings_updated_at();

-- 步驟 3: 刪除表（CASCADE 會同時刪除相關索引）
DROP TABLE IF EXISTS customer_settings CASCADE;

-- 步驟 4: 重新建立表
CREATE TABLE customer_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL UNIQUE,
  show_function_selector BOOLEAN NOT NULL DEFAULT false,
  show_workload_selector BOOLEAN NOT NULL DEFAULT false,
  show_screenshot BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- 外鍵約束
  CONSTRAINT fk_customer
    FOREIGN KEY (customer_id)
    REFERENCES customers(id)
    ON DELETE CASCADE
);

-- 步驟 5: 建立索引
CREATE INDEX idx_customer_settings_customer_id ON customer_settings(customer_id);

-- 步驟 6: 建立觸發器函數
CREATE OR REPLACE FUNCTION update_customer_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 步驟 7: 建立觸發器
CREATE TRIGGER trigger_update_customer_settings_updated_at
  BEFORE UPDATE ON customer_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_customer_settings_updated_at();

-- 步驟 8: 添加註解
COMMENT ON TABLE customer_settings IS 'Stores customer UI customization settings for showing/hiding features';
COMMENT ON COLUMN customer_settings.show_function_selector IS 'Whether to show the function selector component';
COMMENT ON COLUMN customer_settings.show_workload_selector IS 'Whether to show the workload level selector';
COMMENT ON COLUMN customer_settings.show_screenshot IS 'Whether to show the screenshot feature';

-- 步驟 9: 驗證建立成功
SELECT 
  'Table created successfully' as status,
  COUNT(*) as record_count 
FROM customer_settings;
