import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "风来成行｜懂变化的 AI 旅行搭子",
  description: "懂变化的 AI 旅行搭子。锁定约束、检查冲突、追踪来源、稳定修改。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full bg-background font-sans text-foreground">
        {children}
      </body>
    </html>
  );
}
