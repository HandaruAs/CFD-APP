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
  Circle,
  ImageIcon,
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
  { n: "01", title: "Daftar akun", desc: "Isi profil usaha dan unggah dokumen izin dari aplikasi." },
  { n: "02", title: "Verifikasi petugas", desc: "Petugas meninjau data dan menandai titik lapak di lokasi." },
  { n: "03", title: "Lapak disetujui", desc: "Status aktif, jadwal dan titik lapak resmi diterbitkan." },
  { n: "04", title: "Pantau tiap minggu", desc: "Superadmin memantau seluruh titik dan menyusun laporan operasional kota." },
];

type RoleKey = "pedagang" | "petugas" | "superadmin";
type Tone = "leaf" | "sun" | "blue";

const roles: Record<
  RoleKey,
  {
    label: string;
    title: string;
    desc: string;
    icon: React.ElementType;
    features: { icon: React.ElementType; text: string }[];
    panelLabel: string;
    panelRows: { label: string; value: string; tone: Tone }[];
  }
> = {
  pedagang: {
    label: "Pedagang",
    title: "Kelola lapak Anda langsung dari ponsel",
    desc: "Daftar sekali, dapat titik lapak, dan pantau status verifikasi tanpa perlu bolak-balik ke posko CFD.",
    icon: Store,
    features: [
      { icon: MapPinned, text: "Pilih dan lihat titik lapak di peta" },
      { icon: ClipboardCheck, text: "Ajukan dan lacak status verifikasi UMKM" },
      { icon: Clock4, text: "Cek jam operasional zona setiap minggu" },
    ],
    panelLabel: "Profil Pedagang",
    panelRows: [
      { label: "Profil usaha", value: "Lengkap", tone: "leaf" },
      { label: "Titik lapak", value: "Terverifikasi", tone: "leaf" },
      { label: "Dokumen izin usaha", value: "Menunggu", tone: "sun" },
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
    panelLabel: "Verifikasi Petugas",
    panelRows: [
      { label: "Antrean hari ini", value: "18 pedagang", tone: "blue" },
      { label: "Disetujui", value: "14", tone: "leaf" },
      { label: "Perlu tinjauan", value: "4", tone: "sun" },
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
    panelLabel: "Dasbor Superadmin",
    panelRows: [
      { label: "Titik CFD aktif", value: "12 lokasi", tone: "blue" },
      { label: "UMKM aktif kota ini", value: "1.240", tone: "leaf" },
      { label: "Laporan menunggu tinjauan", value: "6", tone: "sun" },
    ],
  },
};

const toneClasses: Record<Tone, string> = {
  leaf: "bg-leaf/10 text-leaf",
  sun: "bg-sun/15 text-[#8a5a00]",
  blue: "bg-blue/10 text-blue",
};

/* =========================================================
   SIGNATURE — pola titik peta + jalur rute
   Latar bertitik ala peta, dan garis rute putus-putus yang
   nyambungin tiap "halte" (langkah) — literal dari konsep
   CFD: satu jalan yang dipetakan.
========================================================= */

function DotGrid({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden className={className}>
      <defs>
        <pattern id="dotgrid" width="22" height="22" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="1.4" fill="var(--blue)" opacity="0.16" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#dotgrid)" />
    </svg>
  );
}

function BrowserWindow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="w-full overflow-hidden rounded-2xl border border-line bg-white shadow-[0_30px_60px_-25px_rgba(47,111,237,0.35)]">
      <div className="flex items-center justify-between border-b border-line bg-mist px-5 py-3.5">
        <div className="flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded-md bg-blue text-[10px] font-bold text-white">
            C
          </span>
          <span className="font-display text-[13px] font-semibold text-ink-strong">{label}</span>
        </div>
        <span className="flex gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-line" />
          <span className="h-1.5 w-1.5 rounded-full bg-line" />
          <span className="h-1.5 w-1.5 rounded-full bg-line" />
        </span>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

/* =========================================================
   HERO MOCKUP — satu dashboard, bukan kartu berserakan
========================================================= */

function HeroMockup() {
  return (
    <div className="w-full overflow-hidden rounded-2xl border border-line bg-white shadow-[0_30px_60px_-25px_rgba(47,111,237,0.35)]">
      {/*
        GANTI BLOK DI BAWAH INI DENGAN GAMBAR ASLI NANTI, contoh:
        <Image src="/images/hero-cfd.jpg" alt="Suasana Car Free Day" width={640} height={480}
               className="h-full w-full object-cover" />
      */}
      <div className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-2 border-2 border-dashed border-line bg-mist text-ink-soft">
        <ImageIcon className="h-6 w-6" strokeWidth={1.6} />
        <p className="text-xs">Gambar belum ditambahkan</p>
      </div>
    </div>
  );
}

/* =========================================================
   ROLE SWITCHER
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
        className="inline-flex w-full flex-col gap-1 rounded-full border border-line bg-white p-1 sm:w-auto sm:flex-row"
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
              className={`focus-ring flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition-colors ${
                isActive ? "bg-blue text-white" : "text-ink-soft hover:text-ink-strong"
              }`}
            >
              <RIcon className="h-4 w-4" strokeWidth={2} />
              {r.label}
            </button>
          );
        })}
      </div>

      <div className="mt-8 grid gap-12 lg:grid-cols-2 lg:items-center lg:gap-16">
        <div key={active} className="animate-[fadein_0.3s_ease-out]">
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue">
            <Icon className="h-3.5 w-3.5" strokeWidth={2.4} />
            Peran {role.label}
          </div>
          <h3 className="mt-3 font-display text-2xl font-semibold leading-snug tracking-tight text-ink-strong sm:text-[28px]">
            {role.title}
          </h3>
          <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">{role.desc}</p>
          <ul className="mt-6 space-y-3 border-t border-line pt-6">
            {role.features.map((f) => {
              const FIcon = f.icon;
              return (
                <li key={f.text} className="flex items-start gap-3 text-sm text-ink-strong">
                  <FIcon className="mt-0.5 h-4 w-4 shrink-0 text-blue" strokeWidth={2.2} />
                  <span>{f.text}</span>
                </li>
              );
            })}
          </ul>
        </div>

        <div key={`${active}-panel`} className="animate-[fadein_0.3s_ease-out]">
          <BrowserWindow label={role.panelLabel}>
            <div className="space-y-2">
              {role.panelRows.map((row) => (
                <div key={row.label} className="flex items-center justify-between rounded-xl bg-mist px-3.5 py-3">
                  <span className="text-[13px] text-ink-soft">{row.label}</span>
                  <span className={`rounded-full px-2.5 py-1 font-mono text-[11px] font-medium ${toneClasses[row.tone]}`}>
                    {row.value}
                  </span>
                </div>
              ))}
            </div>
          </BrowserWindow>
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
      <style>{`
        @keyframes fadein {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .animate-\\[fadein_0\\.3s_ease-out\\] { animation: none; }
        }
      `}</style>

      {/* ---------- NAV ---------- */}
      <header className="sticky top-0 z-20 bg-paper/85 backdrop-blur">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-8">
          <a href="#" className="flex items-center gap-2.5 focus-ring">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue font-display text-sm font-bold text-white">
              C
            </span>
            <span className="font-display text-[15px] font-semibold tracking-tight text-ink-strong">CFD Kita</span>
          </a>
          <div className="hidden items-center gap-1 rounded-full border border-line bg-white p-1 md:flex">
            <a href="#peran" className="focus-ring rounded-full px-4 py-1.5 text-sm text-ink-soft transition-colors hover:text-ink-strong">Peran</a>
            <a href="#fitur" className="focus-ring rounded-full px-4 py-1.5 text-sm text-ink-soft transition-colors hover:text-ink-strong">Fitur</a>
            <a href="#alur" className="focus-ring rounded-full px-4 py-1.5 text-sm text-ink-soft transition-colors hover:text-ink-strong">Cara Kerja</a>
          </div>
          <div className="hidden items-center gap-3 md:flex">
            <a href="/auth/login" className="focus-ring text-sm font-medium text-ink-soft hover:text-ink-strong">Masuk</a>
            <a
              href="/auth/register"
              className="focus-ring rounded-full bg-blue px-4 py-2 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5"
            >
              Daftar Pedagang
            </a>
          </div>
          <button className="focus-ring text-ink-strong md:hidden" aria-label="Buka menu">
            <Menu className="h-6 w-6" />
          </button>
        </nav>
      </header>

      {/* ---------- HERO ---------- */}
      <section className="relative overflow-hidden">
        <DotGrid className="pointer-events-none absolute inset-0 h-full w-full" />
        <div className="relative mx-auto grid max-w-7xl gap-16 px-6 py-20 sm:py-28 lg:grid-cols-[1fr_0.95fr] lg:items-center lg:gap-12 lg:px-8">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-3.5 py-1.5 text-xs font-medium text-ink-soft">
              <span className="h-1.5 w-1.5 rounded-full bg-sun" />
              Dipakai di titik CFD Kabupaten &amp; Kota
            </div>
            <h1 className="mt-6 font-display text-[2.75rem] font-semibold leading-[1.05] tracking-tight text-ink-strong sm:text-[3.4rem]">
              Satu Sistem, untuk
              <br />
              Seluruh Titik Car Free Day.
            </h1>
            <p className="mt-6 max-w-lg text-[17px] leading-relaxed text-ink-soft">
              Dari titik lapak, jadwal operasional, hingga verifikasi usaha — pedagang, petugas,
              dan pengelola kota kini bekerja dari platform yang sama.
            </p>
            <div className="mt-9 flex flex-col gap-3.5 sm:flex-row">
              <a
                href="#peran"
                className="focus-ring inline-flex items-center justify-center gap-2 rounded-full border border-line bg-white px-6 py-3.5 text-sm font-semibold text-ink-strong transition-colors hover:bg-mist"
              >
                Lihat Cara Kerjanya
              </a>
            </div>
            <div className="mt-12 flex flex-wrap gap-x-10 gap-y-4 border-t border-line pt-8">
              {[
                ["12", "titik CFD terhubung"],
                ["1.240", "UMKM aktif"],
                ["98%", "verifikasi tepat waktu"],
              ].map(([n, l]) => (
                <div key={l}>
                  <p className="font-display text-2xl font-semibold text-ink-strong">{n}</p>
                  <p className="mt-0.5 text-xs text-ink-soft">{l}</p>
                </div>
              ))}
            </div>
          </div>

          <HeroMockup />
        </div>
      </section>

      {/* ---------- ROLE SWITCHER ---------- */}
      <section id="peran" className="border-t border-line bg-white py-24 sm:py-32">
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

      {/* ---------- FEATURES — daftar editorial, bukan grid kartu ---------- */}
      <section id="fitur" className="border-t border-line bg-paper py-24 sm:py-32">
        <div className="mx-auto max-w-5xl px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="font-mono text-xs font-medium uppercase tracking-wider text-blue">Fitur inti</p>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-ink-strong sm:text-[2.5rem]">
              Semua yang dibutuhkan untuk mengelola CFD
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

      {/* ---------- HOW IT WORKS — jalur/rute, ala halte ---------- */}
      <section id="alur" className="border-t border-line bg-white py-24 sm:py-32">
        <div className="mx-auto max-w-6xl px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="font-mono text-xs font-medium uppercase tracking-wider text-blue">Alur pendaftaran</p>
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

      {/* ---------- CTA ---------- */}
      <section id="daftar" className="relative overflow-hidden border-t border-line bg-paper py-24 sm:py-28">
        <DotGrid className="pointer-events-none absolute inset-0 h-full w-full" />
        <div className="relative mx-auto max-w-4xl px-6 text-center lg:px-8">
          <h2 className="font-display text-3xl font-semibold tracking-tight text-ink-strong sm:text-4xl">
            Siap kelola CFD di kota Anda?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-ink-soft">
            Baik Anda pedagang yang ingin lapak resmi, petugas yang bertugas di lapangan, atau
            pengelola kota — CFD Kita siap dipakai minggu ini.
          </p>
          <div className="mt-9 flex flex-col justify-center gap-3.5 sm:flex-row">
            <a
              href="/register"
              className="focus-ring inline-flex items-center justify-center rounded-full bg-blue px-6 py-3.5 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5"
            >
              Daftar sebagai Pedagang
            </a>
            <a
              href="mailto:halo@cfdkita.id"
              className="focus-ring inline-flex items-center justify-center rounded-full border border-line bg-white px-6 py-3.5 text-sm font-semibold text-ink-strong transition-colors hover:bg-mist"
            >
              Hubungi Tim Kota
            </a>
          </div>
        </div>
      </section>

      {/* ---------- FOOTER ---------- */}
      <footer className="border-t border-line bg-white pt-16 pb-8">
        <div className="mx-auto max-w-6xl px-6 lg:px-8">
          <div className="flex flex-col justify-between gap-10 border-b border-line pb-12 sm:flex-row">
            <div className="max-w-xs">
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue font-display text-sm font-bold text-white">
                  C
                </span>
                <span className="font-display text-[15px] font-semibold text-ink-strong">CFD Kita</span>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-ink-soft">
                Aplikasi manajemen Car Free Day untuk pedagang, petugas, dan superadmin.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-10 sm:grid-cols-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-ink-soft">Produk</p>
                <ul className="mt-3 space-y-2.5 text-sm text-ink-soft">
                  <li><a href="#peran" className="focus-ring hover:text-ink-strong">Peran Pengguna</a></li>
                  <li><a href="#fitur" className="focus-ring hover:text-ink-strong">Fitur</a></li>
                  <li><a href="#alur" className="focus-ring hover:text-ink-strong">Cara Kerja</a></li>
                </ul>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-ink-soft">Untuk</p>
                <ul className="mt-3 space-y-2.5 text-sm text-ink-soft">
                  <li><a href="#" className="focus-ring hover:text-ink-strong">Pedagang</a></li>
                  <li><a href="#" className="focus-ring hover:text-ink-strong">Petugas CFD</a></li>
                  <li><a href="#" className="focus-ring hover:text-ink-strong">Superadmin</a></li>
                </ul>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-ink-soft">Kontak</p>
                <ul className="mt-3 space-y-2.5 text-sm text-ink-soft">
                  <li>halo@cfdkita.id</li>
                  <li>Senin–Jumat, 08.00–16.00</li>
                </ul>
              </div>
            </div>
          </div>
          <p className="pt-6 text-center text-xs text-ink-soft">
            © 2026 CFD Kita. Dibuat untuk pengelolaan Car Free Day yang lebih rapi.
          </p>
        </div>
      </footer>
    </>
  );
}