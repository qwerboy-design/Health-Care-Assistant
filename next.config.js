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
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
        ],
      },
    ];
  },
}

module.exports = nextConfig
