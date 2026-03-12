# 🌿 Git 分支管理說明

## 📋 分支概覽

### ✅ main（主分支）
- **狀態**: 穩定版本
- **最新提交**: `f4578ad - fix: Remove scale option from html2canvas`
- **包含功能**: 
  - 原有截圖功能（區域截圖 - html2canvas）
  - 所有穩定功能

### 🧪 feature/cross-tab-screenshot-experimental（實驗性分支）
- **狀態**: 開發中/測試階段
- **最新提交**: `e56e558 - feat: Add experimental cross-tab screenshot feature`
- **包含功能**:
  - ✨ 跨分頁截圖功能（Screen Capture API）
  - ✨ 截圖模式選擇對話框
  - ✨ 智能 API 偵測與降級機制
  - ✨ 17 個單元測試
  - ✨ 繁中/英文國際化

---

## 🔄 分支切換操作

### 切換到主分支（穩定版本）
```bash
git checkout main
```
**效果**: 回到原有穩定版本，不包含跨分頁截圖功能

### 切換到實驗性分支（測試新功能）
```bash
git checkout feature/cross-tab-screenshot-experimental
```
**效果**: 啟用跨分頁截圖功能，可以測試新功能

### 查看當前分支
```bash
git branch --show-current
```

### 查看所有分支
```bash
git branch -v
```

---

## 📁 分支差異

### 實驗性分支新增的檔案

#### 核心組件
- `components/screenshot/CrossTabCapture.tsx` - 跨分頁截圖組件
- `components/screenshot/ScreenshotModeSelector.tsx` - 模式選擇組件

#### 測試檔案
- `__tests__/components/screenshot/CrossTabCapture.test.tsx`
- `__tests__/components/screenshot/ScreenshotModeSelector.test.tsx`

#### 文檔
- `CROSS_TAB_SCREENSHOT_USAGE_GUIDE.md` - 使用指南
- `CROSS_TAB_SCREENSHOT_IMPLEMENTATION_COMPLETE.md` - 實作報告
- `FULL_FEATURE_CHECK_REPORT.md` - 功能檢查報告
- `TESTING_INSTRUCTIONS.md` - 測試說明

#### 工具腳本
- `scripts/clean-agent-logs.ps1`
- `scripts/clean-logs.ps1`
- `scripts/fix-encoding.ps1`
- `scripts/fix-components.ps1`

#### 修改的檔案
- `app/(main)/chat/page.tsx` - 整合新功能
- `lib/i18n/translations.ts` - 新增翻譯鍵

---

## ⚠️ 重要注意事項

### 🚫 不要合併到 main
```bash
# ❌ 請勿執行以下操作：
git checkout main
git merge feature/cross-tab-screenshot-experimental
```

**原因**: 
- 功能尚未完善
- 需要更多測試
- 可能影響生產環境

### ✅ 測試流程

1. **切換到實驗性分支**
   ```bash
   git checkout feature/cross-tab-screenshot-experimental
   ```

2. **啟動開發伺服器**
   ```bash
   npm run dev
   ```

3. **測試功能**
   - 訪問 http://localhost:3003/chat
   - 測試跨分頁截圖
   - 記錄問題和建議

4. **測試完成後切換回主分支**
   ```bash
   git checkout main
   ```

---

## 🔧 開發工作流程

### 繼續開發實驗性功能

1. 切換到實驗性分支
   ```bash
   git checkout feature/cross-tab-screenshot-experimental
   ```

2. 進行修改和測試

3. 提交更改
   ```bash
   git add .
   git commit -m "fix: 修復某個問題"
   ```

4. 測試完成後切換回主分支
   ```bash
   git checkout main
   ```

### 如果需要捨棄實驗性分支

⚠️ **警告**: 這將永久刪除所有實驗性功能

```bash
git branch -D feature/cross-tab-screenshot-experimental
```

---

## 📊 版本狀態

### Main 分支（生產版本）
```
✅ 穩定
✅ 可部署
✅ 包含所有已驗證功能
```

### 實驗性分支（開發版本）
```
🧪 測試中
⚠️ 不可部署
✨ 包含新功能但未完全驗證
```

---

## 🎯 何時可以合併？

當以下條件**全部**滿足時，才可考慮合併：

- [ ] 所有手動測試通過
- [ ] Chrome/Edge/Firefox 測試通過
- [ ] Safari 降級機制正常
- [ ] 無已知 bug
- [ ] 性能測試通過（大檔案上傳）
- [ ] 與現有功能完全相容
- [ ] 獲得產品負責人批准
- [ ] 完成程式碼審查

---

## 📞 聯絡與協作

### 如果發現問題
1. 記錄問題詳情
2. 在實驗性分支中修復
3. 測試修復是否有效
4. 提交修復

### 如果需要協助
- 查看 `CROSS_TAB_SCREENSHOT_USAGE_GUIDE.md`
- 查看 `FULL_FEATURE_CHECK_REPORT.md`
- 查看測試報告

---

## 🔒 安全提示

1. **不要推送到 origin/main**
   - 實驗性功能僅在本地測試

2. **保持 main 分支乾淨**
   - main 分支隨時可部署

3. **定期備份**
   - 實驗性分支的更改

---

## 📝 變更日誌

### 2026-03-12
- 創建 `feature/cross-tab-screenshot-experimental` 分支
- 提交跨分頁截圖功能（commit: e56e558）
- 包含 16 個新檔案，1993 行新增代碼
- 所有測試通過（17/17）

---

## 🚀 快速參考

```bash
# 查看當前分支
git branch --show-current

# 切換到主分支（穩定版）
git checkout main

# 切換到實驗性分支（測試版）
git checkout feature/cross-tab-screenshot-experimental

# 查看分支差異
git diff main feature/cross-tab-screenshot-experimental

# 查看檔案清單
git diff --name-only main feature/cross-tab-screenshot-experimental
```

---

**記住**: 實驗性分支僅用於測試，不要合併到 main 直到功能完全穩定！
