import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter } from "next/font/google";
import { I18nProvider } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Платформа криптографічного диплома",
  description:
    "Робочий простір аналізу текстів для криптографічних експериментів",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="uk"
      className={cn(
        "dark bg-background font-sans antialiased",
        geistSans.variable,
        geistMono.variable,
        inter.variable,
      )}
    >
      <body>
        <I18nProvider>{children}</I18nProvider>
      </body>
    </html>
  );
}
