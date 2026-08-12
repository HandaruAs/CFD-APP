import { ListFilter, SquarePen, Store, CircleCheck, Armchair } from "lucide-react";

// Halaman manajemen lapak -- petugas bisa lihat keterisian tiap zona dan
// (nanti) mengubah status lapak per petak. Data zona & petak masih dummy,
// tinggal disambungkan ke endpoint penataan lapak begitu backend-nya siap.

type StatusLapak = "terisi" | "kosong";

type Lapak = {
  kode: string;
  status: StatusLapak;
  pedagang?: string;
};

type Zona = {
  nama: string;
  label: string;
  lapak: Lapak[];
};

const ZONA: Zona[] = [
  {
    nama: "Zona A",
    label: "Utara",
    lapak: [
      { kode: "A-01", status: "terisi", pedagang: "Budi Kopi" },
      { kode: "A-02", status: "terisi", pedagang: "Soto Ayam M..." },
      { kode: "A-03", status: "kosong" },
      { kode: "A-04", status: "terisi", pedagang: "Es Teh Manis" },
      { kode: "A-05", status: "terisi", pedagang: "Pecel Lele Lela" },
    ],
  },
  {
    nama: "Zona B",
    label: "Tengah",
    lapak: [
      { kode: "B-01", status: "kosong" },
      { kode: "B-02", status: "kosong" },
      { kode: "B-03", status: "terisi", pedagang: "Gorengan Ma..." },
    ],
  },
];

function LapakCard({ lapak }: { lapak: Lapak }) {
  const terisi = lapak.status === "terisi";
  return (
    <button
      type="button"
      className={`flex flex-col items-start gap-xs rounded-md border p-sm text-left transition-colors ${
        terisi
          ? "border-outline-variant bg-surface-container-lowest hover:bg-surface-container-low"
          : "border-dashed border-outline-variant bg-surface-container-low hover:bg-surface-container"
      }`}
    >
      <div className="flex w-full items-center justify-between">
        <span className="text-label-md font-semibold text-on-surface">{lapak.kode}</span>
        <span
          className={`h-2 w-2 rounded-full ${
            terisi ? "bg-secondary" : "border border-outline"
          }`}
        />
      </div>
      <span
        className={`text-label-sm ${
          terisi ? "text-on-surface-variant" : "italic text-on-surface-variant"
        }`}
      >
        {terisi ? "Terisi" : "Kosong"}
      </span>
      {terisi && (
        <span className="truncate text-label-sm font-medium text-on-surface">
          {lapak.pedagang}
        </span>
      )}
    </button>
  );
}

export default function ManajemenLapakPage() {
  const terisi = 248;
  const tersedia = 52;
  const total = 300;

  return (
    <div className="flex flex-col gap-lg">
      <div className="flex flex-wrap items-start justify-between gap-md">
        <div>
          <h2 className="text-headline-lg text-on-surface">Manajemen Lapak</h2>
          <p className="mt-xs max-w-2xl text-body-md text-on-surface-variant">
            Kelola status keterisian dan alokasi lapak pedagang di zona CFD.
          </p>
        </div>
        <div className="flex items-center gap-sm">
          <button
            type="button"
            className="flex items-center gap-sm rounded-md border border-outline-variant bg-surface-container-lowest px-md py-sm text-label-md text-on-surface transition-colors hover:bg-surface-container-low"
          >
            <ListFilter className="h-[18px] w-[18px]" strokeWidth={2} />
            Filter Zona
          </button>
          <button
            type="button"
            className="flex items-center gap-sm rounded-md bg-primary px-md py-sm text-label-md text-on-primary transition-colors hover:bg-primary-container"
          >
            <SquarePen className="h-[18px] w-[18px]" strokeWidth={2} />
            Ubah Status
          </button>
        </div>
      </div>

      {/* Kartu ringkasan */}
      <div className="grid grid-cols-1 gap-md sm:grid-cols-3">
        <div className="rounded-lg border border-outline-variant bg-surface-container-lowest p-lg">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-on-primary">
            <Store className="h-[18px] w-[18px]" strokeWidth={2} />
          </span>
          <p className="mt-md text-label-sm uppercase tracking-wide text-on-surface-variant">
            Total Lapak
          </p>
          <p className="text-headline-md text-on-surface">{total}</p>
        </div>

        <div className="rounded-lg border border-outline-variant bg-surface-container-lowest p-lg">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-secondary-container text-on-secondary-container">
            <CircleCheck className="h-[18px] w-[18px]" strokeWidth={2} />
          </span>
          <p className="mt-md text-label-sm uppercase tracking-wide text-on-surface-variant">
            Terisi
          </p>
          <p className="text-headline-md text-on-surface">{terisi}</p>
          <div className="mt-sm h-1.5 w-full overflow-hidden rounded-full bg-surface-container-high">
            <div
              className="h-full rounded-full bg-secondary"
              style={{ width: `${(terisi / total) * 100}%` }}
            />
          </div>
        </div>

        <div className="rounded-lg border border-outline-variant bg-surface-container-lowest p-lg">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-tertiary-container text-on-tertiary-container">
            <Armchair className="h-[18px] w-[18px]" strokeWidth={2} />
          </span>
          <p className="mt-md text-label-sm uppercase tracking-wide text-on-surface-variant">
            Tersedia
          </p>
          <p className="text-headline-md text-on-surface">{tersedia}</p>
          <div className="mt-sm h-1.5 w-full overflow-hidden rounded-full bg-surface-container-high">
            <div
              className="h-full rounded-full bg-tertiary-container"
              style={{ width: `${(tersedia / total) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Zona */}
      {ZONA.map((zona) => (
        <div key={zona.nama}>
          <div className="mb-sm flex items-center justify-between">
            <h3 className="text-title-lg text-on-surface">{zona.nama}</h3>
            <span className="rounded-full bg-surface-container-low px-sm py-1 text-label-sm text-on-surface-variant">
              {zona.label}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-sm sm:grid-cols-3 lg:grid-cols-5">
            {zona.lapak.map((lapak) => (
              <LapakCard key={lapak.kode} lapak={lapak} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
