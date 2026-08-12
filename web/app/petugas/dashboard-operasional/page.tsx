import {
  Radio,
  Store,
  Users,
  AlertTriangle,
  RefreshCcw,
  MoreVertical,
  MapPin,
  Plus,
  Minus,
} from "lucide-react";

// Dashboard utama buat petugas lapangan CFD -- ringkasan status area,
// keterisian lapak, petugas yang bertugas, sebaran lapak di peta, dan
// kehadiran pedagang terbaru. Datanya masih dummy, tinggal disambungkan
// ke endpoint operasional begitu backend-nya siap.

type Kehadiran = {
  kodeLapak: string;
  nama: string;
  kategori: string;
  waktu: string;
};

const KEHADIRAN_TERBARU: Kehadiran[] = [
  { kodeLapak: "A12", nama: "Warung Nasi Uduk...", kategori: "Makanan Berat", waktu: "06:15" },
  { kodeLapak: "B05", nama: "Es Jeruk Peras S...", kategori: "Minuman", waktu: "06:30" },
  { kodeLapak: "C42", nama: "Dimsum Rakyat 99", kategori: "Camilan", waktu: "06:42" },
  { kodeLapak: "A08", nama: "Sate Padang Ma...", kategori: "Makanan Berat", waktu: "07:05" },
  { kodeLapak: "D15", nama: "Kopi Keliling Nus...", kategori: "Minuman", waktu: "07:12" },
];

// Titik pin di peta -- posisi dalam persen (top/left) relatif ke kotak peta.
const PETA_PIN = [
  { top: "12%", left: "22%", warna: "bg-error" },
  { top: "18%", left: "58%", warna: "bg-primary" },
  { top: "30%", left: "40%", warna: "bg-secondary" },
  { top: "34%", left: "64%", warna: "bg-primary" },
  { top: "46%", left: "50%", warna: "bg-secondary" },
  { top: "52%", left: "70%", warna: "bg-primary" },
  { top: "58%", left: "36%", warna: "bg-secondary" },
  { top: "70%", left: "56%", warna: "bg-error" },
];

