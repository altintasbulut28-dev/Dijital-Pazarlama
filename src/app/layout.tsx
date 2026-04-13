import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "APEX OS — Lüks Gayrimenkul Lead Yönetim Sistemi",
  description: "AI destekli lüks gayrimenkul lead yönetim ve otomasyon sistemi. Lead toplama, filtreleme, takip ve ROI dashboard.",
  keywords: "lüks gayrimenkul, lead yönetimi, CRM, emlak, otomasyon, AI",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <body>
        <div className="bg-ambiance" />
        {children}
      </body>
    </html>
  );
}
