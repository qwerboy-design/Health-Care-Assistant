# 手動推送指令

由於自動推送遇到認證問題，請在終端機執行：

```bash
git push origin main
```

這將推送以下 commits：
1. 5ba98c8 - chore: trigger Vercel redeploy with new design system
2. c9845bc - fix: resolve TypeScript build errors for Vercel deployment

推送後，Vercel 將自動開始部署新的設計系統。
