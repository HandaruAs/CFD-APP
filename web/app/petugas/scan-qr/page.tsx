// app/petugas/scan-qr/page.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
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
  CameraOff,
  Sparkles,
  Loader2,
  AlertCircle,
} from "lucide-react";

// ID elemen DOM tempat video kamera akan dirender oleh html5-qrcode
const QR_READER_ELEMENT_ID = "qr-reader";

// ============================================================
// TYPES - sesuai dengan response backend
// ============================================================

type StatusScan = "idle" | "scanning" | "terdaftar" | "tidak-terdaftar";

type PedagangDetail = {
  id: string;
  namaUsaha: string;
  pemilik: string;
  inisial: string;
  kategori: string;
  lokasiLapak: string;
  statusPendaftaran: string;
  nik?: string;
  alamat?: string;
  perkiraanHarga?: string;
};

type VerifyQRResponse = {
  valid: boolean;
  message: string;
  pedagang?: PedagangDetail;
  sudah_check_in: boolean;
  check_in_at?: string;
};

type CheckInResponse = {
  success: boolean;
  message: string;
  check_in_at: string;
  pedagang_id: string;
  nama_usaha: string;
};

type RiwayatScanItem = {
  waktu: string;
  namaUsaha: string;
  status: "berhasil" | "gagal";
  pedagangId?: string;
};

type RiwayatScanResponse = {
  riwayat: RiwayatScanItem[];
  total: number;
};

// ============================================================
// API HELPER
// ============================================================

