"use client";

import { useState, useEffect, useCallback } from "react";
import { PublicNavbar } from "@/components/public-navbar";
import { PublicFooter } from "@/components/public-footer";
import {
  MapPinned,
  Clock4,
  ClipboardCheck,
  History,
  Store,
  ChevronDown,
  RefreshCw,
  MapPin,
  Circle,
} from "lucide-react";

/* =========================================================
   DATA
========================================================= */

const features = [
  {
    icon: MapPinned,
    title: "Titik Lapak di Peta",
    desc: "Lihat titik lapak Anda di peta, lengkap dengan status ketersediaan lapak sekitar secara langsung.",
  },
  {
    icon: Clock4,
    title: "Jam Operasional",
    desc: "Cek jadwal buka-tutup CFD tiap minggu dari HP, biar gak kepagian atau malah kesorean datang.",
  },
  {
    icon: ClipboardCheck,
    title: "Verifikasi UMKM",
    desc: "Ajukan dan pantau status verifikasi usaha Anda langsung dari HP, tanpa perlu bolak-balik ke posko.",
  },
  {
    icon: History,
    title: "Riwayat & Status Lapak",
    desc: "Lihat riwayat check-in dan status pendaftaran Anda kapan saja, gak perlu nanya-nanya ke petugas.",
  },
];

const steps = [
  { n: "01", title: "Daftar akun", desc: "Buat akun dan isi data usaha Anda langsung dari halaman ini." },
  { n: "02", title: "Pilih lokasi", desc: "Pilih cakupan Se-Surabaya atau kecamatan tertentu -- sistem yang mengacak lapaknya." },
  { n: "03", title: "Dapat nomor stan", desc: "Nomor stan langsung terbit beserta kode QR verifikasi." },
  { n: "04", title: "Check-in di lokasi", desc: "Tunjukkan QR ke petugas di lapangan untuk mulai berjualan." },
];

/* =========================================================
   SISA LAPAK REAL-TIME
========================================================= */

interface JalanSisa {
  id: string;
  kode_jalan: string;
  nama: string;
  kuota: number;
  terisi: number;
}

interface KecamatanSisa {
  kecamatanId: string | null;
  kecamatan: string;
  jalan: JalanSisa[];
}

function jumlahSisa(jalan: JalanSisa[]) {
  return jalan.reduce((total, j) => total + Math.max(j.kuota - j.terisi, 0), 0);
}

function jumlahKuota(jalan: JalanSisa[]) {
  return jalan.reduce((total, j) => total + j.kuota, 0);
}

