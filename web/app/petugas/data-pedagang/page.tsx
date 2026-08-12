import { Search, ListFilter, ChevronRight, ChevronLeft } from "lucide-react";

// Halaman daftar pedagang yang terdaftar & aktif di area CFD. Petugas bisa
// mencari, memfilter per kategori/zona, dan membuka detail tiap pedagang.
// Data pedagang masih dummy, tinggal disambungkan ke GET /api/pedagang
// begitu endpoint listing-nya siap di backend.

type KategoriUsaha = "kuliner" | "kerajinan" | "ritel";
type StatusKehadiran = "hadir" | "absen";

type Pedagang = {
  id: string;
  namaUsaha: string;
  pemilik: string;
  inisial: string;
  kategori: KategoriUsaha;
  lokasiLapak: string;
  status: StatusKehadiran;
};

const PEDAGANG: Pedagang[] = [
  {
    id: "APDC-001",
    namaUsaha: "Sate Madura Cak Budi",
    pemilik: "Budi Santosa",
    inisial: "SB",
    kategori: "kuliner",
    lokasiLapak: "Blok A1 - Zona Timur",
    status: "hadir",
  },
  {
    id: "APDC-042",
    namaUsaha: "Batik Aminah",
    pemilik: "Siti Aminah",
    inisial: "SA",
    kategori: "kerajinan",
    lokasiLapak: "Blok C3 - Zona Tengah",
    status: "hadir",
  },
  {
    id: "APDC-115",
    namaUsaha: "Mainan Anak Wira",
    pemilik: "Agus Wibowo",
    inisial: "AW",
    kategori: "ritel",
    lokasiLapak: "Blok D1 - Zona Barat",
    status: "absen",
  },
  {
    id: "APDC-088",
    namaUsaha: "Es Jeruk Peras Segar",
    pemilik: "Joko Riyadi",
    inisial: "JR",
    kategori: "kuliner",
    lokasiLapak: "Blok A5 - Zona Timur",
    status: "hadir",
  },
];

const KATEGORI_STYLE: Record<KategoriUsaha, { label: string; bg: string; text: string }> = {
  kuliner: { label: "Kuliner", bg: "bg-tertiary-container/15", text: "text-on-tertiary-container" },
  kerajinan: { label: "Kerajinan", bg: "bg-primary-container/20", text: "text-on-primary-container" },
  ritel: { label: "Ritel", bg: "bg-surface-container-high", text: "text-on-surface-variant" },
};

const STATUS_STYLE: Record<StatusKehadiran, { label: string; bg: string; text: string }> = {
  hadir: { label: "Hadir", bg: "bg-secondary-container/40", text: "text-on-secondary-container" },
  absen: { label: "Absen", bg: "bg-error-container/60", text: "text-on-error-container" },
};

