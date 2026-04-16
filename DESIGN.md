# DESIGN.md — 臨床助手 AI 設計系統

## 1. 視覺主題 & 氛圍

**設計理念**：溫暖專業的醫療 AI 界面，結合 Notion 風格的易讀性與人性化設計

- **整體氛圍**：溫暖、可信賴、專業但不冷漠
- **資訊密度**：中等，優先考慮可讀性與視覺舒適度
- **設計哲學**：「專業中的人文關懷」— 醫療的精準性與 AI 的智能性，搭配溫暖的色調與柔和的表面

**醫療 AI 的設計原則**：
- 長時間閱讀不疲勞（醫護人員需要長時間使用）
- 清晰的資訊層級（重要醫療資訊不能被遺漏）
- 溫暖但專業（減少醫療環境的冰冷感）
- 快速識別與操作（臨床決策需要效率）

---

## 2. 色彩調色板 & 角色

### 主色調（Primary Colors）

| 色彩名稱 | Hex | 功能角色 |
|---------|-----|---------|
| **Warm Terracotta** | `#D97757` | 主要按鈕、連結、重要提示 |
| **Soft Coral** | `#F1A98A` | Hover 狀態、次要強調 |
| **Deep Terracotta** | `#C35E3F` | Active 狀態、選中項目 |

### 中性色系（Neutral Colors）

| 色彩名稱 | Hex | 功能角色 |
|---------|-----|---------|
| **Paper White** | `#FDFAF7` | 主背景、卡片背景 |
| **Warm Gray 50** | `#FAF8F6` | 次要背景、輸入框背景 |
| **Warm Gray 100** | `#F5F2EE` | 分隔線、邊框 |
| **Warm Gray 200** | `#E8E4DF` | Disabled 狀態 |
| **Warm Gray 700** | `#57534E` | 次要文字 |
| **Warm Gray 900** | `#292524` | 主要文字、標題 |

### 語義色彩（Semantic Colors）

| 色彩名稱 | Hex | 功能角色 |
|---------|-----|---------|
| **Success Green** | `#10B981` | 成功訊息、完成狀態 |
| **Warning Amber** | `#F59E0B` | 警告、需要注意的資訊 |
| **Error Red** | `#EF4444` | 錯誤、危險操作 |
| **Info Blue** | `#3B82F6` | 資訊提示、說明文字 |
| **Medical Purple** | `#8B5CF6` | 醫療特殊標記（如 FHIR 資料） |

---

## 3. 字體排版規則

### 字體家族

```css
--font-sans: 'Inter', 'Noto Sans TC', -apple-system, BlinkMacSystemFont, sans-serif;
--font-serif: 'Merriweather', 'Noto Serif TC', Georgia, serif;
--font-mono: 'JetBrains Mono', 'Consolas', monospace;
```

**使用原則**：
- **Sans-serif（Inter）**：用於 UI 元件、表單、按鈕、說明文字
- **Serif（Merriweather）**：用於頁面標題、重要內容區塊標題（增加溫暖感與權威性）
- **Monospace（JetBrains Mono）**：用於程式碼、資料 ID、技術資訊

### 字體層級

| 層級 | 字體 | 大小 | 行高 | 字重 | 用途 |
|------|------|------|------|------|------|
| **H1** | Serif | 32px | 1.2 | 700 | 頁面主標題 |
| **H2** | Serif | 24px | 1.3 | 700 | 區塊標題 |
| **H3** | Sans | 20px | 1.4 | 600 | 次級標題 |
| **Body** | Sans | 16px | 1.6 | 400 | 正文內容 |
| **Small** | Sans | 14px | 1.5 | 400 | 次要資訊、標籤 |
| **Caption** | Sans | 12px | 1.4 | 400 | 輔助說明 |
| **Code** | Mono | 14px | 1.5 | 400 | 程式碼、ID |

---

## 4. 組件樣式

### 按鈕（Buttons）

