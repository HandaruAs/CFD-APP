"use client";

import { useState } from "react";
import {
  MapPinned,
  Clock4,
  ClipboardCheck,
  BarChart3,
  ArrowUpRight,
  Menu,
  Store,
  ShieldCheck,
  Settings2,
  Users,
  KeyRound,
} from "lucide-react";

/* =========================================================
   DATA
========================================================= */

const features = [
  {
    icon: MapPinned,
    title: "Titik Lapak di Peta",
    desc: "Tandai dan atur titik lapak per zona, lengkap dengan status ketersediaan secara langsung.",
  },
  {
    icon: Clock4,
    title: "Jam Operasional",
    desc: "Atur jadwal buka-tutup tiap titik CFD dan beri tahu pedagang otomatis lewat aplikasi.",
  },
  {
    icon: ClipboardCheck,
    title: "Verifikasi UMKM",
    desc: "Proses pendaftaran dan dokumen pedagang tervalidasi langsung oleh petugas di lapangan.",
  },
  {
    icon: BarChart3,
    title: "Laporan & Rekap",
    desc: "Rekap kehadiran, okupansi lapak, dan aktivitas per zona tersusun rapi untuk evaluasi.",
  },
];

const steps = [
  {
    n: "01",
    title: "Daftar akun",
    desc: "Pedagang mengisi profil usaha dan mengunggah dokumen izin dari aplikasi.",
  },
  {
    n: "02",
    title: "Verifikasi petugas",
    desc: "Petugas CFD meninjau data dan menandai titik lapak yang sesuai di lokasi.",
  },
  {
    n: "03",
    title: "Lapak disetujui",
    desc: "Status berubah aktif, pedagang menerima jadwal dan titik lapak resminya.",
  },
  {
    n: "04",
    title: "Pantau tiap minggu",
    desc: "Superadmin memantau seluruh titik dan menyusun laporan operasional kota.",
  },
];

type RoleKey = "pedagang" | "petugas" | "superadmin";

const roles: Record<
  RoleKey,
  {
    label: string;
    title: string;
    desc: string;
    icon: React.ElementType;
    features: { icon: React.ElementType; text: string }[];
    panelTitle: string;
    panelRows: { label: string; value: string; tone: "green" | "amber" | "blue" }[];
  }
> = {
  pedagang: {
    label: "Pedagang",
    title: "Urus lapak dari ponsel, sebelum matahari terbit",
    desc: "Daftar sekali, dapat titik lapak, dan pantau status verifikasi tanpa perlu bolak-balik ke posko CFD.",
    icon: Store,
    features: [
      { icon: MapPinned, text: "Pilih dan lihat titik lapak di peta" },
      { icon: ClipboardCheck, text: "Ajukan dan lacak status verifikasi UMKM" },
      { icon: Clock4, text: "Cek jam operasional zona setiap minggu" },
    ],
    panelTitle: "Profil Usaha",
    panelRows: [
      { label: "Kedai Kopi Senja", value: "100% lengkap", tone: "green" },
      { label: "Zona B · Lapak 4", value: "Terverifikasi", tone: "green" },
      { label: "Dokumen izin usaha", value: "Menunggu", tone: "amber" },
    ],
  },
  petugas: {
    label: "Petugas CFD",
    title: "Verifikasi lapangan tanpa kertas dan tanpa tebak-tebakan",
    desc: "Petugas memverifikasi pedagang, menandai titik lapak, dan mencatat kehadiran langsung dari lokasi.",
    icon: ShieldCheck,
    features: [
      { icon: ClipboardCheck, text: "Verifikasi pedagang & dokumen di lokasi" },
      { icon: MapPinned, text: "Tandai dan sesuaikan titik lapak di peta" },
      { icon: Users, text: "Catat kehadiran dan pelanggaran zona" },
    ],
    panelTitle: "Status Verifikasi",
    panelRows: [
      { label: "Antrean hari ini", value: "18 pedagang", tone: "blue" },
      { label: "Disetujui", value: "14", tone: "green" },
      { label: "Perlu tinjauan", value: "4", tone: "amber" },
    ],
  },
  superadmin: {
    label: "Superadmin",
    title: "Satu dasbor untuk seluruh titik Car Free Day di kota",
    desc: "Superadmin mengelola akun, memantau seluruh titik CFD, dan menyusun laporan operasional lintas zona.",
    icon: Settings2,
    features: [
      { icon: Users, text: "Kelola akun pedagang dan petugas" },
      { icon: BarChart3, text: "Pantau laporan dan rekap operasional" },
      { icon: KeyRound, text: "Atur hak akses dan aturan sistem" },
    ],
    panelTitle: "Dashboard Operasional",
    panelRows: [
      { label: "Titik CFD aktif", value: "12 lokasi", tone: "blue" },
      { label: "UMKM aktif kota ini", value: "1.240", tone: "green" },
      { label: "Laporan menunggu tinjauan", value: "6", tone: "amber" },
    ],
  },
};

