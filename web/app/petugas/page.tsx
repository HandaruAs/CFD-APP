// app/petugas/page.tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
  type Variants,
} from "framer-motion";
import {
  Clock,
  FileText,
  Sparkles,
  CircleCheck,
  Hourglass,
  Store,
  TrendingUp,
  RefreshCw,
  LogOut,
  MapPin,
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

// Sapaan mengikuti jam -- dulu selalu "Selamat Pagi" walaupun sudah sore.
function sapaan(jam: number) {
  if (jam < 11) return "Selamat Pagi";
  if (jam < 15) return "Selamat Siang";
  if (jam < 18) return "Selamat Sore";
  return "Selamat Malam";
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

const STATUS_KEHADIRAN_STYLE: Record<KehadiranItem["status"], { label: string; bg: string; text: string; dot: string }> = {
  "check-out": { label: "Sudah Check-out", bg: "bg-primary-fixed", text: "text-on-primary-fixed", dot: "bg-primary" },
  "check-in": { label: "Sedang di Lapak", bg: "bg-secondary-container/40", text: "text-on-secondary-container", dot: "bg-secondary" },
  "belum-hadir": { label: "Belum Hadir", bg: "bg-surface-container-high", text: "text-on-surface-variant", dot: "bg-outline" },
};

// Warna avatar diputar bergantian berdasarkan huruf pertama, biar tabel nggak monoton satu warna
const AVATAR_PALETTE = [
  { bg: "bg-primary-fixed", text: "text-on-primary-fixed" },
  { bg: "bg-secondary-fixed", text: "text-on-secondary-fixed" },
  { bg: "bg-tertiary-fixed", text: "text-on-tertiary-fixed" },
];
function avatarStyleFor(seed: string) {
  const code = seed.charCodeAt(0) || 0;
  return AVATAR_PALETTE[code % AVATAR_PALETTE.length];
}

// ===== ANIMASI =====
// Satu urutan masuk saat halaman dibuka: bagian-bagian muncul berurutan dari
// atas ke bawah. Otomatis mati kalau perangkat mengatur "kurangi animasi".
const WADAH: Variants = {
  awal: {},
  tampil: { transition: { staggerChildren: 0.07 } },
};
const BAGIAN: Variants = {
  awal: { opacity: 0, y: 12 },
  tampil: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } },
};

// Angka yang "berhitung naik" ke nilai barunya, termasuk saat data di-refresh.
function AngkaBerjalan({ nilai, format }: { nilai: number; format?: (n: number) => string }) {
  const kurangiGerak = useReducedMotion();
  const mv = useMotionValue(kurangiGerak ? nilai : 0);
  const teks = useTransform(mv, (v) => (format ? format(Math.round(v)) : Math.round(v).toLocaleString("id-ID")));

  useEffect(() => {
    if (kurangiGerak) {
      mv.set(nilai);
      return;
    }
    const kontrol = animate(mv, nilai, { duration: 0.9, ease: [0.22, 1, 0.36, 1] });
    return () => kontrol.stop();
  }, [nilai, mv, kurangiGerak]);

  return <motion.span className="tabular-nums">{teks}</motion.span>;
}

// ===== ILUSTRASI DEKORATIF (SVG inline, tanpa file gambar eksternal) =====
function MarketIllustration({ light }: { light: boolean }) {
  const stroke = light ? "rgba(255,255,255,0.9)" : "var(--color-primary)";
  const fillSoft = light ? "rgba(255,255,255,0.15)" : "var(--color-primary-container)";
  return (
    <svg
      viewBox="0 0 160 120"
      className="hidden h-[110px] w-[140px] shrink-0 sm:block"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle cx="80" cy="60" r="52" fill={fillSoft} opacity={light ? 0.5 : 0.4} />
      <path d="M40 55L80 35L120 55" stroke={stroke} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="45" y="55" width="70" height="35" rx="4" stroke={stroke} strokeWidth="4" />
      <path d="M62 90V70C62 65.5817 65.5817 62 70 62H90C94.4183 62 98 65.5817 98 70V90" stroke={stroke} strokeWidth="4" strokeLinecap="round" />
      <path d="M28 40C28 33.3726 33.3726 28 40 28C46.6274 28 52 33.3726 52 40" stroke={stroke} strokeWidth="3.5" strokeLinecap="round" />
      <line x1="40" y1="28" x2="40" y2="18" stroke={stroke} strokeWidth="3.5" strokeLinecap="round" />
      <circle cx="128" cy="34" r="4" fill={stroke} opacity="0.7" />
      <circle cx="24" cy="82" r="3" fill={stroke} opacity="0.5" />
    </svg>
  );
}

