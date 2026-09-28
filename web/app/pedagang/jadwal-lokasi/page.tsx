"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import {
  AlertCircle,
  CalendarDays,
  CalendarX2,
  Check,
  Clock,
  IdCard,
  Loader2,
  MapPin,
  Navigation,
  QrCode,
  RefreshCw,
  Store,
  Wallet,
  type LucideIcon,
} from "lucide-react";

// ============================================================
// Jadwal & Lokasi pedagang -- semua data dari endpoint yang sudah ada:
//   /api/me                       status pedagang (sudah isi data usaha?)
//   /api/pedagang/lapak/status    lapak yang diklaim hari ini
//   /api/pedagang/check-in/status jam check-in
//   /api/pedagang/checkout        jam selesai sesi & status check-out
//
// QR check-in sengaja TIDAK ada di sini -- QR cuma ada di menu
// "Check in / Check Out" supaya pedagang gak bingung harus buka yang mana.
// ============================================================

type Lapak = {
  sudah_klaim: boolean;
  nomor_lapak?: string;
  nama_jalan?: string;
  nama_kecamatan?: string;
  nama_ruas?: string;
  claimed_at?: string;
};
type CheckIn = { sudah_check_in: boolean; check_in_at?: string };
type Checkout = {
  sudahCheckIn: boolean;
  sudahCheckOut: boolean;
  omset?: number | null;
  jamSelesaiSesi?: string;
  sesiSudahSelesai?: boolean;
};

type Data = {
  stage: string | null;
  lapak: Lapak | null;
  checkIn: CheckIn | null;
  checkout: Checkout | null;
};

async function ambil<T>(path: string): Promise<T> {
  const token = localStorage.getItem("cfd_token");
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? ""}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error || `status ${res.status}`);
  return data as T;
}