export default function DataPedagangPage() {
  const totalPedagang = 150;

  return (
    <div className="flex flex-col gap-lg">
      <div>
        <h2 className="text-headline-lg text-on-surface">Data Pedagang</h2>
        <p className="mt-xs max-w-2xl text-body-md text-on-surface-variant">
          Daftar seluruh pedagang yang terdaftar dan aktif di area CFD.
        </p>
      </div>

      {/* Search & filter */}
      <div className="flex flex-col gap-sm rounded-lg border border-outline-variant bg-surface-container-lowest p-sm sm:flex-row sm:items-center">
        <div className="flex flex-1 items-center gap-sm rounded-md bg-surface-container-low px-md py-sm">
          <Search className="h-4 w-4 text-on-surface-variant" strokeWidth={2} />
          <input
            type="text"
            placeholder="Cari ID atau Nama Usaha..."
            className="w-full bg-transparent text-body-md text-on-surface placeholder:text-on-surface-variant focus:outline-none"
          />
        </div>
        <button
          type="button"
          className="flex items-center gap-sm rounded-md border border-outline-variant px-md py-sm text-label-md text-on-surface-variant transition-colors hover:bg-surface-container-low"
        >
          <ListFilter className="h-[18px] w-[18px]" strokeWidth={2} />
        </button>
        <button
          type="button"
          className="flex items-center justify-center gap-xs rounded-md bg-surface-container-low px-md py-sm text-label-md text-on-surface transition-colors hover:bg-surface-container"
        >
          Semua Kategori
        </button>
        <button
          type="button"
          className="flex items-center justify-center gap-xs rounded-md bg-surface-container-low px-md py-sm text-label-md text-on-surface transition-colors hover:bg-surface-container"
        >
          Semua Zona
        </button>
      </div>

      {/* Tabel pedagang */}
      <div className="overflow-hidden rounded-lg border border-outline-variant bg-surface-container-lowest">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-outline-variant bg-surface-container-low text-label-sm text-on-surface-variant">
                <th className="px-lg py-sm font-medium">ID Pedagang</th>
                <th className="px-lg py-sm font-medium">Profil Usaha</th>
                <th className="px-lg py-sm font-medium">Kategori</th>
                <th className="px-lg py-sm font-medium">Lokasi Lapak</th>
                <th className="px-lg py-sm font-medium">Status Kehadiran</th>
                <th className="px-lg py-sm text-right font-medium">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {PEDAGANG.map((p) => {
                const kategori = KATEGORI_STYLE[p.kategori];
                const status = STATUS_STYLE[p.status];
                return (
                  <tr key={p.id} className="border-b border-outline-variant last:border-0">
                    <td className="px-lg py-md text-body-md text-on-surface-variant">{p.id}</td>
                    <td className="px-lg py-md">
                      <div className="flex items-center gap-sm">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-fixed text-label-sm font-semibold text-on-primary-fixed">
                          {p.inisial}
                        </span>
                        <div>
                          <p className="text-label-md font-semibold text-on-surface">
                            {p.namaUsaha}
                          </p>
                          <p className="text-label-sm text-on-surface-variant">{p.pemilik}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-lg py-md">
                      <span
                        className={`inline-flex rounded-full px-sm py-1 text-label-sm ${kategori.bg} ${kategori.text}`}
                      >
                        {kategori.label}
                      </span>
                    </td>
                    <td className="px-lg py-md text-body-md text-on-surface-variant">
                      {p.lokasiLapak}
                    </td>
                    <td className="px-lg py-md">
                      <span
                        className={`inline-flex rounded-full px-sm py-1 text-label-sm ${status.bg} ${status.text}`}
                      >
                        {status.label}
                      </span>
                    </td>
                    <td className="px-lg py-md text-right">
                      <button
                        type="button"
                        aria-label={`Lihat detail ${p.namaUsaha}`}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container-low"
                      >
                        <ChevronRight className="h-4 w-4" strokeWidth={2} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-sm border-t border-outline-variant px-lg py-sm">
          <p className="text-label-sm text-on-surface-variant">
            Menampilkan 1-{PEDAGANG.length} dari {totalPedagang} pedagang
          </p>
          <div className="flex items-center gap-xs">
            <button
              type="button"
              aria-label="Halaman sebelumnya"
              className="flex h-7 w-7 items-center justify-center rounded-md text-on-surface-variant hover:bg-surface-container-low"
            >
              <ChevronLeft className="h-4 w-4" strokeWidth={2} />
            </button>
            <button
              type="button"
              className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-label-sm text-on-primary"
            >
              1
            </button>
            <button
              type="button"
              className="flex h-7 w-7 items-center justify-center rounded-md text-label-sm text-on-surface-variant hover:bg-surface-container-low"
            >
              2
            </button>
            <button
              type="button"
              className="flex h-7 w-7 items-center justify-center rounded-md text-label-sm text-on-surface-variant hover:bg-surface-container-low"
            >
              3
            </button>
            <span className="px-xs text-label-sm text-on-surface-variant">...</span>
            <button
              type="button"
              aria-label="Halaman berikutnya"
              className="flex h-7 w-7 items-center justify-center rounded-md text-on-surface-variant hover:bg-surface-container-low"
            >
              <ChevronRight className="h-4 w-4" strokeWidth={2} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}