function apiUrl(path: string) {
  const base = process.env.NEXT_PUBLIC_API_URL;
  if (!base) {
    throw new Error("NEXT_PUBLIC_API_URL belum diset di .env.local!");
  }
  return `${base}${path}`;
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem("cfd_token");
  if (!token) {
    throw new Error("belum login");
  }

  const res = await fetch(apiUrl(path), {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers ?? {}),
    },
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `request gagal (status ${res.status})`);
  }
  return data as T;
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function ScanQrPage() {
  // State untuk scan
  const [status, setStatus] = useState<StatusScan>("idle");
  const [pedagang, setPedagang] = useState<PedagangDetail | null>(null);
  const [sudahCheckin, setSudahCheckin] = useState(false);
  const [checkInAt, setCheckInAt] = useState<string | null>(null);
  
  // State untuk loading & error
  const [isScanning, setIsScanning] = useState(false);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [isLoadingRiwayat, setIsLoadingRiwayat] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // State untuk toast & riwayat
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [riwayat, setRiwayat] = useState<RiwayatScanItem[]>([]);
  const [qrCodeInput, setQrCodeInput] = useState("");

  // State & ref untuk kamera
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  // ============================================================
  // FUNGSI API
  // ============================================================

  const loadRiwayat = async () => {
    try {
      setIsLoadingRiwayat(true);
      const data = await apiFetch<RiwayatScanResponse>("/api/petugas/riwayat-scan");
      setRiwayat(data.riwayat || []);
    } catch (err) {
      console.error("Gagal load riwayat:", err);
      // Gagal load riwayat tidak usah tampilkan error ke user, cukup log
    } finally {
      setIsLoadingRiwayat(false);
    }
  };

  // Load riwayat saat halaman pertama kali dimuat
  useEffect(() => {
    loadRiwayat();
    // Auto refresh riwayat tiap 30 detik
    const interval = setInterval(loadRiwayat, 30000);
    return () => clearInterval(interval);
  }, []);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // ============================================================
  // KAMERA - buka/tutup & scan QR real-time
  // ============================================================

  // Efek ini yang benar-benar meminta izin kamera & menyalakan preview,
  // dijalankan setiap kali cameraActive berubah jadi true.
  useEffect(() => {
    if (!cameraActive) return;

    let isCancelled = false;
    const scanner = new Html5Qrcode(QR_READER_ELEMENT_ID);
    scannerRef.current = scanner;

    scanner
      .start(
        { facingMode: "environment" }, // pakai kamera belakang di HP
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          if (isCancelled) return;
          isCancelled = true; // cegah decodedText ganda saat masih proses stop
          setQrCodeInput(decodedText);
          setCameraActive(false);
          handleScan(decodedText);
        },
        () => {
          // callback error per-frame saat QR belum ketemu, sengaja dibiarkan kosong
        }
      )
      .catch((err) => {
        setCameraError(
          "Tidak bisa mengakses kamera: " +
            (err instanceof Error ? err.message : String(err))
        );
        setCameraActive(false);
      });

    return () => {
      isCancelled = true;
      if (scannerRef.current) {
        scannerRef.current
          .stop()
          .then(() => scannerRef.current?.clear())
          .catch(() => {
            // kamera mungkin sudah berhenti duluan, aman diabaikan
          });
        scannerRef.current = null;
      }
    };
  }, [cameraActive]);

  const toggleCamera = () => {
    setCameraError(null);
    setError(null);
    setCameraActive((prev) => !prev);
  };

  // ============================================================
  // HANDLER SCAN QR
  // ============================================================

  const handleScan = async (codeOverride?: string) => {
    const kode = (codeOverride ?? qrCodeInput).trim();
    if (!kode) {
      setError("Masukkan kode QR atau scan terlebih dahulu");
      return;
    }

    setError(null);
    setIsScanning(true);
    setStatus("scanning");
    setPedagang(null);
    setSudahCheckin(false);
    setCheckInAt(null);

    try {
      const data = await apiFetch<VerifyQRResponse>("/api/petugas/scan", {
        method: "POST",
        body: JSON.stringify({ qr_code: kode }),
      });

      if (data.valid && data.pedagang) {
        setStatus("terdaftar");
        setPedagang(data.pedagang);
        setSudahCheckin(data.sudah_check_in);
        setCheckInAt(data.check_in_at || null);
        showToast("✅ QR Code berhasil diverifikasi!", "success");
        
        // Refresh riwayat setelah scan berhasil
        await loadRiwayat();
      } else {
        setStatus("tidak-terdaftar");
        showToast(data.message || "QR Code tidak dikenali", "error");
      }
    } catch (err) {
      setStatus("tidak-terdaftar");
      const errorMsg = err instanceof Error ? err.message : "Gagal memverifikasi QR Code";
      setError(errorMsg);
      showToast(errorMsg, "error");
    } finally {
      setIsScanning(false);
    }
  };

  // ============================================================
  // HANDLER CHECK-IN
  // ============================================================

  const handleCheckin = async () => {
    if (!pedagang) return;

    setIsCheckingIn(true);
    try {
      const data = await apiFetch<CheckInResponse>("/api/petugas/check-in", {
        method: "POST",
        body: JSON.stringify({ pedagang_id: pedagang.id }),
      });

      if (data.success) {
        setSudahCheckin(true);
        setCheckInAt(data.check_in_at);
        showToast("✅ Check-in berhasil dicatat!", "success");
        
        // Refresh riwayat setelah check-in
        await loadRiwayat();
      } else {
        showToast(data.message || "Gagal melakukan check-in", "error");
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Gagal melakukan check-in";
      showToast(errorMsg, "error");
    } finally {
      setIsCheckingIn(false);
    }
  };

  // ============================================================
  // RESET SCAN
  // ============================================================

  const resetScan = () => {
    setStatus("idle");
    setPedagang(null);
    setSudahCheckin(false);
    setCheckInAt(null);
    setError(null);
    setCameraError(null);
    setCameraActive(false);
    setQrCodeInput("");
  };

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="flex flex-col gap-lg">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 rounded-lg px-md py-sm shadow-lg animate-in slide-in-from-bottom-5 ${
            toast.type === "success"
              ? "bg-secondary-container/90 text-on-secondary-container"
              : "bg-error-container/90 text-on-error-container"
          }`}
        >
          <p className="text-label-md">{toast.message}</p>
        </div>
      )}

      {/* Header */}
      <div>
        <h2 className="text-headline-lg text-on-surface">Scan QR Pedagang</h2>
        <p className="mt-xs max-w-2xl text-body-md text-on-surface-variant">
          Pindai QR code pedagang untuk verifikasi dan catat kehadiran di CFD.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-md lg:grid-cols-[360px_1fr]">
        {/* ============================================================
            AREA SCANNER
        ============================================================ */}
        <div className="flex flex-col gap-sm rounded-lg border border-outline-variant bg-surface-container-lowest p-lg">
          <h3 className="text-title-lg text-on-surface">Pemindai QR</h3>

          {/* QR Input manual (fallback) + tombol kamera */}
          <div className="flex gap-sm">
            <input
              type="text"
              value={qrCodeInput}
              onChange={(e) => setQrCodeInput(e.target.value)}
              placeholder="Masukkan kode QR (atau scan)"
              className="flex-1 rounded-lg border border-outline bg-surface-container-lowest px-md py-sm text-body-md text-on-surface outline-none placeholder:text-on-surface-variant/70 focus:border-primary focus:ring-2 focus:ring-primary/20"
              disabled={isScanning || cameraActive}
            />
            <button
              type="button"
              onClick={toggleCamera}
              disabled={isScanning}
              title={cameraActive ? "Tutup kamera" : "Buka kamera"}
              className="flex shrink-0 items-center justify-center rounded-lg border border-outline-variant px-md py-sm text-on-surface-variant transition-all hover:bg-surface-container-low disabled:opacity-60"
            >
              {cameraActive ? (
                <CameraOff className="h-[18px] w-[18px]" strokeWidth={2} />
              ) : (
                <Camera className="h-[18px] w-[18px]" strokeWidth={2} />
              )}
            </button>
          </div>

          {cameraError && (
            <p className="text-label-sm text-error">{cameraError}</p>
          )}

          {/* Preview QR / Scanner */}
          <div className="relative mt-xs flex aspect-square w-full items-center justify-center overflow-hidden rounded-md bg-surface-container-low">
            {cameraActive ? (
              <div id={QR_READER_ELEMENT_ID} className="h-full w-full [&_video]:h-full [&_video]:w-full [&_video]:object-cover" />
            ) : status === "scanning" ? (
              <>
                <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-primary/20 to-primary/5 animate-pulse" />
                <ScanLine className="h-12 w-12 animate-pulse text-primary" strokeWidth={1.5} />
                <div className="absolute inset-x-6 top-1/2 h-0.5 -translate-y-1/2 animate-pulse bg-primary/70" />
                <p className="absolute bottom-6 text-label-sm text-on-surface-variant animate-pulse">
                  Memverifikasi QR Code...
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
                {error && (
                  <p className="text-label-sm text-error">{error}</p>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-xs text-on-surface-variant">
                <Camera className="h-12 w-12" strokeWidth={1.5} />
                <span className="text-label-sm">Masukkan kode QR di atas</span>
                <span className="text-label-xs text-on-surface-variant/60">
                  Atau tempelkan ID pedagang
                </span>
              </div>
            )}

            {/* Sudut bingkai */}
            <span className="absolute left-3 top-3 h-5 w-5 rounded-tl-md border-l-2 border-t-2 border-primary" />
            <span className="absolute right-3 top-3 h-5 w-5 rounded-tr-md border-r-2 border-t-2 border-primary" />
            <span className="absolute bottom-3 left-3 h-5 w-5 rounded-bl-md border-b-2 border-l-2 border-primary" />
            <span className="absolute bottom-3 right-3 h-5 w-5 rounded-br-md border-b-2 border-r-2 border-primary" />
          </div>

          {/* Tombol Scan */}
          <button
            type="button"
            onClick={() => handleScan()}
            disabled={isScanning || cameraActive || !qrCodeInput.trim()}
            className="mt-xs flex items-center justify-center gap-sm rounded-lg bg-primary px-lg py-md text-label-md text-on-primary transition-all hover:bg-primary-container hover:shadow-md disabled:opacity-60"
          >
            {isScanning ? (
              <>
                <Loader2 className="h-[18px] w-[18px] animate-spin" strokeWidth={2} />
                Memverifikasi...
              </>
            ) : (
              <>
                <ScanLine className="h-[18px] w-[18px]" strokeWidth={2} />
                Verifikasi QR
              </>
            )}
          </button>

          {/* Tombol Reset */}
          {status !== "idle" && (
            <button
              type="button"
              onClick={resetScan}
              className="flex items-center justify-center gap-sm rounded-lg border border-outline-variant px-lg py-sm text-label-md text-on-surface-variant transition-all hover:bg-surface-container-low"
            >
              <RotateCcw className="h-[18px] w-[18px]" strokeWidth={2} />
              Scan Ulang
            </button>
          )}
        </div>

        {/* ============================================================
            HASIL VERIFIKASI
        ============================================================ */}
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
                  Masukkan kode QR di atas atau tempelkan ID pedagang
                </p>
              </div>
            )}

            {status === "scanning" && (
              <div className="mt-md flex flex-col items-center justify-center gap-xs rounded-md bg-surface-container-low py-xl text-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" strokeWidth={2} />
                <p className="text-label-md text-on-surface-variant">Memverifikasi kode QR...</p>
              </div>
            )}

            {status === "terdaftar" && pedagang && (
              <div className="mt-md flex flex-col gap-md animate-in fade-in duration-300">
                <div className="flex items-center gap-sm rounded-md bg-secondary-container/40 px-md py-sm text-on-secondary-container">
                  <CheckCircle2 className="h-5 w-5 shrink-0" strokeWidth={2} />
                  <span className="text-label-md font-semibold">✓ Pedagang Terdaftar</span>
                </div>

                <div className="flex items-start gap-sm rounded-md border border-outline-variant p-md hover:border-secondary/30 transition-colors">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-fixed text-label-md font-semibold text-on-primary-fixed">
                    {pedagang.inisial || "??"}
                  </span>
                  <div className="flex-1">
                    <p className="text-title-lg text-on-surface">{pedagang.namaUsaha}</p>
                    <p className="text-label-sm text-on-surface-variant">{pedagang.id}</p>

                    <div className="mt-sm grid grid-cols-1 gap-xs sm:grid-cols-2">
                      <div className="flex items-center gap-xs text-label-sm text-on-surface-variant">
                        <User className="h-3.5 w-3.5" strokeWidth={2} />
                        {pedagang.pemilik}
                      </div>
                      <div className="flex items-center gap-xs text-label-sm text-on-surface-variant">
                        <Tag className="h-3.5 w-3.5" strokeWidth={2} />
                        {pedagang.kategori}
                      </div>
                      <div className="flex items-center gap-xs text-label-sm text-on-surface-variant sm:col-span-2">
                        <MapPin className="h-3.5 w-3.5" strokeWidth={2} />
                        {pedagang.lokasiLapak}
                      </div>
                      {pedagang.perkiraanHarga && (
                        <div className="flex items-center gap-xs text-label-sm text-on-surface-variant sm:col-span-2">
                          <span className="font-semibold">Perkiraan Harga:</span>
                          {pedagang.perkiraanHarga}
                        </div>
                      )}
                    </div>

                    <span className="mt-sm inline-flex items-center rounded-full bg-secondary-container/40 px-sm py-1 text-label-sm text-on-secondary-container">
                      {pedagang.statusPendaftaran}
                    </span>
                  </div>
                </div>

                {sudahCheckin ? (
                  <div className="flex items-center gap-sm rounded-md bg-secondary-container/40 px-md py-sm text-label-md text-on-secondary-container animate-in fade-in">
                    <CheckCircle2 className="h-[18px] w-[18px]" strokeWidth={2} />
                    Check-in berhasil dicatat pukul{" "}
                    {checkInAt ? new Date(checkInAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : "..."}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleCheckin}
                    disabled={isCheckingIn}
                    className="flex items-center justify-center gap-sm rounded-lg bg-secondary px-lg py-md text-label-md text-on-secondary transition-all hover:bg-secondary-container hover:shadow-md disabled:opacity-60"
                  >
                    {isCheckingIn ? (
                      <>
                        <Loader2 className="h-[18px] w-[18px] animate-spin" strokeWidth={2} />
                        Memproses...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-[18px] w-[18px]" strokeWidth={2} />
                        Konfirmasi Check-in
                      </>
                    )}
                  </button>
                )}
              </div>
            )}

            {status === "tidak-terdaftar" && (
              <div className="mt-md flex flex-col gap-md animate-in fade-in duration-300">
                <div className="flex items-center gap-sm rounded-md bg-error-container/60 px-md py-sm text-on-error-container">
                  <XCircle className="h-5 w-5 shrink-0" strokeWidth={2} />
                  <span className="text-label-md font-semibold">✕ Tidak Terdaftar</span>
                </div>
                <div className="rounded-md border border-error/20 bg-error-container/10 p-md">
                  <p className="text-body-md text-on-surface-variant">
                    {error || "Kode QR ini tidak cocok dengan data pedagang di sistem."}
                  </p>
                  <p className="mt-xs text-label-sm text-on-surface-variant/70">
                    Arahkan pedagang untuk mendaftar terlebih dahulu sebelum diizinkan berjualan.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* ============================================================
              RIWAYAT SCAN
          ============================================================ */}
          <div className="rounded-lg border border-outline-variant bg-surface-container-lowest p-lg">
            <div className="mb-md flex items-center gap-sm">
              <History className="h-[18px] w-[18px] text-on-surface-variant" strokeWidth={2} />
              <h3 className="text-title-lg text-on-surface">Riwayat Scan Hari Ini</h3>
              <span className="ml-auto text-label-sm text-on-surface-variant">
                {isLoadingRiwayat ? "Memuat..." : `${riwayat.length} scan`}
              </span>
            </div>

            {isLoadingRiwayat ? (
              <div className="flex items-center justify-center py-md">
                <Loader2 className="h-5 w-5 animate-spin text-on-surface-variant" strokeWidth={2} />
              </div>
            ) : riwayat.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-xs rounded-md bg-surface-container-low py-md text-center">
                <p className="text-label-md text-on-surface-variant">
                  Belum ada riwayat scan hari ini.
                </p>
              </div>
            ) : (
              <ul className="flex flex-col gap-sm">
                {riwayat.map((item, i) => (
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
                    <span
                      className={`shrink-0 rounded-full px-sm py-0.5 text-[10px] font-semibold ${
                        item.status === "berhasil"
                          ? "bg-secondary-container/40 text-on-secondary-container"
                          : "bg-error-container/60 text-on-error-container"
                      }`}
                    >
                      {item.status === "berhasil" ? "Berhasil" : "Gagal"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}