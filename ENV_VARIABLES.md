# 🔐 環境變數參考

此文件列出所有需要設定的環境變數，供 Vercel 部署時參考。

## 📋 必須設定的環境變數

### Supabase 資料庫

```env
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

**取得方式**:
1. 登入 Supabase Dashboard
2. 選擇您的專案
3. Settings → API → 複製 URL 和 Keys

---

### JWT 加密金鑰

```env
JWT_SECRET=your_jwt_secret_at_least_32_characters_long
```

**生成方式**:
```bash
# Linux/Mac
openssl rand -base64 32

# Windows PowerShell
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | % {[char]$_})
```

---

### Google OAuth 2.0

```env
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your_client_secret
```

**取得方式**:
1. 前往 [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. 建立 OAuth 2.0 Client ID
3. 設定授權重新導向 URI: `https://your-app.vercel.app/api/auth/google/callback`

---

### Email 服務 (Resend)

```env
RESEND_API_KEY=re_your_resend_api_key
```

**取得方式**:
1. 註冊 [Resend](https://resend.com)
2. Dashboard → API Keys → Create API Key

---

### MCP Server (AI 整合)

```env
MCP_SERVER_URL=https://mcp.k-dense.ai/claude-scientific-skills/mcp
MCP_API_KEY=  # 可選，如果 Server 需要認證
```

**預設值**: 使用官方 MCP Server，通常無需 API Key

---

### Next.js 設定

```env
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

**設定方式**: 
- 部署到 Vercel 後，使用 Vercel 提供的網域
- 如果使用自訂網域，改為自訂網域

---

## 🔄 環境變數命名規則

- `NEXT_PUBLIC_*`: 這些變數會暴露給瀏覽器，請勿包含敏感資訊
- 其他變數: 僅在 Server 端可用，適合存放 API Keys 等敏感資訊

---

## ✅ Vercel 設定步驟

1. 登入 Vercel Dashboard
2. 選擇專案 → Settings → Environment Variables
3. 依序新增上述所有環境變數
4. 選擇適用環境: Production, Preview, Development
5. 點擊 Save
6. 重新部署專案

---

## 🔒 安全性建議

- ✅ 使用不同的 API Keys 用於開發和生產環境
- ✅ 定期輪換敏感金鑰
- ✅ 不要在程式碼中硬編碼 API Keys
- ✅ 使用 Vercel 的環境變數加密功能
