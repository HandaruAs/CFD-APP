import {
  Clock,
  Hourglass,
  History,
  CircleX,
  CalendarCheck2,
  Link2,
  Copy,
  Lock,
  LockOpen,
} from "lucide-react";

// Halaman pengaturan jam operasional CFD -- petugas bisa lihat sesi yang
// sedang berjalan, mengubah jam mulai/selesai, membuka/menutup pendaftaran
// pedagang, dan melihat riwayat sesi sebelumnya. Data sesi, pendaftaran &
// riwayat masih dummy, tinggal disambungkan ke endpoint jadwal operasional
// begitu backend-nya siap.

type StatusRiwayat = "normal" | "diperpanjang" | "diakhiri-awal";

type Riwayat = {
  tanggal: string;
  jamMulai: string;
  jamSelesai: string;
  durasi: string;
  status: StatusRiwayat;
};

const RIWAYAT: Riwayat[] = [
  { tanggal: "Minggu, 24 Okt 2023", jamMulai: "06:05", jamSelesai: "11:00", durasi: "4j 55m", status: "normal" },
  { tanggal: "Minggu, 17 Okt 2023", jamMulai: "06:00", jamSelesai: "11:15", durasi: "5j 15m", status: "diperpanjang" },
  { tanggal: "Minggu, 10 Okt 2023", jamMulai: "06:00", jamSelesai: "11:00", durasi: "5j 00m", status: "normal" },
  { tanggal: "Minggu, 03 Okt 2023", jamMulai: "06:00", jamSelesai: "10:30", durasi: "4j 30m", status: "diakhiri-awal" },
  { tanggal: "Minggu, 26 Sep 2023", jamMulai: "06:00", jamSelesai: "11:00", durasi: "5j 00m", status: "normal" },
];

const STATUS_STYLE: Record<StatusRiwayat, { label: string; bg: string; text: string }> = {
  normal: {
    label: "Selesai Normal",
    bg: "bg-secondary-container/40",
    text: "text-on-secondary-container",
  },
  diperpanjang: {
    label: "Diperpanjang",
    bg: "bg-tertiary-container/15",
    text: "text-on-tertiary-container",
  },
  "diakhiri-awal": {
    label: "Diakhiri Awal",
    bg: "bg-error-container/60",
    text: "text-on-error-container",
  },
};

// Progres lingkaran sisa waktu -- 02:30 dari total sesi 06:00-11:00 (5 jam)
const SISA_MENIT = 150; // 02:30
const TOTAL_MENIT = 300; // 05:00
const RADIUS = 54;
const CIRC = 2 * Math.PI * RADIUS;
const PROGRESS = (SISA_MENIT / TOTAL_MENIT) * CIRC;

