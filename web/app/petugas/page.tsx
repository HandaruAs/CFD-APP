// app/petugas/page.tsx
"use client";

import Link from "next/link";
import {
  QrCode,
  Clock,
  FileText,
  ChevronRight,
  Sparkles,
} from "lucide-react";

type MenuItem = {
  title: string;
  description: string;
  href: string;
  icon: React.ElementType;
  color: string;
  badge?: string;
  isRecommended?: boolean;
};

const MENU_ITEMS: MenuItem[] = [
  {
    title: "Jam Operasional",
    description: "Atur jadwal CFD dan kelola pendaftaran pedagang",
    href: "/petugas/jam-operasional",
    icon: Clock,
    color: "bg-primary",
    badge: "Pengaturan",
  },
  {
    title: "Scan QR Pedagang",
    description: "Verifikasi kehadiran pedagang dengan scan QR code",
    href: "/petugas/scan-qr",
    icon: QrCode,
    color: "bg-secondary",
    badge: "Aksi Cepat",
    isRecommended: true,
  },
  {
    title: "Laporan Kehadiran",
    description: "Lihat rekap pedagang yang sudah check-in hari ini",
    href: "/petugas/laporan",
    icon: FileText,
    color: "bg-tertiary-container",
    badge: "Lihat Data",
  },
];

export default function PetugasHomePage() {
  const todayStats = {
    sesi: "Sedang Berlangsung",
    jam: "06:00 - 11:00",
    totalPedagang: 150,
    sudahCheckin: 48,
    pendaftaran: "Dibuka",
  };

  const persentase = Math.round((todayStats.sudahCheckin / todayStats.totalPedagang) * 100);

  return (
    <div className="flex flex-col gap-lg">
      {/* Header dengan selamat datang */}
      <div className="flex flex-wrap items-start justify-between gap-md">
        <div>
          <div className="flex items-center gap-sm">
            <h2 className="text-headline-lg text-on-surface">
              Selamat Pagi, Petugas! 👋
            </h2>
            <span className="inline-flex items-center gap-xs rounded-full bg-secondary-container/40 px-sm py-1 text-label-sm text-on-secondary-container">
              <span className="h-1.5 w-1.5 rounded-full bg-secondary animate-pulse" />
              Online
            </span>
          </div>
          <p className="mt-xs text-body-md text-on-surface-variant">
            {new Date().toLocaleDateString('id-ID', { 
              weekday: 'long', 
              day: 'numeric', 
              month: 'long', 
              year: 'numeric' 
            })}
          </p>
        </div>
      </div>

      {/* Status Hari Ini - Ringkasan */}
      <div className="grid grid-cols-1 gap-md sm:grid-cols-3">
        <div className="rounded-lg border border-outline-variant bg-surface-container-lowest p-lg hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-label-sm text-on-surface-variant">Status Sesi</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary-container/20">
              <Clock className="h-4 w-4 text-secondary" />
            </span>
          </div>
          <p className="mt-xs text-title-lg font-semibold text-on-surface">
            {todayStats.sesi}
          </p>
          <p className="text-label-sm text-on-surface-variant">
            {todayStats.jam} WIB
          </p>
        </div>

        <div className="rounded-lg border border-outline-variant bg-surface-container-lowest p-lg hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-label-sm text-on-surface-variant">Kehadiran Hari Ini</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-container/20">
              <FileText className="h-4 w-4 text-primary" />
            </span>
          </div>
          <p className="mt-xs text-title-lg font-semibold text-on-surface">
            {todayStats.sudahCheckin}
            <span className="text-body-md text-on-surface-variant"> / {todayStats.totalPedagang}</span>
          </p>
          <div className="mt-sm h-1.5 w-full overflow-hidden rounded-full bg-surface-container-high">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${persentase}%` }}
            />
          </div>
          <p className="mt-xs text-label-sm text-on-surface-variant">
            {persentase}% sudah check-in
          </p>
        </div>

        <div className="rounded-lg border border-outline-variant bg-surface-container-lowest p-lg hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-label-sm text-on-surface-variant">Pendaftaran</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary-container/20">
              <Sparkles className="h-4 w-4 text-secondary" />
            </span>
          </div>
          <p className="mt-xs text-title-lg font-semibold text-on-surface">
            {todayStats.pendaftaran}
          </p>
          <button className="mt-sm text-label-sm text-primary hover:underline">
            Kelola Pendaftaran →
          </button>
        </div>
      </div>

      {/* 3 Menu Utama */}
      <div className="grid grid-cols-1 gap-md md:grid-cols-3">
        {MENU_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="group relative flex flex-col rounded-lg border border-outline-variant bg-surface-container-lowest p-lg transition-all hover:border-primary hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5"
            >
              {item.isRecommended && (
                <span className="absolute right-2 top-2 flex items-center gap-xs rounded-full bg-secondary-container/40 px-sm py-0.5 text-[10px] text-on-secondary-container">
                  <Sparkles className="h-2.5 w-2.5" />
                  Rekomendasi
                </span>
              )}
              <div className="flex items-start gap-md">
                <span
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${item.color} text-on-primary shadow-sm`}
                >
                  <Icon className="h-6 w-6" strokeWidth={2} />
                </span>
                <div className="flex-1 min-w-0">
                  <h3 className="text-title-md text-on-surface group-hover:text-primary transition-colors">
                    {item.title}
                  </h3>
                  <p className="mt-xs text-body-sm text-on-surface-variant">
                    {item.description}
                  </p>
                </div>
              </div>
              <div className="mt-md flex items-center justify-between border-t border-outline-variant pt-md">
                <span className="text-label-sm text-on-surface-variant">{item.badge}</span>
                <span className="flex items-center gap-xs text-label-sm text-primary group-hover:gap-md transition-all">
                  Buka
                  <ChevronRight className="h-4 w-4" strokeWidth={2} />
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}