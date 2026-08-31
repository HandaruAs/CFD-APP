// app/petugas/jam-operasional/page.tsx
"use client";

import { useEffect, useState } from "react";
import {
  Clock,
  Hourglass,
  History,
  CircleX,
  CalendarCheck2,
  Lock,
  LockOpen,
  Check,
  AlertTriangle,
  Timer,
  Loader2,
  X,
  Info,
  Edit,
  MapPin,
  Store,
  PackageCheck,
  PackageX,
} from "lucide-react";
import { inputClass } from "@/components/form-field";

// ========== TYPES ==========
type StatusRiwayat = "normal" | "diperpanjang" | "diakhiri-awal";
type Riwayat = {
  tanggal: string;
  jamMulai: string;
  jamSelesai: string;
  durasi: string;
  status: StatusRiwayat;
};
type SesiAktif = {
  id: string;
  tanggal: string;
  jamMulai: string;
  jamSelesaiRencana: string;
  status: "berlangsung" | "selesai_normal" | "diperpanjang" | "diakhiri_awal";
  aktif: boolean;
  sisaMenit: number;
  totalMenit: number;
};
type StatusOperasional = {
  pendaftaran: {
    isOpen: boolean;
    linkPendaftaran: string | null;
    jamBuka?: string | null;
    jamTutup?: string | null;
  };
  sesi: SesiAktif | null;
  riwayat: Riwayat[];
};

// ========== TIPE UNTUK SISA LAPAK ==========
type JalanData = {
  nama: string;
  kuota: number;
  terisi: number;
};
type KecamatanData = {
  kecamatan: string;
  jalan: JalanData[];
};

// ========== STYLE ==========
const STATUS_STYLE: Record<StatusRiwayat, { label: string; bg: string; text: string; icon: typeof Check }> = {
  normal: {
    label: "Selesai Normal",
    bg: "bg-secondary-container/40",
    text: "text-on-secondary-container",
    icon: Check,
  },
  diperpanjang: {
    label: "Diperpanjang",
    bg: "bg-tertiary-container/15",
    text: "text-on-tertiary-container",
    icon: Clock,
  },
  "diakhiri-awal": {
    label: "Diakhiri Awal",
    bg: "bg-error-container/60",
    text: "text-on-error-container",
    icon: AlertTriangle,
  },
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
function ModalShell({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(0,0,0,0.5)",
        backdropFilter: "blur(2px)",
        padding: "1rem",
      }}
      onClick={onClose}
    >
      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: "28rem",
          backgroundColor: "#ffffff",
          borderRadius: "0.75rem",
          padding: "1.5rem",
          boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
          animation: "modalIn 0.2s ease-out",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup"
          style={{
            position: "absolute",
            top: "0.75rem",
            right: "0.75rem",
            borderRadius: "9999px",
            padding: "0.25rem",
            color: "#444653",
            background: "transparent",
            border: "none",
            cursor: "pointer",
          }}
        >
          <X className="h-4 w-4" strokeWidth={2} />
        </button>
        {children}
      </div>
    </div>
  );
}

// Animasi modal
if (typeof document !== "undefined") {
  const styleSheet = document.createElement("style");
  styleSheet.textContent = `
    @keyframes modalIn {
      from { opacity: 0; transform: scale(0.95) translateY(10px); }
      to { opacity: 1; transform: scale(1) translateY(0); }
    }
  `;
  document.head.appendChild(styleSheet);
}