// Cincin sisa waktu sesi (dipakai di hero saat sesi berlangsung).
function CincinWaktu({ persen, children }: { persen: number; children: React.ReactNode }) {
  const KELILING = 2 * Math.PI * 44;
  return (
    <div className="relative h-[104px] w-[104px] shrink-0">
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" aria-hidden="true">
        <circle cx="50" cy="50" r="44" fill="none" strokeWidth="8" stroke="rgba(255,255,255,0.18)" />
        <motion.circle
          cx="50"
          cy="50"
          r="44"
          fill="none"
          strokeWidth="8"
          strokeLinecap="round"
          stroke="white"
          strokeDasharray={KELILING}
          initial={false}
          animate={{ strokeDashoffset: KELILING * (1 - Math.min(100, Math.max(0, persen)) / 100) }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  );
}

// ===== CHART: bar horizontal omset per pedagang, tanpa library chart =====
// Data & urutan sama persis seperti sebelumnya (sort by omset desc, top 8).
// Batang sekarang "tumbuh" berurutan saat tampil, dan juara 1-3 dapat warna
// medali.
function OmsetChart({ data }: { data: KehadiranItem[] }) {
  const kurangiGerak = useReducedMotion();
  const withOmset = data
    .filter((d): d is KehadiranItem & { omset: number } => d.omset != null && d.omset > 0)
    .sort((a, b) => b.omset - a.omset)
    .slice(0, 8);

  if (withOmset.length === 0) {
    return (
      <div className="pt-empty">
        <span className="pt-empty-icon">
          <TrendingUp className="h-6 w-6" strokeWidth={1.75} />
        </span>
        <p className="text-body-sm text-on-surface-variant">
          Belum ada data omset (omset diisi pedagang saat check-out).
        </p>
      </div>
    );
  }

  const max = Math.max(...withOmset.map((d) => d.omset));
  const RANK_BADGE = [
    "bg-sun text-on-tertiary-fixed shadow-[0_0_0_3px_var(--color-sun-soft)]",
    "bg-outline-variant text-on-surface shadow-[0_0_0_3px_var(--color-surface-container-high)]",
    "bg-tertiary-fixed-dim text-on-tertiary-fixed shadow-[0_0_0_3px_var(--color-tertiary-fixed)]",
  ];

  return (
    <ol className="flex flex-col gap-md">
      {withOmset.map((item, index) => (
        <li key={item.id} className="group flex items-center gap-sm" title={`${item.namaUsaha} (${item.pemilik}): ${formatRupiah(item.omset)}`}>
          <span
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-label-sm font-semibold ${
              RANK_BADGE[index] ?? "bg-surface-container-high text-on-surface-variant"
            }`}
          >
            {index + 1}
          </span>
          <div className="min-w-0 flex-1 sm:w-36 sm:flex-none">
            <p className="truncate text-body-sm font-medium text-on-surface">{item.namaUsaha}</p>
            <p className="truncate text-label-sm text-on-surface-variant">{item.lokasiLapak || item.pemilik}</p>
            {/* HP: batang tipis di bawah nama */}
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-container-high sm:hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-primary-container to-primary"
                initial={kurangiGerak ? false : { width: "0%" }}
                animate={{ width: `${(item.omset / max) * 100}%` }}
                transition={{ duration: 0.8, delay: kurangiGerak ? 0 : 0.15 + index * 0.06, ease: [0.22, 1, 0.36, 1] }}
              />
            </div>
          </div>
          {/* HP: nilai rupiah di sebelah kanan, batang disembunyikan biar gak kepotong */}
          <span className="shrink-0 text-body-sm font-semibold tabular-nums text-on-surface sm:hidden">
            {formatRupiah(item.omset)}
          </span>
          <div
            className="hidden h-8 flex-1 overflow-hidden rounded-full bg-surface-container-high sm:block"
            style={{
              backgroundImage:
                "repeating-linear-gradient(90deg, var(--color-surface-container-high) 0, var(--color-surface-container-high) 24.75%, var(--color-outline-variant) 25%, var(--color-surface-container-high) 25.25%)",
            }}
          >
            <motion.div
              className="flex h-full items-center justify-end rounded-full bg-gradient-to-r from-primary-container to-primary px-sm transition-[filter] group-hover:brightness-110"
              initial={kurangiGerak ? false : { width: "0%" }}
              animate={{ width: `${Math.max((item.omset / max) * 100, 16)}%` }}
              transition={{ duration: 0.8, delay: kurangiGerak ? 0 : 0.15 + index * 0.06, ease: [0.22, 1, 0.36, 1] }}
            >
              <span className="text-label-sm whitespace-nowrap text-on-primary">{formatRupiah(item.omset)}</span>
            </motion.div>
          </div>
        </li>
      ))}
    </ol>
  );
}

const INTERVAL_REFRESH_MS = 60_000;

export default function PetugasHomePage() {
  const kurangiGerak = useReducedMotion();
  const [status, setStatus] = useState<StatusOperasional | null>(null);
  const [laporan, setLaporan] = useState<LaporanResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [sekarang, setSekarang] = useState(() => new Date());
  const [diperbarui, setDiperbarui] = useState<Date | null>(null);

  const load = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    try {
      const [statusData, laporanData] = await Promise.all([
        apiFetch("/api/petugas/jam-operasional") as Promise<StatusOperasional>,
        apiFetch("/api/petugas/laporan?limit=100") as Promise<LaporanResponse>,
      ]);
      setStatus(statusData);
      setLaporan(laporanData);
      setLoadError(null);
      setDiperbarui(new Date());
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "gagal memuat data dashboard");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    // Data diperbarui otomatis tiap menit, jam di header tiap 30 detik.
    const refresh = setInterval(() => load(), INTERVAL_REFRESH_MS);
    const jam = setInterval(() => setSekarang(new Date()), 30_000);
    return () => {
      clearInterval(refresh);
      clearInterval(jam);
    };
  }, [load]);

  const sesi = status?.sesi ?? null;
  const { label: labelSesi, tone: toneSesi } = turunkanStatusSesi(sesi);

  const totalTerdaftar = laporan?.totalTerdaftar ?? 0;
  const totalCheckin = laporan?.totalCheckin ?? 0;
  const totalCheckout = laporan?.totalCheckout ?? 0;
  const persentaseHadir = laporan?.persenHadir ?? 0;
  const pedagangHariIni = laporan?.data ?? [];

  // Sisa waktu dihitung mundur di browser sejak data terakhir diambil,
  // supaya angkanya tetap jalan di antara refresh.
  const menitBerlalu = diperbarui ? Math.max(0, Math.floor((sekarang.getTime() - diperbarui.getTime()) / 60_000)) : 0;
  const sisaMenit = sesi ? Math.max(0, sesi.sisaMenit - menitBerlalu) : 0;
  const elapsedPercent =
    sesi && sesi.aktif && sesi.totalMenit > 0
      ? Math.round(((sesi.totalMenit - sisaMenit) / sesi.totalMenit) * 100)
      : 0;

  const menitMenujuMulai = (() => {
    if (!sesi || toneSesi !== "upcoming") return null;
    const [h, m] = sesi.jamMulai.split(":").map(Number);
    return h * 60 + m - (sekarang.getHours() * 60 + sekarang.getMinutes());
  })();

  return (
    <motion.div
      className="flex flex-col gap-lg"
      variants={WADAH}
      initial={kurangiGerak ? false : "awal"}
      animate="tampil"
    >
      {/* Header */}
      <motion.div variants={BAGIAN} className="flex flex-wrap items-end justify-between gap-md">
        <div>
          <div className="flex flex-wrap items-center gap-sm">
            <h2 className="text-headline-lg text-on-surface">{sapaan(sekarang.getHours())}, Petugas! 👋</h2>
            <span className="inline-flex items-center gap-xs rounded-full bg-secondary-container/40 px-sm py-1 text-label-sm text-on-secondary-container">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-secondary/70 motion-reduce:hidden" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-secondary" />
              </span>
              Online
            </span>
          </div>
          <p className="mt-xs text-body-md text-on-surface-variant">
            {sekarang.toLocaleDateString("id-ID", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
            <span className="mx-xs text-outline">|</span>
            <span className="tabular-nums">
              {sekarang.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} WIB
            </span>
          </p>
        </div>
        <button
          type="button"
          onClick={() => load(true)}
          disabled={refreshing || loading}
          className="pt-btn pt-btn-secondary"
          title={diperbarui ? `Diperbarui ${diperbarui.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}` : undefined}
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          Muat ulang
        </button>
      </motion.div>

      {loadError && (
        <div className="rounded-lg border border-error-container bg-error-container/20 p-md text-body-sm text-on-error-container">
          Gagal mengambil data terbaru: {loadError}
        </div>
      )}

      {/* ===== HERO: STATUS SESI ===== */}
      <motion.div variants={BAGIAN}>
        {loading ? (
          <div className="h-[156px] animate-pulse rounded-2xl bg-surface-container-high" />
        ) : (
          <div
            className={`relative overflow-hidden rounded-2xl p-lg shadow-[0_1px_3px_rgba(11,28,48,0.05)] sm:p-xl ${
              toneSesi === "live"
                ? "bg-gradient-to-br from-primary to-primary-container text-on-primary shadow-[0_18px_40px_-20px_rgba(0,40,142,0.6)]"
                : "border border-outline-variant bg-surface-container-lowest text-on-surface"
            }`}
          >
            {/* marka jalan CFD sebagai latar */}
            <div
              aria-hidden="true"
              className={`pointer-events-none absolute inset-x-0 bottom-0 h-1 ${toneSesi === "live" ? "opacity-30" : "opacity-15"}`}
              style={{
                backgroundImage: `repeating-linear-gradient(90deg, ${
                  toneSesi === "live" ? "white" : "var(--color-primary)"
                } 0 32px, transparent 32px 56px)`,
              }}
            />

            <div className="relative flex flex-wrap items-center justify-between gap-md">
              <div className="flex items-start gap-md">
                <span
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
                    toneSesi === "live" ? "bg-white/15" : toneSesi === "upcoming" ? "bg-tertiary-fixed" : "bg-surface-container-high"
                  }`}
                >
                  {toneSesi === "live" ? (
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white/80 motion-reduce:hidden" />
                      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-white" />
                    </span>
                  ) : toneSesi === "upcoming" ? (
                    <Hourglass className="h-5 w-5 text-on-tertiary-fixed" strokeWidth={2} />
                  ) : toneSesi === "ended" ? (
                    <CircleCheck className="h-5 w-5 text-on-surface-variant" strokeWidth={2} />
                  ) : (
                    <Clock className="h-5 w-5 text-on-surface-variant" strokeWidth={2} />
                  )}
                </span>
                <div>
                  <p className={`text-label-sm ${toneSesi === "live" ? "text-white/70" : "text-on-surface-variant"}`}>
                    Status Sesi CFD
                  </p>
                  <p className="mt-1 text-headline-md">{labelSesi}</p>
                  {sesi && (
                    <p className={`mt-1 text-body-sm ${toneSesi === "live" ? "text-white/80" : "text-on-surface-variant"}`}>
                      {sesi.jamMulai.slice(0, 5)} – {sesi.jamSelesaiRencana.slice(0, 5)} WIB
                    </p>
                  )}
                  {menitMenujuMulai !== null && menitMenujuMulai > 0 && (
                    <p className="mt-sm inline-flex rounded-full bg-tertiary-fixed px-sm py-1 text-label-sm text-on-tertiary-fixed">
                      Dimulai {menitMenujuMulai >= 60 ? `${Math.floor(menitMenujuMulai / 60)} jam ${menitMenujuMulai % 60} menit` : `${menitMenujuMulai} menit`} lagi
                    </p>
                  )}
                  {toneSesi === "live" && (
                    <div className="mt-md flex items-center gap-md sm:hidden">
                      <div>
                        <p className="text-label-sm text-white/70">Sisa Waktu</p>
                        <p className="text-headline-md tabular-nums">{formatSisaWaktu(sisaMenit)}</p>
                      </div>
                      <div className="h-1.5 w-32 overflow-hidden rounded-full bg-white/20">
                        <div className="h-full rounded-full bg-white transition-all duration-1000" style={{ width: `${elapsedPercent}%` }} />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {toneSesi === "live" ? (
                <div className="hidden items-center gap-lg sm:flex">
                  <CincinWaktu persen={100 - elapsedPercent}>
                    <span className="text-title-lg font-semibold tabular-nums">{formatSisaWaktu(sisaMenit)}</span>
                    <span className="text-label-sm text-white/70">tersisa</span>
                  </CincinWaktu>
                  <MarketIllustration light />
                </div>
              ) : (
                <MarketIllustration light={false} />
              )}
            </div>
          </div>
        )}
      </motion.div>

      {/* ===== KEHADIRAN & PENDAFTARAN ===== */}
      <motion.div variants={BAGIAN} className="grid grid-cols-1 gap-md sm:grid-cols-2">
        {loading ? (
          <>
            <div className="h-[156px] animate-pulse rounded-2xl bg-surface-container-high" />
            <div className="h-[156px] animate-pulse rounded-2xl bg-surface-container-high" />
          </>
        ) : (
          <>
            <div className="pt-card transition-shadow hover:shadow-[0_10px_30px_-16px_rgba(11,28,48,0.25)]">
              <div className="flex items-center gap-md">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-secondary-container/40 text-on-secondary-container">
                  <FileText className="h-5 w-5" strokeWidth={2} />
                </span>
                <p className="text-headline-md font-semibold text-on-surface">
                  <AngkaBerjalan nilai={totalCheckin} />
                  <span className="text-body-md font-normal text-on-surface-variant"> / {totalTerdaftar}</span>
                </p>
              </div>
              <p className="mt-sm text-label-md text-on-surface-variant">Kehadiran Hari Ini</p>
              <div className="mt-sm h-2 w-full overflow-hidden rounded-full bg-surface-container-high">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-secondary-fixed-dim to-secondary"
                  initial={kurangiGerak ? false : { width: 0 }}
                  animate={{ width: `${Math.min(100, persentaseHadir)}%` }}
                  transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                />
              </div>
              <div className="mt-xs flex flex-wrap items-center justify-between gap-xs text-label-sm text-on-surface-variant">
                <span>{persentaseHadir}% sudah check-in</span>
                <span className="inline-flex items-center gap-xs">
                  <LogOut className="h-3.5 w-3.5" strokeWidth={2} />
                  {totalCheckout} sudah check-out
                </span>
              </div>
            </div>

            <div className="pt-card transition-shadow hover:shadow-[0_10px_30px_-16px_rgba(11,28,48,0.25)]">
              <div className="flex items-center gap-md">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-tertiary-container/20 text-on-tertiary-container">
                  <Sparkles className="h-5 w-5" strokeWidth={2} />
                </span>
                <div>
                  <p className="text-label-md text-on-surface-variant">Pendaftaran Pedagang</p>
                  {/* Dulu tulisan "Dibuka/Ditutup" tampil dua kali -- sekarang cukup satu */}
                  <p className="mt-0.5 inline-flex items-center gap-sm text-headline-md font-semibold text-on-surface">
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${status?.pendaftaran.isOpen ? "bg-secondary" : "bg-outline"}`}
                      aria-hidden="true"
                    />
                    {status?.pendaftaran.isOpen ? "Dibuka" : "Ditutup"}
                  </p>
                </div>
              </div>
              {status?.pendaftaran.isOpen && status.pendaftaran.jamBuka && status.pendaftaran.jamTutup ? (
                <p className="mt-sm text-body-sm text-on-surface-variant">
                  Jam pendaftaran {status.pendaftaran.jamBuka.slice(0, 5)} – {status.pendaftaran.jamTutup.slice(0, 5)} WIB
                </p>
              ) : (
                <p className="mt-sm text-body-sm text-on-surface-variant">
                  {status?.pendaftaran.isOpen ? "Pedagang bisa mendaftar kapan saja." : "Pedagang baru belum bisa mendaftar."}
                </p>
              )}
            </div>
          </>
        )}
      </motion.div>

      {/* ===== GRAFIK OMSET ===== */}
      <motion.div variants={BAGIAN} className="pt-card">
        <div className="mb-md flex flex-wrap items-center gap-sm">
          <span className="pt-section-icon">
            <TrendingUp className="h-[18px] w-[18px]" strokeWidth={2} />
          </span>
          <div>
            <h3 className="pt-section-title">Omset Hari Ini</h3>
            <p className="pt-section-desc">Ranking pedagang berdasarkan omset check-out</p>
          </div>
          {laporan && laporan.totalOmset > 0 && (
            <div className="ml-auto flex flex-wrap gap-xs">
              <span className="rounded-full bg-primary-fixed px-md py-1.5 text-label-sm font-semibold text-on-primary-fixed">
                Total <AngkaBerjalan nilai={laporan.totalOmset} format={formatRupiah} />
              </span>
              <span className="rounded-full bg-surface-container-high px-md py-1.5 text-label-sm text-on-surface-variant">
                Rata-rata {formatRupiah(Math.round(laporan.rataOmset))}
              </span>
            </div>
          )}
        </div>
        {loading ? (
          <div className="h-40 animate-pulse rounded-xl bg-surface-container-high" />
        ) : (
          <OmsetChart data={pedagangHariIni} />
        )}
      </motion.div>

      {/* ===== TABEL PEDAGANG HARI INI ===== */}
      <motion.div variants={BAGIAN} className="pt-card !p-0 sm:!p-0 overflow-hidden">
        <div className="flex items-center gap-sm p-lg pb-md sm:p-xl sm:pb-md">
          <span className="pt-section-icon">
            <Store className="h-[18px] w-[18px]" strokeWidth={2} />
          </span>
          <h3 className="pt-section-title">Pedagang Hari Ini</h3>
          <span className="ml-auto rounded-full bg-surface-container-high px-sm py-1 text-label-sm text-on-surface-variant">
            {pedagangHariIni.length} lapak terisi
          </span>
        </div>

        {loading ? (
          <p className="px-lg py-xl text-center text-body-md text-on-surface-variant sm:px-xl">Memuat data...</p>
        ) : pedagangHariIni.length === 0 ? (
          <div className="pt-empty mx-lg mb-lg sm:mx-xl sm:mb-xl">
            <span className="pt-empty-icon">
              <Store className="h-6 w-6" strokeWidth={1.75} />
            </span>
            <p className="text-body-sm text-on-surface-variant">Belum ada pedagang yang check-in hari ini.</p>
          </div>
        ) : (
          <>
            {/* HP: daftar kartu, biar gak perlu geser tabel ke samping */}
            <ul className="flex flex-col divide-y divide-outline-variant border-t border-outline-variant md:hidden">
              {pedagangHariIni.map((item) => {
                const avatar = avatarStyleFor(item.inisial || item.namaUsaha || "?");
                return (
                  <li key={item.id} className="flex flex-col gap-sm px-lg py-md">
                    <div className="flex items-center gap-sm">
                      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-label-sm font-semibold ${avatar.bg} ${avatar.text}`}>
                        {item.inisial || item.namaUsaha?.slice(0, 2).toUpperCase() || "??"}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-body-md font-medium text-on-surface">{item.namaUsaha}</p>
                        <p className="truncate text-label-sm text-on-surface-variant">{item.pemilik}</p>
                      </div>
                      {item.omset != null && (
                        <span className="shrink-0 text-body-md font-semibold tabular-nums text-on-surface">{formatRupiah(item.omset)}</span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-x-md gap-y-xs pl-[52px] text-label-sm text-on-surface-variant">
                      <span className="inline-flex items-center gap-xs">
                        <MapPin className="h-3.5 w-3.5" />
                        {item.lokasiLapak || "-"}
                      </span>
                      <span className="inline-flex items-center gap-xs">
                        <Clock className="h-3.5 w-3.5" />
                        {item.waktuCheckin}
                        {item.waktuCheckout ? ` – ${item.waktuCheckout}` : ""}
                      </span>
                    </div>
                    <div className="pl-[52px]">
                      <StatusPill status={item.status} />
                    </div>
                  </li>
                );
              })}
            </ul>

            {/* Layar lebar: tabel */}
            <div className="hidden max-h-[560px] overflow-auto md:block">
              <table className="w-full text-left">
                <thead className="sticky top-0 z-10">
                  <tr className="border-y border-outline-variant bg-surface-container-low text-label-sm uppercase tracking-wide text-on-surface-variant">
                    <th className="px-lg py-sm font-medium sm:px-xl">Pedagang</th>
                    <th className="px-sm py-sm font-medium">Lokasi Lapak</th>
                    <th className="px-sm py-sm font-medium">Check-in</th>
                    <th className="px-sm py-sm font-medium">Check-out</th>
                    <th className="px-sm py-sm text-right font-medium">Omset</th>
                    <th className="px-sm py-sm pr-lg font-medium sm:pr-xl">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {pedagangHariIni.map((item) => {
                    const avatar = avatarStyleFor(item.inisial || item.namaUsaha || "?");
                    return (
                      <tr
                        key={item.id}
                        className="border-b border-outline-variant transition-colors last:border-0 hover:bg-surface-container-low/60"
                      >
                        <td className="px-lg py-sm sm:px-xl">
                          <div className="flex items-center gap-sm">
                            <span
                              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-label-sm font-semibold ${avatar.bg} ${avatar.text}`}
                            >
                              {item.inisial || item.namaUsaha?.slice(0, 2).toUpperCase() || "??"}
                            </span>
                            <div>
                              <p className="text-body-md text-on-surface">{item.namaUsaha}</p>
                              <p className="text-label-sm text-on-surface-variant">{item.pemilik}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-sm py-sm text-body-md text-on-surface-variant">{item.lokasiLapak || "-"}</td>
                        <td className="px-sm py-sm text-body-md tabular-nums text-on-surface-variant">{item.waktuCheckin}</td>
                        <td className="px-sm py-sm text-body-md tabular-nums text-on-surface-variant">{item.waktuCheckout ?? "-"}</td>
                        <td className="px-sm py-sm text-right text-body-md tabular-nums text-on-surface">
                          {item.omset != null ? formatRupiah(item.omset) : "-"}
                        </td>
                        <td className="px-sm py-sm pr-lg sm:pr-xl">
                          <StatusPill status={item.status} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}

function StatusPill({ status }: { status: KehadiranItem["status"] }) {
  const style = STATUS_KEHADIRAN_STYLE[status];
  return (
    <span className={`pt-pill inline-flex shrink-0 items-center gap-xs ${style.bg} ${style.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} aria-hidden="true" />
      {style.label}
    </span>
  );
}