function SisaLapakRealtime() {
  const [data, setData] = useState<KecamatanSisa[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [reloadSignal, setReloadSignal] = useState(0);

  const requestReload = useCallback(() => {
    setLoading(true);
    setReloadSignal((n) => n + 1);
  }, []);

  useEffect(() => {
    let ignore = false;

    async function fetchData() {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/public/sisa-lapak`);
        if (!res.ok) throw new Error("Gagal memuat data sisa lapak");
        const json = await res.json();
        if (ignore) return;
        setData(Array.isArray(json) ? json : []);
        setError(null);
        setLastUpdated(new Date());
      } catch {
        if (ignore) return;
        setError("Gagal memuat data sisa lapak. Coba muat ulang.");
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    fetchData();
    const interval = setInterval(fetchData, 30_000);
    return () => {
      ignore = true;
      clearInterval(interval);
    };
  }, [reloadSignal]);

  const totalSisa = data.reduce((total, k) => total + jumlahSisa(k.jalan), 0);
  const totalKuota = data.reduce((total, k) => total + jumlahKuota(k.jalan), 0);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          <p className="font-mono text-xs font-medium uppercase tracking-wider text-blue">Data langsung</p>
          <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-ink-strong sm:text-[2.5rem]">
            Sisa lapak se-Surabaya, hari ini
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-ink-soft">
            Diperbarui otomatis tiap 30 detik. Klik nama kecamatan untuk melihat rincian tiap jalan.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {!loading && !error && (
            <div className="rounded-2xl border border-line bg-white px-5 py-3 text-right">
              <p className="font-display text-2xl font-semibold text-ink-strong">
                {totalSisa}
                <span className="text-sm font-normal text-ink-soft"> / {totalKuota}</span>
              </p>
              <p className="text-xs text-ink-soft">lapak tersisa</p>
            </div>
          )}
          <button
            type="button"
            onClick={requestReload}
            aria-label="Muat ulang data"
            className="focus-ring flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-line bg-white text-ink-soft transition-colors hover:text-ink-strong"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} strokeWidth={2} />
          </button>
        </div>
      </div>

      {lastUpdated && !loading && (
        <p className="mt-2 text-xs text-ink-soft">
          Terakhir diperbarui {lastUpdated.toLocaleTimeString("id-ID")} WIB
        </p>
      )}

      <div className="mt-8">
        {loading && data.length === 0 && (
          <div className="rounded-2xl border border-line bg-white p-8 text-center text-sm text-ink-soft">
            Memuat data sisa lapak...
          </div>
        )}

        {!loading && error && data.length === 0 && (
          <div className="rounded-2xl border border-line bg-white p-8 text-center text-sm text-ink-soft">
            {error}
          </div>
        )}

        {!loading && !error && data.length === 0 && (
          <div className="rounded-2xl border border-line bg-white p-8 text-center text-sm text-ink-soft">
            Belum ada sesi CFD yang dibuka hari ini.
          </div>
        )}

        {data.length > 0 && (
          <div className="divide-y divide-line rounded-2xl border border-line bg-white">
            {data.map((kec) => {
              const key = kec.kecamatanId ?? kec.kecamatan;
              const isOpen = expanded === key;
              const sisa = jumlahSisa(kec.jalan);
              const kuota = jumlahKuota(kec.jalan);
              const penuh = sisa <= 0;
              return (
                <div key={key}>
                  <button
                    type="button"
                    onClick={() => setExpanded(isOpen ? null : key)}
                    className="focus-ring flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-mist"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue/10">
                        <MapPin className="h-4 w-4 text-blue" strokeWidth={2.2} />
                      </span>
                      <div>
                        <p className="font-display text-[15px] font-semibold text-ink-strong">{kec.kecamatan}</p>
                        <p className="text-xs text-ink-soft">{kec.jalan.length} jalan terdaftar</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className={`rounded-full px-3 py-1 font-mono text-xs font-medium ${
                          penuh ? "bg-[#fdecec] text-[#ba1a1a]" : "bg-leaf/10 text-leaf"
                        }`}
                      >
                        {penuh ? "Penuh" : `Sisa ${sisa} / ${kuota}`}
                      </span>
                      <ChevronDown
                        className={`h-4 w-4 text-ink-soft transition-transform ${isOpen ? "rotate-180" : ""}`}
                        strokeWidth={2}
                      />
                    </div>
                  </button>

                  {isOpen && (
                    <div className="border-t border-line bg-mist/50 px-5 py-4">
                      {kec.jalan.length === 0 ? (
                        <p className="text-sm text-ink-soft">Belum ada jalan terdaftar di kecamatan ini.</p>
                      ) : (
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                          {kec.jalan.map((j) => {
                            const jSisa = Math.max(j.kuota - j.terisi, 0);
                            const jPenuh = jSisa <= 0;
                            return (
                              <div
                                key={j.id}
                                className="flex items-center justify-between rounded-xl border border-line bg-white px-3.5 py-2.5"
                              >
                                <span className="text-[13px] text-ink-strong">{j.nama}</span>
                                <span
                                  className={`rounded-full px-2.5 py-1 font-mono text-[11px] font-medium ${
                                    jPenuh ? "bg-[#fdecec] text-[#ba1a1a]" : "bg-leaf/10 text-leaf"
                                  }`}
                                >
                                  {jPenuh ? "Penuh" : `Sisa ${jSisa}/${j.kuota}`}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* =========================================================
   HERO -- pola WBS Surabaya: gambar background full-bleed,
   judul + deskripsi singkat, SATU tombol bulat besar.

   GANTI GAMBAR: taruh file kamu di web/public/images/hero-cfd.jpg
   (ganti file itu langsung, nama & lokasinya udah dikunci di
   className bawah -- gak perlu ubah kode apa pun buat ganti foto).
   Selama file itu belum ada, gradient biru di bawah ini yang
   tampil sebagai fallback, jadi hero-nya gak pernah blank/rusak.
========================================================= */

function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Background: foto + overlay gradient biar teks tetap kebaca */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage:
            "linear-gradient(180deg, rgba(15,23,42,0.55) 0%, rgba(15,23,42,0.72) 55%, rgba(15,23,42,0.88) 100%), url('/images/hero-cfd.jpg')",
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-ink-strong/20 via-transparent to-transparent" />

      <div className="relative mx-auto flex min-h-[640px] max-w-4xl flex-col items-center justify-center px-6 py-24 text-center sm:min-h-[720px] lg:px-8">
        <h1 className="font-display text-[2.75rem] font-semibold leading-[1.05] tracking-tight text-white sm:text-[3.6rem]">
          E-Event Surabaya
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-[16px] leading-relaxed text-white/85 sm:text-[17px]">
          Portal resmi pendaftaran pedagang Car Free Day se-Surabaya. Daftar, isi data usaha, dan
          dapatkan nomor stan langsung dari HP -- tanpa antre ke posko.
        </p>

        <a
          href="/daftar-lapak"
          className="focus-ring group relative mt-12 flex h-40 w-40 items-center justify-center rounded-full bg-white text-blue shadow-[0_25px_60px_-15px_rgba(0,0,0,0.5)] transition-transform hover:scale-[1.04] sm:h-48 sm:w-48"
        >
          <span className="absolute -inset-3 rounded-full border border-white/40 animate-[ping_2.4s_ease-in-out_infinite]" />
          <span className="flex flex-col items-center gap-2">
            <Store className="h-9 w-9" strokeWidth={1.8} />
            <span className="font-display text-[15px] font-semibold leading-tight sm:text-base">
              Daftar &amp;
              <br />
              Dapat Nomor Stan
            </span>
          </span>
        </a>
      </div>
    </section>
  );
}

/* =========================================================
   PAGE
========================================================= */

export default function Home() {
  return (
    <>
      <style>{`
        @keyframes ping {
          75%, 100% { transform: scale(1.15); opacity: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .animate-\\[ping_2\\.4s_ease-in-out_infinite\\] { animation: none; }
        }
      `}</style>

      <PublicNavbar />

      <Hero />

      {/* ---------- SISA LAPAK REAL-TIME ---------- */}
      <section id="sisa-lapak" className="border-t border-line bg-paper py-24 sm:py-32">
        <div className="mx-auto max-w-5xl px-6 lg:px-8">
          <SisaLapakRealtime />
        </div>
      </section>

      {/* ---------- FEATURES ---------- */}
      <section id="fitur" className="border-t border-line bg-white py-24 sm:py-32">
        <div className="mx-auto max-w-5xl px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="font-mono text-xs font-medium uppercase tracking-wider text-blue">Buat pedagang</p>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-ink-strong sm:text-[2.5rem]">
              Semua yang Anda butuhkan buat jualan di CFD
            </h2>
          </div>
          <div className="mt-14 divide-y divide-line border-y border-line">
            {features.map((f, i) => {
              const FIcon = f.icon;
              return (
                <div key={f.title} className="grid gap-4 py-7 sm:grid-cols-[3rem_1fr_2fr] sm:items-start sm:gap-8">
                  <span className="font-mono text-sm text-ink-soft">{String(i + 1).padStart(2, "0")}</span>
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue/10">
                      <FIcon className="h-4 w-4 text-blue" strokeWidth={2.2} />
                    </span>
                    <h3 className="font-display text-base font-semibold text-ink-strong">{f.title}</h3>
                  </div>
                  <p className="text-sm leading-relaxed text-ink-soft">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ---------- HOW IT WORKS ---------- */}
      <section id="alur" className="border-t border-line bg-paper py-24 sm:py-32">
        <div className="mx-auto max-w-6xl px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="font-mono text-xs font-medium uppercase tracking-wider text-blue">Alur pendaftaran pedagang</p>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-ink-strong sm:text-[2.5rem]">
              Empat tahap, dari pendaftaran hingga berjualan
            </h2>
          </div>

          <div className="relative mt-16">
            <div className="absolute left-0 right-0 top-[7px] hidden h-px bg-line lg:block" />
            <div className="grid gap-10 lg:grid-cols-4 lg:gap-8">
              {steps.map((s) => (
                <div key={s.n} className="relative">
                  <div className="relative z-10 flex items-center gap-3 lg:block">
                    <span className="flex h-4 w-4 items-center justify-center rounded-full border-2 border-blue bg-paper">
                      <Circle className="h-1.5 w-1.5 fill-blue text-blue" />
                    </span>
                    <p className="font-mono text-xs text-ink-soft lg:mt-4">{s.n}</p>
                  </div>
                  <h3 className="mt-2 font-display text-lg font-semibold text-ink-strong lg:mt-3">{s.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-soft">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
      <PublicFooter />
    </>
  );
}