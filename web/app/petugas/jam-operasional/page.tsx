// app/petugas/jam-operasional/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Clock,
  History,
  Check,
  AlertTriangle,
  Loader2,
  X,
  Info,
  Edit,
  Plus,
  Shuffle,
  ChevronUp,
  ChevronDown,
  Tag,
} from "lucide-react";

// ========== TYPES ==========
type StatusRiwayat = "normal" | "diperpanjang" | "diakhiri-awal";
type Riwayat = {
  id: string;
  tanggal: string;
  jamMulai: string;
  jamSelesai: string;
  durasi: string;
  status: StatusRiwayat;
};
// Sesi CFD hari ini yang beneran ngegate check-in (scan QR) & checkout --
// ini SATU-SATUNYA sesi yang dipakai backend buat validasi (lihat
// modules/shared/sesi.ResolveSesiHariIni). Sebelumnya halaman ini punya
// "Sesi CFD per Wilayah" yang bikin baris cfd_sessions terpisah per
// kota/kecamatan/jalan, tapi ternyata gak pernah dicek di alur klaim
// lapak/check-in/checkout sama sekali -- jadi fitur itu (dan endpoint
// wilayah-saya / sesi-wilayah di backend) sudah dinonaktifkan. Timer &
// kontrol di halaman ini sekarang pakai sesi global ini.
type SesiHariIni = {
  id: string;
  tanggal: string;
  jamMulai: string;
  jamSelesaiRencana: string;
  status: string;
  aktif: boolean;
  sisaMenit: number;
  totalMenit: number;
};
type StatusOperasional = {
  // NOTE: nama field "pendaftaran" ini kontrak API dari backend
  // (StatusOperasionalResponse.Pendaftaran, json:"pendaftaran") -- SENGAJA
  // gak diubah biar gak perlu ubah backend lagi. Tapi secara fungsi,
  // field ini sekarang ngontrol jendela waktu CHECK-IN pedagang (ambil
  // nomor stand), BUKAN pendaftaran akun/data diri. Pendaftaran akun
  // sekarang gak dibatasi jam sama sekali.
  pendaftaran: {
    isOpen: boolean;
    linkPendaftaran: string | null;
    jamBuka?: string | null;
    jamTutup?: string | null;
    kodeEvent: string;
  };
  sesi: SesiHariIni | null;
  riwayat: Riwayat[];
};

// ========== STYLE (class pt-pill-* didefinisikan di petugas.css) ==========
const STATUS_STYLE: Record<StatusRiwayat, { label: string; pill: string; icon: typeof Check }> = {
  normal: { label: "Selesai Normal", pill: "pt-pill-success", icon: Check },
  diperpanjang: { label: "Diperpanjang", pill: "pt-pill-warning", icon: Clock },
  "diakhiri-awal": { label: "Diakhiri Awal", pill: "pt-pill-danger", icon: AlertTriangle },
};

const RADIUS = 54;
const CIRC = 2 * Math.PI * RADIUS;

