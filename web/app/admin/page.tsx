"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  AlurPedagang,
  BannerEvent,
  EASE,
  JudulKartu,
  Kartu,
  KartuAngka,
  Kosong,
  isiCincin,
  jamPendek,
} from "@/components/admin/dashboard-ui";
import {
  Area,
  AreaChart,
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ClipboardList,
  Loader2,
  MapPin,
  ShieldAlert,
  Store,
  UserCheck,
  Users,
  Wallet,
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
    // Semua event hari ini (satu hari boleh banyak event). sesi/lapak/hadir
    // di atas adalah ringkasan gabungannya.
    events?: EventHariIni[];
  };
  tren: {
    sesi: { sesiId: string; tanggal: string; namaSesi: string; klaim: number; hadir: number; omset: number }[];
    minggu: { mingguMulai: string; baru: number; lama: number; total: number }[];
  };
};

type EventHariIni = {
  id: string;
  nama: string;
  status: StatusSesi;
  jamMulai: string;
  jamSelesai: string;
  sisaMenit: number;
  titik: number;
  kapasitas: number;
  klaim: number;
  checkIn: number;
  checkOut: number;
  omset: number;
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
  if (n > 0 && n < 1) return "<1%";
  return `${n.toLocaleString("id-ID", { maximumFractionDigits: 1 })}%`;
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
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-xl pb-xl">
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
          <BagianHariIni
            data={data.hariIni}
            diperbarui={diperbarui}
            refreshing={refreshing}
            onRefresh={() => load(true)}
          />

          <Seksi
            label="01"
            judul="Tren kegiatan"
            deskripsi={`${data.tren.sesi.length} event terakhir dan pendaftaran pedagang ${data.tren.minggu.length} minggu terakhir.`}
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

function Seksi({
  label,
  judul,
  deskripsi,
  children,
}: {
  label: string;
  judul: string;
  deskripsi?: string;
  children: React.ReactNode;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5, ease: EASE }}
      className="flex flex-col gap-md"
    >
      <div>
        <div className="flex items-center gap-sm">
          <span className="rounded-md bg-primary/10 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-primary">{label}</span>
          <h3 className="adm-display text-[24px] leading-tight font-semibold text-on-surface">{judul}</h3>
        </div>
        {deskripsi && <p className="mt-1 text-body-sm text-on-surface-variant">{deskripsi}</p>}
      </div>
      {children}
    </motion.section>
  );
}

function SkeletonDashboard() {
  return (
    <div className="flex flex-col gap-lg" aria-busy="true">
      <div className="h-[260px] animate-pulse rounded-3xl bg-surface-container-high" />
      <div className="grid grid-cols-1 gap-md sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-[150px] animate-pulse rounded-2xl bg-surface-container-high" />
        ))}
      </div>
      <div className="h-[280px] animate-pulse rounded-2xl bg-surface-container-high" />
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

// Event yang dipilih otomatis (atau saat event pilihan admin sudah tidak
// ada): berjalan > terjadwal paling awal > selesai paling akhir > dibatalkan.
function pilihEventUtama(events: EventHariIni[]): EventHariIni | null {
  const urutan: StatusSesi[] = ["berjalan", "terjadwal", "selesai", "dibatalkan"];
  for (const st of urutan) {
    const cocok = events.filter((e) => e.status === st);
    if (cocok.length === 0) continue;
    return st === "selesai" || st === "dibatalkan" ? cocok[cocok.length - 1] : cocok[0];
  }
  return null;
}

