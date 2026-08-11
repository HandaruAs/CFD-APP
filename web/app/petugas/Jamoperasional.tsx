"use client";

import { Clock3, Timer } from "lucide-react";

// -----------------------------------------------------------------------------
// Types & data statis (nanti tinggal disambungkan ke API jam operasional)
// -----------------------------------------------------------------------------

type SesiStatus = "aktif" | "selesai" | "diperpanjang" | "dibatalkan";

const STATUS_STYLES: Record<
  SesiStatus,
  { label: string; bg: string; text: string }
> = {
  aktif: {
    label: "Sedang Berlangsung",
    bg: "bg-secondary-container/40",
    text: "text-on-secondary-container",
  },
  selesai: {
    label: "Selesai Normal",
    bg: "bg-secondary-container/40",
    text: "text-on-secondary-container",
  },
  diperpanjang: {
    label: "Diperpanjang",
    bg: "bg-tertiary-container/15",
    text: "text-on-tertiary-container",
  },
  dibatalkan: {
    label: "Dibatalkan Awal",
    bg: "bg-error-container/60",
    text: "text-on-error-container",
  },
};

function SesiStatusBadge({ status }: { status: SesiStatus }) {
  const s = STATUS_STYLES[status];
  return (
    <span
      className={`inline-flex items-center gap-xs rounded-full px-sm py-1 text-label-sm ${s.bg} ${s.text}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {s.label}
    </span>
  );
}

type RiwayatRow = {
  tanggal: string;
  jamMulai: string;
  jamSelesai: string;
  durasi: string;
  status: SesiStatus;
};

const RIWAYAT: RiwayatRow[] = [
  {
    tanggal: "Minggu, 24 Okt 2023",
    jamMulai: "06:05",
    jamSelesai: "11:00",
    durasi: "4j 55m",
    status: "selesai",
  },
  {
    tanggal: "Minggu, 17 Okt 2023",
    jamMulai: "06:00",
    jamSelesai: "11:15",
    durasi: "5j 15m",
    status: "diperpanjang",
  },
  {
    tanggal: "Minggu, 10 Okt 2023",
    jamMulai: "06:00",
    jamSelesai: "11:00",
    durasi: "5j 00m",
    status: "selesai",
  },
  {
    tanggal: "Minggu, 03 Okt 2023",
    jamMulai: "06:00",
    jamSelesai: "10:30",
    durasi: "4j 30m",
    status: "dibatalkan",
  },
  {
    tanggal: "Minggu, 26 Sep 2023",
    jamMulai: "06:00",
    jamSelesai: "11:00",
    durasi: "5j 00m",
    status: "selesai",
  },
];

const SISA_PERSEN = 65; // porsi lingkaran sisa waktu yang sudah terisi (visual saja)

// -----------------------------------------------------------------------------

export default function JamOperasional() {
  return (
    <div className="flex flex-col gap-lg">
      <div>
        <h1 className="text-title-lg text-on-surface">Jam Operasional</h1>
        <p className="text-label-md text-on-surface-variant">
          Atur jadwal aktif dan durasi kegiatan Car Free Day.
        </p>
      </div>

      {/* Kartu status sesi */}
      <section className="rounded-lg border border-outline-variant bg-surface-container-lowest p-lg">
        <div className="mb-lg flex items-center justify-between">
          <h2 className="text-label-md font-semibold text-on-surface">
            Status Sesi CFD
          </h2>
          <SesiStatusBadge status="aktif" />
        </div>

        <div className="flex flex-col items-stretch gap-lg lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 flex-col gap-md sm:flex-row">
            <div className="flex flex-1 items-center gap-sm rounded-md border border-outline-variant px-md py-sm">
              <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-on-primary">
                <Clock3 className="h-[18px] w-[18px]" strokeWidth={2} />
              </span>
              <div>
                <p className="text-label-sm text-on-surface-variant">
                  JAM MULAI
                </p>
                <p className="text-label-md font-semibold text-on-surface">
                  06:00
                </p>
              </div>
            </div>

            <div className="flex flex-1 items-center gap-sm rounded-md border border-outline-variant px-md py-sm">
              <span className="flex h-9 w-9 items-center justify-center rounded-md bg-tertiary-container text-on-tertiary-container">
                <Timer className="h-[18px] w-[18px]" strokeWidth={2} />
              </span>
              <div>
                <p className="text-label-sm text-on-surface-variant">
                  JAM SELESAI
                </p>
                <p className="text-label-md font-semibold text-on-surface">
                  11:00
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center gap-xs">
            <div
              className="relative flex h-[100px] w-[100px] items-center justify-center rounded-full"
              style={{
                background: `conic-gradient(var(--color-primary) 0% ${SISA_PERSEN}%, var(--color-surface-container-high) ${SISA_PERSEN}% 100%)`,
              }}
            >
              <div className="flex h-[80px] w-[80px] flex-col items-center justify-center rounded-full bg-surface-container-lowest text-center">
                <span className="text-label-md font-semibold text-on-surface">
                  02:30
                </span>
                <span className="text-label-sm text-on-surface-variant">
                  Sisa Waktu
                </span>
              </div>
            </div>
            <p className="text-label-sm text-on-surface-variant">
              Sesi akan berakhir pada 11:00 WIB.
            </p>
          </div>
        </div>

        <div className="mt-lg flex flex-col gap-sm border-t border-outline-variant pt-lg sm:flex-row sm:justify-end">
          <button
            type="button"
            className="rounded-md border border-error/40 bg-error-container/20 px-md py-sm text-label-md text-error transition-colors hover:bg-error-container/40"
          >
            Akhiri Sesi Lebih Awal
          </button>
          <button
            type="button"
            className="rounded-md bg-primary px-md py-sm text-label-md text-on-primary transition-colors hover:opacity-90"
          >
            Terapkan Perubahan
          </button>
        </div>
      </section>

      {/* Riwayat operasional */}
      <section className="rounded-lg border border-outline-variant bg-surface-container-lowest p-lg">
        <h2 className="mb-md text-label-md font-semibold text-on-surface">
          Riwayat Operasional
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-outline-variant text-label-sm text-on-surface-variant">
                <th className="py-sm pr-md font-normal">Tanggal</th>
                <th className="py-sm pr-md font-normal">Jam Mulai</th>
                <th className="py-sm pr-md font-normal">Jam Selesai</th>
                <th className="py-sm pr-md font-normal">Durasi</th>
                <th className="py-sm pr-md font-normal">Status</th>
              </tr>
            </thead>
            <tbody>
              {RIWAYAT.map((row) => (
                <tr
                  key={row.tanggal}
                  className="border-b border-outline-variant last:border-0"
                >
                  <td className="py-sm pr-md text-label-md text-on-surface">
                    {row.tanggal}
                  </td>
                  <td className="py-sm pr-md text-label-md text-on-surface-variant">
                    {row.jamMulai}
                  </td>
                  <td className="py-sm pr-md text-label-md text-on-surface-variant">
                    {row.jamSelesai}
                  </td>
                  <td className="py-sm pr-md text-label-md text-on-surface-variant">
                    {row.durasi}
                  </td>
                  <td className="py-sm pr-md">
                    <SesiStatusBadge status={row.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}