// ===== MAIN =====
export default function JamOperasionalPage() {
  const [status, setStatus] = useState<StatusOperasional | null>(null);
  const [isLoadingPage, setIsLoadingPage] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const [jamMulaiInput, setJamMulaiInput] = useState("06:00");
  const [jamSelesaiInput, setJamSelesaiInput] = useState("11:00");
  const [editMode, setEditMode] = useState(false);

  const [pendaftaranJamBuka, setPendaftaranJamBuka] = useState("00:00");
  const [pendaftaranJamTutup, setPendaftaranJamTutup] = useState("23:59");
  const [isTogglingPendaftaran, setIsTogglingPendaftaran] = useState(false);
  const [isSavingPendaftaran, setIsSavingPendaftaran] = useState(false);

  // ===== STATE UNTUK SISA LAPAK (BARU) =====
  const [lapakData, setLapakData] = useState<KecamatanData[]>([]);
  const [isLoadingLapak, setIsLoadingLapak] = useState(true);
  const [lapakError, setLapakError] = useState<string | null>(null);

  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    message: string;
    confirmLabel: string;
    danger?: boolean;
    onConfirm: () => void;
  } | null>(null);

  const today = new Date();
  const isSunday = today.getDay() === 0;
  const isFriday = today.getDay() === 5;
  const sesiSudahAda = status?.sesi != null;
  const [pendaftaranSudahDiubahHariIni, setPendaftaranSudahDiubahHariIni] = useState(false);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // ===== LOAD STATUS + SISA LAPAK =====
  const loadStatus = async () => {
    try {
      const data = (await apiFetch("/api/petugas/jam-operasional")) as StatusOperasional;
      setStatus(data);
      setLoadError(null);
      if (data.sesi) {
        setJamMulaiInput(data.sesi.jamMulai.slice(0, 5));
        setJamSelesaiInput(data.sesi.jamSelesaiRencana.slice(0, 5));
      }
      if (data.pendaftaran.jamBuka) {
        setPendaftaranJamBuka(data.pendaftaran.jamBuka.slice(0, 5));
      }
      if (data.pendaftaran.jamTutup) {
        setPendaftaranJamTutup(data.pendaftaran.jamTutup.slice(0, 5));
      }
      setPendaftaranSudahDiubahHariIni(false);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "gagal memuat data");
    } finally {
      setIsLoadingPage(false);
    }
  };

  // ===== FETCH SISA LAPAK =====
  const loadSisaLapak = async () => {
    try {
      const data = await apiFetch("/api/petugas/sisa-lapak");
      setLapakData(Array.isArray(data) ? data : []);
      setLapakError(null);
    } catch (err) {
      setLapakError(err instanceof Error ? err.message : "gagal memuat data sisa lapak");
      setLapakData([]);
    } finally {
      setIsLoadingLapak(false);
    }
  };

  useEffect(() => {
    loadStatus();
    loadSisaLapak();
    const interval = setInterval(() => {
      loadStatus();
      loadSisaLapak();
    }, 60_000);
    return () => clearInterval(interval);
  }, []);

  // ===== HANDLER SESI =====
  const handleSimpanPerubahan = async () => {
    setConfirmDialog({
      title: "Konfirmasi Perubahan",
      message: "Apakah Anda yakin dengan perubahan jadwal sesi CFD ini?",
      confirmLabel: "Ya, Simpan",
      onConfirm: async () => {
        setConfirmDialog(null);
        setActionLoading("simpan");
        try {
          await apiFetch("/api/petugas/jam-operasional/sesi", {
            method: "PATCH",
            body: JSON.stringify({ jamMulai: jamMulaiInput, jamSelesaiRencana: jamSelesaiInput }),
          });
          showToast("✅ Jam sesi berhasil disimpan", "success");
          setEditMode(false);
          await loadStatus();
        } catch (err) {
          showToast(err instanceof Error ? err.message : "gagal menyimpan jam sesi", "error");
        } finally {
          setActionLoading(null);
        }
      },
    });
  };

  const handleAkhiriSesi = async () => {
    setConfirmDialog({
      title: "Akhiri Sesi Lebih Awal",
      message: "Yakin mau akhiri sesi CFD hari ini lebih awal? Tindakan ini tidak bisa dibatalkan.",
      confirmLabel: "Ya, Akhiri Sesi",
      danger: true,
      onConfirm: async () => {
        setConfirmDialog(null);
        setActionLoading("akhiri");
        try {
          await apiFetch("/api/petugas/jam-operasional/sesi/akhiri", { method: "PATCH" });
          showToast("✅ Sesi CFD berhasil diakhiri lebih awal", "success");
          await loadStatus();
        } catch (err) {
          showToast(err instanceof Error ? err.message : "gagal mengakhiri sesi", "error");
        } finally {
          setActionLoading(null);
        }
      },
    });
  };

  // ===== HANDLER PENDAFTARAN =====
  const handleTogglePendaftaran = async () => {
    if (!status) return;
    const newState = !status.pendaftaran.isOpen;
    const jamTutupDisplay = status.pendaftaran.jamTutup
      ? ` pada jam ${formatJamTampilan(status.pendaftaran.jamTutup)} WIB`
      : "";

    setConfirmDialog({
      title: `Konfirmasi ${newState ? "Buka" : "Tutup"} Pendaftaran`,
      message: newState
        ? "Apakah Anda yakin ingin membuka pendaftaran pedagang?"
        : `Apakah Anda yakin ingin menutup pendaftaran pedagang${jamTutupDisplay}?`,
      confirmLabel: `Ya, ${newState ? "Buka" : "Tutup"}`,
      danger: !newState,
      onConfirm: async () => {
        setConfirmDialog(null);
        setIsTogglingPendaftaran(true);
        try {
          await apiFetch("/api/petugas/jam-operasional/pendaftaran", {
            method: "PATCH",
            body: JSON.stringify({ isOpen: newState }),
          });
          showToast(`Pendaftaran ${newState ? "dibuka" : "ditutup"} ✅`, "success");
          await loadStatus();
        } catch (err) {
          showToast(err instanceof Error ? err.message : "Gagal mengubah status pendaftaran", "error");
        } finally {
          setIsTogglingPendaftaran(false);
        }
      },
    });
  };

  const handleSimpanPendaftaran = async () => {
    if (!status) return;
    setConfirmDialog({
      title: "Konfirmasi Perubahan Pendaftaran",
      message: "Apakah Anda yakin dengan perubahan pengaturan pendaftaran ini?",
      confirmLabel: "Ya, Simpan",
      onConfirm: async () => {
        setConfirmDialog(null);
        setIsSavingPendaftaran(true);
        try {
          await apiFetch("/api/petugas/jam-operasional/pendaftaran", {
            method: "PATCH",
            body: JSON.stringify({
              isOpen: status.pendaftaran.isOpen,
              jamBuka: pendaftaranJamBuka,
              jamTutup: pendaftaranJamTutup,
            }),
          });
          showToast("✅ Pengaturan pendaftaran berhasil disimpan", "success");
          await loadStatus();
        } catch (err) {
          showToast(err instanceof Error ? err.message : "Gagal menyimpan pengaturan pendaftaran", "error");
        } finally {
          setIsSavingPendaftaran(false);
        }
      },
    });
  };

  if (isLoadingPage) {
    return (
      <div className="flex items-center justify-center py-24 text-on-surface-variant">
        <Loader2 className="h-6 w-6 animate-spin" strokeWidth={2} />
      </div>
    );
  }
  if (loadError || !status) {
    return (
      <div className="rounded-lg border border-error-container bg-error-container/20 p-lg text-on-error-container">
        Gagal memuat data: {loadError ?? "data tidak ditemukan"}
      </div>
    );
  }

  const sesi = status.sesi;
  const sesiSedangAktif = sesi?.aktif ?? false;
  const progress = sesi && sesi.totalMenit > 0 ? (sesi.sisaMenit / sesi.totalMenit) * CIRC : 0;

  const canEditSesi = !sesiSudahAda || (sesiSudahAda && !isSunday && editMode);
  const showEditButton = sesiSudahAda && !isSunday;
  const sesiInfoMessage = !sesiSudahAda
    ? "Anda dapat mengatur jadwal kapan saja. Pada hari Minggu, hanya bisa disimpan sekali."
    : isSunday
    ? "✅ Jadwal Minggu ini sudah diatur, tidak bisa diubah lagi"
    : "💡 Klik 'Edit Kembali' untuk mengoreksi jam jika terjadi kesalahan.";
  const canEditPendaftaran = !(isFriday && pendaftaranSudahDiubahHariIni);

  // ===== SISA LAPAK =====
  const totalKuota = lapakData.reduce((acc, k) => {
    for (const j of k.jalan) acc += j.kuota;
    return acc;
  }, 0);
  const totalTerisi = lapakData.reduce((acc, k) => {
    for (const j of k.jalan) acc += j.terisi;
    return acc;
  }, 0);
  const sisaTotal = totalKuota - totalTerisi;

  return (
    <div className="flex flex-col gap-lg">
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

      <div>
        <h2 className="text-headline-lg text-on-surface">Jam Operasional</h2>
        <p className="mt-xs max-w-2xl text-body-md text-on-surface-variant">
          Atur jam mulai & selesai CFD. Pada hari Minggu hanya bisa disimpan sekali. Kelola pendaftaran pedagang secara terpisah.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-md lg:grid-cols-[1fr_280px]">
        <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-lg">
          {/* Sesi CFD */}
          <div className="flex flex-wrap items-center justify-between gap-sm">
            <h3 className="text-title-lg text-on-surface">Jadwal Sesi CFD Hari Ini</h3>
            <span
              className={`flex items-center gap-xs rounded-full px-sm py-1 text-label-sm ${
                sesi && sesiSedangAktif
                  ? "bg-secondary-container/40 text-on-secondary-container"
                  : "bg-surface-container-high text-on-surface-variant"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full bg-secondary ${sesi && sesiSedangAktif ? "animate-pulse" : ""}`}
              />
              {!sesi && "Belum Diatur"}
              {sesi?.status === "berlangsung" && "Sedang Berlangsung"}
              {sesi?.status === "diperpanjang" && "Diperpanjang"}
              {sesi?.status === "selesai_normal" && "Selesai Normal"}
              {sesi?.status === "diakhiri_awal" && "Diakhiri Awal"}
            </span>
          </div>

          <div className="mt-md grid grid-cols-1 gap-sm sm:grid-cols-2">
            <div className="flex items-center gap-sm rounded-lg bg-surface-container-low p-md">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary text-on-primary">
                <Clock className="h-[18px] w-[18px]" strokeWidth={2} />
              </span>
              <div className="flex-1">
                <p className="text-label-sm uppercase tracking-wide text-on-surface-variant">Jam Mulai CFD</p>
                <input
                  type="time"
                  value={jamMulaiInput}
                  onChange={(e) => setJamMulaiInput(e.target.value)}
                  disabled={!canEditSesi}
                  onKeyDown={(e) => e.preventDefault()}
                  className="w-full bg-transparent text-title-lg text-on-surface outline-none disabled:opacity-50"
                />
              </div>
            </div>
            <div className="flex items-center gap-sm rounded-lg bg-error-container/30 p-md">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-error-container text-on-error-container">
                <Hourglass className="h-[18px] w-[18px]" strokeWidth={2} />
              </span>
              <div className="flex-1">
                <p className="text-label-sm uppercase tracking-wide text-on-surface-variant">Jam Selesai CFD</p>
                <input
                  type="time"
                  value={jamSelesaiInput}
                  onChange={(e) => setJamSelesaiInput(e.target.value)}
                  disabled={!canEditSesi}
                  onKeyDown={(e) => e.preventDefault()}
                  className="w-full bg-transparent text-title-lg text-on-surface outline-none disabled:opacity-50"
                />
              </div>
            </div>
          </div>

          {sesiInfoMessage && (
            <div
              className={`mt-sm flex items-center gap-sm rounded-lg px-md py-sm text-label-sm ${
                sesiSudahAda && !isSunday
                  ? "bg-secondary-container/20 text-on-secondary-container"
                  : "bg-surface-container-high text-on-surface-variant"
              }`}
            >
              <Info className="h-4 w-4" strokeWidth={2} />
              {sesiInfoMessage}
            </div>
          )}

          <div className="mt-lg flex flex-wrap gap-sm border-t border-outline-variant pt-md">
            <button
              type="button"
              onClick={handleSimpanPerubahan}
              disabled={!canEditSesi || actionLoading !== null}
              className="flex items-center gap-sm rounded-md bg-primary px-lg py-sm text-label-md text-on-primary transition-all hover:bg-primary-container hover:shadow-md disabled:opacity-60"
            >
              <CalendarCheck2 className="h-[18px] w-[18px]" strokeWidth={2} />
              {actionLoading === "simpan" ? "Menyimpan..." : "Simpan Perubahan"}
            </button>

            {showEditButton && (
              <button
                type="button"
                onClick={() => setEditMode(!editMode)}
                disabled={actionLoading !== null}
                className={`flex items-center gap-sm rounded-md px-lg py-sm text-label-md transition-all hover:shadow-md ${
                  editMode
                    ? "bg-secondary-container/40 text-on-secondary-container hover:bg-secondary-container"
                    : "bg-surface-container-high text-on-surface-variant hover:bg-surface-container"
                }`}
              >
                <Edit className="h-[18px] w-[18px]" strokeWidth={2} />
                {editMode ? "Batalkan Edit" : "Edit Kembali"}
              </button>
            )}

            {sesiSedangAktif && (
              <button
                type="button"
                onClick={handleAkhiriSesi}
                disabled={actionLoading !== null}
                className="flex items-center gap-sm rounded-md bg-error-container/60 px-lg py-sm text-label-md text-on-error-container transition-all hover:bg-error-container hover:shadow-md disabled:opacity-60"
              >
                <CircleX className="h-[18px] w-[18px]" strokeWidth={2} />
                {actionLoading === "akhiri" ? "Mengakhiri..." : "Akhiri Sesi Lebih Awal"}
              </button>
            )}
          </div>

          {/* ===== PENDAFTARAN ===== */}
          <div className="mt-lg border-t border-outline-variant pt-md">
            <h4 className="text-title-md text-on-surface">Pengaturan Pendaftaran Pedagang</h4>
            <div className="mt-sm flex flex-wrap items-center justify-between gap-sm rounded-lg border border-outline-variant bg-surface-container-lowest p-md">
              <div className="flex items-center gap-sm">
                {status.pendaftaran.isOpen ? (
                  <LockOpen className="h-4 w-4 text-secondary" strokeWidth={2} />
                ) : (
                  <Lock className="h-4 w-4 text-error" strokeWidth={2} />
                )}
                <span className="text-label-md font-medium">
                  Status:{" "}
                  <strong className={status.pendaftaran.isOpen ? "text-secondary" : "text-error"}>
                    {status.pendaftaran.isOpen ? "Terbuka" : "Tertutup"}
                  </strong>
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
              <button
                type="button"
                onClick={handleTogglePendaftaran}
                disabled={isTogglingPendaftaran}
                className={`flex items-center gap-sm rounded-md px-md py-sm text-label-md transition-all hover:shadow-md disabled:opacity-60 ${
                  status.pendaftaran.isOpen
                    ? "bg-error-container/60 text-on-error-container hover:bg-error-container"
                    : "bg-secondary-container/40 text-on-secondary-container hover:bg-secondary-container"
                }`}
              >
                {isTogglingPendaftaran ? (
                  <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
                ) : status.pendaftaran.isOpen ? (
                  <>
                    <Lock className="h-4 w-4" strokeWidth={2} />
                    Tutup Pendaftaran
                  </>
                ) : (
                  <>
                    <LockOpen className="h-4 w-4" strokeWidth={2} />
                    Buka Pendaftaran
                  </>
                )}
              </button>
            </div>

            <div className="mt-sm grid grid-cols-1 gap-sm sm:grid-cols-2">
              <div className="flex items-center gap-sm rounded-lg bg-surface-container-low p-md">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-secondary-container text-on-secondary-container">
                  <Clock className="h-[18px] w-[18px]" strokeWidth={2} />
                </span>
                <div className="flex-1">
                  <p className="text-label-sm uppercase tracking-wide text-on-surface-variant">Jam Buka Pendaftaran</p>
                  <input
                    type="time"
                    value={pendaftaranJamBuka}
                    onChange={(e) => setPendaftaranJamBuka(e.target.value)}
                    disabled={!canEditPendaftaran}
                    onKeyDown={(e) => e.preventDefault()}
                    className="w-full bg-transparent text-title-lg text-on-surface outline-none disabled:opacity-50"
                  />
                </div>
              </div>
              <div className="flex items-center gap-sm rounded-lg bg-error-container/30 p-md">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-error-container text-on-error-container">
                  <Hourglass className="h-[18px] w-[18px]" strokeWidth={2} />
                </span>
                <div className="flex-1">
                  <p className="text-label-sm uppercase tracking-wide text-on-surface-variant">Jam Tutup Pendaftaran</p>
                  <input
                    type="time"
                    value={pendaftaranJamTutup}
                    onChange={(e) => setPendaftaranJamTutup(e.target.value)}
                    disabled={!canEditPendaftaran}
                    onKeyDown={(e) => e.preventDefault()}
                    className="w-full bg-transparent text-title-lg text-on-surface outline-none disabled:opacity-50"
                  />
                </div>
              </div>
            </div>

            {isFriday && pendaftaranSudahDiubahHariIni && (
              <div className="mt-sm flex items-center gap-sm rounded-lg bg-surface-container-high px-md py-sm text-label-sm text-on-surface-variant">
                <Info className="h-4 w-4" strokeWidth={2} />
                Pengaturan pendaftaran sudah diubah hari ini (hanya sekali pada hari Jumat)
              </div>
            )}

            <div className="mt-sm flex justify-end">
              <button
                type="button"
                onClick={handleSimpanPendaftaran}
                disabled={!canEditPendaftaran || isSavingPendaftaran}
                className="flex items-center gap-sm rounded-md bg-secondary px-lg py-sm text-label-md text-on-secondary transition-all hover:bg-secondary-container hover:shadow-md disabled:opacity-60"
              >
                {isSavingPendaftaran ? (
                  <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
                ) : (
                  <CalendarCheck2 className="h-[18px] w-[18px]" strokeWidth={2} />
                )}
                {isSavingPendaftaran ? "Menyimpan..." : "Simpan Pengaturan Pendaftaran"}
              </button>
            </div>
          </div>
        </div>

        {/* Timer */}
        <div className="flex flex-col items-center justify-center gap-sm rounded-xl border border-outline-variant bg-surface-container-lowest p-lg text-center">
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
                {sesi && sesiSedangAktif ? formatSisaWaktu(sesi.sisaMenit) : "--:--"}
              </span>
              <span className="text-label-sm text-on-surface-variant">Sisa Waktu CFD</span>
            </div>
          </div>
          <p className="text-label-sm text-on-surface-variant">
            {sesi && sesiSedangAktif ? (
              <>
                Sesi saat ini akan berakhir pada{" "}
                <strong className="text-on-surface">{formatJamTampilan(sesi.jamSelesaiRencana)} WIB</strong>
              </>
            ) : (
              "Belum ada sesi yang sedang berlangsung"
            )}
          </p>
          <div className="mt-xs w-full max-w-[200px] rounded-full bg-surface-container-high h-1">
            <div
              className="h-full rounded-full bg-primary transition-all duration-1000"
              style={{ width: `${sesi && sesi.totalMenit > 0 ? (sesi.sisaMenit / sesi.totalMenit) * 100 : 0}%` }}
            />
          </div>
        </div>
      </div>

      {/* ===== RIWAYAT OPERASIONAL ===== */}
      <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-lg">
        <div className="mb-md flex items-center gap-sm">
          <History className="h-[18px] w-[18px] text-on-surface-variant" strokeWidth={2} />
          <h3 className="text-title-lg text-on-surface">Riwayat Operasional</h3>
          <span className="ml-auto text-label-sm text-on-surface-variant">{status.riwayat.length} sesi terakhir</span>
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
              {status.riwayat.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-sm py-md text-center text-body-md text-on-surface-variant">
                    Belum ada riwayat sesi.
                  </td>
                </tr>
              )}
              {status.riwayat.map((row) => {
                const style = STATUS_STYLE[row.status];
                const Icon = style.icon;
                return (
                  <tr
                    key={row.tanggal + row.jamMulai}
                    className="border-b border-outline-variant last:border-0 hover:bg-surface-container-low/50 transition-colors"
                  >
                    <td className="px-sm py-sm text-body-md text-on-surface">{row.tanggal}</td>
                    <td className="px-sm py-sm text-body-md text-on-surface-variant">{formatWaktuTabel(row.jamMulai)}</td>
                    <td className="px-sm py-sm text-body-md text-on-surface-variant">{formatWaktuTabel(row.jamSelesai)}</td>
                    <td className="px-sm py-sm text-body-md text-on-surface-variant">{row.durasi}</td>
                    <td className="px-sm py-sm">
                      <span className={`inline-flex items-center gap-xs rounded-full px-sm py-1 text-label-sm ${style.bg} ${style.text}`}>
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
      </div>

      {/* ===== SISA KUOTA LAPAK PER WILAYAH (BARU – DARI API) ===== */}
      <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-lg">
        <div className="mb-md flex items-center gap-sm">
          <Store className="h-[18px] w-[18px] text-on-surface-variant" strokeWidth={2} />
          <h3 className="text-title-lg text-on-surface">Sisa Kuota Lapak per Wilayah</h3>
          <span className="ml-auto text-label-sm text-on-surface-variant">
            {isLoadingLapak ? "Memuat..." : `Total ${totalKuota} lapak, ${sisaTotal} tersisa`}
          </span>
        </div>

        {isLoadingLapak ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-on-surface-variant" strokeWidth={2} />
          </div>
        ) : lapakError ? (
          <div className="rounded-lg border border-error-container bg-error-container/20 p-md text-on-error-container">
            Gagal memuat data lapak: {lapakError}
          </div>
        ) : lapakData.length === 0 ? (
          <p className="text-center text-body-md text-on-surface-variant">
            Belum ada data kuota lapak yang diatur.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {lapakData.map((kec) => {
              const totalKuotaKec = kec.jalan.reduce((s, j) => s + j.kuota, 0);
              const totalTerisiKec = kec.jalan.reduce((s, j) => s + j.terisi, 0);
              const sisaKec = totalKuotaKec - totalTerisiKec;
              return (
                <div key={kec.kecamatan} className="rounded-lg border border-outline-variant bg-surface-container-low p-md">
                  <h4 className="text-title-md text-on-surface flex items-center gap-1">
                    <MapPin className="h-4 w-4" strokeWidth={2} />
                    {kec.kecamatan}
                  </h4>
                  <p className="text-label-sm text-on-surface-variant mt-1">
                    {sisaKec} dari {totalKuotaKec} lapak tersisa
                  </p>
                  <div className="mt-2 space-y-2">
                    {kec.jalan.map((jalan) => {
                      const sisa = jalan.kuota - jalan.terisi;
                      const persen = jalan.kuota > 0 ? (jalan.terisi / jalan.kuota) * 100 : 0;
                      const levelColor =
                        sisa === 0
                          ? "bg-error"
                          : sisa / jalan.kuota <= 0.2
                          ? "bg-tertiary"
                          : "bg-secondary";
                      return (
                        <div key={jalan.nama} className="rounded border border-outline-variant bg-surface-container-lowest p-2">
                          <div className="flex justify-between">
                            <span className="text-label-sm text-on-surface">{jalan.nama}</span>
                            <span className="text-label-sm font-semibold text-on-surface">{sisa}</span>
                          </div>
                          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-surface-container-high">
                            <div
                              className={`h-full rounded-full ${levelColor} transition-all duration-500`}
                              style={{ width: `${Math.min(100, persen)}%` }}
                            />
                          </div>
                          <p className="mt-0.5 text-label-xs text-on-surface-variant">
                            {jalan.terisi} terisi dari {jalan.kuota}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal Konfirmasi */}
      {confirmDialog && (
        <ModalShell onClose={() => setConfirmDialog(null)}>
          <div className="flex items-center gap-sm mb-3">
            <span
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                confirmDialog.danger ? "bg-error-container/60 text-on-error-container" : "bg-primary/10 text-primary"
              }`}
            >
              <AlertTriangle className="h-[18px] w-[18px]" strokeWidth={2} />
            </span>
            <h3 className="text-title-lg text-on-surface font-semibold">{confirmDialog.title}</h3>
          </div>
          <p className="text-body-md text-on-surface-variant mb-4">{confirmDialog.message}</p>
          <div className="flex justify-end gap-sm">
            <button
              type="button"
              onClick={() => setConfirmDialog(null)}
              className="rounded-md px-4 py-2 text-label-md text-on-surface-variant hover:bg-surface-container-high transition"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={confirmDialog.onConfirm}
              className={`rounded-md px-4 py-2 text-label-md transition hover:shadow-md ${
                confirmDialog.danger
                  ? "bg-error-container/60 text-on-error-container hover:bg-error-container"
                  : "bg-primary text-on-primary hover:bg-primary-container"
              }`}
            >
              {confirmDialog.confirmLabel}
            </button>
          </div>
        </ModalShell>
      )}
    </div>
  );
}