#### 主要按鈕（Primary）
```css
Background: Warm Terracotta (#D97757)
Text: White
Border: none
Border-radius: 10px
Padding: 12px 24px
Font-weight: 500
Transition: transform 0.2s, box-shadow 0.2s

Hover: Background → Soft Coral (#F1A98A)
       Box-shadow: 0 4px 12px rgba(217, 119, 87, 0.2)
       Transform: translateY(-1px)

Active: Background → Deep Terracotta (#C35E3F)
        Transform: translateY(0)

Disabled: Background → Warm Gray 200 (#E8E4DF)
          Text → Warm Gray 700 (#57534E)
```

#### 次要按鈕（Secondary）
```css
Background: Paper White (#FDFAF7)
Text: Warm Terracotta (#D97757)
Border: 1.5px solid Warm Gray 100 (#F5F2EE)
Border-radius: 10px
Padding: 12px 24px

Hover: Background → Warm Gray 50 (#FAF8F6)
       Border → Warm Terracotta (#D97757)
```

### 輸入框（Input Fields）

```css
Background: Warm Gray 50 (#FAF8F6)
Border: 1px solid Warm Gray 100 (#F5F2EE)
Border-radius: 8px
Padding: 10px 14px
Font-size: 16px
Transition: all 0.2s

Focus: Border → Warm Terracotta (#D97757)
       Box-shadow: 0 0 0 3px rgba(217, 119, 87, 0.1)
       Background → Paper White (#FDFAF7)

Error: Border → Error Red (#EF4444)
       Box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1)
```

### 卡片（Cards）

```css
Background: Paper White (#FDFAF7)
Border: 1px solid Warm Gray 100 (#F5F2EE)
Border-radius: 12px
Padding: 20px
Box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05)
Transition: box-shadow 0.3s, border-color 0.3s

Hover: Box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08)
       Border-color: Warm Gray 200 (#E8E4DF)

Active: Border-color: Warm Terracotta (#D97757)
```

### 訊息氣泡（Message Bubbles）

#### 使用者訊息
```css
Background: Linear gradient from Warm Terracotta to Soft Coral
           (from #D97757 to #F1A98A)
Text: White
Border-radius: 18px 18px 4px 18px
Padding: 12px 16px
Max-width: 75%
Box-shadow: 0 2px 8px rgba(217, 119, 87, 0.15)
```

#### AI 回應
```css
Background: Paper White (#FDFAF7)
Text: Warm Gray 900 (#292524)
Border: 1px solid Warm Gray 100 (#F5F2EE)
Border-radius: 18px 18px 18px 4px
Padding: 16px 20px
Max-width: 80%
Box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05)
```

---

## 5. 佈局原則

### 間距系統（Spacing Scale）

```css
--space-xs: 4px    /* 元件內小間距 */
--space-sm: 8px    /* 元件內間距 */
--space-md: 16px   /* 元件間距、卡片內邊距 */
--space-lg: 24px   /* 區塊間距 */
--space-xl: 32px   /* 大區塊間距 */
--space-2xl: 48px  /* 頁面區域間距 */
--space-3xl: 64px  /* 頁面頂部間距 */
```

### 留白哲學

- **呼吸空間**：醫療資訊密集，必須保持足夠留白避免視覺疲勞
- **視覺分組**：使用留白而非過多分隔線來區分內容區塊
- **焦點引導**：重要醫療資訊周圍保持更多留白

### 響應式斷點

```css
Mobile: < 640px
Tablet: 640px - 1024px
Desktop: > 1024px
```

---

## 6. 深度 & 高度

### 陰影系統

```css
--shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.04)     /* 輸入框 */
--shadow-md: 0 2px 8px rgba(0, 0, 0, 0.06)     /* 卡片、下拉選單 */
--shadow-lg: 0 4px 16px rgba(0, 0, 0, 0.08)    /* Modal、Hover 卡片 */
--shadow-xl: 0 8px 24px rgba(0, 0, 0, 0.12)    /* 浮動面板 */

--shadow-terracotta: 0 4px 12px rgba(217, 119, 87, 0.2)  /* 主要按鈕 Hover */
```

### 表面層級