export default function JamOperasionalPage() {
  return (
    <div className="flex flex-col gap-lg">
      <div>
        <h2 className="text-headline-lg text-on-surface">Jam Operasional</h2>
        <p className="mt-xs max-w-2xl text-body-md text-on-surface-variant">
          Atur jadwal aktif dan durasi kegiatan Car Free Day.
        </p>
      </div>

      {/* Pendaftaran pedagang -- buka/tutup akses ke website pendaftaran umkm.
          Status & link masih dummy, tinggal disambungkan ke endpoint
          pengaturan pendaftaran begitu backend-nya siap. */}
      <div className="rounded-lg border border-outline-variant bg-surface-container-lowest p-lg">
        <div className="flex flex-wrap items-center justify-between gap-sm">
          <h3 className="text-title-lg text-on-surface">Pendaftaran Pedagang</h3>
          <span className="flex items-center gap-xs rounded-full bg-secondary-container/40 px-sm py-1 text-label-sm text-on-secondary-container">
            <span className="h-1.5 w-1.5 rounded-full bg-secondary" />
            Pendaftaran Dibuka
          </span>
        </div>
        <p className="mt-xs text-body-md text-on-surface-variant">
          Buka pendaftaran supaya pedagang baru bisa mendaftar lewat website pendaftaran UMKM sebelum
          hari CFD berlangsung.
        </p>

        <div className="mt-md flex flex-col gap-sm sm:flex-row sm:items-center">
          <div className="flex flex-1 items-center gap-sm rounded-md bg-surface-container-low px-md py-sm">
            <Link2 className="h-4 w-4 shrink-0 text-on-surface-variant" strokeWidth={2} />
            <span className="truncate text-body-md text-on-surface-variant">
              cfdsurabaya.id/pendaftaran
            </span>
          </div>
          <button
            type="button"
            className="flex shrink-0 items-center justify-center gap-sm rounded-md border border-outline-variant px-md py-sm text-label-md text-on-surface transition-colors hover:bg-surface-container-low"
          >
            <Copy className="h-[18px] w-[18px]" strokeWidth={2} />
            Salin Link
          </button>
        </div>

        <div className="mt-md flex flex-wrap gap-sm border-t border-outline-variant pt-md">
          <button
            type="button"
            className="flex items-center gap-sm rounded-md bg-error-container/60 px-lg py-sm text-label-md text-on-error-container transition-colors hover:bg-error-container"
          >
            <Lock className="h-[18px] w-[18px]" strokeWidth={2} />
            Tutup Pendaftaran
          </button>
          <button
            type="button"
            className="flex items-center gap-sm rounded-md border border-outline-variant px-lg py-sm text-label-md text-on-surface-variant transition-colors hover:bg-surface-container-low"
          >
            <LockOpen className="h-[18px] w-[18px]" strokeWidth={2} />
            Buka Pendaftaran
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-md lg:grid-cols-[1fr_280px]">
        <div className="rounded-lg border border-outline-variant bg-surface-container-lowest p-lg">
          <div className="flex items-center justify-between">
            <h3 className="text-title-lg text-on-surface">Status Sesi CFD</h3>
            <span className="flex items-center gap-xs rounded-full bg-secondary-container/40 px-sm py-1 text-label-sm text-on-secondary-container">
              <span className="h-1.5 w-1.5 rounded-full bg-secondary" />
              Sedang Berlangsung
            </span>
          </div>

          <div className="mt-md grid grid-cols-1 gap-sm sm:grid-cols-2">
            <div className="flex items-center gap-sm rounded-md bg-surface-container-low p-md">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary text-on-primary">
                <Clock className="h-[18px] w-[18px]" strokeWidth={2} />
              </span>
              <div>
                <p className="text-label-sm uppercase tracking-wide text-on-surface-variant">
                  Jam Mulai
                </p>
                <p className="text-title-lg text-on-surface">06.00</p>
              </div>
            </div>
            <div className="flex items-center gap-sm rounded-md bg-error-container/30 p-md">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-error-container text-on-error-container">
                <Hourglass className="h-[18px] w-[18px]" strokeWidth={2} />
              </span>
              <div>
                <p className="text-label-sm uppercase tracking-wide text-on-surface-variant">
                  Jam Selesai
                </p>
                <p className="text-title-lg text-on-surface">11.00</p>
              </div>
            </div>
          </div>

          <div className="mt-lg flex flex-wrap gap-sm border-t border-outline-variant pt-md">
            <button
              type="button"
              className="flex items-center gap-sm rounded-md bg-error-container/60 px-lg py-sm text-label-md text-on-error-container transition-colors hover:bg-error-container"
            >
              <CircleX className="h-[18px] w-[18px]" strokeWidth={2} />
              Akhiri Sesi Lebih Awal
            </button>
            <button
              type="button"
              className="flex items-center gap-sm rounded-md bg-primary px-lg py-sm text-label-md text-on-primary transition-colors hover:bg-primary-container"
            >
              <CalendarCheck2 className="h-[18px] w-[18px]" strokeWidth={2} />
              Terapkan Perubahan
            </button>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center gap-sm rounded-lg border border-outline-variant bg-surface-container-lowest p-lg text-center">
          <div className="relative flex h-32 w-32 items-center justify-center">
            <svg className="h-32 w-32 -rotate-90" viewBox="0 0 120 120">
              <circle
                cx="60"
                cy="60"
                r={RADIUS}
                fill="none"
                stroke="var(--color-surface-container-high)"
                strokeWidth="10"
              />
              <circle
                cx="60"
                cy="60"
                r={RADIUS}
                fill="none"
                stroke="var(--color-primary)"
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={CIRC}
                strokeDashoffset={CIRC - PROGRESS}
              />
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="text-title-lg font-semibold text-on-surface">02:30</span>
              <span className="text-label-sm text-on-surface-variant">Sisa Waktu</span>
            </div>
          </div>
          <p className="text-label-sm text-on-surface-variant">
            Sesi saat ini akan berakhir pada 11.00 WIB.
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-outline-variant bg-surface-container-lowest p-lg">
        <div className="mb-md flex items-center gap-sm">
          <History className="h-[18px] w-[18px] text-on-surface-variant" strokeWidth={2} />
          <h3 className="text-title-lg text-on-surface">Riwayat Operasional</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-outline-variant text-label-sm text-on-surface-variant">
                <th className="px-sm py-sm font-medium">Tanggal</th>
                <th className="px-sm py-sm font-medium">Jam Mulai</th>
                <th className="px-sm py-sm font-medium">Jam Selesai</th>
                <th className="px-sm py-sm font-medium">Durasi</th>
                <th className="px-sm py-sm font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {RIWAYAT.map((row) => {
                const style = STATUS_STYLE[row.status];
                return (
                  <tr
                    key={row.tanggal}
                    className="border-b border-outline-variant last:border-0"
                  >
                    <td className="px-sm py-sm text-body-md text-on-surface">{row.tanggal}</td>
                    <td className="px-sm py-sm text-body-md text-on-surface-variant">
                      {row.jamMulai}
                    </td>
                    <td className="px-sm py-sm text-body-md text-on-surface-variant">
                      {row.jamSelesai}
                    </td>
                    <td className="px-sm py-sm text-body-md text-on-surface-variant">
                      {row.durasi}
                    </td>
                    <td className="px-sm py-sm">
                      <span
                        className={`inline-flex items-center rounded-full px-sm py-1 text-label-sm ${style.bg} ${style.text}`}
                      >
                        {style.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}