// Kondisi hari ini SELALU per satu event. Satu hari boleh punya beberapa
// event (bahkan berjalan bersamaan), jadi status & sisa waktu, lapak terisi,
// dan pedagang hadir diambil dari event yang dipilih admin -- tidak lagi
// digabung dari semua event (ringkasan gabungan sesi/lapak/hadir dari
// backend sengaja tidak dipakai di sini).
function BagianHariIni({
  data,
  diperbarui,
  refreshing,
  onRefresh,
}: {
  data: DashboardData["hariIni"];
  diperbarui: Date | null;
  refreshing: boolean;
  onRefresh: () => void;
}) {
  const events = data.events ?? [];
  // null = ikut pilihan otomatis; tetap dipertahankan walau data di-refresh.
  const [pilihanId, setPilihanId] = useState<string | null>(null);
  const ev = events.find((e) => e.id === pilihanId) ?? pilihEventUtama(events);

  const lapak = ev ? { terisi: ev.klaim, kapasitas: ev.kapasitas } : { terisi: 0, kapasitas: 0 };
  const hadir = ev ? { klaim: ev.klaim, checkIn: ev.checkIn, checkOut: ev.checkOut } : { klaim: 0, checkIn: 0, checkOut: 0 };
  // Klaim bisa berubah jadi "batal" kalau sesi sempat ditutup, sementara
  // pedagangnya sudah check-in -- penyebut minimal = jumlah check-in supaya
  // tidak tampil "1 / 0".
  const penyebutHadir = Math.max(hadir.klaim, hadir.checkIn);
  const belumCheckout = Math.max(0, hadir.checkIn - hadir.checkOut);

  return (
    <section className="flex flex-col gap-md">
      <BannerEvent
        label="Pusat kendali CFD"
        tanggal={formatTanggal(data.tanggal, { weekday: "long", ...TANGGAL_LENGKAP })}
        diperbarui={diperbarui}
        refreshing={refreshing}
        onRefresh={onRefresh}
        judul={ev ? ev.nama : "Belum ada event hari ini"}
        status={ev ? ev.status : "belum_ada"}
        jam={ev ? `${jamPendek(ev.jamMulai)} – ${jamPendek(ev.jamSelesai)} WIB` : null}
        info={ev ? { icon: MapPin, teks: `${ev.titik} titik lokasi` } : null}
        cincin={isiCincin(ev)}
        events={events.map((e) => ({
          id: e.id,
          nama: e.nama,
          status: e.status,
          keterangan: `${jamPendek(e.jamMulai)}–${jamPendek(e.jamSelesai)} · ${e.checkIn}/${e.klaim} hadir`,
        }))}
        pilihanId={ev?.id ?? null}
        onPilih={setPilihanId}
      />

      {/* ---------- Angka utama ---------- */}
      <div className="grid grid-cols-1 gap-md sm:grid-cols-2 xl:grid-cols-4">
        <KartuAngka
          i={0}
          icon={Store}
          warna="#2f6fed"
          judul="Lapak terisi"
          nilai={lapak.terisi}
          dari={lapak.kapasitas}
          keterangan={lapak.kapasitas ? `${Math.max(0, lapak.kapasitas - lapak.terisi)} lapak masih kosong` : "Belum ada lapak di event ini"}
        />
        <KartuAngka
          i={1}
          icon={Users}
          warna="#16a06c"
          judul="Pedagang hadir"
          nilai={hadir.checkIn}
          dari={penyebutHadir}
          keterangan={penyebutHadir === 0 ? (ev ? "Belum ada pedagang yang ikut" : "Belum ada event") : `dari ${penyebutHadir} pedagang terdaftar`}
        />
        <KartuAngka
          i={2}
          icon={UserCheck}
          warna="#f59e0b"
          judul="Masih di lapak"
          nilai={belumCheckout}
          keterangan={`${hadir.checkOut} pedagang sudah check-out`}
        />
        <KartuAngka i={3} icon={Wallet} warna="#8b5cf6" judul="Omset dilaporkan" nilai={ev?.omset ?? 0} rupiah keterangan="Diisi pedagang saat check-out" />
      </div>

      <AlurPedagang klaim={hadir.klaim} checkIn={hadir.checkIn} checkOut={hadir.checkOut} adaEvent={!!ev} />
    </section>
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
          <h4 className="text-title-md text-on-surface">Kehadiran per Event</h4>
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
        <Kosong teks="Belum ada event yang tercatat." />
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
              aria-label="Pilih event. Gunakan panah kiri dan kanan."
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
        <span className="text-on-surface-variant">Omset event ini</span>
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
      <span className="block text-label-sm text-on-surface-variant" title="Dibanding event sebelumnya">
        {ringkas ? "= event lalu" : "sama dengan event lalu"}
      </span>
    );
  }
  const naik = bulat > 0;
  return (
    <span
      className={`block text-label-sm font-semibold ${naik ? "text-secondary" : "text-error"}`}
      title={`${naik ? "Naik" : "Turun"} ${Math.abs(bulat).toLocaleString("id-ID")}${satuan} dibanding event sebelumnya`}
    >
      {naik ? "▲" : "▼"} {Math.abs(bulat).toLocaleString("id-ID")}
      {satuan}
      {!ringkas && <span className="font-normal text-on-surface-variant"> vs event lalu</span>}
    </span>
  );
}


function TooltipKotak({ judul, baris }: { judul: string; baris: { label: string; nilai: string; warna: string }[] }) {
  return (
    <div className="rounded-xl border border-outline-variant bg-surface-container-lowest px-3 py-2 text-[12px] shadow-[0_12px_32px_-12px_rgb(11_28_48/0.35)]">
      <p className="mb-1 font-semibold text-on-surface">{judul}</p>
      {baris.map((b) => (
        <p key={b.label} className="flex items-center gap-2 text-on-surface-variant">
          <span className="h-2 w-2 rounded-full" style={{ background: b.warna }} />
          {b.label}: <b className="text-on-surface tabular-nums">{b.nilai}</b>
        </p>
      ))}
    </div>
  );
}

type SesiTren = DashboardData["tren"]["sesi"][number];

