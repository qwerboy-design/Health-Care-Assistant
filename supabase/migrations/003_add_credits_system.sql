-- Migration: Add Credits System
-- Description: 新增 Credits 分數系統、模型定價管理、Credits 消費記錄

-- 1. 在 customers 表新增 credits 欄位
ALTER TABLE customers
ADD COLUMN credits INTEGER DEFAULT 0 NOT NULL;

-- 為現有用戶設置初始 Credits（例如 100 點）
UPDATE customers SET credits = 100 WHERE credits = 0;

-- 2. 建立 model_pricing 表（模型定價管理）
CREATE TABLE model_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_name VARCHAR(255) UNIQUE NOT NULL,
  display_name VARCHAR(255) NOT NULL,
  credits_cost INTEGER NOT NULL CHECK (credits_cost > 0),
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 建立索引以提升查詢效能
CREATE INDEX idx_model_pricing_active ON model_pricing(is_active);
CREATE INDEX idx_model_pricing_model_name ON model_pricing(model_name);

-- 3. 建立 credits_transactions 表（Credits 消費歷史）
CREATE TABLE credits_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES chat_conversations(id) ON DELETE SET NULL,
  model_name VARCHAR(255) NOT NULL,
  credits_cost INTEGER NOT NULL,
  credits_before INTEGER NOT NULL,
  credits_after INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 建立索引以提升查詢效能
CREATE INDEX idx_credits_transactions_customer ON credits_transactions(customer_id);
CREATE INDEX idx_credits_transactions_conversation ON credits_transactions(conversation_id);
CREATE INDEX idx_credits_transactions_created_at ON credits_transactions(created_at DESC);

-- 4. 在 chat_conversations 表新增 model_name 欄位
ALTER TABLE chat_conversations
ADD COLUMN model_name VARCHAR(255);

-- 5. 插入預設模型定價資料
-- 注意：模型名稱必須與 Anthropic API 支援的模型 ID 完全一致
INSERT INTO model_pricing (model_name, display_name, credits_cost, is_active) VALUES
  ('claude-haiku-4-5-20251001', 'Claude Haiku 4.5', 3, true),
  ('claude-sonnet-4-5-20250929', 'Claude Sonnet 4.5', 5, true),
  ('claude-opus-4-5-20251101', 'Claude Opus 4.5', 20, true);

-- 參考：Anthropic Claude 4.5 系列模型 ID（2026年最新）
-- - claude-sonnet-4-5-20250929 (Claude Sonnet 4.5) - 平衡智能與速度
-- - claude-haiku-4-5-20251001 (Claude Haiku 4.5) - 最快速
-- - claude-opus-4-5-20251101 (Claude Opus 4.5) - 最高智能

-- 6. 建立更新 updated_at 的觸發器函數（如果不存在）
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. 為 model_pricing 表建立觸發器
CREATE TRIGGER update_model_pricing_updated_at
  BEFORE UPDATE ON model_pricing
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 8. 建立 RLS (Row Level Security) 政策

-- customers 表的 credits 欄位：用戶只能讀取自己的 credits
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- model_pricing 表：所有已認證用戶可讀取啟用的模型
ALTER TABLE model_pricing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view active models"
  ON model_pricing FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Admins can manage models"
  ON model_pricing FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM customers
      WHERE customers.id = auth.uid()::uuid
      AND customers.role = 'admin'
    )
  );

-- credits_transactions 表：用戶只能查看自己的交易記錄
ALTER TABLE credits_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transactions"
  ON credits_transactions FOR SELECT
  TO authenticated
  USING (customer_id = auth.uid()::uuid);

CREATE POLICY "Service role can insert transactions"
  ON credits_transactions FOR INSERT
  TO service_role
  WITH CHECK (true);

-- 9. 建立輔助函數：檢查並扣除 Credits
CREATE OR REPLACE FUNCTION deduct_customer_credits(
  p_customer_id UUID,
  p_credits_cost INTEGER,
  p_model_name VARCHAR(255),
  p_conversation_id UUID
)
RETURNS JSON AS $$
DECLARE
  v_current_credits INTEGER;
  v_new_credits INTEGER;
  v_transaction_id UUID;
BEGIN
  -- 鎖定該用戶的記錄以避免並發問題
  SELECT credits INTO v_current_credits
  FROM customers
  WHERE id = p_customer_id
  FOR UPDATE;

  -- 檢查 Credits 是否足夠
  IF v_current_credits < p_credits_cost THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Credits 不足',
      'current_credits', v_current_credits,
      'required_credits', p_credits_cost
    );
  END IF;

  -- 計算新的 Credits
  v_new_credits := v_current_credits - p_credits_cost;

  -- 更新用戶 Credits
  UPDATE customers
  SET credits = v_new_credits
  WHERE id = p_customer_id;

  -- 記錄交易
  INSERT INTO credits_transactions (
    customer_id,
    conversation_id,
    model_name,
    credits_cost,
    credits_before,
    credits_after
  ) VALUES (
    p_customer_id,
    p_conversation_id,
    p_model_name,
    p_credits_cost,
    v_current_credits,
    v_new_credits
  ) RETURNING id INTO v_transaction_id;

  -- 返回成功結果
  RETURN json_build_object(
    'success', true,
    'transaction_id', v_transaction_id,
    'credits_before', v_current_credits,
    'credits_after', v_new_credits
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. 建立輔助函數：增加 Credits（管理員用）
CREATE OR REPLACE FUNCTION add_customer_credits(
  p_customer_id UUID,
  p_credits_amount INTEGER
)
RETURNS JSON AS $$
DECLARE
  v_current_credits INTEGER;
  v_new_credits INTEGER;
BEGIN
  -- 獲取當前 Credits
  SELECT credits INTO v_current_credits
  FROM customers
  WHERE id = p_customer_id
  FOR UPDATE;

  IF v_current_credits IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', '用戶不存在'
    );
  END IF;

  -- 計算新的 Credits
  v_new_credits := v_current_credits + p_credits_amount;

  -- 更新用戶 Credits
  UPDATE customers
  SET credits = v_new_credits
  WHERE id = p_customer_id;

  -- 返回成功結果
  RETURN json_build_object(
    'success', true,
    'credits_before', v_current_credits,
    'credits_after', v_new_credits
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. 註解說明
COMMENT ON COLUMN customers.credits IS '用戶的 Credits 分數';
COMMENT ON TABLE model_pricing IS '模型定價管理表';
COMMENT ON TABLE credits_transactions IS 'Credits 消費歷史記錄';
COMMENT ON COLUMN chat_conversations.model_name IS '對話使用的模型名稱';
