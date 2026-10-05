import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { AppShell } from "@/components/app-shell";
import { Geist, Geist_Mono, Fraunces } from "next/font/google";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "CFD Pedagang | Portal Pedagang",
  description:
    "Portal pedagang untuk pendaftaran, verifikasi, dan pengelolaan lapak Car Free Day Surabaya.",
  // Logo E-Event Surabaya di tab browser. File-nya ada di public/images/,
  // jadi path-nya ditulis mulai dari "/images/..." (tanpa "/public").
  // CATATAN: jangan taruh lagi favicon.ico di folder app/ -- kalau ada,
  // Next.js memakai file itu dan logo di bawah ini tidak tampil.
  icons: {
    icon: [
      { url: "/images/favicon.ico", sizes: "any" },
      { url: "/images/icon.png", type: "image/png", sizes: "256x256" },
    ],
    apple: { url: "/images/apple-icon.png", sizes: "180x180" },
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}