function GrafikOmset({ sesi }: { sesi: DashboardData["tren"]["sesi"] }) {
  const total = sesi.reduce((n, s) => n + s.omset, 0);
  const rata = sesi.length ? total / sesi.length : 0;
  const data = sesi.map((s) => ({ ...s, label: formatTanggal(s.tanggal) }));

  return (
    <Kartu>
      <JudulKartu icon={Wallet} judul="Omset per event" keterangan={sesi.length ? `Total ${formatRupiah(total)}` : undefined} />
      {sesi.length === 0 ? (
        <Kosong teks="Belum ada event yang tercatat." />
      ) : (
        <>
          <p className="mb-sm text-label-sm text-on-surface-variant">
            Dari omset yang diisi pedagang saat check-out · rata-rata {formatRupiahRingkas(Math.round(rata))} per event
          </p>
          <div className="h-[230px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 10, right: 8, left: -8, bottom: 0 }}>
                <defs>
                  <linearGradient id="adm-omset" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="var(--color-outline-variant)" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "var(--color-on-surface-variant)" }} />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  width={52}
                  tick={{ fontSize: 11, fill: "var(--color-on-surface-variant)" }}
                  tickFormatter={(v: number) => formatRupiahRingkas(v)}
                />
                <ReferenceLine y={rata} stroke="#c2410c" strokeDasharray="5 5" strokeOpacity={0.5} />
                <Tooltip
                  cursor={{ stroke: "var(--color-outline-variant)" }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const s = payload[0].payload as SesiTren;
                    return (
                      <TooltipKotak
                        judul={`${s.namaSesi} · ${formatTanggal(s.tanggal)}`}
                        baris={[{ label: "Omset", nilai: formatRupiah(s.omset), warna: "#f59e0b" }]}
                      />
                    );
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="omset"
                  stroke="#f59e0b"
                  strokeWidth={2.5}
                  fill="url(#adm-omset)"
                  dot={{ r: 3.5, fill: "#fff", stroke: "#f59e0b", strokeWidth: 2 }}
                  activeDot={{ r: 6 }}
                  animationDuration={900}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </Kartu>
  );
}

function GrafikPertumbuhan({ minggu }: { minggu: DashboardData["tren"]["minggu"] }) {
  const totalSekarang = minggu.length ? minggu[minggu.length - 1].total : 0;
  const tambahan = minggu.reduce((n, m) => n + m.baru + m.lama, 0);
  const data = minggu.map((m) => ({ ...m, label: formatTanggal(m.mingguMulai) }));

  return (
    <Kartu>
      <JudulKartu
        icon={ClipboardList}
        judul="Pedagang terdaftar per minggu"
        keterangan={`${totalSekarang} pedagang · +${tambahan} dalam ${minggu.length} minggu`}
      />
      <div className="mb-sm flex flex-wrap gap-md text-label-sm text-on-surface-variant">
        <Legenda warna="bg-[#16a06c]" label="Baru (daftar sendiri)" />
        <Legenda warna="bg-[#9db4ff]" label="Lama (ditambahkan admin)" />
        <span className="inline-flex items-center gap-xs">
          <span className="w-4 border-t-2 border-[#2f6fed]" />
          Total terdaftar
        </span>
      </div>
      {minggu.length === 0 ? (
        <Kosong teks="Belum ada data pendaftaran." />
      ) : (
        <div className="h-[230px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 10, right: 0, left: -18, bottom: 0 }}>
              <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="var(--color-outline-variant)" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "var(--color-on-surface-variant)" }} />
              <YAxis yAxisId="baru" allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "var(--color-on-surface-variant)" }} />
              <YAxis yAxisId="total" orientation="right" hide />
              <Tooltip
                cursor={{ fill: "var(--color-surface-container-low)" }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const m = payload[0].payload as DashboardData["tren"]["minggu"][number];
                  return (
                    <TooltipKotak
                      judul={`Minggu mulai ${formatTanggal(m.mingguMulai)}`}
                      baris={[
                        { label: "Baru", nilai: String(m.baru), warna: "#16a06c" },
                        { label: "Lama", nilai: String(m.lama), warna: "#9db4ff" },
                        { label: "Total terdaftar", nilai: String(m.total), warna: "#2f6fed" },
                      ]}
                    />
                  );
                }}
              />
              <Bar yAxisId="baru" dataKey="baru" stackId="a" fill="#16a06c" maxBarSize={36} animationDuration={800} />
              <Bar yAxisId="baru" dataKey="lama" stackId="a" fill="#9db4ff" radius={[6, 6, 0, 0]} maxBarSize={36} animationDuration={800} />
              <Line yAxisId="total" type="monotone" dataKey="total" stroke="#2f6fed" strokeWidth={2.5} dot={false} animationDuration={1000} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
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

