# 語系 (i18n) 實作說明

> 最後更新：2026-02-08

## 概述

專案支援 **繁體中文 (ZW)** 與 **英文 (EN)** 兩種介面語系。使用者在登錄頁選擇語系後，全站介面（首頁、登錄、註冊、主導航、聊天、對話記錄、後台管理）會同步切換，且語系選擇會持久化，下次造訪仍沿用上次選擇。

## 架構

- **Client**：`LocaleProvider` 提供 `locale`、`setLocale`、`t(key)`；切換時寫入 `localStorage` 與 cookie `locale`，並設定 `document.documentElement.lang`。
- **Server**：從 `cookies().get('locale')` 讀取語系，使用 `getT(locale)` 取得翻譯函數，輸出對應文案。
- **翻譯檔**：`lib/i18n/translations.ts`，Client 與 Server 共用同一套 key。

## 主要檔案

| 路徑 | 說明 |
|------|------|
| `lib/i18n/translations.ts` | `Locale` 型別、zh-TW/en 翻譯物件、`getT(locale)`（支援 dot path 與 `{param}` 替換） |
| `components/providers/LocaleProvider.tsx` | Context Provider、`useLocale()` hook、cookie/localStorage 寫入 |
| `app/layout.tsx` | 以 `<LocaleProvider>` 包住 `{children}` |

## 翻譯 key 結構

- `common.*` - 共用（loading、logout、errorNetwork 等）
- `home.*` - 首頁
- `nav.*` - 主導航、後台導航
- `login.*` - 登錄頁
- `register.*` - 註冊頁
- `admin.*` - 後台管理與模型管理
- `chat.*` - 聊天、模型選擇、工作量、功能、上傳等
- `conversations.*` - 對話記錄頁
- `onboarding.*` - 引導彈窗

## 使用方式

### Client Component

```tsx
import { useLocale } from '@/components/providers/LocaleProvider';

export function MyComponent() {
  const { locale, setLocale, t } = useLocale();
  return (
    <>
      <h1>{t('login.title')}</h1>
      <button onClick={() => setLocale('en')}>EN</button>
    </>
  );
}
```

### Server Component

```tsx
import { cookies } from 'next/headers';
import { getT, DEFAULT_LOCALE, type Locale } from '@/lib/i18n/translations';

export default async function Page() {
  const cookieStore = await cookies();
  const value = cookieStore.get('locale')?.value;
  const locale: Locale = value === 'zh-TW' || value === 'en' ? value : DEFAULT_LOCALE;
  const t = getT(locale);
  return <h1>{t('home.title')}</h1>;
}
```

### 帶參數的翻譯

```ts
t('chat.uploadFormat', { max: 100 });  // 替換 key 內的 {max}
```

## 新增語系

1. 在 `lib/i18n/translations.ts` 將 `Locale` 型別改為 `'zh-TW' | 'en' | '新語系'`。
2. 新增該語系的翻譯物件（與 zhTW、en 同結構），並加入 `maps`。
3. 在登錄頁（或全域）增加對應語系按鈕，呼叫 `setLocale('新語系')`。

## Cookie 與 localStorage

- **Cookie 名稱**：`locale`
- **localStorage 鍵**：`locale`
- **Cookie 設定**：path=/，max-age=365 天，SameSite=Lax
- Server Component 僅能讀取 cookie，故語系切換時必須同時寫入 cookie，首頁與 layouts 才能輸出正確語系。