/* =========================================================
   HERO MOCKUP CARDS
========================================================= */

function ClockCard() {
  return (
    <div className="w-64 rounded-2xl bg-white shadow-[0_20px_50px_-15px_rgba(10,15,29,0.45)] border border-line overflow-hidden">
      <div className="flex items-center justify-between px-4 pt-4">
        <p className="font-display text-[13px] font-semibold text-ink-strong">Jam Operasional</p>
        <span className="flex items-center gap-1 rounded-full bg-leaf/10 px-2 py-0.5 text-[10px] font-semibold text-leaf">
          <span className="h-1.5 w-1.5 rounded-full bg-leaf" />
          Sesi Aktif
        </span>
      </div>
      <div className="mt-3 flex items-center gap-4 px-4">
        <div className="relative h-16 w-16 shrink-0 rounded-full border-4 border-mist">
          <div className="absolute inset-0 rounded-full border-4 border-blue border-r-transparent border-b-transparent rotate-45" />
          <div className="absolute inset-0 flex items-center justify-center font-mono text-[11px] font-medium text-ink-strong">
            06:14
          </div>
        </div>
        <div className="flex-1 space-y-1.5">
          <div className="flex justify-between font-mono text-[10px] text-ink-soft">
            <span>Mulai</span>
            <span className="text-ink-strong">05:30</span>
          </div>
          <div className="flex justify-between font-mono text-[10px] text-ink-soft">
            <span>Selesai</span>
            <span className="text-ink-strong">09:00</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-mist overflow-hidden">
            <div className="h-full w-[63%] rounded-full bg-blue" />
          </div>
        </div>
      </div>
      <div className="mt-4 border-t border-line px-4 py-3">
        <p className="text-[10px] text-ink-soft">Lokasi: Jl. Basuki Rahmat, Zona A</p>
      </div>
    </div>
  );
}