export default function DashboardOperasionalPage() {
  const totalLapak = 300;
  const lapakTerisi = 248;
  const persenTerisi = Math.round((lapakTerisi / totalLapak) * 1000) / 10;

  return (
    <div className="flex flex-col gap-lg">
      <div>
        <h2 className="text-headline-lg text-on-surface">Dashboard Operasional</h2>
        <p className="mt-xs max-w-2xl text-body-md text-on-surface-variant">
          Ringkasan status Car Free Day di area yang kamu tugaskan hari ini.
        </p>
      </div>

      {/* Kartu ringkasan */}
      <div className="grid grid-cols-1 gap-md sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg bg-primary p-lg text-on-primary">
          <div className="flex items-center justify-between">
            <span className="text-label-sm uppercase tracking-wide text-on-primary/70">
              Status Area
            </span>
            <Radio className="h-4 w-4" strokeWidth={2} />
          </div>
          <p className="mt-xs text-headline-md">Aktif</p>
          <span className="mt-md inline-flex items-center gap-xs rounded-md bg-on-primary/10 px-sm py-1 text-label-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-secondary-fixed" />
            Sedang Berlangsung (06:00 - 11:00)
          </span>
        </div>

        <div className="rounded-lg border border-outline-variant bg-surface-container-lowest p-lg">
          <div className="flex items-center justify-between">
            <span className="text-label-sm uppercase tracking-wide text-on-surface-variant">
              Keterisian Lapak
            </span>
            <Store className="h-4 w-4 text-on-surface-variant" strokeWidth={2} />
          </div>
          <p className="mt-xs text-headline-md text-on-surface">
            {lapakTerisi}
            <span className="text-body-md text-on-surface-variant"> / {totalLapak}</span>
          </p>
          <div className="mt-md h-1.5 w-full overflow-hidden rounded-full bg-surface-container-high">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${persenTerisi}%` }}
            />
          </div>
          <p className="mt-xs text-label-sm text-on-surface-variant">{persenTerisi}% Terisi</p>
        </div>

        <div className="rounded-lg border border-outline-variant bg-surface-container-lowest p-lg">
          <div className="flex items-center justify-between">
            <span className="text-label-sm uppercase tracking-wide text-on-surface-variant">
              Petugas Aktif
            </span>
            <Users className="h-4 w-4 text-on-surface-variant" strokeWidth={2} />
          </div>
          <p className="mt-xs text-headline-md text-on-surface">12</p>
          <p className="mt-md text-label-sm text-on-surface-variant">Semua pos terjaga</p>
        </div>

        <div className="flex flex-col gap-sm">
          <button
            type="button"
            className="flex items-center justify-center gap-sm rounded-lg bg-error px-lg py-md text-label-md text-on-error transition-colors hover:opacity-90"
          >
            <AlertTriangle className="h-[18px] w-[18px]" strokeWidth={2} />
            Lapor Pelanggaran
          </button>
          <button
            type="button"
            className="flex items-center justify-center gap-sm rounded-lg border border-outline-variant bg-surface-container-lowest px-lg py-md text-label-md text-on-surface transition-colors hover:bg-surface-container-low"
          >
            <RefreshCcw className="h-[18px] w-[18px]" strokeWidth={2} />
            Ubah Status Operasional
          </button>
        </div>
      </div>

      {/* Peta & kehadiran terbaru */}
      <div className="grid grid-cols-1 gap-md lg:grid-cols-[1fr_320px]">
        <div className="rounded-lg border border-outline-variant bg-surface-container-lowest p-lg">
          <div className="flex items-center justify-between">
            <h3 className="text-title-lg text-on-surface">Sebaran Lapak Area A - Sudirman</h3>
            <div className="flex items-center gap-md text-label-sm text-on-surface-variant">
              <span className="flex items-center gap-xs">
                <span className="h-2 w-2 rounded-full bg-secondary" />
                Terisi
              </span>
              <span className="flex items-center gap-xs">
                <span className="h-2 w-2 rounded-full border border-outline" />
                Kosong
              </span>
            </div>
          </div>

          <div className="relative mt-md h-[320px] overflow-hidden rounded-md border border-outline-variant bg-surface-container-low">
            {/* Peta statis/dekoratif -- integrasi peta interaktif menyusul */}
            <svg
              className="absolute inset-0 h-full w-full text-outline-variant"
              preserveAspectRatio="none"
              viewBox="0 0 400 320"
            >
              <path d="M40 0 L60 320" stroke="currentColor" strokeWidth="2" fill="none" />
              <path d="M0 90 L400 70" stroke="currentColor" strokeWidth="2" fill="none" />
              <path d="M0 220 L400 240" stroke="currentColor" strokeWidth="2" fill="none" />
              <path d="M180 0 L200 320" stroke="currentColor" strokeWidth="1.5" fill="none" />
              <path d="M290 0 L270 320" stroke="currentColor" strokeWidth="1.5" fill="none" />
            </svg>

            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-title-lg font-semibold text-on-surface-variant/70">
              Jakarta
            </span>

            {PETA_PIN.map((pin, i) => (
              <span
                key={i}
                className={`absolute flex h-6 w-6 -translate-x-1/2 -translate-y-full items-center justify-center rounded-full ${pin.warna} text-on-primary shadow-sm`}
                style={{ top: pin.top, left: pin.left }}
              >
                <MapPin className="h-3.5 w-3.5" strokeWidth={2.5} />
              </span>
            ))}

            <div className="absolute bottom-sm right-sm flex flex-col overflow-hidden rounded-md border border-outline-variant bg-surface-container-lowest">
              <button
                type="button"
                aria-label="Perbesar peta"
                className="flex h-7 w-7 items-center justify-center text-on-surface-variant hover:bg-surface-container-low"
              >
                <Plus className="h-3.5 w-3.5" strokeWidth={2} />
              </button>
              <button
                type="button"
                aria-label="Perkecil peta"
                className="flex h-7 w-7 items-center justify-center border-t border-outline-variant text-on-surface-variant hover:bg-surface-container-low"
              >
                <Minus className="h-3.5 w-3.5" strokeWidth={2} />
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-outline-variant bg-surface-container-lowest p-lg">
          <div className="flex items-center justify-between">
            <h3 className="text-title-lg text-on-surface">Kehadiran Terbaru</h3>
            <button
              type="button"
              aria-label="Opsi lainnya"
              className="flex h-7 w-7 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container-low"
            >
              <MoreVertical className="h-4 w-4" strokeWidth={2} />
            </button>
          </div>

          <ul className="mt-md flex flex-col gap-sm">
            {KEHADIRAN_TERBARU.map((item) => (
              <li
                key={item.kodeLapak}
                className="flex items-center gap-sm rounded-md bg-surface-container-low p-sm"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary-container text-label-sm font-semibold text-on-primary-container">
                  {item.kodeLapak}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-label-md text-on-surface">{item.nama}</p>
                  <p className="text-label-sm text-on-surface-variant">{item.kategori}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-xs">
                  <span className="text-label-sm text-on-surface-variant">{item.waktu}</span>
                  <span className="rounded-full bg-secondary-container/40 px-sm py-[1px] text-label-sm text-on-secondary-container">
                    Hadir
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}