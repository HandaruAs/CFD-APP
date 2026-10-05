"use client";

import { useState, useEffect, useCallback } from "react";
import { PublicNavbar } from "@/components/public-navbar";
import { PublicFooter } from "@/components/public-footer";
import {
  CalendarCheck,
  QrCode,
  BadgeCheck,
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
    icon: CalendarCheck,
    title: "Daftar Event dari HP",
    desc: "Pilih event CFD yang pendaftarannya dibuka dan daftar langsung, tanpa antre ke posko.",
  },
  {
    icon: QrCode,
    title: "Nomor Stan & QR Otomatis",
    desc: "Nomor stan dan kode QR langsung terbit. Lokasi lapak diacak sistem, jadi adil untuk semua pedagang.",
  },
  {
    icon: History,
    title: "Riwayat",
    desc: "Lihat riwayat check-in dan status pendaftaran Anda kapan saja.",
  },
];

const steps = [
  { n: "01", title: "Daftar akun", desc: "Buat akun dan isi data usaha Anda langsung dari halaman ini." },
  { n: "02", title: "Pilih event", desc: "Pilih event CFD yang ingin diikuti -- lokasi lapak diacak otomatis oleh sistem." },
  { n: "03", title: "Dapat nomor stan", desc: "Nomor stan langsung terbit beserta kode QR untuk event tersebut." },
  { n: "04", title: "Check-in di lokasi", desc: "Tunjukkan QR ke petugas di lapangan untuk mulai berjualan." },
];

/* =========================================================
   SISA LAPAK REAL-TIME
========================================================= */

// Data dari GET /api/public/sisa-lapak: event hari ini s/d 14 hari ke
// depan (tanpa data pribadi). Kuota diatur per event; sisa = kuota - terdaftar.
interface LokasiEvent {
  kecamatan: string | null;
  namaJalan: string;
  jumlahRuas: number;
  kapasitas: number;
}

interface EventSisa {
  id: string;
  nama: string;
  tanggal: string;
  jamMulai: string;
  jamSelesai: string;
  status: "terjadwal" | "berjalan" | "selesai" | "dibatalkan";
  statusPendaftaran: "belum_dibuka" | "dibuka" | "ditutup";
  kuotaTotal: number;
  terisi: number;
  sisa: number;
  lokasi: LokasiEvent[];
}

function formatTanggalEvent(iso: string) {
  const d = new Date(`${iso.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  const hariIni = new Date();
  hariIni.setHours(0, 0, 0, 0);
  const selisih = Math.round((d.getTime() - hariIni.getTime()) / 86_400_000);
  const label = d.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long" });
  if (selisih === 0) return `Hari ini · ${label}`;
  if (selisih === 1) return `Besok · ${label}`;
  return label;
}

const LABEL_PENDAFTARAN: Record<EventSisa["statusPendaftaran"], string> = {
  belum_dibuka: "Pendaftaran belum dibuka",
  dibuka: "Pendaftaran dibuka",
  ditutup: "Pendaftaran ditutup",
};

function SisaLapakRealtime() {
  const [data, setData] = useState<EventSisa[]>([]);
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
        setData(Array.isArray(json?.data) ? json.data : []);
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

  // Angka besar di kanan atas: sisa tempat di event yang pendaftarannya dibuka.
  const eventDibuka = data.filter((e) => e.statusPendaftaran === "dibuka");
  const totalSisa = eventDibuka.reduce((total, e) => total + e.sisa, 0);
  const totalKuota = eventDibuka.reduce((total, e) => total + e.kuotaTotal, 0);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          <p className="font-mono text-xs font-medium uppercase tracking-wider text-blue">Data langsung</p>
          <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-ink-strong sm:text-[2.5rem]">
            Event CFD & sisa lapak
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-ink-soft">
            Event hari ini sampai 2 minggu ke depan. Diperbarui otomatis tiap 30 detik. Klik event untuk melihat
            lokasinya.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {!loading && !error && (
            <div className="rounded-2xl border border-line bg-white px-5 py-3 text-right">
              <p className="font-display text-2xl font-semibold text-ink-strong">
                {totalSisa}
                <span className="text-sm font-normal text-ink-soft"> / {totalKuota}</span>
              </p>
              <p className="text-xs text-ink-soft">lapak tersisa (pendaftaran dibuka)</p>
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
            Belum ada event CFD yang dijadwalkan dalam 2 minggu ke depan.
          </div>
        )}

        {data.length > 0 && (
          <div className="divide-y divide-line rounded-2xl border border-line bg-white">
            {data.map((ev) => {
              const isOpen = expanded === ev.id;
              const penuh = ev.sisa <= 0;
              const berjalan = ev.status === "berjalan";
              return (
                <div key={ev.id}>
                  <button
                    type="button"
                    onClick={() => setExpanded(isOpen ? null : ev.id)}
                    className="focus-ring flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-mist"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue/10">
                        <MapPin className="h-4 w-4 text-blue" strokeWidth={2.2} />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-display text-[15px] font-semibold text-ink-strong">{ev.nama}</p>
                        <p className="text-xs text-ink-soft">
                          {formatTanggalEvent(ev.tanggal)} · {ev.jamMulai.replace(":", ".")}–{ev.jamSelesai.replace(":", ".")} WIB
                        </p>
                        <p className="mt-0.5 flex items-center gap-1.5 text-xs text-ink-soft">
                          <Circle
                            className={`h-2 w-2 ${berjalan || ev.statusPendaftaran === "dibuka" ? "fill-leaf text-leaf" : "fill-ink-soft/40 text-ink-soft/40"}`}
                          />
                          {berjalan ? "Sedang berlangsung" : LABEL_PENDAFTARAN[ev.statusPendaftaran]}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span
                        className={`rounded-full px-3 py-1 font-mono text-xs font-medium ${
                          penuh ? "bg-[#fdecec] text-[#ba1a1a]" : "bg-leaf/10 text-leaf"
                        }`}
                      >
                        {penuh ? "Penuh" : `Sisa ${ev.sisa} / ${ev.kuotaTotal}`}
                      </span>
                      <ChevronDown
                        className={`h-4 w-4 text-ink-soft transition-transform ${isOpen ? "rotate-180" : ""}`}
                        strokeWidth={2}
                      />
                    </div>
                  </button>

                  {isOpen && (
                    <div className="border-t border-line bg-mist/50 px-5 py-4">
                      {ev.lokasi.length === 0 ? (
                        <p className="text-sm text-ink-soft">Lokasi event ini belum ditentukan.</p>
                      ) : (
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                          {ev.lokasi.map((l) => (
                            <div
                              key={`${l.kecamatan ?? "-"}-${l.namaJalan}`}
                              className="flex items-center justify-between rounded-xl border border-line bg-white px-3.5 py-2.5"
                            >
                              <span className="text-[13px] text-ink-strong">
                                {l.namaJalan}
                                {l.kecamatan && <span className="text-ink-soft"> · Kec. {l.kecamatan}</span>}
                              </span>
                              <span className="font-mono text-[11px] text-ink-soft">{l.jumlahRuas} ruas</span>
                            </div>
                          ))}
                        </div>
                      )}
                      <p className="mt-3 text-xs text-ink-soft">
                        Lokasi lapak dan nomor stan diacak otomatis oleh sistem saat pedagang ikut event.
                      </p>
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
            "url('/images/CFD_SURABAYA.jpg')",
        }}
      />
      <div className="absolute inset-0 bg-black/55" />
     

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
            Jualan di CFD jadi lebih muda
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