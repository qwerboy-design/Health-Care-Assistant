# 設計系統實作摘要

## ✅ 已完成的更新（2026-04-16）

基於 **Notion 風格**和**溫暖點綴色（Terracotta）**的醫療 AI 設計系統已成功實作。

### 1. 核心設計文件

- ✅ **DESIGN.md**：完整的設計系統規範文件
  - 色彩調色板（Terracotta 主色調 + 溫暖中性色）
  - 字體系統（Sans-serif、Serif、Monospace）
  - 組件樣式規範
  - 間距系統
  - 陰影與深度系統
  - 響應式設計原則
  - Do's and Don'ts 指南

### 2. 配置文件更新

- ✅ **tailwind.config.ts**
  - 新增 Terracotta 色系（`terracotta`, `terracotta-soft`, `terracotta-deep`）
  - 新增 Paper 色系（溫暖中性色）
  - 新增醫療紫色（`medical-purple`）
  - 自訂字體家族（Inter、Merriweather、JetBrains Mono）
  - 自訂間距系統
  - 自訂圓角半徑
  - 自訂陰影效果

- ✅ **app/globals.css**
  - 定義 CSS 變數
  - 新增字體工具類別（`.heading-serif`, `.text-mono`）
  - 新增組件基礎樣式（`.btn-primary`, `.btn-secondary`, `.input-field`, `.card`）
  - 支援深色模式（可選）
  - 優化字體渲染

### 3. 頁面組件更新

#### 認證頁面
- ✅ **app/(auth)/login/page.tsx**
  - 更新背景色為 Paper White
  - 更新主色調為 Terracotta
  - 標題使用 Serif 字體
  - 按鈕使用新的設計系統
  - 輸入框使用 `.input-field` 樣式類別
  - 錯誤訊息使用語義色彩

- ✅ **app/(auth)/register/page.tsx**
  - 與登入頁面一致的設計風格
  - 溫暖的色調與柔和的表面
  - 專業但不失人性化

#### 聊天功能
- ✅ **app/(main)/chat/page.tsx**
  - Header 使用 Serif 標題字體
  - 下載按鈕使用 `.btn-primary` 樣式
  - 截圖按鈕使用成功綠色
  - FHIR 按鈕使用醫療紫色
  - 邊框顏色更新為 `paper-gray100`

- ✅ **components/chat/ChatWindow.tsx**
  - 背景色更新為 Paper
  - 邊框顏色更新為溫暖中性色

- ✅ **components/chat/ChatInput.tsx**
  - 背景和邊框使用新的色系
  - 文字顏色使用溫暖灰色
  - 檔案上傳提示使用 Terracotta 背景
  - 輸入框使用 `.input-field` 樣式
  - 發送按鈕使用 `.btn-primary` 樣式
  - 錯誤和警告使用語義色彩

- ✅ **components/chat/MessageBubble.tsx**
  - 使用者訊息：Terracotta 漸層背景
  - AI 回應：Paper 背景 + 柔和邊框
  - 優化行高與間距
  - 增加溫暖感與易讀性

### 4. 設計特色

