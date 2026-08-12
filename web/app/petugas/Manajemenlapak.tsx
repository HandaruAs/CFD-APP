"use client";

import { Store, CheckCircle2, Clock3, SlidersHorizontal, Pencil } from "lucide-react";

// -----------------------------------------------------------------------------
// Types & data statis (nanti tinggal disambungkan ke API lapak/zona)
// -----------------------------------------------------------------------------

type LapakStatus = "terisi" | "kosong";

const LAPAK_STATUS_STYLES: Record<
  LapakStatus,
  { label: string; dot: string; text: string }
> = {
  terisi: {
    label: "Terisi",
    dot: "bg-secondary",
    text: "text-on-secondary-container",
  },
  kosong: {
    label: "Kosong",
    dot: "bg-tertiary",
    text: "text-on-tertiary-container",
  },
};

type Lapak = {
  kode: string;
  status: LapakStatus;
  pedagang?: string;
};

const ZONA_A: Lapak[] = [
  { kode: "A-01", status: "terisi", pedagang: "Budi Kopi" },
  { kode: "A-02", status: "terisi", pedagang: "Soto Ayam M..." },
  { kode: "A-03", status: "kosong" },
  { kode: "A-04", status: "terisi", pedagang: "Es Teh Manis" },
  { kode: "A-05", status: "terisi", pedagang: "Pecel Lele Lela" },
];

const ZONA_B: Lapak[] = [
  { kode: "B-01", status: "kosong" },
  { kode: "B-02", status: "kosong" },
  { kode: "B-03", status: "terisi", pedagang: "Gorengan Ma..." },
];

const TOTAL_LAPAK = 300;
const TERISI = 248;
const TERSEDIA = 52;

// -----------------------------------------------------------------------------

function LapakStatusTag({ status }: { status: LapakStatus }) {
  const s = LAPAK_STATUS_STYLES[status];
  return (
    <span className={`flex items-center gap-xs text-label-sm ${s.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}

function LapakCard({ lapak }: { lapak: Lapak }) {
  return (
    <div className="rounded-md border border-outline-variant bg-surface-container-lowest p-md">
      <div className="mb-xs flex items-center justify-between">
        <span className="text-label-md font-semibold text-on-surface">
          {lapak.kode}
        </span>
        <LapakStatusTag status={lapak.status} />
      </div>
      <p
        className={`truncate text-label-sm ${
          lapak.pedagang ? "text-on-surface-variant" : "text-on-surface-variant/60 italic"
        }`}
      >
        {lapak.pedagang ?? "Kosong"}
      </p>
    </div>
  );
}

function StatCard({
  icon: Icon,
  iconBg,
  iconText,
  label,
  value,
  progress,
}: {
  icon: typeof Store;
  iconBg: string;
  iconText: string;
  label: string;
  value: number;
  progress?: number;
}) {
  return (
    <div className="flex-1 rounded-lg border border-outline-variant bg-surface-container-lowest p-lg">
      <span
        className={`flex h-9 w-9 items-center justify-center rounded-md ${iconBg} ${iconText}`}
      >
        <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
      </span>
      <p className="mt-md text-label-sm text-on-surface-variant">{label}</p>
      <p className="text-title-lg font-semibold text-on-surface">{value}</p>
      {progress !== undefined && (
        <div className="mt-sm h-1.5 w-full overflow-hidden rounded-full bg-surface-container-high">
          <div
            className={`h-full rounded-full ${iconBg.replace("/15", "")}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------

export default function ManajemenLapak() {
  return (
    <div className="flex flex-col gap-lg">
      <div className="flex flex-col gap-md sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-title-lg text-on-surface">Manajemen Lapak</h1>
          <p className="text-label-md text-on-surface-variant">
            Kelola status ketersediaan lapak dan alokasi pedagang di zona CFD.
          </p>
        </div>
        <div className="flex gap-sm">
          <button
            type="button"
            className="flex items-center gap-xs rounded-md border border-outline px-md py-sm text-label-md text-on-surface transition-colors hover:bg-surface-container-low"
          >
            <SlidersHorizontal className="h-4 w-4" strokeWidth={2} />
            Filter Zona
          </button>
          <button
            type="button"
            className="flex items-center gap-xs rounded-md bg-primary px-md py-sm text-label-md text-on-primary transition-colors hover:opacity-90"
          >
            <Pencil className="h-4 w-4" strokeWidth={2} />
            Ubah Status
          </button>
        </div>
      </div>

      {/* Kartu ringkasan */}
      <div className="flex flex-col gap-md sm:flex-row">
        <StatCard
          icon={Store}
          iconBg="bg-primary-container"
          iconText="text-primary"
          label="TOTAL LAPAK"
          value={TOTAL_LAPAK}
        />
        <StatCard
          icon={CheckCircle2}
          iconBg="bg-secondary-container"
          iconText="text-on-secondary-container"
          label="TERISI"
          value={TERISI}
          progress={(TERISI / TOTAL_LAPAK) * 100}
        />
        <StatCard
          icon={Clock3}
          iconBg="bg-tertiary-container"
          iconText="text-on-tertiary-container"
          label="TERSEDIA"
          value={TERSEDIA}
          progress={(TERSEDIA / TOTAL_LAPAK) * 100}
        />
      </div>

      {/* Zona A */}
      <section>
        <div className="mb-md flex items-center justify-between">
          <h2 className="text-label-md font-semibold text-on-surface">
            Zona A
          </h2>
          <button
            type="button"
            className="text-label-sm text-on-surface-variant hover:text-on-surface"
          >
            Ubah
          </button>
        </div>
        <div className="grid grid-cols-2 gap-md sm:grid-cols-3 lg:grid-cols-5">
          {ZONA_A.map((lapak) => (
            <LapakCard key={lapak.kode} lapak={lapak} />
          ))}
        </div>
      </section>

      {/* Zona B */}
      <section>
        <div className="mb-md flex items-center justify-between">
          <h2 className="text-label-md font-semibold text-on-surface">
            Zona B
          </h2>
          <span className="rounded-full bg-surface-container-low px-sm py-1 text-label-sm text-on-surface-variant">
            Tersisa
          </span>
        </div>
        <div className="grid grid-cols-2 gap-md sm:grid-cols-3 lg:grid-cols-5">
          {ZONA_B.map((lapak) => (
            <LapakCard key={lapak.kode} lapak={lapak} />
          ))}
        </div>
      </section>
    </div>
  );
}