"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  CalendarClock,
  CircleCheck,
  ClipboardList,
  Clock,
  Loader2,
  RefreshCw,
  ShieldAlert,
  Store,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";

// ============================================================
// TYPES -- sama persis dengan entity backend
// (backend/modules/admin/dashboard/entity/dashboard.go)
// ============================================================

type StatusSesi = "belum_ada" | "terjadwal" | "berjalan" | "selesai" | "dibatalkan";

type DashboardData = {
  hariIni: {
    tanggal: string;
    sesi: {
      status: StatusSesi;
      namaSesi: string | null;
      jamMulai: string | null;
      jamSelesai: string | null;
      sisaMenit: number;
    };
    lapak: { terisi: number; kapasitas: number; persen: number };
    hadir: { klaim: number; checkIn: number; checkOut: number };
  };
  tren: {
    sesi: { sesiId: string; tanggal: string; namaSesi: string; klaim: number; hadir: number; omset: number }[];
    minggu: { mingguMulai: string; baru: number; lama: number; total: number }[];
  };
};

// ============================================================
// API HELPER
// ============================================================

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function apiFetch<T>(path: string): Promise<T> {
  const token = localStorage.getItem("cfd_token");
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? ""}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401) throw new ApiError("Sesi login sudah habis, silakan login ulang.", 401);
    throw new ApiError((data as { error?: string }).error || `Permintaan gagal (status ${res.status})`, res.status);
  }
  return data as T;
}

// ============================================================
// FORMAT & LABEL
// ============================================================

const TANGGAL_LENGKAP: Intl.DateTimeFormatOptions = { day: "numeric", month: "long", year: "numeric" };

function formatTanggal(value: string, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" }) {
  if (!value) return "-";
  const d = new Date(`${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("id-ID", opts);
}

function formatRupiah(n: number) {
  return `Rp ${n.toLocaleString("id-ID")}`;
}

// Versi ringkas buat label grafik: 1.250.000 -> "1,3 jt"
function formatRupiahRingkas(n: number) {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} M`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} jt`;
  if (n >= 1_000) return `${(n / 1_000).toLocaleString("id-ID", { maximumFractionDigits: 0 })} rb`;
  return n.toLocaleString("id-ID");
}

function formatPersen(n: number) {
  return `${n.toLocaleString("id-ID", { maximumFractionDigits: 1 })}%`;
}

function formatSisaWaktu(menit: number) {
  const j = Math.floor(menit / 60);
  const m = menit % 60;
  if (j === 0) return `${m} menit lagi`;
  return m === 0 ? `${j} jam lagi` : `${j} jam ${m} menit lagi`;
}

function persenAman(bagian: number, total: number) {
  if (total <= 0) return 0;
  return Math.min(100, Math.round((bagian / total) * 100));
}

// ============================================================
// PAGE
// ============================================================

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [diperbarui, setDiperbarui] = useState<Date | null>(null);

  const load = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    try {
      const res = await apiFetch<DashboardData>("/api/admin/dashboard");
      setData(res);
      setError(null);
      setDiperbarui(new Date());
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        setForbidden(true);
      } else {
        // Data lama tetap ditampilkan kalau refresh gagal -- cuma banner
        // kecil yang muncul, halaman gak diganti layar error.
        setError(err instanceof Error ? err.message : "Gagal memuat dashboard.");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    // Angka "hari ini" berubah terus selama CFD berjalan -- refresh tiap menit.
    const interval = setInterval(() => load(), 60_000);
    return () => clearInterval(interval);
  }, [load]);

  if (forbidden) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-sm rounded-2xl border border-outline-variant bg-surface-container-lowest p-xl text-center">
        <ShieldAlert className="h-10 w-10 text-error" strokeWidth={2} />
        <h2 className="text-headline-md text-on-surface">Akses Ditolak</h2>
        <p className="text-body-sm text-on-surface-variant">Akun kamu tidak memiliki akses ke halaman Super Admin.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-xl pb-xl">
      {/* Heading */}
      <div className="flex flex-wrap items-end justify-between gap-md">
        <div>
          <h2 className="text-headline-lg text-on-surface">Dashboard Super Admin</h2>
          <p className="mt-xs text-body-md text-on-surface-variant">
            {data
              ? formatTanggal(data.hariIni.tanggal, { weekday: "long", ...TANGGAL_LENGKAP })
              : "Ringkasan kegiatan CFD"}
          </p>
        </div>
        <div className="flex items-center gap-sm">
          {diperbarui && (
            <span className="text-label-sm text-on-surface-variant">
              Diperbarui {diperbarui.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
          <button
            type="button"
            onClick={() => load(true)}
            disabled={refreshing || loading}
            className="pt-btn pt-btn-secondary"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            Muat ulang
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-start justify-between gap-md rounded-xl border border-error-container bg-error-container/30 px-md py-sm text-body-sm text-on-error-container">
          <span>{data ? `Gagal memperbarui data: ${error}` : error}</span>
          {!data && (
            <button type="button" onClick={() => load(true)} className="shrink-0 font-semibold underline">
              Coba lagi
            </button>
          )}
        </div>
      )}

      {loading && !data ? (
        <SkeletonDashboard />
      ) : data ? (
        <>
          <Seksi judul="Hari Ini">
            <BagianHariIni data={data.hariIni} />
          </Seksi>

          <Seksi
            judul="Tren Kegiatan"
            deskripsi={`${data.tren.sesi.length} sesi CFD terakhir dan pendaftaran pedagang ${data.tren.minggu.length} minggu terakhir.`}
          >
            <GrafikKehadiran sesi={data.tren.sesi} />
            <div className="grid grid-cols-1 gap-md xl:grid-cols-2">
              <GrafikOmset sesi={data.tren.sesi} />
              <GrafikPertumbuhan minggu={data.tren.minggu} />
            </div>
          </Seksi>

        </>
      ) : null}

    </div>
  );
}

// ============================================================
// KERANGKA
// ============================================================

function Seksi({ judul, deskripsi, children }: { judul: string; deskripsi?: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-md">
      <div>
        <h3 className="pt-section-title">{judul}</h3>
        {deskripsi && <p className="pt-section-desc">{deskripsi}</p>}
      </div>
      {children}
    </section>
  );
}

function Kartu({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl border border-outline-variant bg-surface-container-lowest p-lg shadow-[0_1px_3px_rgba(11,28,48,0.05)] ${className}`}
    >
      {children}
    </div>
  );
}