function formatJamTampilan(jam: string) {
  return jam.slice(0, 5).replace(":", ".");
}
function formatSisaWaktu(totalMenit: number) {
  const jam = Math.floor(totalMenit / 60);
  const menit = totalMenit % 60;
  return `${String(jam).padStart(2, "0")}:${String(menit).padStart(2, "0")}`;
}
function formatWaktuTabel(waktu: string) {
  return waktu.split(".")[0];
}
function apiUrl(path: string) {
  const base = process.env.NEXT_PUBLIC_API_URL;
  if (!base) throw new Error("NEXT_PUBLIC_API_URL belum diset!");
  return `${base}${path}`;
}
async function apiFetch(path: string, options: RequestInit = {}) {
  const token = localStorage.getItem("cfd_token");
  if (!token) throw new Error("belum login");
  const res = await fetch(apiUrl(path), {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers ?? {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `request gagal (status ${res.status})`);
  return data;
}

// ===== MODAL SHELL =====
function ModalShell({
  children,
  onClose,
  title,
  description,
  footer,
  maxWidthClass = "max-w-[30rem]",
}: {
  children: React.ReactNode;
  onClose: () => void;
  title?: string;
  description?: string;
  footer?: React.ReactNode;
  maxWidthClass?: string;
}) {
  return (
    <div className="pt-modal-overlay" onClick={onClose}>
      <div className={`pt-modal-box ${maxWidthClass}`} onClick={(e) => e.stopPropagation()}>
        <button type="button" onClick={onClose} aria-label="Tutup" className="pt-modal-close">
          <X className="h-4 w-4" strokeWidth={2} />
        </button>

        {(title || description) && (
          <div className="shrink-0 border-b border-outline-variant px-lg pb-md pt-lg pr-14">
            {title && <h3 className="text-title-lg font-semibold text-on-surface">{title}</h3>}
            {description && <p className="mt-1 text-body-sm text-on-surface-variant">{description}</p>}
          </div>
        )}

        <div className="overflow-y-auto px-lg py-md">{children}</div>

        {footer && <div className="shrink-0 border-t border-outline-variant px-lg py-md">{footer}</div>}
      </div>
    </div>
  );
}

// ===== TIME STEPPER (ganti input jam bawaan browser) =====
// Jam & menit cuma bisa diubah lewat tombol panah, tidak bisa diketik
// sama sekali -- lebih mudah dipakai lewat sentuhan/klik dan tidak
// memunculkan popup jam bawaan browser yang tampilannya tidak
// konsisten dengan desain halaman.
function TimeStepper({
  value,
  onChange,
  disabled = false,
}: {
  value: string; // format "HH:MM"
  onChange: (next: string) => void;
  disabled?: boolean;
}) {
  const [hh, mm] = value.split(":").map((n) => parseInt(n, 10) || 0);

  const setHour = (next: number) => {
    const wrapped = ((next % 24) + 24) % 24;
    onChange(`${String(wrapped).padStart(2, "0")}:${String(mm).padStart(2, "0")}`);
  };
  // Menit melompat per 5 dan selalu "snap" ke kelipatan 5 terdekat di
  // arah yang ditekan -- jadi dari angka aneh manapun (mis. 08 atau 59)
  // satu klik langsung ke angka bulat (10 atau 00), bukan geser 1-1.
  const setMinute = (direction: 1 | -1) => {
    const next =
      direction === 1 ? Math.ceil((mm + 1) / 5) * 5 : Math.floor((mm - 1) / 5) * 5;
    const wrapped = ((next % 60) + 60) % 60;
    onChange(`${String(hh).padStart(2, "0")}:${String(wrapped).padStart(2, "0")}`);
  };

  return (
    <div className="inline-flex items-center gap-sm">
      <div className="flex flex-col items-center">
        <button
          type="button"
          onClick={() => setHour(hh + 1)}
          disabled={disabled}
          aria-label="Tambah jam"
          className="pt-time-btn"
        >
          <ChevronUp className="h-4 w-4" strokeWidth={2.5} />
        </button>
        <span className="pt-time-value">{String(hh).padStart(2, "0")}</span>
        <button
          type="button"
          onClick={() => setHour(hh - 1)}
          disabled={disabled}
          aria-label="Kurangi jam"
          className="pt-time-btn"
        >
          <ChevronDown className="h-4 w-4" strokeWidth={2.5} />
        </button>
      </div>
      <span className="text-title-lg font-semibold text-on-surface">:</span>
      <div className="flex flex-col items-center">
        <button
          type="button"
          onClick={() => setMinute(1)}
          disabled={disabled}
          aria-label="Tambah menit"
          className="pt-time-btn"
        >
          <ChevronUp className="h-4 w-4" strokeWidth={2.5} />
        </button>
        <span className="pt-time-value">{String(mm).padStart(2, "0")}</span>
        <button
          type="button"
          onClick={() => setMinute(-1)}
          disabled={disabled}
          aria-label="Kurangi menit"
          className="pt-time-btn"
        >
          <ChevronDown className="h-4 w-4" strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
}

// ===== MAIN =====
export default function JamOperasionalPage() {
  const [status, setStatus] = useState<StatusOperasional | null>(null);
  const [isLoadingPage, setIsLoadingPage] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // ===== STATE SESI CFD HARI INI =====
  const [showAturSesiModal, setShowAturSesiModal] = useState(false);
  const [formJamMulai, setFormJamMulai] = useState("06:00");
  const [formJamSelesai, setFormJamSelesai] = useState("11:00");
  const [isSubmittingSesi, setIsSubmittingSesi] = useState(false);
  const [isBukaSesi, setIsBukaSesi] = useState(false);

  // "checkIn*" di sini map ke field API "pendaftaran" (lihat catatan di
  // tipe StatusOperasional di atas) -- ini jendela waktu buat pedagang
  // check-in / ambil nomor stand, bukan buat isi form pendaftaran akun.
  const [checkInJamBuka, setCheckInJamBuka] = useState("00:00");
  const [checkInJamTutup, setCheckInJamTutup] = useState("23:59");
  const [kodeEvent, setKodeEvent] = useState("CFD");
  const [isSavingCheckIn, setIsSavingCheckIn] = useState(false);
  const [showEditJamCheckInModal, setShowEditJamCheckInModal] = useState(false);

  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    message: string;
    confirmLabel: string;
    danger?: boolean;
    onConfirm: () => void;
  } | null>(null);

  const isFriday = new Date().getDay() === 5;
  const [checkInSudahDiubahHariIni, setCheckInSudahDiubahHariIni] = useState(false);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // ===== LOAD STATUS (sesi hari ini + pendaftaran/check-in + riwayat) =====
  const loadStatus = async () => {
    try {
      const data = (await apiFetch("/api/petugas/jam-operasional")) as StatusOperasional;
      setStatus(data);
      setLoadError(null);
      if (data.pendaftaran.jamBuka) {
        setCheckInJamBuka(data.pendaftaran.jamBuka.slice(0, 5));
      }
      if (data.pendaftaran.jamTutup) {
        setCheckInJamTutup(data.pendaftaran.jamTutup.slice(0, 5));
      }
      if (data.pendaftaran.kodeEvent) {
        setKodeEvent(data.pendaftaran.kodeEvent);
      }
      setCheckInSudahDiubahHariIni(false);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "gagal memuat data");
    } finally {
      setIsLoadingPage(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadStatus();
    const interval = setInterval(loadStatus, 60_000);
    return () => clearInterval(interval);
  }, []);

  // ===== HANDLER: BUKA SESI SEKARANG (jam mulai = sekarang, selesai 23:59) =====
  const handleBukaSesiManual = async () => {
    setIsBukaSesi(true);
    try {
      await apiFetch("/api/petugas/jam-operasional/sesi/buka", { method: "PATCH" });
      showToast("✅ Sesi CFD berhasil dibuka", "success");
      await loadStatus();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "gagal membuka sesi", "error");
    } finally {
      setIsBukaSesi(false);
    }
  };

  // ===== HANDLER: ATUR JAM SESI (bikin baru / update jam yang sudah ada) =====
  const openAturSesiModal = () => {
    setFormJamMulai(status?.sesi ? formatJamTampilan(status.sesi.jamMulai).replace(".", ":") : "06:00");
    setFormJamSelesai(
      status?.sesi ? formatJamTampilan(status.sesi.jamSelesaiRencana).replace(".", ":") : "11:00"
    );
    setShowAturSesiModal(true);
  };

  const handleSimpanSesi = async () => {
    if (!formJamMulai || !formJamSelesai) {
      showToast("Lengkapi jam mulai dan jam selesai", "error");
      return;
    }
    setIsSubmittingSesi(true);
    try {
      await apiFetch("/api/petugas/jam-operasional/sesi", {
        method: "PATCH",
        body: JSON.stringify({ jamMulai: formJamMulai, jamSelesaiRencana: formJamSelesai }),
      });
      showToast("✅ Jam sesi CFD berhasil disimpan", "success");
      setShowAturSesiModal(false);
      await loadStatus();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "gagal menyimpan jam sesi", "error");
    } finally {
      setIsSubmittingSesi(false);
    }
  };

  // ===== HANDLER: AKHIRI SESI LEBIH AWAL =====
  // Teks konfirmasi ini SENGAJA dirombak dari versi sebelumnya -- versi
  // lama bilang "sesi tidak bisa dibuka lagi hari ini", padahal itu udah
  // gak akurat lagi: BukaSesiManual/SimpanSesi sekarang reaktivasi baris
  // cfd_sessions yang sama (ON CONFLICT DO UPDATE), jadi sesi ini BISA
  // dibuka lagi kalau memang perlu. Yang beneran permanen & perlu
  // diketahui petugas SEBELUM klik itu soal klaim pedagang yang belum
  // check-in -- itu yang dibatalkan otomatis (lihat
  // BatalkanKlaimBelumCheckIn di modules/operasional).
  const handleAkhiriSesi = () => {
    setConfirmDialog({
      title: "Akhiri Sesi Lebih Awal",
      message:
        "Sesi CFD hari ini akan langsung ditutup. Pedagang yang SUDAH check-in tetap aman dan bisa langsung check-out. Pedagang yang BELUM check-in klaim lapaknya otomatis dibatalkan (mereka perlu klaim ulang kalau sesi ini dibuka lagi). Sesi ini masih bisa dibuka ulang lewat \"Buka Sesi Sekarang\" atau \"Atur Jam Sesi\" kalau ternyata masih diperlukan hari ini. Lanjutkan?",
      confirmLabel: "Ya, Akhiri Sesi",
      danger: true,
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          await apiFetch("/api/petugas/jam-operasional/sesi/akhiri", { method: "PATCH" });
          showToast("✅ Sesi CFD berhasil diakhiri lebih awal", "success");
          await loadStatus();
        } catch (err) {
          showToast(err instanceof Error ? err.message : "gagal mengakhiri sesi", "error");
        }
      },
    });
  };

  // ===== HANDLER KODE EVENT =====
  // "Pengaturan Check-in Pedagang" (toggle buka/tutup + jendela jam)
  // udah gak ngefek apa-apa lagi di backend -- ClaimLapak sekarang SELALU
  // boleh diklaim kapan aja (lihat komentar GetStatus di
  // modules/pedagang/lapak/usecase). Yang masih beneran dipakai di sini
  // cuma Kode Event (prefix nomor lapak acak) -- isOpen/jamBuka/jamTutup
  // tetap dikirim APA ADANYA (gak diubah) biar kontrak PATCH ke backend
  // gak perlu disentuh.
  const handleSimpanCheckIn = async () => {
    if (!status) return;
    setConfirmDialog({
      title: "Konfirmasi Perubahan Kode Event",
      message: "Apakah Anda yakin dengan perubahan kode event ini?",
      confirmLabel: "Ya, Simpan",
      onConfirm: async () => {
        setConfirmDialog(null);
        setIsSavingCheckIn(true);
        try {
          await apiFetch("/api/petugas/jam-operasional/pendaftaran", {
            method: "PATCH",
            body: JSON.stringify({
              isOpen: status.pendaftaran.isOpen,
              jamBuka: checkInJamBuka,
              jamTutup: checkInJamTutup,
              kodeEvent,
            }),
          });
          showToast("✅ Kode event berhasil disimpan", "success");
          setShowEditJamCheckInModal(false);
          await loadStatus();
        } catch (err) {
          showToast(err instanceof Error ? err.message : "Gagal menyimpan kode event", "error");
        } finally {
          setIsSavingCheckIn(false);
        }
      },
    });
  };

  if (isLoadingPage) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="pt-loading">
          <Loader2 className="h-6 w-6 animate-spin" strokeWidth={2} />
          <p className="text-body-sm">Memuat data jam operasional...</p>
        </div>
      </div>
    );
  }
  if (loadError || !status) {
    return (
      <div className="rounded-xl border border-error-container bg-error-container/20 px-md py-sm text-body-sm text-on-error-container">
        Gagal memuat data: {loadError ?? "data tidak ditemukan"}
      </div>
    );
  }

  const canEditCheckIn = !(isFriday && checkInSudahDiubahHariIni);

  const sesi = status.sesi;
  const progress = sesi && sesi.totalMenit > 0 ? (sesi.sisaMenit / sesi.totalMenit) * CIRC : 0;
  const sesiSudahLewat = !!sesi && !sesi.aktif && sesi.status !== "aktif";

  return (
    <div className="flex flex-col gap-lg pb-xl">
      {toast && (
        <div className={`pt-toast ${toast.type === "success" ? "pt-toast-success" : "pt-toast-error"}`}>
          {toast.type === "success" ? (
            <Check className="h-4 w-4 shrink-0" strokeWidth={2.5} />
          ) : (
            <AlertTriangle className="h-4 w-4 shrink-0" strokeWidth={2.5} />
          )}
          <p className="text-body-md font-medium">{toast.message}</p>
        </div>
      )}

      <div>
        <h2 className="text-headline-lg text-on-surface">Jam Operasional</h2>
        <p className="mt-xs max-w-2xl text-body-md text-on-surface-variant">
          Atur sesi CFD hari ini dan kelola check-in pedagang.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-md lg:grid-cols-[1fr_300px]">
        {/* ===== SESI CFD HARI INI + CHECK-IN (satu card, timer di samping) ===== */}
        <div className="pt-card">
          <div className="flex flex-wrap items-center justify-between gap-sm">
            <h3 className="pt-section-title">Sesi CFD Hari Ini</h3>
            <div className="flex items-center gap-sm">
              <Link href="/petugas/acak-lapak" className="pt-btn pt-btn-secondary">
                <Shuffle className="h-4 w-4" strokeWidth={2} />
                Acak Lapak
              </Link>
              {sesi && (
                <button type="button" onClick={openAturSesiModal} className="pt-btn pt-btn-ghost">
                  <Edit className="h-4 w-4" strokeWidth={2} />
                  Ubah Jam
                </button>
              )}
            </div>
          </div>

          {!sesi ? (
            <div className="mt-md flex flex-col items-center gap-sm py-8 text-center">
              <p className="text-body-md text-on-surface-variant">Belum ada sesi CFD untuk hari ini.</p>
              <div className="flex flex-wrap justify-center gap-sm">
                <button
                  type="button"
                  onClick={handleBukaSesiManual}
                  disabled={isBukaSesi}
                  className="pt-btn pt-btn-primary"
                >
                  {isBukaSesi ? (
                    <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
                  ) : (
                    <Plus className="h-4 w-4" strokeWidth={2} />
                  )}
                  Buka Sesi Sekarang
                </button>
                <button type="button" onClick={openAturSesiModal} className="pt-btn pt-btn-secondary">
                  <Clock className="h-4 w-4" strokeWidth={2} />
                  Atur Jam Sesi
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-md flex flex-col gap-sm rounded-xl border border-outline-variant bg-surface-container-low p-md sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-sm">
                  <p className="text-title-md text-on-surface">CFD {sesi.tanggal}</p>
                  <span className={`pt-pill ${sesi.aktif ? "pt-pill-success" : "pt-pill-neutral"}`}>
                    <span className={`pt-pill-dot ${sesi.aktif ? "is-pulse" : ""}`} />
                    {sesi.aktif ? "Berlangsung" : sesiSudahLewat ? "Sudah Berakhir" : "Belum Mulai"}
                  </span>
                </div>
                <p className="mt-0.5 text-body-sm text-on-surface-variant">
                  {formatJamTampilan(sesi.jamMulai)} – {formatJamTampilan(sesi.jamSelesaiRencana)} WIB
                  {sesi.aktif && (
                    <>
                      {" "}
                      · sisa <strong className="text-on-surface">{formatSisaWaktu(sesi.sisaMenit)}</strong>
                    </>
                  )}
                </p>
              </div>
              {sesi.aktif && (
                <button
                  type="button"
                  onClick={handleAkhiriSesi}
                  className="pt-btn pt-btn-ghost-danger self-end sm:self-center"
                >
                  <AlertTriangle className="h-4 w-4" strokeWidth={2} />
                  Akhiri Lebih Awal
                </button>
              )}
            </div>
          )}

          {/* Catatan singkat di bawah card, biar petugas ngerti konsekuensi
              "Akhiri Lebih Awal" TANPA harus klik dulu -- gak ganggu alur
              normal (cuma nongol pas ada sesi aktif). */}
          {sesi && sesi.aktif && (
            <p className="mt-sm flex items-start gap-1.5 text-label-sm text-on-surface-variant">
              <Info className="h-3.5 w-3.5 shrink-0 translate-y-0.5" strokeWidth={2} />
              Kalau sesi diakhiri lebih awal, pedagang yang belum check-in klaim lapaknya otomatis
              dibatalkan. Sesi tetap bisa dibuka lagi kalau ternyata masih diperlukan.
            </p>
          )}

          {/* ===== KODE EVENT (nested di card yang sama) ===== */}
          <div className="mt-lg border-t border-outline-variant pt-lg">
            <div className="flex flex-wrap items-center justify-between gap-sm">
              <h4 className="pt-section-title">Kode Event</h4>
              <button
                type="button"
                onClick={() => setShowEditJamCheckInModal(true)}
                className="pt-btn pt-btn-ghost"
              >
                <Edit className="h-4 w-4" strokeWidth={2} />
                Edit
              </button>
            </div>

            <div className="mt-sm rounded-xl border border-outline-variant bg-surface-container-lowest p-md">
              <div className="flex flex-wrap items-center gap-sm">
                <span className="inline-flex items-center gap-1 rounded-full bg-primary-container px-2.5 py-0.5 text-label-sm font-medium text-on-primary-container">
                  <Tag className="h-3 w-3" strokeWidth={2.5} />
                  Kode: {status.pendaftaran.kodeEvent || "CFD"}
                </span>
                {status.pendaftaran.linkPendaftaran && (
                  <a
                    href={status.pendaftaran.linkPendaftaran}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-label-sm text-primary underline hover:opacity-80"
                  >
                    Link Pendaftaran
                  </a>
                )}
              </div>
              <p className="mt-sm text-label-sm text-on-surface-variant">
                Prefix nomor lapak acak pedagang, mis. &quot;{status.pendaftaran.kodeEvent || "CFD"}-001234&quot;.
                Check-in kehadiran pedagang di lokasi tetap dilakukan petugas lewat Scan QR -- kode
                ini cuma buat prefix nomor lapak.
              </p>
            </div>
          </div>
        </div>

        {/* Timer */}
        <div className="pt-card flex flex-col items-center justify-center gap-sm text-center">
          <div className="relative flex h-32 w-32 items-center justify-center">
            <svg className="h-32 w-32 -rotate-90" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r={RADIUS} fill="none" stroke="var(--color-surface-container-high)" strokeWidth="10" />
              <circle
                cx="60"
                cy="60"
                r={RADIUS}
                fill="none"
                stroke="var(--color-primary)"
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={CIRC}
                strokeDashoffset={CIRC - progress}
                className="transition-all duration-1000"
              />
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="text-title-lg font-semibold text-on-surface">
                {sesi && sesi.aktif ? formatSisaWaktu(sesi.sisaMenit) : "--:--"}
              </span>
              <span className="text-label-sm text-on-surface-variant">Sisa Waktu CFD</span>
            </div>
          </div>
          <p className="text-label-sm text-on-surface-variant">
            {sesi && sesi.aktif ? (
              <>
                Sesi hari ini akan berakhir pada{" "}
                <strong className="text-on-surface">{formatJamTampilan(sesi.jamSelesaiRencana)} WIB</strong>
              </>
            ) : (
              "Belum ada sesi yang sedang berlangsung"
            )}
          </p>
        </div>
      </div>

      {/* ===== RIWAYAT OPERASIONAL ===== */}
      <div className="pt-card">
        <div className="mb-md flex items-center gap-sm">
          <History className="h-[18px] w-[18px] text-on-surface-variant" strokeWidth={2} />
          <h3 className="pt-section-title">Riwayat Operasional</h3>
          <span className="ml-auto text-label-sm text-on-surface-variant">{status.riwayat.length} sesi terakhir</span>
        </div>

        {status.riwayat.length === 0 ? (
          <p className="py-8 text-center text-body-md text-on-surface-variant">Belum ada riwayat sesi.</p>
        ) : (
          <>
            {/* Tabel -- tablet ke atas */}
            <div className="hidden overflow-x-auto sm:block">
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
                  {status.riwayat.map((row) => {
                    const style = STATUS_STYLE[row.status];
                    const Icon = style.icon;
                    return (
                      <tr
                        key={row.id}
                        className="border-b border-outline-variant last:border-0 hover:bg-surface-container-low/50 transition-colors"
                      >
                        <td className="px-sm py-sm text-body-md text-on-surface">{row.tanggal}</td>
                        <td className="px-sm py-sm text-body-md text-on-surface-variant">{formatWaktuTabel(row.jamMulai)}</td>
                        <td className="px-sm py-sm text-body-md text-on-surface-variant">{formatWaktuTabel(row.jamSelesai)}</td>
                        <td className="px-sm py-sm text-body-md text-on-surface-variant">{row.durasi}</td>
                        <td className="px-sm py-sm">
                          <span className={`pt-pill ${style.pill}`}>
                            <Icon className="h-3 w-3" strokeWidth={2.5} />
                            {style.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Daftar kartu -- mobile */}
            <div className="flex flex-col gap-sm sm:hidden">
              {status.riwayat.map((row) => {
                const style = STATUS_STYLE[row.status];
                const Icon = style.icon;
                return (
                  <div key={row.id} className="rounded-xl border border-outline-variant bg-surface-container-low p-md">
                    <div className="flex items-center justify-between gap-sm">
                      <p className="text-body-md font-medium text-on-surface">{row.tanggal}</p>
                      <span className={`pt-pill ${style.pill}`}>
                        <Icon className="h-3 w-3" strokeWidth={2.5} />
                        {style.label}
                      </span>
                    </div>
                    <p className="mt-1 text-body-sm text-on-surface-variant">
                      {formatWaktuTabel(row.jamMulai)} – {formatWaktuTabel(row.jamSelesai)} · {row.durasi}
                    </p>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Modal Atur Jam Sesi Hari Ini */}
      {showAturSesiModal && (
        <ModalShell
          onClose={() => setShowAturSesiModal(false)}
          title={sesi ? "Ubah Jam Sesi CFD" : "Atur Jam Sesi CFD"}
          description="Sesi ini menentukan kapan pedagang bisa check-in (scan QR) dan kapan mereka baru boleh check-out."
          footer={
            <div className="flex justify-end gap-sm">
              <button type="button" onClick={() => setShowAturSesiModal(false)} className="pt-btn pt-btn-ghost">
                Batal
              </button>
              <button
                type="button"
                onClick={handleSimpanSesi}
                disabled={isSubmittingSesi}
                className="pt-btn pt-btn-primary"
              >
                {isSubmittingSesi && <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />}
                {isSubmittingSesi ? "Menyimpan..." : "Simpan"}
              </button>
            </div>
          }
        >
          <div className="grid grid-cols-1 gap-sm sm:grid-cols-2">
            <div>
              <label className="pt-field-label">Jam Mulai</label>
              <div className="mt-1">
                <TimeStepper value={formJamMulai} onChange={setFormJamMulai} />
              </div>
            </div>
            <div>
              <label className="pt-field-label">Jam Selesai</label>
              <div className="mt-1">
                <TimeStepper value={formJamSelesai} onChange={setFormJamSelesai} />
              </div>
            </div>
          </div>
        </ModalShell>
      )}

      {/* Modal Edit Kode Event */}
      {showEditJamCheckInModal && (
        <ModalShell
          onClose={() => setShowEditJamCheckInModal(false)}
          title="Edit Kode Event"
          description="Prefix nomor lapak acak pedagang -- ganti sesuai event yang sedang berjalan (CFD, MRT, dst)."
          footer={
            <div className="flex justify-end gap-sm">
              <button
                type="button"
                onClick={() => setShowEditJamCheckInModal(false)}
                className="pt-btn pt-btn-ghost"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSimpanCheckIn}
                disabled={!canEditCheckIn || isSavingCheckIn}
                className="pt-btn pt-btn-primary"
              >
                {isSavingCheckIn && <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />}
                {isSavingCheckIn ? "Menyimpan..." : "Simpan"}
              </button>
            </div>
          }
        >
          <div className="rounded-lg bg-surface-container-low p-md">
            <div className="flex items-center gap-sm">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary-container text-on-primary-container">
                <Tag className="h-[18px] w-[18px]" strokeWidth={2} />
              </span>
              <p className="text-label-sm uppercase tracking-wide text-on-surface-variant">Kode Event</p>
            </div>
            <div className="mt-sm">
              <input
                type="text"
                value={kodeEvent}
                onChange={(e) => setKodeEvent(e.target.value.toUpperCase().slice(0, 10))}
                disabled={!canEditCheckIn}
                placeholder="CFD"
                className="pt-input w-full uppercase"
              />
              <p className="mt-xs text-label-sm text-on-surface-variant">
                Prefix nomor lapak acak pedagang, mis. &quot;{kodeEvent || "CFD"}-001234&quot;. Ganti sesuai event yang sedang berjalan (CFD, MRT, dst).
              </p>
            </div>
          </div>

          {isFriday && checkInSudahDiubahHariIni && (
            <div className="mt-sm flex items-center gap-sm rounded-lg bg-surface-container-high px-md py-sm text-label-sm text-on-surface-variant">
              <Info className="h-4 w-4 shrink-0" strokeWidth={2} />
              Pengaturan sudah diubah hari ini (hanya sekali pada hari Jumat)
            </div>
          )}
        </ModalShell>
      )}
      {confirmDialog && (
        <ModalShell onClose={() => setConfirmDialog(null)} maxWidthClass="max-w-[26rem]">
          <div className="flex items-center gap-sm mb-3 pr-8">
            <span
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
                confirmDialog.danger ? "bg-error-container/60 text-on-error-container" : "bg-primary/10 text-primary"
              }`}
            >
              <AlertTriangle className="h-5 w-5" strokeWidth={2} />
            </span>
            <h3 className="text-title-lg text-on-surface font-semibold">{confirmDialog.title}</h3>
          </div>
          <p className="text-body-md text-on-surface-variant mb-4">{confirmDialog.message}</p>
          <div className="flex justify-end gap-sm">
            <button type="button" onClick={() => setConfirmDialog(null)} className="pt-btn pt-btn-ghost">
              Batal
            </button>
            <button
              type="button"
              onClick={confirmDialog.onConfirm}
              className={`pt-btn ${confirmDialog.danger ? "pt-btn-danger" : "pt-btn-primary"}`}
            >
              {confirmDialog.confirmLabel}
            </button>
          </div>
        </ModalShell>
      )}
    </div>
  );
}