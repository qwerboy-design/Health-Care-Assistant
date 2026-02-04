# 🚀 使用 Vercel CLI 部署指南

## ✅ 已完成
- Vercel CLI 已安装（版本 50.9.6）
- 代码已推送到 GitHub

---

## 📋 使用 Vercel CLI 部署步骤

### 步骤 1: 登入 Vercel

```bash
vercel login
```

这将：
1. 打开浏览器
2. 要求您登入 Vercel 账号
3. 授权 CLI 访问

**或者**，您可以使用 Email 验证：
```bash
vercel login --email your-email@example.com
```

---

### 步骤 2: 链接到 Vercel 项目

在项目根目录执行：

```bash
vercel link
```

这会询问：
- **Set up and deploy?** → 选择 **Y**
- **Which scope?** → 选择您的账号/团队
- **Link to existing project?** → 选择 **N** (首次部署)
- **What's your project's name?** → 输入项目名称（例如：`health-care-assistant`）
- **In which directory is your code located?** → 按 Enter（使用当前目录 `./`）

---

### 步骤 3: 设置环境变量

⚠️ **重要**: 在部署前必须设置所有环境变量！

#### 选项 A: 使用 CLI 逐个添加

```bash
# 示例：添加 Supabase URL
vercel env add NEXT_PUBLIC_SUPABASE_URL production

# 然后输入值，并选择环境（production/preview/development）
```

**需要添加的 15+ 个环境变量**（参考 `VERCEL_ENV_CHECKLIST.md`）：
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
JWT_SECRET
NEXT_PUBLIC_GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
RESEND_API_KEY
R2_ACCOUNT_ID
R2_ACCESS_KEY_ID
R2_SECRET_ACCESS_KEY
R2_BUCKET_NAME
R2_PUBLIC_URL
ANTHROPIC_API_KEY
ANTHROPIC_MODEL
NEXT_PUBLIC_APP_URL
ADMIN_EMAIL
```

#### 选项 B: 使用 Vercel Dashboard 设置（推荐）

1. 前往 https://vercel.com/dashboard
2. 选择您的项目
3. Settings → Environment Variables
4. 按照 `VERCEL_ENV_CHECKLIST.md` 逐一添加

💡 **建议**: 使用 Dashboard 设置环境变量更直观方便！

---

### 步骤 4: 部署到 Vercel

#### 部署到 Production（正式环境）

```bash
vercel --prod
```

这会：
1. 构建项目（`npm run build`）
2. 上传到 Vercel
3. 部署到生产环境
4. 提供生产环境 URL

#### 部署到 Preview（预览环境）

```bash
vercel
```

这会创建一个预览部署，用于测试。

---

### 步骤 5: 监控部署状态

部署过程中，CLI 会显示：
- ✅ 构建日志
- ✅ 部署进度
- ✅ 最终的部署 URL

部署完成后会显示类似：
```
✅ Production: https://health-care-assistant.vercel.app [2m 30s]
```

---

## 🔄 部署后必做事项

### 1. 更新 `NEXT_PUBLIC_APP_URL`

```bash
# 使用实际的 Vercel URL 更新
vercel env add NEXT_PUBLIC_APP_URL production
# 输入: https://your-actual-app.vercel.app

# 重新部署以应用更改
vercel --prod
```

### 2. 更新 Google OAuth 重定向 URI

前往 [Google Cloud Console](https://console.cloud.google.com/apis/credentials)：
1. 选择您的 OAuth 2.0 Client ID
2. 添加 **Authorized redirect URIs**:
   ```
   https://your-actual-app.vercel.app/api/auth/google/callback
   ```
3. 添加 **Authorized JavaScript origins**:
   ```
   https://your-actual-app.vercel.app
   ```
4. 保存

---

## 📊 其他有用的 CLI 命令

### 查看项目信息
```bash
vercel list
```

### 查看部署列表
```bash
vercel ls
```

### 查看环境变量
```bash
vercel env ls
```

### 查看部署日志
```bash
vercel logs <deployment-url>
```

### 删除环境变量
```bash
vercel env rm VARIABLE_NAME production
```

### 拉取环境变量到本地
```bash
vercel env pull .env.local
```

---

## 🆘 故障排除

### 部署失败：Environment variable not found

**解决方法**：
1. 确认所有必须的环境变量都已设置
2. 检查变量名称拼写
3. 使用 `vercel env ls` 查看已设置的变量

### 部署失败：Build error

**解决方法**：
1. 本地测试构建：`npm run build`
2. 检查 Vercel 构建日志
3. 确认所有依赖都在 `package.json` 中

### OAuth 不工作

**解决方法**：
1. 确认已更新 Google OAuth 重定向 URI
2. 等待 5-10 分钟让 Google 设置生效
3. 清除浏览器缓存并重试

---

## 🔄 后续更新部署

当您修改代码并推送到 GitHub 后：

**自动部署**（推荐）：
- Vercel 会自动检测 GitHub 推送并部署
- 推送到 `main` → 自动部署到 Production
- 推送到其他分支 → 自动部署到 Preview

**手动部署**（使用 CLI）：
```bash
# 确保代码已推送到 GitHub
git push origin main

# 手动触发部署
vercel --prod
```

---

## 📚 相关资源

- [Vercel CLI 文档](https://vercel.com/docs/cli)
- [Vercel 环境变量文档](https://vercel.com/docs/concepts/projects/environment-variables)
- 项目文档：
  - `VERCEL_ENV_CHECKLIST.md` - 环境变量清单
  - `VERCEL_QUICK_DEPLOY.md` - 快速部署参考
  - `GITHUB_VERCEL_DEPLOYMENT_STEPS.md` - 完整部署指南

---

## ⚡ 快速命令参考

```bash
# 登入
vercel login

# 链接项目
vercel link

# 部署到预览环境
vercel

# 部署到生产环境
vercel --prod

# 查看部署列表
vercel ls

# 查看环境变量
vercel env ls

# 添加环境变量
vercel env add VARIABLE_NAME production

# 查看日志
vercel logs
```

---

**准备好开始部署了吗？** 🚀

下一步：执行 `vercel login` 登入您的 Vercel 账号！
