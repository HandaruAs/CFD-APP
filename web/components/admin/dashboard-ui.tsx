"use client";

// Komponen tampilan dashboard yang dipakai bersama oleh dashboard
// superadmin (app/admin/page.tsx) dan dashboard petugas (app/petugas/page.tsx):
// banner event hari ini, kartu angka, cincin persen, alur pedagang, dan kartu.
import { AnimatePresence, motion } from "framer-motion";
import NumberFlow from "@number-flow/react";
import {
  AlertTriangle,
  CalendarClock,
  ChevronRight,
  CircleCheck,
  ClipboardList,
  Clock,
  LogOut,
  MapPin,
  QrCode,
  RefreshCw,
  Users,
  type LucideIcon,
} from "lucide-react";

export const EASE = [0.22, 1, 0.36, 1] as const;

export type StatusEvent = "belum_ada" | "terjadwal" | "berjalan" | "selesai" | "dibatalkan";

export const TAMPILAN_STATUS: Record<StatusEvent, { label: string; pill: string; titik: string; ikon: LucideIcon }> = {
  berjalan: { label: "Sedang berjalan", pill: "bg-secondary-container/50 text-on-secondary-container ring-secondary/20", titik: "bg-secondary", ikon: Clock },
  terjadwal: { label: "Terjadwal hari ini", pill: "bg-tertiary-fixed text-on-tertiary-fixed-variant ring-tertiary/15", titik: "bg-[#f59e0b]", ikon: CalendarClock },
  selesai: { label: "Sudah selesai", pill: "bg-surface-container-high text-on-surface-variant ring-outline-variant", titik: "bg-outline", ikon: CircleCheck },
  belum_ada: { label: "Belum ada event", pill: "bg-surface-container-high text-on-surface-variant ring-outline-variant", titik: "bg-outline-variant", ikon: CalendarClock },
  dibatalkan: { label: "Dibatalkan", pill: "bg-error-container/70 text-on-error-container ring-error/20", titik: "bg-error", ikon: AlertTriangle },
};

export function persenAman(bagian: number, total: number) {
  if (total <= 0) return 0;
  return Math.min(100, Math.round((bagian / total) * 100));
}

// "06:00" / "06:00:00" -> menit sejak tengah malam
export function keMenit(jam: string) {
  const [h, m] = jam.split(":").map((x) => Number(x) || 0);
  return h * 60 + m;
}

export function jamPendek(jam: string) {
  return jam ? jam.slice(0, 5) : "-";
}

// ============================================================
// KARTU DASAR
// ============================================================

export function Kartu({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`adm-kartu p-lg ${className}`}>{children}</div>;
}

export function JudulKartu({
  icon: Icon,
  judul,
  keterangan,
  kanan,
}: {
  icon?: LucideIcon;
  judul: string;
  keterangan?: string;
  kanan?: React.ReactNode;
}) {
  return (
    <div className="mb-md flex flex-wrap items-start justify-between gap-x-sm gap-y-xs">
      <div className="flex items-center gap-sm">
        {Icon && (
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-primary">
            <Icon className="h-4 w-4" strokeWidth={2.2} />
          </span>
        )}
        <h4 className="text-title-md text-on-surface">{judul}</h4>
      </div>
      {kanan ?? (keterangan && <span className="text-label-sm text-on-surface-variant">{keterangan}</span>)}
    </div>
  );
}

export function Kosong({ teks, icon: Icon = CalendarClock }: { teks: string; icon?: LucideIcon }) {
  return (
    <div className="flex min-h-[140px] flex-col items-center justify-center gap-sm rounded-xl border border-dashed border-outline-variant bg-surface-container-low px-md text-center text-body-sm text-on-surface-variant">
      <Icon className="h-6 w-6 opacity-60" />
      {teks}
    </div>
  );
}

// ============================================================
// BANNER EVENT HARI INI
// ============================================================

export type PilihanEvent = { id: string; nama: string; status: StatusEvent; keterangan: string };