function JudulKartu({ icon: Icon, judul, keterangan }: { icon?: LucideIcon; judul: string; keterangan?: string }) {
  return (
    <div className="mb-md flex flex-wrap items-start justify-between gap-x-sm gap-y-xs">
      <div className="flex items-center gap-sm">
        {Icon && <Icon className="h-4 w-4 text-primary" strokeWidth={2.2} />}
        <h4 className="text-title-md text-on-surface">{judul}</h4>
      </div>
      {keterangan && <span className="text-label-sm text-on-surface-variant">{keterangan}</span>}
    </div>
  );
}

function Kosong({ teks }: { teks: string }) {
  return (
    <div className="flex min-h-[120px] items-center justify-center rounded-xl bg-surface-container-low px-md text-center text-body-sm text-on-surface-variant">
      {teks}
    </div>
  );
}

function SkeletonDashboard() {
  return (
    <div className="flex flex-col gap-lg" aria-busy="true">
      <div className="grid grid-cols-1 gap-md lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-[168px] animate-pulse rounded-2xl bg-surface-container-high" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-md xl:grid-cols-2">
        <div className="h-[280px] animate-pulse rounded-2xl bg-surface-container-high" />
        <div className="h-[280px] animate-pulse rounded-2xl bg-surface-container-high" />
      </div>
      <div className="flex items-center justify-center gap-sm text-on-surface-variant">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-body-sm">Memuat dashboard...</span>
      </div>
    </div>
  );
}

// ============================================================
// 1. KONDISI HARI INI
// ============================================================

