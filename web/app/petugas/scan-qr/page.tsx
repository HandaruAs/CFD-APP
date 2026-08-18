"use client";

import { useState } from "react";
import {
  QrCode,
  ScanLine,
  CheckCircle2,
  XCircle,
  MapPin,
  Tag,
  User,
  History,
  RotateCcw,
} from "lucide-react";

// Halaman scan QR check-in pedagang -- petugas scan QR code milik pedagang
// buat ngecek apakah dia sudah terdaftar di CFD dan konfirmasi kehadirannya.
// Kamera & hasil scan masih disimulasikan (dummy), tinggal disambungkan ke
// endpoint verifikasi QR + POST check-in begitu backend-nya siap.

type StatusScan = "idle" | "scanning" | "terdaftar" | "tidak-terdaftar";

type DetailPedagang = {
  id: string;
  namaUsaha: string;
  pemilik: string;
  inisial: string;
  kategori: string;
  lokasiLapak: string;
  statusPendaftaran: string;
};

// Dummy hasil scan -- di dunia nyata ini datang dari respons endpoint
// verifikasi QR (GET /api/pedagang/verify?kode=...)
const CONTOH_TERDAFTAR: DetailPedagang = {
  id: "APDC-001",
  namaUsaha: "Sate Madura Cak Budi",
  pemilik: "Budi Santosa",
  inisial: "SB",
  kategori: "Kuliner",
  lokasiLapak: "Blok A1 - Zona Timur",
  statusPendaftaran: "Terverifikasi",
};

type RiwayatScan = {
  waktu: string;
  namaUsaha: string;
  status: "berhasil" | "gagal";
};

const RIWAYAT_SCAN: RiwayatScan[] = [
  { waktu: "07:12", namaUsaha: "Kopi Keliling Nusantara", status: "berhasil" },
  { waktu: "07:05", namaUsaha: "Sate Padang Mak Etek", status: "berhasil" },
  { waktu: "06:58", namaUsaha: "Kode QR tidak dikenali", status: "gagal" },
  { waktu: "06:42", namaUsaha: "Dimsum Rakyat 99", status: "berhasil" },
];

