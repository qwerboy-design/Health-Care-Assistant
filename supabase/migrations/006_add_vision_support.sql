-- Migration: Add Vision Support to Models
-- Description: 新增 supports_vision 欄位來標記模型是否支持圖片和 PDF 分析

-- 1. 新增 supports_vision 欄位到 model_pricing 表
ALTER TABLE model_pricing
ADD COLUMN supports_vision BOOLEAN DEFAULT false NOT NULL;

-- 2. 為支持視覺的模型設置標籤
UPDATE model_pricing
SET supports_vision = true
WHERE model_name IN (
  'claude-sonnet-4-5-20250929',
  'claude-opus-4-5-20251101'
);

-- 3. 建立索引以提升查詢效能
CREATE INDEX idx_model_pricing_vision ON model_pricing(supports_vision);

-- 4. 註解說明
COMMENT ON COLUMN model_pricing.supports_vision IS '是否支持圖片和 PDF 分析（Sonnet 4.5 和 Opus 4.5）';