const TAMPILAN_SESI: Record<StatusSesi, { label: string; kartu: string; ikon: LucideIcon; ikonWarna: string }> = {
  berjalan: {
    label: "Sedang berjalan",
    kartu: "border-transparent bg-primary text-on-primary",
    ikon: Clock,
    ikonWarna: "bg-white/15 text-on-primary",
  },
  terjadwal: {
    label: "Terjadwal hari ini",
    kartu: "border-outline-variant bg-surface-container-lowest text-on-surface",
    ikon: CalendarClock,
    ikonWarna: "bg-tertiary-fixed text-on-tertiary-fixed",
  },
  selesai: {
    label: "Sudah selesai",
    kartu: "border-outline-variant bg-surface-container-lowest text-on-surface",
    ikon: CircleCheck,
    ikonWarna: "bg-secondary-container text-on-secondary-container",
  },
  belum_ada: {
    label: "Belum dibuka",
    kartu: "border-outline-variant bg-surface-container-lowest text-on-surface",
    ikon: CalendarClock,
    ikonWarna: "bg-surface-container-high text-on-surface-variant",
  },
  dibatalkan: {
    label: "Dibatalkan",
    kartu: "border-error-container bg-error-container/30 text-on-surface",
    ikon: AlertTriangle,
    ikonWarna: "bg-error-container text-on-error-container",
  },
};