```
Level 0: 主背景 (Paper White)
Level 1: 卡片、輸入框 (Paper White + Border)
Level 2: Hover 卡片、下拉選單 (Paper White + Shadow-md)
Level 3: Modal、側邊欄 (Paper White + Shadow-lg)
Level 4: Tooltip、通知 (Paper White + Shadow-xl)
```

---

## 7. Do's and Don'ts

### ✅ DO（推薦做法）

1. **使用柔和圓角**：所有互動元件使用 8-12px 圓角，營造友善感
2. **保持溫暖色調**：即使是中性色，也選用帶暖調的灰色
3. **優先使用 Serif 標題**：增加權威性與溫暖感
4. **充足行高**：正文行高至少 1.6，確保長時間閱讀舒適
5. **明確的互動反饋**：所有按鈕、連結都要有 Hover 和 Active 狀態
6. **使用語義色彩**：成功、警告、錯誤使用標準語義色
7. **醫療資訊突顯**：重要醫療數據使用更大字重或背景色突顯

### ❌ DON'T（避免做法）

1. **避免純黑色文字**：使用 Warm Gray 900 代替 #000000
2. **避免冷色調為主色**：不使用冷藍色、冷灰色作為主要界面色
3. **避免過多顏色**：主色調以 Terracotta 為主，避免多色混雜
4. **避免尖銳邊角**：不使用 0px 圓角，最小 4px
5. **避免過小字體**：最小字體 12px，正文不小於 16px
6. **避免低對比度**：文字與背景對比度至少 4.5:1
7. **避免過度動畫**：醫療應用需要穩定性，避免花俏動畫

---

## 8. 響應式行為

### 手機版（< 640px）

- 單欄佈局
- 按鈕最小高度 44px（符合手指觸控）
- 訊息氣泡最大寬度 85%
- 隱藏非必要功能（如截圖功能）
- 底部固定輸入區域

### 平板/桌面版（≥ 640px）

- 最大內容寬度 7xl（1280px）
- 多欄佈局可用
- 側邊欄可展開
- 顯示所有功能
- Hover 效果啟用

### 觸控優化

- 按鈕最小尺寸 44x44px
- 間距至少 8px
- 支援滑動手勢
- 避免依賴 Hover 狀態

---

## 9. Agent Prompt 快速參考

### 快速色彩參考

```
主色：#D97757 (Warm Terracotta)
背景：#FDFAF7 (Paper White)
文字：#292524 (Warm Gray 900)
成功：#10B981 | 警告：#F59E0B | 錯誤：#EF4444
```

### 快速樣式指令

**建立主要按鈕**：
```
背景 #D97757，白色文字，圓角 10px，padding 12px 24px，
hover 時提升並加陰影
```

**建立卡片**：
```
背景 #FDFAF7，邊框 #F5F2EE，圓角 12px，padding 20px，
淺陰影，hover 時加深陰影
```

**建立輸入框**：
```
背景 #FAF8F6，邊框 #F5F2EE，圓角 8px，
focus 時邊框變 #D97757 並加淺色光暈
```

---

## 10. 實作檢查清單

在實作 UI 時，請確認：

- [ ] 主色調使用 Terracotta (#D97757)
- [ ] 背景色使用 Paper White (#FDFAF7)
- [ ] 頁面標題使用 Serif 字體
- [ ] 正文使用 Sans-serif 字體，16px，行高 1.6
- [ ] 所有按鈕有 Hover 和 Active 狀態
- [ ] 所有互動元件有適當圓角（8-12px）
- [ ] 文字顏色使用 Warm Gray 900，避免純黑色
- [ ] 重要操作使用主色調（Terracotta）
- [ ] 錯誤、警告、成功使用語義色彩
- [ ] 卡片和輸入框有適當陰影
- [ ] 間距使用間距系統（4px 的倍數）
- [ ] 手機版按鈓最小 44px 高度
- [ ] 對比度符合 WCAG AA 標準（4.5:1）

---

**設計系統版本**：v1.0  
**最後更新**：2026-04-16  
**適用專案**：臨床助手 AI (Health Care Assistant)
