-- 檢查並修復 customer_settings 表
-- 步驟 1: 檢查表是否存在
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'customer_settings'
) as table_exists;

-- 步驟 2: 檢查表結構
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'customer_settings'
ORDER BY ordinal_position;

-- 步驟 3: 檢查現有資料
SELECT COUNT(*) as record_count FROM customer_settings;

-- 步驟 4: 查看現有資料（如果有）
SELECT * FROM customer_settings LIMIT 5;