export function BannerEvent({
  label,
  tanggal,
  diperbarui,
  refreshing,
  onRefresh,
  judul,
  status,
  jam,
  info,
  cincin,
  events,
  pilihanId,
  onPilih,
}: {
  label: string;
  tanggal: string;
  diperbarui: Date | null;
  refreshing: boolean;
  onRefresh: () => void;
  judul: string;
  status: StatusEvent;
  jam: string | null;
  info?: { icon: LucideIcon; teks: string } | null;
  cincin: { atas: string; bawah: string; persen: number };
  events: PilihanEvent[];
  pilihanId: string | null;
  onPilih: (id: string) => void;
}) {
  const tampilan = TAMPILAN_STATUS[status] ?? TAMPILAN_STATUS.belum_ada;
  const InfoIcon = info?.icon ?? MapPin;

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: EASE }}
      className="adm-hero relative overflow-hidden rounded-3xl p-lg text-on-surface shadow-[0_24px_60px_-34px_rgb(0_40_142/0.45)] sm:p-xl"
    >
      <div aria-hidden="true" className="adm-hero-grid pointer-events-none absolute inset-0" />

      <div className="relative flex flex-wrap items-center justify-between gap-sm">
        <div className="flex flex-wrap items-center gap-sm text-[12px] font-medium text-on-surface-variant">
          <span className="rounded-full bg-surface-container-lowest px-3 py-1 ring-1 ring-outline-variant">{tanggal}</span>
          {diperbarui && (
            <span className="inline-flex items-center gap-1.5">
              <span className="relative flex h-2 w-2" aria-hidden="true">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-secondary opacity-50 motion-reduce:hidden" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-secondary" />
              </span>
              Diperbarui {diperbarui.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} · otomatis tiap menit
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={refreshing}
          className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-surface-container-lowest px-3.5 text-[13px] font-semibold text-primary ring-1 ring-outline-variant transition hover:ring-primary/40 disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          Muat ulang
        </button>
      </div>

      <div className="relative mt-lg grid grid-cols-1 items-center gap-xl lg:grid-cols-[minmax(0,1fr)_auto]">
        <div className="min-w-0">
          <p className="text-[12px] font-semibold tracking-[0.2em] text-[#b45309] uppercase">{label}</p>
          <AnimatePresence mode="wait">
            <motion.h2
              key={judul}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
              className="adm-display mt-2 text-[30px] leading-[1.1] font-semibold sm:text-[40px]"
            >
              {judul}
            </motion.h2>
          </AnimatePresence>
          <div className="mt-md flex flex-wrap items-center gap-sm">
            <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[13px] font-semibold ring-1 ${tampilan.pill}`}>
              <span className={`h-2 w-2 rounded-full ${tampilan.titik} ${status === "berjalan" ? "animate-pulse" : ""}`} />
              {tampilan.label}
            </span>
            {jam && (
              <span className="inline-flex items-center gap-1.5 font-mono text-[14px] text-on-surface-variant tabular-nums">
                <Clock className="h-4 w-4" />
                {jam}
              </span>
            )}
            {info && (
              <span className="inline-flex items-center gap-1.5 text-[14px] text-on-surface-variant">
                <InfoIcon className="h-4 w-4" />
                {info.teks}
              </span>
            )}
          </div>
        </div>

        <CincinWaktu {...cincin} />
      </div>

      {/* Pilih event -- muncul kalau hari ini lebih dari satu event. */}
      {events.length > 1 && (
        <div className="relative mt-lg border-t border-outline-variant pt-md">
          <p className="mb-sm text-[12px] font-medium text-on-surface-variant">{events.length} event hari ini · pilih yang ingin dipantau</p>
          <div role="tablist" aria-label="Event hari ini" className="flex gap-sm overflow-x-auto pb-1">
            {events.map((e) => {
              const aktif = e.id === pilihanId;
              const st = TAMPILAN_STATUS[e.status] ?? TAMPILAN_STATUS.belum_ada;
              return (
                <button
                  key={e.id}
                  type="button"
                  role="tab"
                  aria-selected={aktif}
                  onClick={() => onPilih(e.id)}
                  className={`relative flex min-w-[220px] shrink-0 flex-col items-start gap-1 rounded-2xl px-4 py-3 text-left transition ${
                    aktif ? "text-on-primary" : "bg-surface-container-lowest text-on-surface ring-1 ring-outline-variant hover:ring-primary/40"
                  }`}
                >
                  {aktif && (
                    <motion.span
                      layoutId="adm-event-aktif"
                      className="absolute inset-0 rounded-2xl bg-primary shadow-[0_10px_24px_-12px_rgb(0_40_142/0.8)]"
                      transition={{ type: "spring", stiffness: 400, damping: 34 }}
                    />
                  )}
                  <span className="relative flex w-full items-center gap-2">
                    <span className={`h-2 w-2 shrink-0 rounded-full ${st.titik} ${aktif ? "ring-2 ring-white/70" : ""}`} />
                    <span className="truncate text-[14px] font-semibold">{e.nama}</span>
                  </span>
                  <span className={`relative font-mono text-[12px] tabular-nums ${aktif ? "text-on-primary/80" : "text-on-surface-variant"}`}>
                    {e.keterangan}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </motion.div>
  );
}

// Cincin waktu di banner: seberapa jauh event sudah berjalan.
export function CincinWaktu({ atas, bawah, persen }: { atas: string; bawah: string; persen: number }) {
  const R = 54;
  const KELILING = 2 * Math.PI * R;
  return (
    <div
      className="relative mx-auto grid h-[124px] w-[124px] shrink-0 place-items-center sm:h-[150px] sm:w-[150px] lg:mx-0"
      aria-label={`${atas} ${bawah}`}
    >
      <svg viewBox="0 0 128 128" className="absolute inset-0 h-full w-full -rotate-90" aria-hidden="true">
        <circle cx="64" cy="64" r={R} fill="none" strokeWidth="10" stroke="var(--color-surface-container-high)" />
        <motion.circle
          cx="64"
          cy="64"
          r={R}
          fill="none"
          strokeWidth="10"
          strokeLinecap="round"
          stroke="url(#adm-cincin)"
          strokeDasharray={KELILING}
          initial={{ strokeDashoffset: KELILING }}
          animate={{ strokeDashoffset: KELILING * (1 - Math.min(100, Math.max(0, persen)) / 100) }}
          transition={{ duration: 1.2, ease: EASE }}
        />
        <defs>
          <linearGradient id="adm-cincin" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#2f6fed" />
            <stop offset="100%" stopColor="#fdba3d" />
          </linearGradient>
        </defs>
      </svg>
      <div className="text-center">
        <p className="font-mono text-[24px] leading-none font-semibold text-on-surface tabular-nums">{atas}</p>
        <p className="mt-1 text-[12px] text-on-surface-variant">{bawah}</p>
      </div>
    </div>
  );
}

// Isi cincin berdasarkan status & jam event.
export function isiCincin(
  ev: { status: StatusEvent; jamMulai: string; jamSelesai: string; sisaMenit: number; totalMenit?: number } | null,
) {
  if (!ev) return { atas: "—", bawah: "tidak ada event", persen: 0 };
  const total = Math.max(1, ev.totalMenit ?? keMenit(ev.jamSelesai) - keMenit(ev.jamMulai));
  if (ev.status === "berjalan") {
    const j = Math.floor(ev.sisaMenit / 60);
    const m = ev.sisaMenit % 60;
    return {
      atas: j > 0 ? `${j}j ${m}m` : `${m}m`,
      bawah: "lagi selesai",
      persen: Math.min(100, Math.max(0, ((total - ev.sisaMenit) / total) * 100)),
    };
  }
  if (ev.status === "terjadwal") return { atas: jamPendek(ev.jamMulai), bawah: "mulai", persen: 0 };
  if (ev.status === "selesai") return { atas: "Selesai", bawah: `pukul ${jamPendek(ev.jamSelesai)}`, persen: 100 };
  return { atas: "Batal", bawah: "event dibatalkan", persen: 0 };
}

// ============================================================
// KARTU ANGKA
// ============================================================

export function KartuAngka({
  i,
  icon: Icon,
  warna,
  judul,
  nilai,
  dari,
  rupiah = false,
  keterangan,
}: {
  i: number;
  icon: LucideIcon;
  warna: string;
  judul: string;
  nilai: number;
  dari?: number;
  rupiah?: boolean;
  keterangan: string;
}) {
  const persen = dari ? persenAman(nilai, dari) : null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: EASE, delay: 0.08 + i * 0.06 }}
      whileHover={{ y: -3 }}
      className="adm-kartu group overflow-hidden p-lg"
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -top-14 -right-14 h-36 w-36 rounded-full opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100"
        style={{ background: `${warna}26` }}
      />
      <div className="relative flex items-start justify-between gap-sm">
        <div className="min-w-0">
          <p className="text-label-md text-on-surface-variant">{judul}</p>
          <p className="mt-2 text-[34px] leading-none font-semibold tracking-tight text-on-surface tabular-nums">
            <NumberFlow
              value={nilai}
              locales="id-ID"
              format={
                rupiah
                  ? { style: "currency", currency: "IDR", maximumFractionDigits: 0, notation: nilai >= 10_000_000 ? "compact" : "standard" }
                  : undefined
              }
            />
            {dari !== undefined && dari > 0 && (
              <span className="ml-1 text-[18px] font-medium text-on-surface-variant">/ {dari.toLocaleString("id-ID")}</span>
            )}
          </p>
        </div>
        {persen !== null ? (
          <Cincin persen={persen} warna={warna} />
        ) : (
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl" style={{ background: `${warna}1f`, color: warna }}>
            <Icon className="h-5 w-5" />
          </span>
        )}
      </div>
      <p className="relative mt-md text-body-sm text-on-surface-variant">{keterangan}</p>
    </motion.div>
  );
}

export function Cincin({ persen, warna }: { persen: number; warna: string }) {
  const R = 20;
  const K = 2 * Math.PI * R;
  return (
    <span className="relative grid h-14 w-14 shrink-0 place-items-center">
      <svg viewBox="0 0 48 48" className="absolute inset-0 -rotate-90" aria-hidden="true">
        <circle cx="24" cy="24" r={R} fill="none" strokeWidth="5" className="stroke-surface-container-high" />
        <motion.circle
          cx="24"
          cy="24"
          r={R}
          fill="none"
          strokeWidth="5"
          strokeLinecap="round"
          stroke={warna}
          strokeDasharray={K}
          initial={{ strokeDashoffset: K }}
          animate={{ strokeDashoffset: K * (1 - persen / 100) }}
          transition={{ duration: 1, ease: EASE }}
        />
      </svg>
      <span className="text-[11px] font-bold tabular-nums text-on-surface">{persen}%</span>
    </span>
  );
}

// ============================================================
// ALUR PEDAGANG: ikut event -> check-in -> check-out
// ============================================================

export function AlurPedagang({
  klaim,
  checkIn,
  checkOut,
  adaEvent,
}: {
  klaim: number;
  checkIn: number;
  checkOut: number;
  adaEvent: boolean;
}) {
  const dasar = Math.max(klaim, checkIn, 1);
  const langkah = [
    { label: "Ikut event", sub: "pedagang terdaftar", nilai: klaim, warna: "#2f6fed", icon: ClipboardList },
    {
      label: "Check-in",
      sub: klaim ? `${persenAman(checkIn, Math.max(klaim, checkIn))}% dari yang terdaftar` : "dipindai petugas",
      nilai: checkIn,
      warna: "#16a06c",
      icon: QrCode,
    },
    { label: "Check-out", sub: checkIn ? `${persenAman(checkOut, checkIn)}% dari yang hadir` : "lapor omset", nilai: checkOut, warna: "#f59e0b", icon: LogOut },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE, delay: 0.3 }}
      className="adm-kartu p-lg"
    >
      <JudulKartu icon={Users} judul="Alur pedagang di event ini" keterangan={adaEvent ? "Dari daftar sampai pulang" : "Belum ada event hari ini"} />
      <div className="grid grid-cols-1 gap-md md:grid-cols-3">
        {langkah.map((l, i) => {
          const Icon = l.icon;
          return (
            <div key={l.label} className="relative">
              {i > 0 && (
                <ChevronRight aria-hidden="true" className="absolute top-1/2 -left-[18px] hidden h-5 w-5 -translate-y-1/2 text-outline md:block" />
              )}
              <div className="rounded-2xl bg-surface-container-low p-md">
                <div className="flex items-center gap-sm">
                  <span className="grid h-9 w-9 place-items-center rounded-xl text-white" style={{ background: l.warna }}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-label-md font-semibold text-on-surface">
                      <span className="mr-1 font-mono text-[11px] text-on-surface-variant">{i + 1}.</span>
                      {l.label}
                    </p>
                    <p className="truncate text-label-sm text-on-surface-variant">{l.sub}</p>
                  </div>
                  <span className="text-[26px] font-semibold tabular-nums text-on-surface">
                    <NumberFlow value={l.nilai} locales="id-ID" />
                  </span>
                </div>
                <div className="mt-md h-2 overflow-hidden rounded-full bg-surface-container-high">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: l.warna }}
                    initial={{ width: 0 }}
                    animate={{ width: `${(l.nilai / dasar) * 100}%` }}
                    transition={{ duration: 0.9, ease: EASE, delay: 0.35 + i * 0.12 }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