function BagianHariIni({ data }: { data: DashboardData["hariIni"] }) {
  const { sesi, lapak, hadir } = data;
  const tampilan = TAMPILAN_SESI[sesi.status] ?? TAMPILAN_SESI.belum_ada;
  const IkonSesi = tampilan.ikon;
  const gelap = sesi.status === "berjalan";

  return (
    <div className="grid grid-cols-1 gap-md lg:grid-cols-3">
      {/* Status sesi */}
      <div
        className={`flex flex-col justify-between gap-md rounded-2xl border p-lg shadow-[0_1px_3px_rgba(11,28,48,0.05)] ${tampilan.kartu}`}
      >
        <div className="flex items-start gap-md">
          <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${tampilan.ikonWarna}`}>
            <IkonSesi className="h-5 w-5" strokeWidth={2} />
          </span>
          <div className="min-w-0">
            <p className={`text-label-md ${gelap ? "text-on-primary/80" : "text-on-surface-variant"}`}>Sesi CFD</p>
            <p className="mt-1 text-headline-md">{tampilan.label}</p>
            {sesi.namaSesi && (
              <p className={`mt-1 truncate text-body-sm ${gelap ? "text-on-primary/80" : "text-on-surface-variant"}`}>
                {sesi.namaSesi}
              </p>
            )}
          </div>
        </div>
        <p className={`text-body-sm ${gelap ? "text-on-primary/90" : "text-on-surface-variant"}`}>
          {sesi.jamMulai
            ? `Pukul ${sesi.jamMulai} – ${sesi.jamSelesai ?? "selesai"}${
                sesi.status === "berjalan" ? ` · berakhir ${formatSisaWaktu(sesi.sisaMenit)}` : ""
              }`
            : ""}
        </p>
      </div>

      {/* Lapak terisi */}
      <Kartu className="flex flex-col justify-between gap-md">
        <div className="flex items-start justify-between gap-sm">
          <div>
            <p className="text-label-md text-on-surface-variant">Lapak Terisi</p>
            <p className="mt-1 text-display-lg leading-none tabular-nums text-on-surface">{formatPersen(lapak.persen)}</p>
          </div>
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary-fixed text-on-primary-fixed">
            <Store className="h-5 w-5" strokeWidth={2} />
          </span>
        </div>
        <div>
          <BatangProgres persen={lapak.persen} />
          <p className="mt-sm text-body-sm text-on-surface-variant">
            <span className="font-semibold tabular-nums text-on-surface">{lapak.terisi}</span> dari{" "}
            <span className="tabular-nums">{lapak.kapasitas}</span> lapak ·{" "}
            <span className="tabular-nums">{Math.max(0, lapak.kapasitas - lapak.terisi)}</span> tersisa
          </p>
        </div>
      </Kartu>

      {/* Pedagang hadir */}
      <Kartu className="flex flex-col justify-between gap-md">
        <div className="flex items-start justify-between gap-sm">
          <div>
            <p className="text-label-md text-on-surface-variant">Pedagang Hadir</p>
            <p className="mt-1 text-display-lg leading-none tabular-nums text-on-surface">
              {hadir.checkIn}
              <span className="text-headline-md text-on-surface-variant"> / {hadir.klaim}</span>
            </p>
          </div>
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-secondary-container text-on-secondary-container">
            <Users className="h-5 w-5" strokeWidth={2} />
          </span>
        </div>
        <div>
          <BatangProgres persen={persenAman(hadir.checkIn, hadir.klaim)} warna="bg-secondary" />
          <p className="mt-sm text-body-sm text-on-surface-variant">
            {hadir.klaim === 0
              ? "Belum ada pedagang yang klaim lapak hari ini."
              : `${hadir.checkIn} check-in dari ${hadir.klaim} yang klaim · ${hadir.checkOut} sudah check-out`}
          </p>
        </div>
      </Kartu>
    </div>
  );
}

function BatangProgres({ persen, warna = "bg-primary" }: { persen: number; warna?: string }) {
  return (
    <div
      className="h-2 overflow-hidden rounded-full bg-surface-container-high"
      role="progressbar"
      aria-valuenow={Math.round(persen)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={`h-full rounded-full ${warna} transition-[width] duration-700`}
        style={{ width: `${Math.min(100, persen)}%` }}
      />
    </div>
  );
}

// ============================================================
// 2. TREN
// ============================================================

type ModeKehadiran = "jumlah" | "persen";

// Grafik kehadiran interaktif:
// - arahkan kursor / tap / pakai tombol panah ← → buat pilih sesi,
//   detailnya muncul di panel samping (dibanding sesi sebelumnya);
// - mode "Jumlah" (klaim vs hadir) atau "Persen hadir";
// - klik legenda buat sembunyikan/tampilkan seri;
// - garis putus-putus = rata-rata kehadiran semua sesi yang tampil.
function GrafikKehadiran({ sesi }: { sesi: DashboardData["tren"]["sesi"] }) {
  const [mode, setMode] = useState<ModeKehadiran>("jumlah");
  const [tampilKlaim, setTampilKlaim] = useState(true);
  const [tampilHadir, setTampilHadir] = useState(true);
  // null = ikut sesi terbaru (jadi tetap benar walau data di-refresh)
  const [pilihan, setPilihan] = useState<number | null>(null);

  const aktif = pilihan !== null && pilihan < sesi.length ? pilihan : sesi.length - 1;
  const persenHadir = (s: { klaim: number; hadir: number }) => (s.klaim > 0 ? (s.hadir / s.klaim) * 100 : 0);

  const maksJumlah = Math.max(
    1,
    ...sesi.map((s) => Math.max(tampilKlaim ? s.klaim : 0, tampilHadir ? s.hadir : 0))
  );
  const rataRata =
    sesi.length === 0
      ? 0
      : mode === "persen"
        ? sesi.reduce((n, s) => n + persenHadir(s), 0) / sesi.length
        : sesi.reduce((n, s) => n + s.hadir, 0) / sesi.length;
  const skala = mode === "persen" ? 100 : maksJumlah;
  const posisiRata = (rataRata / skala) * 85; // 85% = tinggi maksimum batang

  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      setPilihan(Math.min(sesi.length - 1, aktif + 1));
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      setPilihan(Math.max(0, aktif - 1));
    }
  }

  const s = sesi[aktif];
  const sebelumnya = aktif > 0 ? sesi[aktif - 1] : null;

  return (
    <Kartu>
      <div className="mb-md flex flex-wrap items-start justify-between gap-sm">
        <div className="flex items-center gap-sm">
          <Users className="h-4 w-4 text-primary" strokeWidth={2.2} />
          <h4 className="text-title-md text-on-surface">Kehadiran per Sesi</h4>
        </div>
        {sesi.length > 0 && (
          <div className="inline-flex rounded-full bg-surface-container-high p-0.5" role="group" aria-label="Tampilan grafik">
            {(
              [
                ["jumlah", "Jumlah"],
                ["persen", "Persen hadir"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setMode(key)}
                aria-pressed={mode === key}
                className={`min-h-[32px] rounded-full px-md text-label-md transition-colors ${
                  mode === key
                    ? "bg-surface-container-lowest text-on-surface shadow-sm"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      {sesi.length === 0 ? (
        <Kosong teks="Belum ada sesi CFD yang tercatat." />
      ) : (
        <div className="grid grid-cols-1 gap-lg lg:grid-cols-[minmax(0,1fr)_260px]">
          {/* ---------- Grafik ---------- */}
          <div className="min-w-0">
            <style>{`@keyframes kehadiran-tumbuh { from { transform: scaleY(0); } to { transform: scaleY(1); } }`}</style>

            <div className="mb-sm flex flex-wrap items-center gap-sm text-label-sm">
              {mode === "jumlah" ? (
                <>
                  <LegendaToggle
                    aktif={tampilKlaim}
                    warna="bg-primary-fixed-dim"
                    label="Klaim lapak"
                    onClick={() => (tampilKlaim && !tampilHadir ? null : setTampilKlaim((v) => !v))}
                  />
                  <LegendaToggle
                    aktif={tampilHadir}
                    warna="bg-primary"
                    label="Hadir (check-in)"
                    onClick={() => (tampilHadir && !tampilKlaim ? null : setTampilHadir((v) => !v))}
                  />
                </>
              ) : (
                <>
                  <Legenda warna="bg-primary" label="Di atas rata-rata" />
                  <Legenda warna="bg-sun" label="Di bawah rata-rata" />
                </>
              )}
              <span className="ml-auto inline-flex items-center gap-xs text-on-surface-variant">
                <span className="w-4 border-t-2 border-dashed border-tertiary" />
                Rata-rata{" "}
                {mode === "persen"
                  ? formatPersen(rataRata)
                  : `${rataRata.toLocaleString("id-ID", { maximumFractionDigits: 1 })} hadir`}
              </span>
            </div>

            <div
              className="relative flex h-[220px] items-end gap-xs border-b border-outline-variant outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              tabIndex={0}
              role="listbox"
              aria-label="Pilih sesi. Gunakan panah kiri dan kanan."
              aria-activedescendant={`sesi-kehadiran-${aktif}`}
              onKeyDown={onKeyDown}
            >
              {/* garis rata-rata */}
              <div
                className="pointer-events-none absolute inset-x-0 z-10 border-t-2 border-dashed border-tertiary/70 transition-[bottom] duration-500"
                style={{ bottom: `${posisiRata}%` }}
                aria-hidden="true"
              />

              {sesi.map((item, i) => {
                const dipilih = i === aktif;
                const persen = persenHadir(item);
                return (
                  <button
                    key={item.sesiId}
                    id={`sesi-kehadiran-${i}`}
                    type="button"
                    role="option"
                    aria-selected={dipilih}
                    tabIndex={-1}
                    onMouseEnter={() => setPilihan(i)}
                    onFocus={() => setPilihan(i)}
                    onClick={() => setPilihan(i)}
                    aria-label={`${item.namaSesi}, ${formatTanggal(item.tanggal, TANGGAL_LENGKAP)}: ${item.hadir} hadir dari ${item.klaim} klaim`}
                    className={`group relative flex h-full min-w-0 flex-1 items-end justify-center gap-[3px] rounded-t-lg px-[2px] transition-colors ${
                      dipilih ? "bg-primary-fixed/40" : "hover:bg-surface-container-low"
                    }`}
                  >
                    {mode === "jumlah" ? (
                      <>
                        {tampilKlaim && (
                          <BatangInteraktif
                            nilai={item.klaim}
                            tinggi={(item.klaim / maksJumlah) * 85}
                            warna="bg-primary-fixed-dim"
                            redup={!dipilih}
                            tampilNilai={dipilih}
                            urutan={i}
                          />
                        )}
                        {tampilHadir && (
                          <BatangInteraktif
                            nilai={item.hadir}
                            tinggi={(item.hadir / maksJumlah) * 85}
                            warna="bg-primary"
                            redup={!dipilih}
                            tampilNilai={dipilih}
                            urutan={i}
                          />
                        )}
                      </>
                    ) : (
                      <BatangInteraktif
                        nilai={item.klaim > 0 ? formatPersen(persen) : "-"}
                        tinggi={(persen / 100) * 85}
                        warna={persen >= rataRata ? "bg-primary" : "bg-sun"}
                        redup={!dipilih}
                        tampilNilai={dipilih}
                        urutan={i}
                        lebar="max-w-[28px]"
                      />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="flex gap-xs pt-sm">
              {sesi.map((item, i) => (
                <span
                  key={item.sesiId}
                  className={`min-w-0 flex-1 truncate text-center text-label-sm transition-colors ${
                    i === aktif ? "font-semibold text-on-surface" : "text-on-surface-variant"
                  }`}
                >
                  <span className="sm:hidden">{formatTanggal(item.tanggal, { day: "numeric", month: "numeric" })}</span>
                  <span className="hidden sm:inline">{formatTanggal(item.tanggal)}</span>
                </span>
              ))}
            </div>
          </div>

          {/* ---------- Panel detail sesi terpilih ---------- */}
          <PanelSesi sesi={s} sebelumnya={sebelumnya} persenHadir={persenHadir} />
        </div>
      )}
    </Kartu>
  );
}

function BatangInteraktif({
  nilai,
  tinggi,
  warna,
  redup,
  tampilNilai,
  urutan,
  lebar = "max-w-[20px]",
}: {
  nilai: number | string;
  tinggi: number;
  warna: string;
  redup: boolean;
  tampilNilai: boolean;
  urutan: number;
  lebar?: string;
}) {
  const kosong = nilai === 0 || tinggi <= 0;
  return (
    <span className={`flex h-full w-full ${lebar} flex-col items-center justify-end`}>
      <span
        className={`mb-1 whitespace-nowrap text-label-sm font-semibold tabular-nums transition-opacity duration-200 ${
          tampilNilai ? "text-on-surface opacity-100" : "opacity-0 group-hover:opacity-70"
        }`}
      >
        {nilai}
      </span>
      <span
        className={`block w-full origin-bottom rounded-t-md ${warna} transition-[height,opacity] duration-500 [animation:kehadiran-tumbuh_650ms_cubic-bezier(0.22,1,0.36,1)_both] motion-reduce:[animation:none] ${
          redup ? "opacity-45" : "opacity-100"
        }`}
        style={{
          height: kosong ? "2px" : `${Math.max(3, tinggi)}%`,
          // delay bertahap biar batang "tumbuh" berurutan dari kiri ke kanan
          animationDelay: `${urutan * 60}ms`,
        }}
      />
    </span>
  );
}

function LegendaToggle({
  aktif,
  warna,
  label,
  onClick,
}: {
  aktif: boolean;
  warna: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={aktif}
      title={aktif ? `Sembunyikan ${label}` : `Tampilkan ${label}`}
      className={`inline-flex min-h-[32px] items-center gap-xs rounded-full border px-sm transition-colors ${
        aktif
          ? "border-outline-variant text-on-surface hover:bg-surface-container-low"
          : "border-dashed border-outline-variant text-on-surface-variant/60 line-through"
      }`}
    >
      <span className={`h-2.5 w-2.5 rounded-sm ${warna} ${aktif ? "" : "opacity-30"}`} />
      {label}
    </button>
  );
}

function PanelSesi({
  sesi,
  sebelumnya,
  persenHadir,
}: {
  sesi: DashboardData["tren"]["sesi"][number];
  sebelumnya: DashboardData["tren"]["sesi"][number] | null;
  persenHadir: (s: { klaim: number; hadir: number }) => number;
}) {
  const persen = persenHadir(sesi);
  const tidakHadir = Math.max(0, sesi.klaim - sesi.hadir);
  const selisihHadir = sebelumnya ? sesi.hadir - sebelumnya.hadir : null;
  const selisihPersen = sebelumnya && sebelumnya.klaim > 0 && sesi.klaim > 0 ? persen - persenHadir(sebelumnya) : null;

  // Cincin persen hadir -- keliling lingkaran r=42 ≈ 263,9
  const KELILING = 2 * Math.PI * 42;

  return (
    <div
      className="flex flex-col gap-md rounded-xl bg-surface-container-low p-md"
      aria-live="polite"
    >
      <div>
        <p className="text-label-sm text-on-surface-variant">
          {formatTanggal(sesi.tanggal, { weekday: "long", ...TANGGAL_LENGKAP })}
        </p>
        <p className="mt-0.5 truncate text-title-md text-on-surface" title={sesi.namaSesi}>
          {sesi.namaSesi}
        </p>
      </div>

      <div className="flex items-center gap-md">
        <svg viewBox="0 0 100 100" className="h-[88px] w-[88px] shrink-0 -rotate-90" aria-hidden="true">
          <circle cx="50" cy="50" r="42" fill="none" strokeWidth="10" className="stroke-surface-container-high" />
          <circle
            cx="50"
            cy="50"
            r="42"
            fill="none"
            strokeWidth="10"
            strokeLinecap="round"
            className="stroke-primary transition-[stroke-dashoffset] duration-500"
            strokeDasharray={KELILING}
            strokeDashoffset={KELILING * (1 - Math.min(100, persen) / 100)}
          />
        </svg>
        <div>
          <p className="text-headline-md tabular-nums text-on-surface">
            {sesi.klaim > 0 ? formatPersen(persen) : "-"}
          </p>
          <p className="text-label-sm text-on-surface-variant">pedagang hadir</p>
          {selisihPersen !== null && <Selisih nilai={selisihPersen} satuan="%" />}
        </div>
      </div>

      <dl className="grid grid-cols-3 gap-sm text-center">
        <AngkaMini label="Klaim" nilai={sesi.klaim} />
        <AngkaMini
          label="Hadir"
          nilai={sesi.hadir}
          tambahan={selisihHadir !== null ? <Selisih nilai={selisihHadir} ringkas /> : null}
        />
        <AngkaMini label="Absen" nilai={tidakHadir} />
      </dl>

      <div className="flex items-center justify-between gap-sm border-t border-outline-variant pt-sm text-body-sm">
        <span className="text-on-surface-variant">Omset sesi ini</span>
        <span className="font-semibold tabular-nums text-on-surface">{formatRupiah(sesi.omset)}</span>
      </div>
    </div>
  );
}

function AngkaMini({ label, nilai, tambahan }: { label: string; nilai: number; tambahan?: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-surface-container-lowest px-xs py-sm">
      <dt className="text-label-sm text-on-surface-variant">{label}</dt>
      <dd className="text-title-lg tabular-nums text-on-surface">{nilai}</dd>
      {tambahan}
    </div>
  );
}

// Selisih dibanding sesi sebelumnya: ▲ hijau kalau naik, ▼ merah kalau turun.
// ringkas = cuma panah + angka (buat kotak kecil), keterangannya lewat title.
function Selisih({ nilai, satuan = "", ringkas = false }: { nilai: number; satuan?: string; ringkas?: boolean }) {
  const bulat = satuan === "%" ? Math.round(nilai * 10) / 10 : Math.round(nilai);
  if (bulat === 0) {
    return (
      <span className="block text-label-sm text-on-surface-variant" title="Dibanding sesi sebelumnya">
        {ringkas ? "= sesi lalu" : "sama dengan sesi lalu"}
      </span>
    );
  }
  const naik = bulat > 0;
  return (
    <span
      className={`block text-label-sm font-semibold ${naik ? "text-secondary" : "text-error"}`}
      title={`${naik ? "Naik" : "Turun"} ${Math.abs(bulat).toLocaleString("id-ID")}${satuan} dibanding sesi sebelumnya`}
    >
      {naik ? "▲" : "▼"} {Math.abs(bulat).toLocaleString("id-ID")}
      {satuan}
      {!ringkas && <span className="font-normal text-on-surface-variant"> vs sesi lalu</span>}
    </span>
  );
}

function GrafikOmset({ sesi }: { sesi: DashboardData["tren"]["sesi"] }) {
  const total = sesi.reduce((n, s) => n + s.omset, 0);
  const maks = Math.max(1, ...sesi.map((s) => s.omset));
  // viewBox 100 x 100; garis digambar di area y 18..95 supaya label nilai
  // di atas titik tertinggi gak kepotong.
  const titik = sesi.map((s, i) => {
    const x = sesi.length === 1 ? 50 : 4 + (i / (sesi.length - 1)) * 92;
    const y = 95 - (s.omset / maks) * 77;
    return { x, y, s };
  });
  const garis = titik.map((t) => `${t.x},${t.y}`).join(" ");
  const area = titik.length > 1 ? `${titik[0].x},100 ${garis} ${titik[titik.length - 1].x},100` : "";

  return (
    <Kartu>
      <JudulKartu icon={Wallet} judul="Omset per Sesi" keterangan={sesi.length ? `Total ${formatRupiah(total)}` : undefined} />
      {sesi.length === 0 ? (
        <Kosong teks="Belum ada sesi CFD yang tercatat." />
      ) : (
        <>
          <div className="mb-sm text-label-sm text-on-surface-variant">Dari omset yang diisi pedagang saat check-out</div>
          <div className="relative h-[200px] border-b border-outline-variant">
            <svg
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              className="absolute inset-0 h-full w-full overflow-visible"
              aria-hidden="true"
            >
              {area && <polygon points={area} className="fill-tertiary-fixed/50" />}
              {titik.length > 1 && (
                <polyline
                  points={garis}
                  fill="none"
                  className="stroke-tertiary"
                  strokeWidth={2.5}
                  vectorEffect="non-scaling-stroke"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              )}
            </svg>
            {/* Titik & nilai pakai HTML biar bentuknya gak ikut gepeng mengikuti SVG */}
            {titik.map((t) => (
              <div
                key={t.s.sesiId}
                className="absolute flex flex-col items-center"
                style={{ left: `${t.x}%`, top: `${t.y}%`, transform: "translate(-50%, calc(-100% + 5px))" }}
                title={`${t.s.namaSesi} (${formatTanggal(t.s.tanggal)}): ${formatRupiah(t.s.omset)}`}
              >
                <span className="mb-1 whitespace-nowrap text-label-sm tabular-nums text-on-surface-variant">
                  {formatRupiahRingkas(t.s.omset)}
                </span>
                <span className="h-2.5 w-2.5 rounded-full border-2 border-surface-container-lowest bg-tertiary" />
              </div>
            ))}
          </div>
          <LabelSumbuX items={sesi.map((s) => formatTanggal(s.tanggal))} />
        </>
      )}
    </Kartu>
  );
}

function GrafikPertumbuhan({ minggu }: { minggu: DashboardData["tren"]["minggu"] }) {
  const maks = Math.max(1, ...minggu.map((m) => m.baru + m.lama));
  const totalSekarang = minggu.length ? minggu[minggu.length - 1].total : 0;
  const tambahan = minggu.reduce((n, m) => n + m.baru + m.lama, 0);

  return (
    <Kartu>
      <JudulKartu
        icon={ClipboardList}
        judul="Pedagang Terdaftar per Minggu"
        keterangan={`${totalSekarang} pedagang terdaftar · +${tambahan} dalam ${minggu.length} minggu`}
      />
      <div className="mb-sm flex flex-wrap gap-md text-label-sm text-on-surface-variant">
        <Legenda warna="bg-secondary" label="Pedagang Baru (daftar sendiri)" />
        <Legenda warna="bg-primary-fixed-dim" label="Pedagang Lama (ditambahkan admin)" />
      </div>
      <div className="flex h-[160px] items-end gap-sm border-b border-outline-variant">
        {minggu.map((m) => {
          const jumlah = m.baru + m.lama;
          const tinggi = jumlah === 0 ? 0 : Math.max(4, (jumlah / maks) * 80);
          return (
            <div
              key={m.mingguMulai}
              className="flex h-full min-w-0 flex-1 flex-col items-center justify-end"
              title={`Minggu mulai ${formatTanggal(m.mingguMulai)}: ${m.baru} baru, ${m.lama} lama · total ${m.total}`}
            >
              <span className="mb-1 text-label-sm tabular-nums text-on-surface-variant">{jumlah > 0 ? `+${jumlah}` : ""}</span>
              <div className="flex w-full max-w-[40px] flex-col overflow-hidden rounded-t-md" style={{ height: `${tinggi}%` }}>
                <div className="bg-secondary" style={{ flexGrow: m.baru }} />
                <div className="bg-primary-fixed-dim" style={{ flexGrow: m.lama }} />
              </div>
            </div>
          );
        })}
      </div>
      <LabelSumbuX items={minggu.map((m) => formatTanggal(m.mingguMulai))} />
    </Kartu>
  );
}

function Legenda({ warna, label }: { warna: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-xs">
      <span className={`h-2.5 w-2.5 rounded-sm ${warna}`} />
      {label}
    </span>
  );
}

function LabelSumbuX({ items }: { items: string[] }) {
  return (
    <div className="flex gap-sm pt-sm">
      {items.map((label, i) => (
        <span key={`${label}-${i}`} className="min-w-0 flex-1 truncate text-center text-label-sm text-on-surface-variant">
          {label}
        </span>
      ))}
    </div>
  );
}