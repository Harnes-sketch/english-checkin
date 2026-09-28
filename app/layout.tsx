import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "英语打卡",
  description: "每天练一点，按月看见自己的进展。",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body>{children}</body></html>;
}
