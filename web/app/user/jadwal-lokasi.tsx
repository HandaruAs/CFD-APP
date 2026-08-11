import Link from "next/link";
import { CalendarX2, Hourglass, IdCard } from "lucide-react";

export default function JadwalLokasiPage() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center text-center">
      <div className="relative mb-lg">
        <span className="flex h-28 w-28 items-center justify-center rounded-xl bg-surface-container-high text-on-surface-variant">
          <CalendarX2 className="h-11 w-11" strokeWidth={1.75} />
        </span>
        <span className="absolute -bottom-2 -right-2 flex h-9 w-9 items-center justify-center rounded-md bg-surface-container-lowest text-tertiary shadow-sm">
          <Hourglass className="h-[18px] w-[18px]" strokeWidth={2} />
        </span>
      </div>

      <h2 className="mb-sm text-headline-lg text-on-surface">
        Jadwal Belum Tersedia
      </h2>
      <p className="mb-lg max-w-md text-body-lg text-on-surface-variant">
        Selesaikan pendaftaran dan tunggu verifikasi akun Anda disetujui
        untuk dapat melihat lokasi dan jadwal berjualan Anda di CFD.
      </p>

      <Link
        href="/status-verifikasi"
        className="flex items-center gap-sm rounded-md bg-primary px-lg py-sm text-label-md text-on-primary transition-colors hover:bg-primary-container"
      >
        <IdCard className="h-[18px] w-[18px]" strokeWidth={2} />
        Cek Status Verifikasi
      </Link>
    </div>
  );
}
