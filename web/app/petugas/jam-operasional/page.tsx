// app/petugas/jam-operasional/page.tsx
"use client";

import { useState } from "react";
import {
  Clock,
  Hourglass,
  History,
  CircleX,
  CalendarCheck2,
  Lock,
  LockOpen,
  Check,
  AlertTriangle,
} from "lucide-react";

type StatusRiwayat = "normal" | "diperpanjang" | "diakhiri-awal";

type Riwayat = {
  tanggal: string;
  jamMulai: string;
  jamSelesai: string;
  durasi: string;
  status: StatusRiwayat;
};

const RIWAYAT: Riwayat[] = [
  { tanggal: "Minggu, 24 Okt 2023", jamMulai: "06:05", jamSelesai: "11:00", durasi: "4j 55m", status: "normal" },
  { tanggal: "Minggu, 17 Okt 2023", jamMulai: "06:00", jamSelesai: "11:15", durasi: "5j 15m", status: "diperpanjang" },
  { tanggal: "Minggu, 10 Okt 2023", jamMulai: "06:00", jamSelesai: "11:00", durasi: "5j 00m", status: "normal" },
  { tanggal: "Minggu, 03 Okt 2023", jamMulai: "06:00", jamSelesai: "10:30", durasi: "4j 30m", status: "diakhiri-awal" },
  { tanggal: "Minggu, 26 Sep 2023", jamMulai: "06:00", jamSelesai: "11:00", durasi: "5j 00m", status: "normal" },
];

const STATUS_STYLE: Record<StatusRiwayat, { label: string; bg: string; text: string; icon: typeof Check }> = {
  normal: {
    label: "Selesai Normal",
    bg: "bg-secondary-container/40",
    text: "text-on-secondary-container",
    icon: Check,
  },
  diperpanjang: {
    label: "Diperpanjang",
    bg: "bg-tertiary-container/15",
    text: "text-on-tertiary-container",
    icon: Clock,
  },
  "diakhiri-awal": {
    label: "Diakhiri Awal",
    bg: "bg-error-container/60",
    text: "text-on-error-container",
    icon: AlertTriangle,
  },
};

const SISA_MENIT = 150;
const TOTAL_MENIT = 300;
const RADIUS = 54;
const CIRC = 2 * Math.PI * RADIUS;
const PROGRESS = (SISA_MENIT / TOTAL_MENIT) * CIRC;

