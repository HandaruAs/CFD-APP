// app/petugas/scan-qr/page.tsx
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
  Camera,
  Sparkles,
} from "lucide-react";

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
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const mulaiScan = () => {
    setSudahCheckin(false);
    setStatus("scanning");
    // Simulasi scan
    setTimeout(() => {
      setStatus("terdaftar");
      setToast({ message: "✅ QR Code berhasil dipindai!", type: "success" });
      setTimeout(() => setToast(null), 3000);
    }, 1500);
  };

  const scanUlang = () => {
    setSudahCheckin(false);
    setStatus("idle");
    setToast(null);
  };

  const handleCheckin = () => {
    setSudahCheckin(true);
    setToast({ message: "✅ Check-in berhasil dicatat!", type: "success" });
    setTimeout(() => setToast(null), 3000);
  };

  return (
    <div className="flex flex-col gap-lg">
      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 rounded-lg px-md py-sm shadow-lg animate-in slide-in-from-bottom-5 ${
          toast.type === "success" ? "bg-secondary-container/90 text-on-secondary-container" : "bg-error-container/90 text-on-error-container"
        }`}>
          <p className="text-label-md">{toast.message}</p>
        </div>
      )}

      <div>
        <h2 className="text-headline-lg text-on-surface">Scan QR Pedagang</h2>
        <p className="mt-xs max-w-2xl text-body-md text-on-surface-variant">
          Pindai QR code pedagang untuk verifikasi dan catat kehadiran di CFD.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-md lg:grid-cols-[360px_1fr]">
        {/* Area Scanner */}
        <div className="flex flex-col gap-sm rounded-lg border border-outline-variant bg-surface-container-lowest p-lg">
          <h3 className="text-title-lg text-on-surface">Pemindai QR</h3>

          <div className="relative mt-xs flex aspect-square w-full items-center justify-center overflow-hidden rounded-md bg-surface-container-low">
            {status === "scanning" ? (
              <>
                <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-primary/20 to-primary/5 animate-pulse" />
                <ScanLine className="h-12 w-12 animate-pulse text-primary" strokeWidth={1.5} />
                <div className="absolute inset-x-6 top-1/2 h-0.5 -translate-y-1/2 animate-pulse bg-primary/70" />
                <p className="absolute bottom-6 text-label-sm text-on-surface-variant animate-pulse">
                  Mencari QR Code...
                </p>
              </>
            ) : status === "terdaftar" || status === "tidak-terdaftar" ? (
              <div className="flex flex-col items-center gap-xs">
                {status === "terdaftar" ? (
                  <CheckCircle2 className="h-16 w-16 text-secondary" strokeWidth={1.5} />
                ) : (
                  <XCircle className="h-16 w-16 text-error" strokeWidth={1.5} />
                )}
                <span className="text-label-md text-on-surface-variant">
                  {status === "terdaftar" ? "QR Terverifikasi ✓" : "QR Tidak Dikenali"}
                </span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-xs text-on-surface-variant">
                <Camera className="h-12 w-12" strokeWidth={1.5} />
                <span className="text-label-sm">Arahkan kamera ke QR code pedagang</span>
              </div>
            )}

            {/* Sudut bingkai */}
            <span className="absolute left-3 top-3 h-5 w-5 rounded-tl-md border-l-2 border-t-2 border-primary" />
            <span className="absolute right-3 top-3 h-5 w-5 rounded-tr-md border-r-2 border-t-2 border-primary" />
            <span className="absolute bottom-3 left-3 h-5 w-5 rounded-bl-md border-b-2 border-l-2 border-primary" />
            <span className="absolute bottom-3 right-3 h-5 w-5 rounded-br-md border-b-2 border-r-2 border-primary" />
          </div>

          <button
            type="button"
            onClick={mulaiScan}
            disabled={status === "scanning"}
            className="mt-xs flex items-center justify-center gap-sm rounded-lg bg-primary px-lg py-md text-label-md text-on-primary transition-all hover:bg-primary-container hover:shadow-md disabled:opacity-60"
          >
            {status === "scanning" ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-on-primary border-t-transparent" />
                Memindai...
              </>
            ) : (
              <>
                <ScanLine className="h-[18px] w-[18px]" strokeWidth={2} />
                Mulai Scan
              </>
            )}
          </button>

          {status !== "idle" && (
            <button
              type="button"
              onClick={scanUlang}
              className="flex items-center justify-center gap-sm rounded-lg border border-outline-variant px-lg py-sm text-label-md text-on-surface-variant transition-all hover:bg-surface-container-low"
            >
              <RotateCcw className="h-[18px] w-[18px]" strokeWidth={2} />
              Scan Ulang
            </button>
          )}
        </div>

        {/* Hasil Verifikasi */}
        <div className="flex flex-col gap-md">
          <div className="rounded-lg border border-outline-variant bg-surface-container-lowest p-lg">
            <h3 className="text-title-lg text-on-surface">Hasil Verifikasi</h3>

            {status === "idle" && (
              <div className="mt-md flex flex-col items-center justify-center gap-xs rounded-md bg-surface-container-low py-xl text-center">
                <QrCode className="h-8 w-8 text-on-surface-variant" strokeWidth={1.5} />
                <p className="text-label-md text-on-surface-variant">
                  Belum ada QR yang dipindai.
                </p>
                <p className="text-label-sm text-on-surface-variant/70">
                  Tekan &quot;Mulai Scan&quot; untuk memulai
                </p>
              </div>
            )}

            {status === "scanning" && (
              <div className="mt-md flex flex-col items-center justify-center gap-xs rounded-md bg-surface-container-low py-xl text-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                <p className="text-label-md text-on-surface-variant">Memverifikasi kode QR...</p>
              </div>
            )}

            {status === "terdaftar" && (
              <div className="mt-md flex flex-col gap-md animate-in fade-in duration-300">
                <div className="flex items-center gap-sm rounded-md bg-secondary-container/40 px-md py-sm text-on-secondary-container">
                  <CheckCircle2 className="h-5 w-5 shrink-0" strokeWidth={2} />
                  <span className="text-label-md font-semibold">✓ Pedagang Terdaftar</span>
                </div>

                <div className="flex items-start gap-sm rounded-md border border-outline-variant p-md hover:border-secondary/30 transition-colors">
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
                  <div className="flex items-center gap-sm rounded-md bg-secondary-container/40 px-md py-sm text-label-md text-on-secondary-container animate-in fade-in">
                    <CheckCircle2 className="h-[18px] w-[18px]" strokeWidth={2} />
                    Check-in berhasil dicatat pukul {new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleCheckin}
                    className="flex items-center justify-center gap-sm rounded-lg bg-secondary px-lg py-md text-label-md text-on-secondary transition-all hover:bg-secondary-container hover:shadow-md"
                  >
                    <Sparkles className="h-[18px] w-[18px]" strokeWidth={2} />
                    Konfirmasi Check-in
                  </button>
                )}
              </div>
            )}

            {status === "tidak-terdaftar" && (
              <div className="mt-md flex flex-col gap-md animate-in fade-in duration-300">
                <div className="flex items-center gap-sm rounded-md bg-error-container/60 px-md py-sm text-on-error-container">
                  <XCircle className="h-5 w-5 shrink-0" strokeWidth={2} />
                  <span className="text-label-md font-semibold">✕ Belum Terdaftar</span>
                </div>
                <div className="rounded-md border border-error/20 bg-error-container/10 p-md">
                  <p className="text-body-md text-on-surface-variant">
                    Kode QR ini tidak cocok dengan data pedagang di sistem.
                  </p>
                  <p className="mt-xs text-label-sm text-on-surface-variant/70">
                    Arahkan pedagang untuk mendaftar terlebih dahulu sebelum diizinkan berjualan.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Riwayat Scan */}
          <div className="rounded-lg border border-outline-variant bg-surface-container-lowest p-lg">
            <div className="mb-md flex items-center gap-sm">
              <History className="h-[18px] w-[18px] text-on-surface-variant" strokeWidth={2} />
              <h3 className="text-title-lg text-on-surface">Riwayat Scan Hari Ini</h3>
              <span className="ml-auto text-label-sm text-on-surface-variant">
                {RIWAYAT_SCAN.length} scan
              </span>
            </div>
            <ul className="flex flex-col gap-sm">
              {RIWAYAT_SCAN.map((item, i) => (
                <li
                  key={i}
                  className={`flex items-center gap-sm rounded-md p-sm transition-colors ${
                    item.status === "berhasil" 
                      ? "bg-secondary-container/20 hover:bg-secondary-container/30" 
                      : "bg-error-container/10 hover:bg-error-container/20"
                  }`}
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
                  <span className={`shrink-0 rounded-full px-sm py-0.5 text-[10px] font-semibold ${
                    item.status === "berhasil" 
                      ? "bg-secondary-container/40 text-on-secondary-container" 
                      : "bg-error-container/60 text-on-error-container"
                  }`}>
                    {item.status === "berhasil" ? "Berhasil" : "Gagal"}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}