function jam(iso?: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

const PANDUAN = [
  {
    judul: "Datang ke lapakmu",
    isi: "Cari nomor lapak di jalan yang tertera di atas. Tata dagangan sebelum sesi CFD dimulai.",
  },
  {
    judul: "Minta petugas scan QR",
    isi: "Buka menu Check in / Check Out, lalu tunjukkan QR-mu ke petugas supaya kehadiranmu tercatat.",
  },
  {
    judul: "Isi omset sebelum pulang",
    isi: "Setelah sesi selesai, isi omset hari ini di menu Check in / Check Out. Kalau terlewat, kamu tidak bisa check-in di CFD berikutnya.",
  },
];

// ============================================================
// PAGE
// ============================================================

export default function JadwalLokasiPage() {
  const [data, setData] = useState<Data | null>(null);
  const [gagal, setGagal] = useState(false);

  const muat = useCallback(async () => {
    setGagal(false);
    const [me, lapak, checkIn, checkout] = await Promise.allSettled([
      ambil<{ user?: { pedagang_stage?: string } }>("/api/me"),
      ambil<Lapak>("/api/pedagang/lapak/status"),
      ambil<CheckIn>("/api/pedagang/check-in/status"),
      // 409 = belum ada sesi CFD hari ini -> wajar, dilewati
      ambil<Checkout>("/api/pedagang/checkout"),
    ]);
    if (me.status === "rejected" && lapak.status === "rejected") {
      setGagal(true);
      return;
    }
    setData({
      stage: me.status === "fulfilled" ? me.value.user?.pedagang_stage ?? null : null,
      lapak: lapak.status === "fulfilled" ? lapak.value : null,
      checkIn: checkIn.status === "fulfilled" ? checkIn.value : null,
      checkout: checkout.status === "fulfilled" ? checkout.value : null,
    });
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    muat();
  }, [muat]);

  if (gagal) {
    return (
      <Kosong
        ikon={AlertCircle}
        judul="Jadwal tidak bisa dimuat"
        isi="Periksa koneksi internet kamu, lalu coba lagi."
        aksi={
          <button type="button" onClick={muat} className="pt-btn pt-btn-primary">
            <RefreshCw className="h-4 w-4" />
            Coba lagi
          </button>
        }
      />
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center gap-sm text-on-surface-variant">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-body-md">Memuat jadwal...</span>
      </div>
    );
  }

  if (data.stage !== "verified") {
    return (
      <Kosong
        ikon={CalendarX2}
        judul="Jadwal belum tersedia"
        isi="Isi data usaha kamu terlebih dahulu untuk bisa klaim lapak dan melihat jadwal berjualan di CFD."
        aksi={
          <Link href="/pedagang/pendaftaran" className="pt-btn pt-btn-primary">
            <IdCard className="h-4 w-4" />
            Isi data usaha
          </Link>
        }
      />
    );
  }

  return <JadwalHariIni data={data} />;
}

// ============================================================
// JADWAL HARI INI
// ============================================================

function JadwalHariIni({ data }: { data: Data }) {
  const kurangiGerak = useReducedMotion();
  const { lapak, checkIn, checkout } = data;
  const sudahKlaim = Boolean(lapak?.sudah_klaim && lapak.nomor_lapak);
  const tanggal = new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  const jamSelesai = jam(checkout?.jamSelesaiSesi);
  const jamCheckIn = jam(checkIn?.check_in_at);
  const jamKlaim = jam(lapak?.claimed_at);
  const sudahCheckIn = Boolean(checkIn?.sudah_check_in || checkout?.sudahCheckIn);
  const sudahCheckOut = Boolean(checkout?.sudahCheckOut);

  const lokasiLengkap = [lapak?.nama_jalan, lapak?.nama_kecamatan && `Kec. ${lapak.nama_kecamatan}`, "Surabaya"]
    .filter(Boolean)
    .join(", ");
  const urlPeta = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(lokasiLengkap)}`;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-lg pb-xl">
      <div>
        <p className="flex items-center gap-xs text-label-md text-on-surface-variant">
          <CalendarDays className="h-4 w-4" />
          {tanggal}
        </p>
        <h1 className="mt-xs text-headline-lg text-on-surface">Jadwal &amp; lokasi berjualan</h1>
      </div>

      {!sudahKlaim ? (
        <Kosong
          ikon={Store}
          judul="Kamu belum punya lapak hari ini"
          isi="Klaim lapak dulu untuk mendapatkan nomor dan lokasi berjualan di CFD hari ini."
          aksi={
            <Link href="/pedagang/nomer-stand" className="pt-btn pt-btn-primary">
              Klaim lapak
            </Link>
          }
          rata={false}
        />
      ) : (
        <div className="grid grid-cols-1 gap-lg xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="flex min-w-0 flex-col gap-lg">
            {/* ---------- Lokasi (bagian utama) ---------- */}
            <motion.section
              initial={kurangiGerak ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="relative overflow-hidden rounded-3xl bg-primary text-on-primary shadow-[0_18px_40px_-18px_rgba(0,40,142,0.55)]"
            >
              <div className="relative flex flex-col gap-lg p-lg md:p-xl">
                <div className="flex flex-wrap items-center justify-between gap-sm">
                  <span className="inline-flex items-center gap-xs text-label-md text-on-primary/80">
                    <MapPin className="h-4 w-4" />
                    Lapakmu hari ini
                  </span>
                  {lapak?.nama_kecamatan && (
                    <span className="rounded-full bg-white/15 px-sm py-1 text-label-sm">Kec. {lapak.nama_kecamatan}</span>
                  )}
                </div>

                <div>
                  <p className="font-display text-[clamp(2.25rem,6vw,3.5rem)] font-bold leading-none tracking-tight">
                    {lapak?.nomor_lapak}
                  </p>
                  <p className="mt-sm text-title-lg text-on-primary/95">
                    {lapak?.nama_jalan}
                    {lapak?.nama_ruas && <span className="text-on-primary/75">, {lapak.nama_ruas}</span>}
                  </p>
                </div>

                {/* garis putus-putus = marka jalan CFD */}
                <div className="mt-sm flex flex-wrap items-center justify-between gap-md border-t-2 border-dashed border-white/25 pt-md">
                  <p className="text-body-sm text-on-primary/80">
                    {jamKlaim ? `Diklaim pukul ${jamKlaim}` : "Lapak sudah diklaim"}
                  </p>
                  <a
                    href={urlPeta}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex min-h-[44px] items-center gap-sm rounded-full bg-white px-lg text-label-md font-semibold text-primary transition-colors hover:bg-primary-fixed focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                  >
                    <Navigation className="h-4 w-4" />
                    Buka di Google Maps
                  </a>
                </div>
              </div>
            </motion.section>

            {/* ---------- Jadwal ---------- */}
            <section className="grid grid-cols-1 gap-md sm:grid-cols-3">
              <KotakInfo ikon={CalendarDays} label="Tanggal" nilai={new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long" })} />
              <KotakInfo ikon={Clock} label="Sesi selesai" nilai={jamSelesai ? `Pukul ${jamSelesai}` : "Menunggu petugas"} />
              <KotakInfo
                ikon={Wallet}
                label="Omset hari ini"
                nilai={sudahCheckOut && typeof checkout?.omset === "number" ? `Rp ${checkout.omset.toLocaleString("id-ID")}` : "Belum diisi"}
              />
            </section>

            {/* ---------- Langkah hari ini ---------- */}
            <section className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-lg">
              <div className="mb-md flex flex-wrap items-center justify-between gap-sm">
                <h2 className="text-title-md text-on-surface">Kehadiranmu hari ini</h2>
                <Link href="/pedagang/nomer-stand" className="inline-flex items-center gap-xs text-label-md text-primary hover:underline">
                  <QrCode className="h-4 w-4" />
                  Buka QR check-in
                </Link>
              </div>
              <ol className="grid grid-cols-1 gap-sm sm:grid-cols-3">
                <Langkah no={1} judul="Klaim lapak" keterangan={jamKlaim ? `Pukul ${jamKlaim}` : "Selesai"} selesai />
                <Langkah
                  no={2}
                  judul="Check-in"
                  keterangan={sudahCheckIn ? `Pukul ${jamCheckIn ?? "-"}` : "Minta petugas scan QR-mu"}
                  selesai={sudahCheckIn}
                  aktif={!sudahCheckIn}
                />
                <Langkah
                  no={3}
                  judul="Check-out"
                  keterangan={sudahCheckOut ? "Omset sudah tercatat" : checkout?.sesiSudahSelesai ? "Isi omset sekarang" : "Setelah sesi selesai"}
                  selesai={sudahCheckOut}
                  aktif={sudahCheckIn && !sudahCheckOut}
                />
              </ol>
              {sudahCheckIn && !sudahCheckOut && (
                <Link href="/pedagang/CekOut" className="pt-btn pt-btn-primary mt-md w-full justify-center sm:w-auto">
                  Isi omset &amp; check-out
                </Link>
              )}
            </section>
          </div>

          {/* ---------- Panduan ---------- */}
          <section className="self-start rounded-2xl border border-outline-variant bg-surface-container-lowest p-lg">
            <h2 className="text-title-md text-on-surface">Panduan berjualan</h2>
            <ol className="mt-md flex flex-col gap-md">
              {PANDUAN.map((p, i) => (
                <li key={p.judul} className="flex gap-sm">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-fixed text-label-md font-semibold text-on-primary-fixed">
                    {i + 1}
                  </span>
                  <div>
                    <p className="text-body-md font-semibold text-on-surface">{p.judul}</p>
                    <p className="mt-0.5 text-body-sm text-on-surface-variant">{p.isi}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </div>
      )}
    </div>
  );
}

function KotakInfo({ ikon: Ikon, label, nilai }: { ikon: LucideIcon; label: string; nilai: string }) {
  return (
    <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest px-md py-md">
      <p className="flex items-center gap-xs text-label-sm text-on-surface-variant">
        <Ikon className="h-4 w-4" />
        {label}
      </p>
      <p className="mt-xs text-title-md text-on-surface">{nilai}</p>
    </div>
  );
}

function Langkah({
  no,
  judul,
  keterangan,
  selesai = false,
  aktif = false,
}: {
  no: number;
  judul: string;
  keterangan: string;
  selesai?: boolean;
  aktif?: boolean;
}) {
  return (
    <li
      className={`flex items-start gap-sm rounded-xl p-md ${
        selesai ? "bg-secondary-container/40" : aktif ? "bg-primary-fixed/50 ring-1 ring-primary/30" : "bg-surface-container-low"
      }`}
      aria-current={aktif ? "step" : undefined}
    >
      <span
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-label-md font-semibold ${
          selesai ? "bg-secondary text-on-secondary" : aktif ? "bg-primary text-on-primary" : "bg-surface-container-high text-on-surface-variant"
        }`}
      >
        {selesai ? <Check className="h-4 w-4" strokeWidth={3} /> : no}
      </span>
      <div className="min-w-0">
        <p className="text-body-md font-semibold text-on-surface">{judul}</p>
        <p className="text-body-sm text-on-surface-variant">{keterangan}</p>
      </div>
    </li>
  );
}

function Kosong({
  ikon: Ikon,
  judul,
  isi,
  aksi,
  rata = true,
}: {
  ikon: LucideIcon;
  judul: string;
  isi: string;
  aksi?: React.ReactNode;
  rata?: boolean;
}) {
  return (
    <div className={`flex flex-col items-center justify-center text-center ${rata ? "min-h-[60vh]" : "rounded-2xl border border-outline-variant bg-surface-container-lowest px-lg py-xl"}`}>
      <span className="mb-md flex h-20 w-20 items-center justify-center rounded-2xl bg-surface-container-high text-on-surface-variant">
        <Ikon className="h-9 w-9" strokeWidth={1.75} />
      </span>
      <h2 className="text-headline-md text-on-surface">{judul}</h2>
      <p className="mb-lg mt-xs max-w-md text-body-md text-on-surface-variant">{isi}</p>
      {aksi}
    </div>
  );
}