export default function JamOperasionalPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const handleAction = async (action: "akhiri" | "tutup") => {
    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    
    const messages = {
      akhiri: "✅ Sesi CFD berhasil diakhiri lebih awal",
      tutup: "🔒 Pendaftaran pedagang berhasil ditutup",
    };
    
    setToast({ message: messages[action], type: "success" });
    setIsLoading(false);
    setTimeout(() => setToast(null), 3000);
  };

  return (
    <div className="flex flex-col gap-lg">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 rounded-lg px-md py-sm shadow-lg animate-in slide-in-from-bottom-5 ${
          toast.type === "success" ? "bg-secondary-container/90 text-on-secondary-container" : "bg-error-container/90 text-on-error-container"
        }`}>
          <p className="text-label-md">{toast.message}</p>
        </div>
      )}

      {/* Header */}
      <div>
        <h2 className="text-headline-lg text-on-surface">Jam Operasional</h2>
        <p className="mt-xs max-w-2xl text-body-md text-on-surface-variant">
          Atur jadwal aktif dan durasi kegiatan Car Free Day.
        </p>
      </div>

      {/* Pendaftaran Pedagang */}
      <div className="rounded-lg border border-outline-variant bg-surface-container-lowest p-lg">
        <div className="flex flex-wrap items-center justify-between gap-sm">
          <h3 className="text-title-lg text-on-surface">Pendaftaran Pedagang</h3>
          <span className="flex items-center gap-xs rounded-full bg-secondary-container/40 px-sm py-1 text-label-sm text-on-secondary-container">
            <span className="h-1.5 w-1.5 rounded-full bg-secondary" />
            Pendaftaran Dibuka
          </span>
        </div>
        <p className="mt-xs text-body-md text-on-surface-variant">
          Buka pendaftaran supaya pedagang baru bisa mendaftar lewat website pendaftaran UMKM sebelum hari CFD berlangsung.
        </p>

        <div className="mt-md flex flex-wrap gap-sm border-t border-outline-variant pt-md">
          <button
            type="button"
            onClick={() => handleAction("tutup")}
            disabled={isLoading}
            className="flex items-center gap-sm rounded-md bg-error-container/60 px-lg py-sm text-label-md text-on-error-container transition-all hover:bg-error-container hover:shadow-md disabled:opacity-60"
          >
            <Lock className="h-[18px] w-[18px]" strokeWidth={2} />
            Tutup Pendaftaran
          </button>
          <button
            type="button"
            className="flex items-center gap-sm rounded-md bg-primary/10 px-lg py-sm text-label-md text-primary transition-all hover:bg-primary hover:text-on-primary"
          >
            <LockOpen className="h-[18px] w-[18px]" strokeWidth={2} />
            Buka Pendaftaran
          </button>
        </div>
      </div>

      {/* Status Sesi & Sisa Waktu */}
      <div className="grid grid-cols-1 gap-md lg:grid-cols-[1fr_280px]">
        <div className="rounded-lg border border-outline-variant bg-surface-container-lowest p-lg">
          <div className="flex items-center justify-between">
            <h3 className="text-title-lg text-on-surface">Status Sesi CFD</h3>
            <span className="flex items-center gap-xs rounded-full bg-secondary-container/40 px-sm py-1 text-label-sm text-on-secondary-container">
              <span className="h-1.5 w-1.5 rounded-full bg-secondary animate-pulse" />
              Sedang Berlangsung
            </span>
          </div>

          <div className="mt-md grid grid-cols-1 gap-sm sm:grid-cols-2">
            <div className="flex items-center gap-sm rounded-md bg-surface-container-low p-md">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary text-on-primary">
                <Clock className="h-[18px] w-[18px]" strokeWidth={2} />
              </span>
              <div>
                <p className="text-label-sm uppercase tracking-wide text-on-surface-variant">
                  Jam Mulai
                </p>
                <p className="text-title-lg text-on-surface">06.00</p>
              </div>
            </div>
            <div className="flex items-center gap-sm rounded-md bg-error-container/30 p-md">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-error-container text-on-error-container">
                <Hourglass className="h-[18px] w-[18px]" strokeWidth={2} />
              </span>
              <div>
                <p className="text-label-sm uppercase tracking-wide text-on-surface-variant">
                  Jam Selesai
                </p>
                <p className="text-title-lg text-on-surface">11.00</p>
              </div>
            </div>
          </div>

          <div className="mt-lg flex flex-wrap gap-sm border-t border-outline-variant pt-md">
            <button
              type="button"
              onClick={() => handleAction("akhiri")}
              disabled={isLoading}
              className="flex items-center gap-sm rounded-md bg-error-container/60 px-lg py-sm text-label-md text-on-error-container transition-all hover:bg-error-container hover:shadow-md disabled:opacity-60"
            >
              <CircleX className="h-[18px] w-[18px]" strokeWidth={2} />
              Akhiri Sesi Lebih Awal
            </button>
            <button
              type="button"
              className="flex items-center gap-sm rounded-md bg-primary px-lg py-sm text-label-md text-on-primary transition-all hover:bg-primary-container hover:shadow-md"
            >
              <CalendarCheck2 className="h-[18px] w-[18px]" strokeWidth={2} />
              Simpan Perubahan
            </button>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center gap-sm rounded-lg border border-outline-variant bg-surface-container-lowest p-lg text-center">
          <div className="relative flex h-32 w-32 items-center justify-center">
            <svg className="h-32 w-32 -rotate-90" viewBox="0 0 120 120">
              <circle
                cx="60"
                cy="60"
                r={RADIUS}
                fill="none"
                stroke="var(--color-surface-container-high)"
                strokeWidth="10"
              />
              <circle
                cx="60"
                cy="60"
                r={RADIUS}
                fill="none"
                stroke="var(--color-primary)"
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={CIRC}
                strokeDashoffset={CIRC - PROGRESS}
                className="transition-all duration-1000"
              />
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="text-title-lg font-semibold text-on-surface">02:30</span>
              <span className="text-label-sm text-on-surface-variant">Sisa Waktu</span>
            </div>
          </div>
          <p className="text-label-sm text-on-surface-variant">
            Sesi saat ini akan berakhir pada <strong className="text-on-surface">11.00 WIB</strong>
          </p>
          <div className="mt-xs w-full max-w-[200px] rounded-full bg-surface-container-high h-1">
            <div className="h-full rounded-full bg-primary transition-all duration-1000" style={{ width: `${(SISA_MENIT / TOTAL_MENIT) * 100}%` }} />
          </div>
        </div>
      </div>

      {/* Riwayat Operasional */}
      <div className="rounded-lg border border-outline-variant bg-surface-container-lowest p-lg">
        <div className="mb-md flex items-center gap-sm">
          <History className="h-[18px] w-[18px] text-on-surface-variant" strokeWidth={2} />
          <h3 className="text-title-lg text-on-surface">Riwayat Operasional</h3>
          <span className="ml-auto text-label-sm text-on-surface-variant">
            {RIWAYAT.length} sesi terakhir
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-outline-variant text-label-sm text-on-surface-variant">
                <th className="px-sm py-sm font-medium">Tanggal</th>
                <th className="px-sm py-sm font-medium">Jam Mulai</th>
                <th className="px-sm py-sm font-medium">Jam Selesai</th>
                <th className="px-sm py-sm font-medium">Durasi</th>
                <th className="px-sm py-sm font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {RIWAYAT.map((row) => {
                const style = STATUS_STYLE[row.status];
                const Icon = style.icon;
                return (
                  <tr
                    key={row.tanggal}
                    className="border-b border-outline-variant last:border-0 hover:bg-surface-container-low/50 transition-colors"
                  >
                    <td className="px-sm py-sm text-body-md text-on-surface">{row.tanggal}</td>
                    <td className="px-sm py-sm text-body-md text-on-surface-variant">
                      {row.jamMulai}
                    </td>
                    <td className="px-sm py-sm text-body-md text-on-surface-variant">
                      {row.jamSelesai}
                    </td>
                    <td className="px-sm py-sm text-body-md text-on-surface-variant">
                      {row.durasi}
                    </td>
                    <td className="px-sm py-sm">
                      <span
                        className={`inline-flex items-center gap-xs rounded-full px-sm py-1 text-label-sm ${style.bg} ${style.text}`}
                      >
                        <Icon className="h-3 w-3" strokeWidth={2.5} />
                        {style.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}