function ZoneMapCard() {
  const zones = [
    { label: "Zona A", pct: 92, tone: "leaf" },
    { label: "Zona B", pct: 68, tone: "blue" },
    { label: "Zona C", pct: 40, tone: "sun" },
  ];
  return (
    <div className="w-72 rounded-2xl bg-white shadow-[0_20px_50px_-15px_rgba(10,15,29,0.45)] border border-line overflow-hidden">
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <p className="font-display text-[13px] font-semibold text-ink-strong">Titik Lapak</p>
        <span className="font-mono text-[10px] text-ink-soft">3 zona aktif</span>
      </div>
      <div className="relative mx-4 mb-4 h-28 overflow-hidden rounded-xl bg-mist">
        <svg viewBox="0 0 280 110" className="h-full w-full" aria-hidden>
          <path d="M0 70 Q 70 30 140 55 T 280 45" fill="none" stroke="#c9d5ea" strokeWidth="10" strokeLinecap="round" />
          <circle cx="55" cy="52" r="7" fill="#34c77b" />
          <circle cx="140" cy="55" r="7" fill="#2f6fed" />
          <circle cx="225" cy="42" r="7" fill="#fdba3d" />
        </svg>
      </div>
      <div className="space-y-2.5 px-4 pb-4">
        {zones.map((z) => (
          <div key={z.label} className="flex items-center gap-3">
            <span
              className={`h-2 w-2 shrink-0 rounded-full ${
                z.tone === "leaf" ? "bg-leaf" : z.tone === "blue" ? "bg-blue" : "bg-sun"
              }`}
            />
            <span className="w-14 text-[11px] font-medium text-ink-strong">{z.label}</span>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-mist">
              <div
                className={`h-full rounded-full ${
                  z.tone === "leaf" ? "bg-leaf" : z.tone === "blue" ? "bg-blue" : "bg-sun"
                }`}
                style={{ width: `${z.pct}%` }}
              />
            </div>
            <span className="w-9 text-right font-mono text-[10px] text-ink-soft">{z.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatsCard() {
  const items = [
    { label: "Lapak Aktif", value: "300", color: "text-blue" },
    { label: "Terverifikasi", value: "248", color: "text-leaf" },
    { label: "Menunggu", value: "52", color: "text-sun" },
  ];
  return (
    <div className="w-72 rounded-2xl bg-midnight shadow-[0_20px_50px_-15px_rgba(10,15,29,0.6)] border border-white/10 overflow-hidden">
      <div className="px-4 pt-4">
        <p className="font-display text-[13px] font-semibold text-white">Manajemen Lapak</p>
        <p className="text-[10px] text-white/50">Titik CFD — Jl. Ijen</p>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 px-4">
        {items.map((it) => (
          <div key={it.label} className="rounded-xl bg-white/5 px-2 py-2.5 text-center">
            <p className={`font-mono text-base font-semibold ${it.color}`}>{it.value}</p>
            <p className="mt-0.5 text-[9px] leading-tight text-white/50">{it.label}</p>
          </div>
        ))}
      </div>
      <div className="mt-3 flex h-16 items-end gap-1 px-4 pb-4">
        {[40, 65, 50, 80, 55, 90, 70].map((h, i) => (
          <div key={i} className="flex-1 rounded-t-sm bg-gradient-to-t from-blue to-blue/40" style={{ height: `${h}%` }} />
        ))}
      </div>
    </div>
  );
}

/* =========================================================
   ROLE SWITCHER (elemen interaktif utama)
========================================================= */

function RoleSwitcher() {
  const [active, setActive] = useState<RoleKey>("pedagang");
  const role = roles[active];
  const Icon = role.icon;

  return (
    <div>
      <div
        role="tablist"
        aria-label="Pilih peran pengguna"
        className="inline-flex w-full flex-col gap-2 rounded-2xl bg-mist p-1.5 sm:w-auto sm:flex-row sm:gap-1"
      >
        {(Object.keys(roles) as RoleKey[]).map((key) => {
          const r = roles[key];
          const RIcon = r.icon;
          const isActive = key === active;
          return (
            <button
              key={key}
              role="tab"
              aria-selected={isActive}
              onClick={() => setActive(key)}
              className={`focus-ring flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium transition-colors ${
                isActive ? "bg-ink text-white shadow-sm" : "text-ink-soft hover:text-ink-strong"
              }`}
            >
              <RIcon className="h-4 w-4" strokeWidth={2} />
              {r.label}
            </button>
          );
        })}
      </div>

      <div className="mt-8 grid gap-10 rounded-3xl border border-line bg-white p-6 sm:p-8 lg:grid-cols-2 lg:items-center lg:gap-14">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-blue/10 px-3 py-1 text-xs font-semibold text-blue">
            <Icon className="h-3.5 w-3.5" strokeWidth={2.4} />
            Peran {role.label}
          </div>
          <h3 className="mt-4 font-display text-2xl font-semibold leading-snug text-ink-strong sm:text-[28px]">
            {role.title}
          </h3>
          <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">{role.desc}</p>
          <ul className="mt-6 space-y-3">
            {role.features.map((f) => {
              const FIcon = f.icon;
              return (
                <li key={f.text} className="flex items-start gap-3 text-sm text-ink-strong">
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-mist">
                    <FIcon className="h-3.5 w-3.5 text-blue" strokeWidth={2.2} />
                  </span>
                  <span className="pt-0.5">{f.text}</span>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="rounded-2xl bg-ink p-5">
          <div className="flex items-center justify-between">
            <p className="font-display text-sm font-semibold text-white">{role.panelTitle}</p>
            <span className="flex gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-white/20" />
              <span className="h-1.5 w-1.5 rounded-full bg-white/20" />
              <span className="h-1.5 w-1.5 rounded-full bg-sun" />
            </span>
          </div>
          <div className="mt-4 space-y-2">
            {role.panelRows.map((row) => (
              <div key={row.label} className="flex items-center justify-between rounded-xl bg-white/5 px-3.5 py-3">
                <span className="text-[13px] text-white/70">{row.label}</span>
                <span
                  className={`rounded-full px-2.5 py-1 font-mono text-[11px] font-medium ${
                    row.tone === "amber"
                      ? "bg-sun/15 text-sun"
                      : row.tone === "green"
                      ? "bg-leaf/15 text-leaf"
                      : "bg-blue/20 text-[#8fb3ff]"
                  }`}
                >
                  {row.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   PAGE
========================================================= */

export default function Home() {
  return (
    <>
      {/* ---------- NAV ---------- */}
      <header className="absolute inset-x-0 top-0 z-20">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6 lg:px-8">
          <a href="#" className="flex items-center gap-2.5 focus-ring">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue font-display text-sm font-bold text-white">
              C
            </span>
            <span className="font-display text-[15px] font-semibold tracking-tight text-white">CFD Kita</span>
          </a>
          <div className="hidden items-center gap-9 md:flex">
            <a href="#peran" className="focus-ring text-sm text-white/70 transition-colors hover:text-white">Peran Pengguna</a>
            <a href="#fitur" className="focus-ring text-sm text-white/70 transition-colors hover:text-white">Fitur</a>
            <a href="#alur" className="focus-ring text-sm text-white/70 transition-colors hover:text-white">Cara Kerja</a>
          </div>
          <div className="hidden items-center gap-3 md:flex">
            <a href="/auth/login" className="focus-ring text-sm font-medium text-white/80 hover:text-white">Masuk</a>
            <a
              href="/auth/register"
              className="focus-ring rounded-full bg-white px-4 py-2 text-sm font-semibold text-ink transition-transform hover:-translate-y-0.5"
            >
              Daftar Pedagang
            </a>
          </div>
          <button className="focus-ring text-white md:hidden" aria-label="Buka menu">
            <Menu className="h-6 w-6" />
          </button>
        </nav>
      </header>

      {/* ---------- HERO ---------- */}
      <section className="relative overflow-hidden bg-ink pb-28 pt-36 sm:pb-36 sm:pt-44">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(120% 100% at 15% 0%, #16233f 0%, #0a0f1d 45%, #0a0f1d 100%), radial-gradient(60% 45% at 88% 92%, rgba(253,186,61,0.16) 0%, rgba(253,186,61,0) 70%)",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-40"
          style={{ background: "linear-gradient(180deg, rgba(253,186,61,0) 0%, rgba(253,186,61,0.08) 100%)" }}
        />

        <div className="relative mx-auto grid max-w-7xl gap-16 px-6 lg:grid-cols-[1.05fr_1fr] lg:items-center lg:gap-12 lg:px-8">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 text-xs font-medium text-white/70">
              <span className="h-1.5 w-1.5 rounded-full bg-sun" />
              Dipakai di titik CFD Kabupaten &amp; Kota
            </div>
            <h1 className="mt-6 font-display text-[2.6rem] font-semibold leading-[1.08] tracking-tight text-white sm:text-6xl">
              Satu jalan pagi,
              <br />
              <span className="text-sun">tiga peran</span>, satu aplikasi.
            </h1>
            <p className="mt-6 max-w-lg text-[17px] leading-relaxed text-white/60">
              CFD Kita menghubungkan pedagang, petugas, dan superadmin dalam satu sistem — dari
              titik lapak, jam operasional, sampai verifikasi UMKM, sebelum jalan ramai dan
              setelah jalan sepi kembali.
            </p>
            <div className="mt-9 flex flex-col gap-3.5 sm:flex-row">
              <a
                href="/register"
                className="focus-ring group inline-flex items-center justify-center gap-2 rounded-full bg-blue px-6 py-3.5 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5"
              >
                Daftarkan Lapak Anda
                <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </a>
              <a
                href="#peran"
                className="focus-ring inline-flex items-center justify-center gap-2 rounded-full border border-white/15 px-6 py-3.5 text-sm font-semibold text-white/85 transition-colors hover:bg-white/5"
              >
                Lihat Cara Kerjanya
              </a>
            </div>
            <div className="mt-12 flex flex-wrap gap-x-10 gap-y-4">
              {[
                ["12", "titik CFD terhubung"],
                ["1.240", "UMKM aktif"],
                ["98%", "verifikasi tepat waktu"],
              ].map(([n, l]) => (
                <div key={l}>
                  <p className="font-display text-2xl font-semibold text-white">{n}</p>
                  <p className="mt-0.5 text-xs text-white/50">{l}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative mx-auto h-[440px] w-full max-w-md lg:h-[480px]">
            <div className="absolute left-0 top-2 rotate-[-6deg] sm:left-4">
              <ClockCard />
            </div>
            <div className="absolute right-0 top-32 rotate-[4deg] sm:top-36">
              <ZoneMapCard />
            </div>
            <div className="absolute bottom-0 left-6 rotate-[-3deg] sm:left-10">
              <StatsCard />
            </div>
          </div>
        </div>
      </section>

      {/* ---------- ROLE SWITCHER ---------- */}
      <section id="peran" className="bg-paper py-24 sm:py-32">
        <div className="mx-auto max-w-6xl px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="font-mono text-xs font-medium uppercase tracking-wider text-blue">Sistem tiga peran</p>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-ink-strong sm:text-[2.5rem]">
              Setiap peran, tampilan dan wewenangnya sendiri
            </h2>
            <p className="mt-4 text-[15px] leading-relaxed text-ink-soft">
              Pedagang, petugas, dan superadmin masuk ke aplikasi yang sama — tapi melihat dasbor
              yang dirancang khusus untuk tugas masing-masing.
            </p>
          </div>
          <div className="mt-10">
            <RoleSwitcher />
          </div>
        </div>
      </section>

      {/* ---------- FEATURES ---------- */}
      <section id="fitur" className="border-t border-line bg-white py-24 sm:py-32">
        <div className="mx-auto max-w-6xl px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="font-mono text-xs font-medium uppercase tracking-wider text-blue">Fitur inti</p>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-ink-strong sm:text-[2.5rem]">
              Semua yang dibutuhkan untuk mengelola CFD
            </h2>
          </div>
          <div className="mt-14 grid gap-px overflow-hidden rounded-3xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
            {features.map((f) => {
              const FIcon = f.icon;
              return (
                <div key={f.title} className="group bg-white p-7 transition-colors hover:bg-mist/60">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue/10">
                    <FIcon className="h-5 w-5 text-blue" strokeWidth={2.2} />
                  </span>
                  <h3 className="mt-5 font-display text-base font-semibold text-ink-strong">{f.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-soft">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ---------- HOW IT WORKS ---------- */}
      <section id="alur" className="bg-mist py-24 sm:py-32">
        <div className="mx-auto max-w-6xl px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="font-mono text-xs font-medium uppercase tracking-wider text-blue">Alur pendaftaran</p>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-ink-strong sm:text-[2.5rem]">
              Dari daftar sampai berjualan, empat langkah
            </h2>
          </div>
          <div className="mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((s, i) => (
              <div key={s.n} className="relative">
                <p className="font-mono text-sm font-medium text-blue/70">{s.n}</p>
                <h3 className="mt-3 font-display text-lg font-semibold text-ink-strong">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">{s.desc}</p>
                {i < steps.length - 1 && <div className="mt-6 hidden h-px w-full bg-line lg:block" />}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- CTA ---------- */}
      <section id="daftar" className="relative overflow-hidden bg-ink py-24 sm:py-28">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{ background: "radial-gradient(70% 100% at 85% 100%, rgba(47,111,237,0.25) 0%, rgba(47,111,237,0) 60%)" }}
        />
        <div className="relative mx-auto max-w-4xl px-6 text-center lg:px-8">
          <h2 className="font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Siap kelola CFD di kota Anda?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-white/60">
            Baik Anda pedagang yang ingin lapak resmi, petugas yang bertugas di lapangan, atau
            pengelola kota — CFD Kita siap dipakai minggu ini.
          </p>
          <div className="mt-9 flex flex-col justify-center gap-3.5 sm:flex-row">
            <a
              href="/register"
              className="focus-ring inline-flex items-center justify-center rounded-full bg-white px-6 py-3.5 text-sm font-semibold text-ink transition-transform hover:-translate-y-0.5"
            >
              Daftar sebagai Pedagang
            </a>
            <a
              href="mailto:halo@cfdkita.id"
              className="focus-ring inline-flex items-center justify-center rounded-full border border-white/15 px-6 py-3.5 text-sm font-semibold text-white/85 transition-colors hover:bg-white/5"
            >
              Hubungi Tim Kota
            </a>
          </div>
        </div>
      </section>

      {/* ---------- FOOTER ---------- */}
      <footer className="bg-ink pt-16 pb-8">
        <div className="mx-auto max-w-6xl px-6 lg:px-8">
          <div className="flex flex-col justify-between gap-10 border-b border-white/10 pb-12 sm:flex-row">
            <div className="max-w-xs">
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue font-display text-sm font-bold text-white">
                  C
                </span>
                <span className="font-display text-[15px] font-semibold text-white">CFD Kita</span>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-white/50">
                Aplikasi manajemen Car Free Day untuk pedagang, petugas, dan superadmin.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-10 sm:grid-cols-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-white/40">Produk</p>
                <ul className="mt-3 space-y-2.5 text-sm text-white/60">
                  <li><a href="#peran" className="focus-ring hover:text-white">Peran Pengguna</a></li>
                  <li><a href="#fitur" className="focus-ring hover:text-white">Fitur</a></li>
                  <li><a href="#alur" className="focus-ring hover:text-white">Cara Kerja</a></li>
                </ul>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-white/40">Untuk</p>
                <ul className="mt-3 space-y-2.5 text-sm text-white/60">
                  <li><a href="#" className="focus-ring hover:text-white">Pedagang</a></li>
                  <li><a href="#" className="focus-ring hover:text-white">Petugas CFD</a></li>
                  <li><a href="#" className="focus-ring hover:text-white">Superadmin</a></li>
                </ul>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-white/40">Kontak</p>
                <ul className="mt-3 space-y-2.5 text-sm text-white/60">
                  <li>halo@cfdkita.id</li>
                  <li>Senin–Jumat, 08.00–16.00</li>
                </ul>
              </div>
            </div>
          </div>
          <p className="pt-6 text-center text-xs text-white/35">
            © 2026 CFD Kita. Dibuat untuk pengelolaan Car Free Day yang lebih rapi.
          </p>
        </div>
      </footer>
    </>
  );
}