export default function ScanQrPage() {
  const [status, setStatus] = useState<StatusScan>("idle");
  const [sudahCheckin, setSudahCheckin] = useState(false);

  function mulaiScan() {
    setSudahCheckin(false);
    setStatus("scanning");
    // Simulasi proses scan kamera -- nanti diganti hasil asli dari
    // library QR scanner + endpoint verifikasi.
    setTimeout(() => {
      setStatus("terdaftar");
    }, 900);
  }

  function scanUlang() {
    setSudahCheckin(false);
    setStatus("idle");
  }

  function simulasiTidakTerdaftar() {
    setSudahCheckin(false);
    setStatus("tidak-terdaftar");
  }

  return (
    <div className="flex flex-col gap-lg">
      <div>
        <h2 className="text-headline-lg text-on-surface">Scan QR Pedagang</h2>
        <p className="mt-xs max-w-2xl text-body-md text-on-surface-variant">
          Pindai QR code pedagang untuk memverifikasi status pendaftaran dan mencatat kehadiran di CFD.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-md lg:grid-cols-[360px_1fr]">
        {/* Area kamera / scanner */}
        <div className="flex flex-col gap-sm rounded-lg border border-outline-variant bg-surface-container-lowest p-lg">
          <h3 className="text-title-lg text-on-surface">Pemindai</h3>

          <div className="relative mt-xs flex aspect-square w-full items-center justify-center overflow-hidden rounded-md border-2 border-dashed border-outline-variant bg-surface-container-low">
            {status === "scanning" ? (
              <>
                <ScanLine className="h-10 w-10 animate-pulse text-primary" strokeWidth={1.5} />
                <div className="absolute inset-x-6 top-1/2 h-0.5 -translate-y-1/2 animate-pulse bg-primary/70" />
              </>
            ) : (
              <div className="flex flex-col items-center gap-xs text-on-surface-variant">
                <QrCode className="h-10 w-10" strokeWidth={1.5} />
                <span className="text-label-sm">Arahkan kamera ke QR code pedagang</span>
              </div>
            )}

            {/* Sudut bingkai pemindai */}
            <span className="absolute left-3 top-3 h-5 w-5 rounded-tl-md border-l-2 border-t-2 border-primary" />
            <span className="absolute right-3 top-3 h-5 w-5 rounded-tr-md border-r-2 border-t-2 border-primary" />
            <span className="absolute bottom-3 left-3 h-5 w-5 rounded-bl-md border-b-2 border-l-2 border-primary" />
            <span className="absolute bottom-3 right-3 h-5 w-5 rounded-br-md border-b-2 border-r-2 border-primary" />
          </div>

          <button
            type="button"
            onClick={mulaiScan}
            disabled={status === "scanning"}
            className="mt-xs flex items-center justify-center gap-sm rounded-lg bg-primary px-lg py-md text-label-md text-on-primary transition-colors hover:bg-primary-container disabled:opacity-60"
          >
            <ScanLine className="h-[18px] w-[18px]" strokeWidth={2} />
            {status === "scanning" ? "Memindai..." : "Mulai Scan"}
          </button>

          {/* Tombol simulasi buat lihat kondisi tidak terdaftar -- bantu QA
              tampilan sebelum terhubung ke kamera & backend asli. */}
          <button
            type="button"
            onClick={simulasiTidakTerdaftar}
            className="flex items-center justify-center gap-sm rounded-lg border border-outline-variant px-lg py-sm text-label-sm text-on-surface-variant transition-colors hover:bg-surface-container-low"
          >
            Simulasikan QR Tidak Dikenali
          </button>
          {/* Tombol simulasi di atas cuma buat QA, hapus saat kamera asli terhubung */}
        </div>

        {/* Hasil verifikasi */}
        <div className="flex flex-col gap-md">
          <div className="rounded-lg border border-outline-variant bg-surface-container-lowest p-lg">
            <h3 className="text-title-lg text-on-surface">Hasil Verifikasi</h3>

            {status === "idle" && (
              <div className="mt-md flex flex-col items-center justify-center gap-xs rounded-md bg-surface-container-low py-xl text-center">
                <QrCode className="h-8 w-8 text-on-surface-variant" strokeWidth={1.5} />
                <p className="text-label-md text-on-surface-variant">
                  Belum ada QR yang dipindai. Tekan &quot;Mulai Scan&quot; untuk mulai.
                </p>
              </div>
            )}

            {status === "scanning" && (
              <div className="mt-md flex flex-col items-center justify-center gap-xs rounded-md bg-surface-container-low py-xl text-center">
                <ScanLine className="h-8 w-8 animate-pulse text-primary" strokeWidth={1.5} />
                <p className="text-label-md text-on-surface-variant">Memverifikasi kode QR...</p>
              </div>
            )}

            {status === "terdaftar" && (
              <div className="mt-md flex flex-col gap-md">
                <div className="flex items-center gap-sm rounded-md bg-secondary-container/40 px-md py-sm text-on-secondary-container">
                  <CheckCircle2 className="h-5 w-5 shrink-0" strokeWidth={2} />
                  <span className="text-label-md font-semibold">Pedagang Terdaftar</span>
                </div>

                <div className="flex items-start gap-sm rounded-md border border-outline-variant p-md">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-fixed text-label-md font-semibold text-on-primary-fixed">
                    {CONTOH_TERDAFTAR.inisial}
                  </span>
                  <div className="flex-1">
                    <p className="text-title-lg text-on-surface">{CONTOH_TERDAFTAR.namaUsaha}</p>
                    <p className="text-label-sm text-on-surface-variant">{CONTOH_TERDAFTAR.id}</p>

                    <div className="mt-sm grid grid-cols-1 gap-xs sm:grid-cols-2">
                      <div className="flex items-center gap-xs text-label-sm text-on-surface-variant">
                        <User className="h-3.5 w-3.5" strokeWidth={2} />
                        {CONTOH_TERDAFTAR.pemilik}
                      </div>
                      <div className="flex items-center gap-xs text-label-sm text-on-surface-variant">
                        <Tag className="h-3.5 w-3.5" strokeWidth={2} />
                        {CONTOH_TERDAFTAR.kategori}
                      </div>
                      <div className="flex items-center gap-xs text-label-sm text-on-surface-variant sm:col-span-2">
                        <MapPin className="h-3.5 w-3.5" strokeWidth={2} />
                        {CONTOH_TERDAFTAR.lokasiLapak}
                      </div>
                    </div>

                    <span className="mt-sm inline-flex items-center rounded-full bg-secondary-container/40 px-sm py-1 text-label-sm text-on-secondary-container">
                      {CONTOH_TERDAFTAR.statusPendaftaran}
                    </span>
                  </div>
                </div>

                {sudahCheckin ? (
                  <div className="flex items-center gap-sm rounded-md bg-secondary-container/40 px-md py-sm text-label-md text-on-secondary-container">
                    <CheckCircle2 className="h-[18px] w-[18px]" strokeWidth={2} />
                    Check-in berhasil dicatat pukul 07:24
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setSudahCheckin(true)}
                    className="flex items-center justify-center gap-sm rounded-lg bg-primary px-lg py-md text-label-md text-on-primary transition-colors hover:bg-primary-container"
                  >
                    <CheckCircle2 className="h-[18px] w-[18px]" strokeWidth={2} />
                    Konfirmasi Check-in
                  </button>
                )}

                <button
                  type="button"
                  onClick={scanUlang}
                  className="flex items-center justify-center gap-sm rounded-lg border border-outline-variant px-lg py-sm text-label-md text-on-surface-variant transition-colors hover:bg-surface-container-low"
                >
                  <RotateCcw className="h-[18px] w-[18px]" strokeWidth={2} />
                  Scan Pedagang Lain
                </button>
              </div>
            )}

            {status === "tidak-terdaftar" && (
              <div className="mt-md flex flex-col gap-md">
                <div className="flex items-center gap-sm rounded-md bg-error-container/60 px-md py-sm text-on-error-container">
                  <XCircle className="h-5 w-5 shrink-0" strokeWidth={2} />
                  <span className="text-label-md font-semibold">Belum Terdaftar</span>
                </div>
                <p className="text-body-md text-on-surface-variant">
                  Kode QR ini tidak cocok dengan data pedagang manapun di sistem. Arahkan pedagang untuk
                  mendaftar lebih dulu lewat halaman pendaftaran sebelum diizinkan berjualan di area CFD.
                </p>
                <button
                  type="button"
                  onClick={scanUlang}
                  className="flex items-center justify-center gap-sm rounded-lg border border-outline-variant px-lg py-sm text-label-md text-on-surface-variant transition-colors hover:bg-surface-container-low"
                >
                  <RotateCcw className="h-[18px] w-[18px]" strokeWidth={2} />
                  Coba Scan Lagi
                </button>
              </div>
            )}
          </div>

          {/* Riwayat scan hari ini */}
          <div className="rounded-lg border border-outline-variant bg-surface-container-lowest p-lg">
            <div className="mb-md flex items-center gap-sm">
              <History className="h-[18px] w-[18px] text-on-surface-variant" strokeWidth={2} />
              <h3 className="text-title-lg text-on-surface">Riwayat Scan Hari Ini</h3>
            </div>
            <ul className="flex flex-col gap-sm">
              {RIWAYAT_SCAN.map((item, i) => (
                <li
                  key={i}
                  className="flex items-center gap-sm rounded-md bg-surface-container-low p-sm"
                >
                  {item.status === "berhasil" ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-secondary" strokeWidth={2} />
                  ) : (
                    <XCircle className="h-4 w-4 shrink-0 text-error" strokeWidth={2} />
                  )}
                  <span className="flex-1 truncate text-label-md text-on-surface">
                    {item.namaUsaha}
                  </span>
                  <span className="shrink-0 text-label-sm text-on-surface-variant">{item.waktu}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
