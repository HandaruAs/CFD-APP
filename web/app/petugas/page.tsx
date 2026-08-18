// app/petugas/page.tsx
"use client";

import Link from "next/link";
import {
  QrCode,
  Clock,
  FileText,
  ChevronRight,
} from "lucide-react";

type MenuItem = {
  title: string;
  description: string;
  href: string;
  icon: React.ElementType;
  color: string;
  status?: string;
};

const MENU_ITEMS: MenuItem[] = [
  {
    title: "Jam Operasional",
    description: "Atur jadwal CFD, buka/tutup pendaftaran pedagang, dan lihat riwayat sesi",
    href: "/petugas/jam-operasional",
    icon: Clock,
    color: "bg-primary",
    status: "Aktif",
  },
  {
    title: "Scan QR Pedagang",
    description: "Verifikasi dan catat kehadiran pedagang melalui scan QR code",
    href: "/petugas/scan-qr",
    icon: QrCode,
    color: "bg-secondary",
    status: "Tersedia",
  },
  {
    title: "Laporan Kehadiran",
    description: "Lihat daftar pedagang yang sudah check-in di CFD hari ini",
    href: "/petugas/laporan",
    icon: FileText,
    color: "bg-tertiary-container",
    status: "Tersedia",
  },
];

export default function PetugasHomePage() {
  return (
    <div className="flex flex-col gap-lg">
      {/* Header */}
      <div>
        <h2 className="text-headline-lg text-on-surface">CFD Hub</h2>
        <p className="mt-xs max-w-2xl text-body-md text-on-surface-variant">
          Kelola operasional Car Free Day
        </p>
      </div>

      {/* 3 Menu Utama */}
      <div className="grid grid-cols-1 gap-md md:grid-cols-3">
        {MENU_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="group flex flex-col rounded-lg border border-outline-variant bg-surface-container-lowest p-lg transition-all hover:border-primary hover:shadow-md hover:shadow-primary/5"
            >
              <div className="flex items-start justify-between">
                <span
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg ${item.color} text-on-primary`}
                >
                  <Icon className="h-6 w-6" strokeWidth={2} />
                </span>
                {item.status && (
                  <span className="inline-flex items-center gap-xs rounded-full bg-secondary-container/40 px-sm py-1 text-label-sm text-on-secondary-container">
                    <span className="h-1.5 w-1.5 rounded-full bg-secondary" />
                    {item.status}
                  </span>
                )}
              </div>
              
              <h3 className="mt-md text-title-lg text-on-surface group-hover:text-primary transition-colors">
                {item.title}
              </h3>
              <p className="mt-xs text-body-md text-on-surface-variant flex-1">
                {item.description}
              </p>
              
              <div className="mt-md flex items-center gap-xs text-label-sm text-on-surface-variant group-hover:text-primary transition-colors">
                <span>Buka Halaman</span>
                <ChevronRight className="h-4 w-4" strokeWidth={2} />
              </div>
            </Link>
          );
        })}
      </div>

      {/* Ringkasan status hari ini */}
      <div className="mt-md rounded-lg border border-outline-variant bg-surface-container-lowest p-lg">
        <h3 className="text-title-lg text-on-surface">Status Hari Ini</h3>
        <div className="mt-md grid grid-cols-1 gap-sm sm:grid-cols-3">
          <div className="flex items-center gap-sm rounded-md bg-surface-container-low px-md py-sm">
            <span className="h-2 w-2 rounded-full bg-secondary" />
            <span className="text-label-sm text-on-surface-variant">Sesi CFD:</span>
            <span className="text-label-sm font-semibold text-on-surface">Sedang Berlangsung</span>
            <span className="text-label-sm text-on-surface-variant">(06:00 - 11:00)</span>
          </div>
          <div className="flex items-center gap-sm rounded-md bg-surface-container-low px-md py-sm">
            <span className="text-label-sm text-on-surface-variant">Pendaftaran:</span>
            <span className="text-label-sm font-semibold text-on-surface">Dibuka</span>
          </div>
          <div className="flex items-center gap-sm rounded-md bg-surface-container-low px-md py-sm">
            <span className="text-label-sm text-on-surface-variant">Check-in hari ini:</span>
            <span className="text-label-sm font-semibold text-on-surface">5 pedagang</span>
          </div>
        </div>
      </div>
    </div>
  );
}