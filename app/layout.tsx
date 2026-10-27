import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ourtodo｜共用待辦事項",
  description: "把生活的大小事，一起好好完成。",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-Hant">
      <body className="antialiased">{children}</body>
    </html>
  );
}