#### 色彩系統
- **主色調**：Warm Terracotta (#D97757) - 溫暖、專業、人性化
- **背景色**：Paper White (#FDFAF7) - 柔和、不刺眼、長時間閱讀舒適
- **文字色**：Warm Gray 900 (#292524) - 避免純黑色，減少視覺疲勞
- **語義色**：Success Green、Warning Amber、Error Red、Info Blue

#### 字體系統
- **標題**：Merriweather (Serif) - 增加權威性與溫暖感
- **正文**：Inter (Sans-serif) - 清晰易讀
- **程式碼**：JetBrains Mono (Monospace) - 技術資訊專用

#### 設計原則
1. **溫暖但專業**：醫療的精準性 + 人性化關懷
2. **易讀性優先**：行高 1.6、適當留白、清晰對比
3. **減少視覺疲勞**：溫暖色調、柔和表面、避免純黑純白
4. **快速識別**：清晰的視覺層級、一致的互動反饋

---

## 📋 後續可選優化

### 1. 字體載入優化

建議在 `app/layout.tsx` 中加入 Google Fonts：

```tsx
import { Inter, Merriweather, JetBrains_Mono } from 'next/font/google';

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
});

const merriweather = Merriweather({ 
  weight: ['400', '700'],
  subsets: ['latin'],
  variable: '--font-merriweather',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
});
```

### 2. 其他組件更新

以下組件可根據需要進一步更新：

- `components/chat/FunctionSelector.tsx`
- `components/chat/WorkloadSelector.tsx`
- `components/chat/FileUploader.tsx`
- `components/chat/ModelSelector.tsx`
- `components/chat/CreditsDisplay.tsx`
- `components/onboarding/OnboardingModal.tsx`
- `components/fhir/FHIRImportModal.tsx`
- Admin 相關頁面

更新方式：
- 將藍色 (`blue-*`) 改為 `terracotta`
- 將灰色 (`gray-*`) 改為 `paper-gray*`
- 將標題字體加上 `heading-serif` 類別
- 使用 `.btn-primary`、`.btn-secondary`、`.input-field`、`.card` 等預定義樣式

### 3. 視覺一致性檢查清單

在更新其他組件時，請確認：

- [ ] 所有主要按鈕使用 Terracotta 色系
- [ ] 所有頁面標題使用 Serif 字體
- [ ] 所有輸入框使用一致的樣式
- [ ] 錯誤訊息使用 `text-error`
- [ ] 警告訊息使用 `text-warning`
- [ ] 成功訊息使用 `text-success`
- [ ] 卡片使用 `.card` 或一致的樣式
- [ ] 背景色使用 `bg-paper` 或 `bg-paper-gray50`
- [ ] 邊框顏色使用 `border-paper-gray100` 或 `border-paper-gray200`

---

## 🎨 使用指南

### 快速套用設計系統

#### 1. 建立主要按鈕
```tsx
<button className="btn-primary">
  送出
</button>
```

#### 2. 建立次要按鈕
```tsx
<button className="btn-secondary">
  取消
</button>
```

#### 3. 建立輸入框
```tsx
<input 
  type="text" 
  className="input-field" 
  placeholder="請輸入..."
/>
```

#### 4. 建立卡片
```tsx
<div className="card">
  <h3 className="heading-serif text-xl mb-2">標題</h3>
  <p>內容...</p>
</div>
```

#### 5. 使用色彩系統
```tsx
{/* 主色調 */}
<div className="bg-terracotta text-white">主要元素</div>
<div className="text-terracotta">連結或強調文字</div>

{/* 背景 */}
<div className="bg-paper">主背景</div>
<div className="bg-paper-gray50">次要背景</div>

{/* 文字 */}
<h1 className="text-paper-gray900">主要文字</h1>
<p className="text-paper-gray700">次要文字</p>

{/* 語義色 */}
<p className="text-success">成功訊息</p>
<p className="text-warning">警告訊息</p>
<p className="text-error">錯誤訊息</p>
<p className="text-info">資訊提示</p>
```

#### 6. 使用字體
```tsx
<h1 className="heading-serif text-3xl">頁面標題</h1>
<code className="text-mono text-sm">程式碼或 ID</code>
```

---

## 🔧 技術細節

### 已支援的 Tailwind 類別

#### 色彩
- `terracotta`、`terracotta-soft`、`terracotta-deep`
- `paper`、`paper-gray50` ~ `paper-gray900`
- `success`、`warning`、`error`、`info`、`medical-purple`

#### 陰影
- `shadow-soft`、`shadow-card`、`shadow-hover`、`shadow-modal`、`shadow-terracotta`

#### 圓角
- `rounded-sm` (4px)、`rounded-md` (8px)、`rounded-lg` (10px)、`rounded-xl` (12px)、`rounded-2xl` (18px)

#### 間距
- `space-xs` (4px)、`space-sm` (8px)、`space-md` (16px)、`space-lg` (24px)
- `space-xl` (32px)、`space-2xl` (48px)、`space-3xl` (64px)

---

## 📱 響應式設計

設計系統已考慮響應式設計：

- **手機版**（< 640px）：單欄佈局、最小觸控尺寸 44px
- **平板版**（640px - 1024px）：適應性佈局
- **桌面版**（> 1024px）：多欄佈局、Hover 效果啟用

---

## 🎯 設計目標達成

✅ **簡潔專業**：去除不必要的裝飾，專注於功能與內容  
✅ **醫療適用**：溫暖色調減少醫療環境的冰冷感  
✅ **易讀性高**：Notion 風格的舒適排版，適合長時間使用  
✅ **一致性強**：統一的色彩、字體、間距系統  
✅ **人性化**：Terracotta 主色帶來溫暖與親和力

---

## 🚀 快速啟動

1. **啟動開發伺服器**：
   ```bash
   npm run dev
   ```

2. **檢視更新的頁面**：
   - 登入頁面：`/login`
   - 註冊頁面：`/register`
   - 聊天頁面：`/chat`

3. **測試設計系統**：
   - 測試按鈕的 Hover 和 Active 狀態
   - 測試輸入框的 Focus 效果
   - 檢查訊息氣泡的視覺效果
   - 確認色彩對比度是否舒適

---

## 📚 參考資源

- **DESIGN.md**：完整設計系統規範
- **tailwind.config.ts**：Tailwind 配置
- **app/globals.css**：全域樣式與 CSS 變數
- **awesome-design-md**：https://github.com/VoltAgent/awesome-design-md

---

**設計系統版本**：v1.0  
**實作日期**：2026-04-16  
**設計靈感**：Notion (溫暖極簡) + Terracotta (人性化點綴)  
**適用專案**：臨床助手 AI (Health Care Assistant)
