import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "메리핏 예약",
  description: "메리핏 필라테스 예약·출석",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body className="min-h-screen bg-neutral-50 text-neutral-900 antialiased">
        <div className="mx-auto max-w-md px-4 pb-16">{children}</div>
      </body>
    </html>
  );
}
