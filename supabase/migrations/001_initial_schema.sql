-- 臨床助手 AI 資料庫初始化腳本

-- 客戶表
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    password_hash VARCHAR(255),
    auth_provider VARCHAR(20) NOT NULL CHECK (auth_provider IN ('password', 'otp', 'google')),
    oauth_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_oauth_id ON customers(oauth_id);

COMMENT ON TABLE customers IS '客戶資料表';
COMMENT ON COLUMN customers.auth_provider IS '認證提供者: password, otp, google';
COMMENT ON COLUMN customers.oauth_id IS 'OAuth 提供者的用戶 ID';

-- OTP tokens 表
CREATE TABLE IF NOT EXISTS otp_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL,
    token VARCHAR(6) NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_otp_tokens_email ON otp_tokens(email);
CREATE INDEX IF NOT EXISTS idx_otp_tokens_token ON otp_tokens(token);

COMMENT ON TABLE otp_tokens IS 'OTP 驗證碼表';

-- Sessions 表
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    token TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    ip_address VARCHAR(45),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sessions_customer_id ON sessions(customer_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);

COMMENT ON TABLE sessions IS 'Session 表';

-- 對話表
CREATE TABLE IF NOT EXISTS chat_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    workload_level VARCHAR(20) NOT NULL CHECK (workload_level IN ('instant', 'basic', 'standard', 'professional')),
    selected_function VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_chat_conversations_customer_id ON chat_conversations(customer_id);

COMMENT ON TABLE chat_conversations IS '對話記錄表';
COMMENT ON COLUMN chat_conversations.workload_level IS '工作量級別: instant, basic, standard, professional';
COMMENT ON COLUMN chat_conversations.selected_function IS '選擇的功能: lab, radiology, medical_record, medication';

-- 訊息表
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    file_url TEXT,
    file_name VARCHAR(255),
    file_type VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation_id ON chat_messages(conversation_id);

COMMENT ON TABLE chat_messages IS '對話訊息表';
COMMENT ON COLUMN chat_messages.role IS '訊息角色: user, assistant';

-- 自動更新 updated_at 函數
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 自動更新 customers.updated_at
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 自動更新 chat_conversations.updated_at
CREATE TRIGGER update_chat_conversations_updated_at BEFORE UPDATE ON chat_conversations
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
