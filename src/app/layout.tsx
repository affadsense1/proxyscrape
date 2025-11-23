import type { Metadata } from "next";
import "./globals.css";

// 使用系统字体，避免构建时下载 Google Fonts 超时
// 如果需要 Inter 字体，可以在 globals.css 中使用 @font-face 本地加载

export const metadata: Metadata = {
  title: "CloudProxy Node - 代理节点管理平台",
  description: "自动扫描和管理代理节点的智能平台",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased font-sans">
        {children}
      </body>
    </html>
  );
}
