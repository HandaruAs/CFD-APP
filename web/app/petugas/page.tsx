// app/petugas/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Clock,
  FileText,
  ChevronRight,
  Sparkles,
  CircleCheck,
  Hourglass,
  Store,
  TrendingUp,
} from "lucide-react";

// ===== TYPES =====
type SesiAktif = {
  id: string;
  tanggal: string;
  jamMulai: string;
  jamSelesaiRencana: string;
  status: string;
  aktif: boolean;
  sisaMenit: number;
  totalMenit: number;
};
type StatusOperasional = {
  pendaftaran: {
    isOpen: boolean;
    linkPendaftaran: string | null;
    jamBuka?: string | null;
    jamTutup?: string | null;
  };
  sesi: SesiAktif | null;
  riwayat: unknown[];
};
type KehadiranItem = {
  id: string;
  pedagangId: string;
  namaUsaha: string;
  pemilik: string;
  inisial: string;
  kategori: string;
  lokasiLapak: string;
  waktuCheckin: string;
  waktuCheckout: string | null;
  omset: number | null;
  metode: string;
  status: "check-in" | "check-out" | "belum-hadir";
};
type LaporanResponse = {
  totalTerdaftar: number;
  totalCheckin: number;
  totalCheckout: number;
  totalOmset: number;
  rataOmset: number;
  persenHadir: number;
  data: KehadiranItem[];
  page: number;
  limit: number;
  total: number;
};

