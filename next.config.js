/** @type {import('next').NextConfig} */
const nextConfig = {
  // 禁用 Vercel Analytics 在本地開發環境
  experimental: {
    webVitalsAttribution: ['CLS', 'LCP'],
  },
  // 在本地開發時關閉 Vercel Speed Insights
  ...(() => {
    if (process.env.NODE_ENV === 'development') {
      return {
        env: {
          NEXT_PUBLIC_VERCEL_ENV: 'development',
        },
      };
    }
    return {};
  })(),
}

module.exports = nextConfig
