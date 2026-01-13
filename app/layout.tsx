import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "臨床助手 AI",
  description: "智能臨床助手，提供檢驗、放射、病歷、藥物分析功能",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-TW">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