function apiUrl(path: string) {
  const base = process.env.NEXT_PUBLIC_API_URL;
  if (!base) throw new Error("NEXT_PUBLIC_API_URL belum diset!");
  return `${base}${path}`;
}
async function apiFetch(path: string, options: RequestInit = {}) {
  const token = localStorage.getItem("cfd_token");
  if (!token) throw new Error("belum login");
  const res = await fetch(apiUrl(path), {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers ?? {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `request gagal (status ${res.status})`);
  return data;
}
function formatSisaWaktu(totalMenit: number) {
  const jam = Math.floor(totalMenit / 60);
  const menit = totalMenit % 60;
  return `${String(jam).padStart(2, "0")}:${String(menit).padStart(2, "0")}`;
}
function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

type SesiTone = "live" | "upcoming" | "ended" | "none";
function turunkanStatusSesi(sesi: SesiAktif | null): { label: string; tone: SesiTone } {
  if (!sesi) return { label: "Belum Ada Sesi", tone: "none" };
  if (sesi.aktif) return { label: "Sedang Berlangsung", tone: "live" };
  if (sesi.status === "ditutup") return { label: "Diakhiri Lebih Awal", tone: "ended" };
  if (sesi.status === "selesai") return { label: "Sudah Selesai", tone: "ended" };

  const now = new Date();
  const nowMenit = now.getHours() * 60 + now.getMinutes();
  const [jamMulaiH, jamMulaiM] = sesi.jamMulai.split(":").map(Number);
  if (nowMenit < jamMulaiH * 60 + jamMulaiM) return { label: "Menunggu Mulai", tone: "upcoming" };

  return { label: "Sudah Berakhir", tone: "ended" };
}

const STATUS_KEHADIRAN_STYLE: Record<KehadiranItem["status"], { label: string; bg: string; text: string }> = {
  "check-out": { label: "Sudah Check-out", bg: "bg-primary-container/15", text: "text-on-primary-container" },
  "check-in": { label: "Sedang di Lapak", bg: "bg-secondary-container/40", text: "text-on-secondary-container" },
  "belum-hadir": { label: "Belum Hadir", bg: "bg-surface-container-high", text: "text-on-surface-variant" },
};

// ===== CHART: bar horizontal omset per pedagang, tanpa library eksternal =====
function OmsetChart({ data }: { data: KehadiranItem[] }) {
  const withOmset = data
    .filter((d): d is KehadiranItem & { omset: number } => d.omset != null && d.omset > 0)
    .sort((a, b) => b.omset - a.omset)
    .slice(0, 8);

  if (withOmset.length === 0) {
    return (
      <p className="py-lg text-center text-body-sm text-on-surface-variant">
        Belum ada data omset (omset diisi pedagang saat check-out).
      </p>
    );
  }

  const max = Math.max(...withOmset.map((d) => d.omset));

  return (
    <div className="flex flex-col gap-sm">
      {withOmset.map((item) => (
        <div key={item.id} className="flex items-center gap-md">
          <p className="w-28 shrink-0 truncate text-body-sm text-on-surface" title={item.namaUsaha}>
            {item.namaUsaha}
          </p>
          <div className="h-6 flex-1 overflow-hidden rounded-full bg-surface-container-high">
            <div
              className="flex h-full items-center justify-end rounded-full bg-primary px-sm transition-all duration-700"
              style={{ width: `${Math.max((item.omset / max) * 100, 12)}%` }}
            >
              <span className="text-label-sm whitespace-nowrap text-on-primary">
                {formatRupiah(item.omset)}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function PetugasHomePage() {
  const [status, setStatus] = useState<StatusOperasional | null>(null);
  const [laporan, setLaporan] = useState<LaporanResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [statusData, laporanData] = await Promise.all([
          apiFetch("/api/petugas/jam-operasional") as Promise<StatusOperasional>,
          apiFetch("/api/petugas/laporan?limit=100") as Promise<LaporanResponse>,
        ]);
        setStatus(statusData);
        setLaporan(laporanData);
        setLoadError(null);
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : "gagal memuat data dashboard");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const sesi = status?.sesi ?? null;
  const { label: labelSesi, tone: toneSesi } = turunkanStatusSesi(sesi);

  const totalTerdaftar = laporan?.totalTerdaftar ?? 0;
  const totalCheckin = laporan?.totalCheckin ?? 0;
  const persentaseHadir = laporan?.persenHadir ?? 0;
  const pedagangHariIni = laporan?.data ?? [];

  const elapsedPercent =
    sesi && sesi.aktif && sesi.totalMenit > 0
      ? Math.round(((sesi.totalMenit - sesi.sisaMenit) / sesi.totalMenit) * 100)
      : 0;

  return (
    <div className="flex flex-col gap-lg">
      {/* Header */}
      <div>
        <div className="flex items-center gap-sm">
          <h2 className="text-headline-lg text-on-surface">Selamat Pagi, Petugas! 👋</h2>
          <span className="inline-flex items-center gap-xs rounded-full bg-secondary-container/40 px-sm py-1 text-label-sm text-on-secondary-container">
            <span className="h-1.5 w-1.5 rounded-full bg-secondary animate-pulse" />
            Online
          </span>
        </div>
        <p className="mt-xs text-body-md text-on-surface-variant">
          {new Date().toLocaleDateString("id-ID", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </p>
      </div>

      {loadError && (
        <div className="rounded-lg border border-error-container bg-error-container/20 p-md text-body-sm text-on-error-container">
          Gagal mengambil data terbaru: {loadError}
        </div>
      )}

      {/* ===== HERO: STATUS SESI ===== */}
      {loading ? (
        <div className="h-[132px] animate-pulse rounded-xl bg-surface-container-high" />
      ) : (
        <div
          className={`rounded-xl p-lg ${
            toneSesi === "live"
              ? "bg-primary text-on-primary"
              : "border border-outline-variant bg-surface-container-lowest text-on-surface"
          }`}
        >
          <div className="flex flex-wrap items-start justify-between gap-md">
            <div className="flex items-start gap-md">
              <span
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
                  toneSesi === "live" ? "bg-white/15" : "bg-surface-container-high"
                }`}
              >
                {toneSesi === "live" ? (
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white/80" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-white" />
                  </span>
                ) : toneSesi === "upcoming" ? (
                  <Hourglass className="h-5 w-5 text-on-tertiary-container" strokeWidth={2} />
                ) : toneSesi === "ended" ? (
                  <CircleCheck className="h-5 w-5 text-on-surface-variant" strokeWidth={2} />
                ) : (
                  <Clock className="h-5 w-5 text-on-surface-variant" strokeWidth={2} />
                )}
              </span>
              <div>
                <p
                  className={`text-label-sm ${
                    toneSesi === "live" ? "text-white/70" : "text-on-surface-variant"
                  }`}
                >
                  Status Sesi CFD
                </p>
                <p className="mt-1 text-headline-md">{labelSesi}</p>
                {sesi && (
                  <p className={`mt-1 text-body-sm ${toneSesi === "live" ? "text-white/80" : "text-on-surface-variant"}`}>
                    {sesi.jamMulai.slice(0, 5)} – {sesi.jamSelesaiRencana.slice(0, 5)} WIB
                  </p>
                )}
              </div>
            </div>

            {toneSesi === "live" && (
              <div className="text-right">
                <p className="text-label-sm text-white/70">Sisa Waktu</p>
                <p className="text-headline-md tabular-nums">{formatSisaWaktu(sesi!.sisaMenit)}</p>
              </div>
            )}
          </div>

          {toneSesi === "live" && (
            <div className="mt-md h-1.5 w-full overflow-hidden rounded-full bg-white/20">
              <div
                className="h-full rounded-full bg-white transition-all duration-1000"
                style={{ width: `${elapsedPercent}%` }}
              />
            </div>
          )}
        </div>
      )}

      {/* ===== KEHADIRAN & PENDAFTARAN ===== */}
      <div className="grid grid-cols-1 gap-md sm:grid-cols-2">
        {loading ? (
          <>
            <div className="h-[104px] animate-pulse rounded-xl bg-surface-container-high" />
            <div className="h-[104px] animate-pulse rounded-xl bg-surface-container-high" />
          </>
        ) : (
          <>
            <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-lg">
              <div className="flex items-center justify-between">
                <span className="text-label-sm text-on-surface-variant">Kehadiran Hari Ini</span>
                <FileText className="h-4 w-4 text-on-surface-variant" strokeWidth={2} />
              </div>
              <p className="mt-xs text-title-lg font-semibold text-on-surface">
                {totalCheckin}
                <span className="text-body-md font-normal text-on-surface-variant"> / {totalTerdaftar} pedagang</span>
              </p>
              <div className="mt-sm h-1.5 w-full overflow-hidden rounded-full bg-surface-container-high">
                <div
                  className="h-full rounded-full bg-secondary transition-all duration-500"
                  style={{ width: `${persentaseHadir}%` }}
                />
              </div>
              <p className="mt-xs text-label-sm text-on-surface-variant">{persentaseHadir}% sudah check-in</p>
            </div>

            <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-lg">
              <div className="flex items-center justify-between">
                <span className="text-label-sm text-on-surface-variant">Pendaftaran Pedagang</span>
                <Sparkles className="h-4 w-4 text-on-surface-variant" strokeWidth={2} />
              </div>
              <p className="mt-xs text-title-lg font-semibold text-on-surface">
                {status?.pendaftaran.isOpen ? "Dibuka" : "Ditutup"}
              </p>
              <Link
                href="/petugas/jam-operasional"
                className="mt-sm inline-flex items-center gap-xs text-label-sm text-primary hover:underline"
              >
                Kelola pendaftaran
                <ChevronRight className="h-3.5 w-3.5" strokeWidth={2.5} />
              </Link>
            </div>
          </>
        )}
      </div>

      {/* ===== GRAFIK OMSET ===== */}
      <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-lg">
        <div className="mb-md flex items-center gap-sm">
          <TrendingUp className="h-[18px] w-[18px] text-on-surface-variant" strokeWidth={2} />
          <h3 className="text-title-lg text-on-surface">Omset Hari Ini</h3>
          {laporan && laporan.totalOmset > 0 && (
            <span className="ml-auto text-label-sm text-on-surface-variant">
              Total {formatRupiah(laporan.totalOmset)}
            </span>
          )}
        </div>
        {loading ? (
          <div className="h-40 animate-pulse rounded-lg bg-surface-container-high" />
        ) : (
          <OmsetChart data={pedagangHariIni} />
        )}
      </div>

      {/* ===== TABEL PEDAGANG HARI INI ===== */}
      <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-lg">
        <div className="mb-md flex items-center gap-sm">
          <Store className="h-[18px] w-[18px] text-on-surface-variant" strokeWidth={2} />
          <h3 className="text-title-lg text-on-surface">Pedagang Hari Ini</h3>
          <span className="ml-auto text-label-sm text-on-surface-variant">{pedagangHariIni.length} lapak terisi</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-outline-variant text-label-sm text-on-surface-variant">
                <th className="px-sm py-sm font-medium">Pedagang</th>
                <th className="px-sm py-sm font-medium">Lokasi Lapak</th>
                <th className="px-sm py-sm font-medium">Check-in</th>
                <th className="px-sm py-sm font-medium">Check-out</th>
                <th className="px-sm py-sm font-medium">Omset</th>
                <th className="px-sm py-sm font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={6} className="px-sm py-md text-center text-body-md text-on-surface-variant">
                    Memuat data...
                  </td>
                </tr>
              )}
              {!loading && pedagangHariIni.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-sm py-md text-center text-body-md text-on-surface-variant">
                    Belum ada pedagang yang check-in hari ini.
                  </td>
                </tr>
              )}
              {!loading &&
                pedagangHariIni.map((item) => {
                  const style = STATUS_KEHADIRAN_STYLE[item.status];
                  return (
                    <tr
                      key={item.id}
                      className="border-b border-outline-variant last:border-0 hover:bg-surface-container-low/50 transition-colors"
                    >
                      <td className="px-sm py-sm">
                        <p className="text-body-md text-on-surface">{item.namaUsaha}</p>
                        <p className="text-label-sm text-on-surface-variant">{item.pemilik}</p>
                      </td>
                      <td className="px-sm py-sm text-body-md text-on-surface-variant">{item.lokasiLapak || "-"}</td>
                      <td className="px-sm py-sm text-body-md text-on-surface-variant">{item.waktuCheckin}</td>
                      <td className="px-sm py-sm text-body-md text-on-surface-variant">{item.waktuCheckout ?? "-"}</td>
                      <td className="px-sm py-sm text-body-md text-on-surface">
                        {item.omset != null ? formatRupiah(item.omset) : "-"}
                      </td>
                      <td className="px-sm py-sm">
                        <span className={`inline-flex items-center rounded-full px-sm py-1 text-label-sm ${style.bg} ${style.text}`}>
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