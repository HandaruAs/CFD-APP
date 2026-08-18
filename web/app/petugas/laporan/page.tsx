import {
  Search,
  ListFilter,
  Download,
  ChevronRight,
  ChevronLeft,
  UserCheck,
  Store,
  Clock,
} from "lucide-react";

// Halaman laporan kehadiran -- daftar pedagang yang sudah check-in (scan QR)
// ke area CFD hari ini, lengkap dengan waktu check-in-nya. Data masih dummy,
// tinggal disambungkan ke GET /api/checkin begitu endpoint-nya siap.

type KategoriUsaha = "kuliner" | "kerajinan" | "ritel";

type Kehadiran = {
  id: string;
  namaUsaha: string;
  pemilik: string;
  inisial: string;
  kategori: KategoriUsaha;
  lokasiLapak: string;
  waktuCheckin: string;
  metode: string;
};

const KEHADIRAN: Kehadiran[] = [
  {
    id: "APDC-001",
    namaUsaha: "Sate Madura Cak Budi",
    pemilik: "Budi Santosa",
    inisial: "SB",
    kategori: "kuliner",
    lokasiLapak: "Blok A1 - Zona Timur",
    waktuCheckin: "06:15",
    metode: "Scan QR",
  },
  {
    id: "APDC-042",
    namaUsaha: "Batik Aminah",
    pemilik: "Siti Aminah",
    inisial: "SA",
    kategori: "kerajinan",
    lokasiLapak: "Blok C3 - Zona Tengah",
    waktuCheckin: "06:30",
    metode: "Scan QR",
  },
  {
    id: "APDC-077",
    namaUsaha: "Dimsum Rakyat 99",
    pemilik: "Hendra Wijaya",
    inisial: "HW",
    kategori: "kuliner",
    lokasiLapak: "Blok C4 - Zona Tengah",
    waktuCheckin: "06:42",
    metode: "Scan QR",
  },
  {
    id: "APDC-023",
    namaUsaha: "Sate Padang Mak Etek",
    pemilik: "Yulia Etek",
    inisial: "YE",
    kategori: "kuliner",
    lokasiLapak: "Blok A8 - Zona Timur",
    waktuCheckin: "07:05",
    metode: "Scan QR",
  },
  {
    id: "APDC-088",
    namaUsaha: "Kopi Keliling Nusantara",
    pemilik: "Joko Riyadi",
    inisial: "JR",
    kategori: "kuliner",
    lokasiLapak: "Blok D2 - Zona Barat",
    waktuCheckin: "07:12",
    metode: "Scan QR",
  },
];

const KATEGORI_STYLE: Record<KategoriUsaha, { label: string; bg: string; text: string }> = {
  kuliner: { label: "Kuliner", bg: "bg-tertiary-container/15", text: "text-on-tertiary-container" },
  kerajinan: { label: "Kerajinan", bg: "bg-primary-container/20", text: "text-on-primary-container" },
  ritel: { label: "Ritel", bg: "bg-surface-container-high", text: "text-on-surface-variant" },
};

export default function LaporanPage() {
  const totalTerdaftar = 150;
  const totalCheckin = KEHADIRAN.length;
  const persenHadir = Math.round((totalCheckin / totalTerdaftar) * 1000) / 10;

  return (
    <div className="flex flex-col gap-lg">
      <div className="flex flex-wrap items-start justify-between gap-md">
        <div>
          <h2 className="text-headline-lg text-on-surface">Laporan Kehadiran Pedagang</h2>
          <p className="mt-xs max-w-2xl text-body-md text-on-surface-variant">
            Daftar pedagang yang sudah check-in via scan QR ke area CFD hari ini.
          </p>
        </div>
        <button
          type="button"
          className="flex items-center gap-sm rounded-md bg-primary px-md py-sm text-label-md text-on-primary transition-colors hover:bg-primary-container"
        >
          <Download className="h-[18px] w-[18px]" strokeWidth={2} />
          Unduh Laporan
        </button>
      </div>

      {/* Kartu ringkasan */}
      <div className="grid grid-cols-1 gap-md sm:grid-cols-3">
        <div className="rounded-lg border border-outline-variant bg-surface-container-lowest p-lg">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-on-primary">
            <UserCheck className="h-[18px] w-[18px]" strokeWidth={2} />
          </span>
          <p className="mt-md text-label-sm uppercase tracking-wide text-on-surface-variant">
            Sudah Check-in
          </p>
          <p className="text-headline-md text-on-surface">{totalCheckin}</p>
        </div>

        <div className="rounded-lg border border-outline-variant bg-surface-container-lowest p-lg">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-secondary-container text-on-secondary-container">
            <Store className="h-[18px] w-[18px]" strokeWidth={2} />
          </span>
          <p className="mt-md text-label-sm uppercase tracking-wide text-on-surface-variant">
            Total Terdaftar
          </p>
          <p className="text-headline-md text-on-surface">{totalTerdaftar}</p>
        </div>

        <div className="rounded-lg border border-outline-variant bg-surface-container-lowest p-lg">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-tertiary-container text-on-tertiary-container">
            <Clock className="h-[18px] w-[18px]" strokeWidth={2} />
          </span>
          <p className="mt-md text-label-sm uppercase tracking-wide text-on-surface-variant">
            Persentase Kehadiran
          </p>
          <p className="text-headline-md text-on-surface">{persenHadir}%</p>
        </div>
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
          Hari Ini
        </button>
      </div>

      {/* Tabel kehadiran */}
      <div className="overflow-hidden rounded-lg border border-outline-variant bg-surface-container-lowest">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-outline-variant bg-surface-container-low text-label-sm text-on-surface-variant">
                <th className="px-lg py-sm font-medium">Waktu Check-in</th>
                <th className="px-lg py-sm font-medium">ID Pedagang</th>
                <th className="px-lg py-sm font-medium">Profil Usaha</th>
                <th className="px-lg py-sm font-medium">Kategori</th>
                <th className="px-lg py-sm font-medium">Lokasi Lapak</th>
                <th className="px-lg py-sm font-medium">Metode</th>
                <th className="px-lg py-sm text-right font-medium">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {KEHADIRAN.map((k) => {
                const kategori = KATEGORI_STYLE[k.kategori];
                return (
                  <tr key={k.id} className="border-b border-outline-variant last:border-0">
                    <td className="px-lg py-md text-body-md text-on-surface">{k.waktuCheckin}</td>
                    <td className="px-lg py-md text-body-md text-on-surface-variant">{k.id}</td>
                    <td className="px-lg py-md">
                      <div className="flex items-center gap-sm">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-fixed text-label-sm font-semibold text-on-primary-fixed">
                          {k.inisial}
                        </span>
                        <div>
                          <p className="text-label-md font-semibold text-on-surface">
                            {k.namaUsaha}
                          </p>
                          <p className="text-label-sm text-on-surface-variant">{k.pemilik}</p>
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
                      {k.lokasiLapak}
                    </td>
                    <td className="px-lg py-md">
                      <span className="inline-flex rounded-full bg-secondary-container/40 px-sm py-1 text-label-sm text-on-secondary-container">
                        {k.metode}
                      </span>
                    </td>
                    <td className="px-lg py-md text-right">
                      <button
                        type="button"
                        aria-label={`Lihat detail ${k.namaUsaha}`}
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
            Menampilkan 1-{KEHADIRAN.length} dari {totalCheckin} pedagang yang sudah check-in
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
