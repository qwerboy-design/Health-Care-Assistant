-- 新增帳號審核系統欄位

-- 新增 approval_status 欄位
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS approval_status VARCHAR(20) DEFAULT 'pending' 
CHECK (approval_status IN ('pending', 'approved', 'rejected'));

-- 新增 role 欄位
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'user' 
CHECK (role IN ('user', 'admin'));

-- 新增索引以優化查詢效能
CREATE INDEX IF NOT EXISTS idx_customers_approval_status ON customers(approval_status);
CREATE INDEX IF NOT EXISTS idx_customers_role ON customers(role);

-- 新增註解
COMMENT ON COLUMN customers.approval_status IS '帳號審核狀態: pending(待審核), approved(已通過), rejected(已拒絕)';
COMMENT ON COLUMN customers.role IS '用戶角色: user(一般用戶), admin(管理員)';

-- 將現有用戶的 approval_status 設為 'approved'（向後相容）
UPDATE customers 
SET approval_status = 'approved' 
WHERE approval_status IS NULL;
