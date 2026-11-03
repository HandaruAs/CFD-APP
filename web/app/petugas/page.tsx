// app/petugas/page.tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Clock, MapPin, Store, TrendingUp, UserCheck, Users, Wallet } from "lucide-react";
import {
  AlurPedagang,
  BannerEvent,
  JudulKartu,
  KartuAngka,
  isiCincin,
  jamPendek,
} from "@/components/admin/dashboard-ui";

// ===== TYPES =====
// Event hari ini dari GET /api/petugas/events/hari-ini. Satu hari boleh
// punya beberapa event (bahkan berjalan bersamaan), jadi SELURUH dashboard
// -- status & sisa waktu, kehadiran, kuota, omset, dan tabel pedagang --
// selalu menampilkan SATU event yang dipilih petugas lewat kartu pilihan
// event di banner. Data tidak lagi digabung dari beberapa event.
type EventHariIni = {
  id: string;
  nama: string;
  tanggal: string;
  jamMulai: string;
  jamSelesai: string;
  status: "terjadwal" | "berjalan" | "selesai" | "dibatalkan";
  sisaMenit: number;
  totalMenit: number;
  kuotaTotal: number;
  terisi: number;
  checkIn: number;
  checkOut: number;
};
// Event yang dipilih otomatis saat dashboard dibuka (atau saat event
// pilihan petugas sudah tidak ada): berjalan > terjadwal paling awal >
// selesai paling akhir > dibatalkan.
function pilihEventUtama(events: EventHariIni[]): EventHariIni | null {
  const urutan: EventHariIni["status"][] = ["berjalan", "terjadwal", "selesai", "dibatalkan"];
  for (const st of urutan) {
    const cocok = events.filter((e) => e.status === st);
    if (cocok.length === 0) continue;
    return st === "selesai" || st === "dibatalkan" ? cocok[cocok.length - 1] : cocok[0];
  }
  return null;
}

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
  const [events, setEvents] = useState<EventHariIni[]>([]);
  // Event yang dipilih petugas. null = ikut pilihan otomatis (pilihEventUtama).
  const [pilihanId, setPilihanId] = useState<string | null>(null);
  // Laporan disimpan bersama id event-nya, supaya saat ganti event data
  // lama tidak sempat tampil sebagai data event baru.
  const [laporan, setLaporan] = useState<{ eventId: string; data: LaporanResponse } | null>(null);
  const [laporanTick, setLaporanTick] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [sekarang, setSekarang] = useState(() => new Date());
  const [diperbarui, setDiperbarui] = useState<Date | null>(null);

  const load = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    try {
      const eventData = (await apiFetch("/api/petugas/events/hari-ini")) as { data: EventHariIni[] };
      setEvents(eventData.data ?? []);
      setLaporanTick((n) => n + 1); // laporan event terpilih ikut dimuat ulang
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
    // Data diperbarui otomatis tiap menit, jam & sisa waktu tiap 30 detik.
    const refresh = setInterval(() => load(), INTERVAL_REFRESH_MS);
    const jam = setInterval(() => setSekarang(new Date()), 30_000);
    return () => {
      clearInterval(refresh);
      clearInterval(jam);
    };
  }, [load]);

  const eventTerpilih = events.find((e) => e.id === pilihanId) ?? pilihEventUtama(events);
  const idTerpilih = eventTerpilih?.id ?? null;

  // Kehadiran, omset & tabel pedagang HANYA untuk event terpilih.
  useEffect(() => {
    if (!idTerpilih) return;
    let batal = false;
    apiFetch(`/api/petugas/laporan?eventId=${encodeURIComponent(idTerpilih)}&limit=100`)
      .then((data: LaporanResponse) => {
        if (!batal) setLaporan({ eventId: idTerpilih, data });
      })
      .catch((err) => {
        if (!batal) setLoadError(err instanceof Error ? err.message : "gagal memuat data kehadiran");
      });
    return () => {
      batal = true;
    };
  }, [idTerpilih, laporanTick]);

  const laporanEvent = laporan && laporan.eventId === idTerpilih ? laporan.data : null;
  // Skeleton saat data event terpilih belum datang (pertama buka / ganti event).
  const memuatLaporan = loading || (idTerpilih !== null && laporanEvent === null);

  const totalTerdaftar = laporanEvent?.totalTerdaftar ?? 0;
  const totalCheckin = laporanEvent?.totalCheckin ?? 0;
  const totalCheckout = laporanEvent?.totalCheckout ?? 0;
  const pedagangHariIni = laporanEvent?.data ?? [];
  const kuotaTotal = eventTerpilih?.kuotaTotal ?? 0;
  const kuotaTerisi = eventTerpilih?.terisi ?? 0;
  const penyebutHadir = Math.max(totalTerdaftar, totalCheckin);
  const masihDiLapak = Math.max(0, totalCheckin - totalCheckout);

  // Sisa waktu dihitung mundur di browser sejak data terakhir diambil,
  // supaya angkanya tetap jalan di antara refresh.
  const menitBerlalu = diperbarui ? Math.max(0, Math.floor((sekarang.getTime() - diperbarui.getTime()) / 60_000)) : 0;
  const cincin = isiCincin(
    eventTerpilih
      ? {
          status: eventTerpilih.status,
          jamMulai: eventTerpilih.jamMulai,
          jamSelesai: eventTerpilih.jamSelesai,
          sisaMenit: Math.max(0, eventTerpilih.sisaMenit - menitBerlalu),
          totalMenit: eventTerpilih.totalMenit || undefined,
        }
      : null,
  );

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-lg pb-xl">
      {loadError && (
        <div className="rounded-xl border border-error-container bg-error-container/30 px-md py-sm text-body-sm text-on-error-container">
          Gagal mengambil data terbaru: {loadError}
        </div>
      )}

      {/* ===== BANNER: EVENT TERPILIH ===== */}
      {loading ? (
        <div className="h-[260px] animate-pulse rounded-3xl bg-surface-container-high" />
      ) : (
        <BannerEvent
          label={`${sapaan(sekarang.getHours())}, Petugas`}
          tanggal={sekarang.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          diperbarui={diperbarui}
          refreshing={refreshing}
          onRefresh={() => load(true)}
          judul={eventTerpilih ? eventTerpilih.nama : "Belum ada event hari ini"}
          status={eventTerpilih ? eventTerpilih.status : "belum_ada"}
          jam={eventTerpilih ? `${jamPendek(eventTerpilih.jamMulai)} – ${jamPendek(eventTerpilih.jamSelesai)} WIB` : null}
          info={eventTerpilih ? { icon: Users, teks: `${eventTerpilih.checkIn} pedagang sudah check-in` } : null}
          cincin={cincin}
          events={events.map((e) => ({
            id: e.id,
            nama: e.nama,
            status: e.status,
            keterangan: `${jamPendek(e.jamMulai)}–${jamPendek(e.jamSelesai)} · ${e.checkIn} hadir`,
          }))}
          pilihanId={idTerpilih}
          onPilih={setPilihanId}
        />
      )}

      {/* ===== ANGKA UTAMA ===== */}
      {memuatLaporan ? (
        <div className="grid grid-cols-1 gap-md sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-[150px] animate-pulse rounded-2xl bg-surface-container-high" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-md sm:grid-cols-2 xl:grid-cols-4">
          <KartuAngka
            i={0}
            icon={Users}
            warna="#16a06c"
            judul="Pedagang hadir"
            nilai={totalCheckin}
            dari={penyebutHadir}
            keterangan={penyebutHadir === 0 ? (eventTerpilih ? "Belum ada pedagang yang ikut" : "Belum ada event") : `dari ${penyebutHadir} pedagang terdaftar`}
          />
          <KartuAngka
            i={1}
            icon={Store}
            warna="#2f6fed"
            judul="Kuota event ini"
            nilai={kuotaTerisi}
            dari={kuotaTotal}
            keterangan={eventTerpilih ? `Sisa ${Math.max(0, kuotaTotal - kuotaTerisi)} tempat` : "Belum ada event hari ini"}
          />
          <KartuAngka
            i={2}
            icon={UserCheck}
            warna="#f59e0b"
            judul="Masih di lapak"
            nilai={masihDiLapak}
            keterangan={`${totalCheckout} pedagang sudah check-out`}
          />
          <KartuAngka
            i={3}
            icon={Wallet}
            warna="#8b5cf6"
            judul="Omset event ini"
            nilai={laporanEvent?.totalOmset ?? 0}
            rupiah
            keterangan={
              laporanEvent && laporanEvent.totalOmset > 0
                ? `Rata-rata ${formatRupiah(Math.round(laporanEvent.rataOmset))} per pedagang`
                : "Diisi pedagang saat check-out"
            }
          />
        </div>
      )}

      {!memuatLaporan && (
        <AlurPedagang klaim={totalTerdaftar} checkIn={totalCheckin} checkOut={totalCheckout} adaEvent={!!eventTerpilih} />
      )}

      {/* ===== RANKING OMSET ===== */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: 0.35 }}
        className="adm-kartu p-lg"
      >
        <JudulKartu icon={TrendingUp} judul="Ranking omset pedagang" keterangan="Berdasarkan omset yang diisi saat check-out" />
        {memuatLaporan ? (
          <div className="h-40 animate-pulse rounded-xl bg-surface-container-high" />
        ) : (
          <OmsetChart data={pedagangHariIni} />
        )}
      </motion.div>

      {/* ===== PEDAGANG DI EVENT INI ===== */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: 0.42 }}
        className="adm-kartu overflow-hidden"
      >
        <div className="flex items-center gap-sm p-lg pb-md">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-primary">
            <Store className="h-4 w-4" strokeWidth={2.2} />
          </span>
          <h4 className="text-title-md text-on-surface">Pedagang di event ini</h4>
          <span className="ml-auto rounded-full bg-surface-container-high px-sm py-1 text-label-sm text-on-surface-variant">
            {pedagangHariIni.length} lapak terisi
          </span>
        </div>

        {memuatLaporan ? (
          <p className="px-lg py-xl text-center text-body-md text-on-surface-variant">Memuat data...</p>
        ) : pedagangHariIni.length === 0 ? (
          <div className="pt-empty mx-lg mb-lg">
            <span className="pt-empty-icon">
              <Store className="h-6 w-6" strokeWidth={1.75} />
            </span>
            <p className="text-body-sm text-on-surface-variant">
              {eventTerpilih ? "Belum ada pedagang yang check-in di event ini." : "Belum ada event hari ini."}
            </p>
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
    </div>
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