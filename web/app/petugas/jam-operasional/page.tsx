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
} from "lucide-react";
import { inputClass } from "@/components/form-field";

type StatusRiwayat = "normal" | "diperpanjang" | "diakhiri-awal";

type Riwayat = {
  tanggal: string;
  jamMulai: string;
  jamSelesai: string;
  durasi: string;
  status: StatusRiwayat;
};

// Bentuknya persis SesiAktifDTO di backend (modules/operasional/entity/dto.go)
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

// Bentuknya persis StatusOperasionalResponse di backend
type StatusOperasional = {
  pendaftaran: { isOpen: boolean; linkPendaftaran: string | null };
  sesi: SesiAktif | null;
  riwayat: Riwayat[];
};

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

// "06:00:00" atau "06:00" -> "06.00" (format tampilan lama tetap dipakai)
function formatJamTampilan(jam: string) {
  return jam.slice(0, 5).replace(":", ".");
}

// 150 menit -> "02:30"
function formatSisaWaktu(totalMenit: number) {
  const jam = Math.floor(totalMenit / 60);
  const menit = totalMenit % 60;
  return `${String(jam).padStart(2, "0")}:${String(menit).padStart(2, "0")}`;
}

function apiUrl(path: string) {
  const base = process.env.NEXT_PUBLIC_API_URL;
  if (!base) {
    throw new Error("NEXT_PUBLIC_API_URL belum diset di .env.local!");
  }
  return `${base}${path}`;
}

async function apiFetch(path: string, options: RequestInit = {}) {
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
  return data;
}

export default function JamOperasionalPage() {
  const [status, setStatus] = useState<StatusOperasional | null>(null);
  const [isLoadingPage, setIsLoadingPage] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  // nama action yang lagi diproses, dipakai buat disable tombol yang relevan aja
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const [jamMulaiInput, setJamMulaiInput] = useState("06:00");
  const [jamSelesaiInput, setJamSelesaiInput] = useState("11:00");
  const [showPerpanjang, setShowPerpanjang] = useState(false);
  const [jamPerpanjangInput, setJamPerpanjangInput] = useState("");

  // Ganti confirm() bawaan browser -- dipakai buat 2 aksi yang butuh
  // konfirmasi (tutup pendaftaran & akhiri sesi lebih awal).
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    message: string;
    confirmLabel: string;
    onConfirm: () => void;
  } | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadStatus = async () => {
    try {
      const data = (await apiFetch("/api/petugas/jam-operasional")) as StatusOperasional;
      setStatus(data);
      setLoadError(null);
      if (data.sesi) {
        setJamMulaiInput(data.sesi.jamMulai.slice(0, 5));
        setJamSelesaiInput(data.sesi.jamSelesaiRencana.slice(0, 5));
      }
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "gagal memuat data");
    } finally {
      setIsLoadingPage(false);
    }
  };

  useEffect(() => {
    loadStatus();
    // auto-refresh tiap 1 menit biar "Sisa Waktu" & status sesi nggak basi
    // kalau halaman dibiarin terbuka lama.
    const interval = setInterval(loadStatus, 60_000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSimpanPerubahan = async () => {
    setActionLoading("simpan");
    try {
      await apiFetch("/api/petugas/jam-operasional/sesi", {
        method: "PATCH",
        body: JSON.stringify({ jamMulai: jamMulaiInput, jamSelesaiRencana: jamSelesaiInput }),
      });
      showToast("✅ Jam sesi berhasil disimpan");
      await loadStatus();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "gagal menyimpan jam sesi", "error");
    } finally {
      setActionLoading(null);
    }
  };

  const handleAkhiriSesi = async () => {
    setActionLoading("akhiri");
    try {
      await apiFetch("/api/petugas/jam-operasional/sesi/akhiri", { method: "PATCH" });
      showToast("✅ Sesi CFD berhasil diakhiri lebih awal");
      await loadStatus();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "gagal mengakhiri sesi", "error");
    } finally {
      setActionLoading(null);
    }
  };

  const askAkhiriSesi = () => {
    setConfirmDialog({
      title: "Akhiri Sesi Lebih Awal",
      message: "Yakin mau akhiri sesi CFD hari ini lebih awal? Tindakan ini tidak bisa dibatalkan.",
      confirmLabel: "Ya, Akhiri Sesi",
      onConfirm: () => {
        setConfirmDialog(null);
        handleAkhiriSesi();
      },
    });
  };

  const handlePerpanjang = async () => {
    if (!jamPerpanjangInput) return;
    setActionLoading("perpanjang");
    try {
      await apiFetch("/api/petugas/jam-operasional/sesi/perpanjang", {
        method: "PATCH",
        body: JSON.stringify({ jamSelesaiBaru: jamPerpanjangInput }),
      });
      showToast("✅ Sesi CFD berhasil diperpanjang");
      setShowPerpanjang(false);
      setJamPerpanjangInput("");
      await loadStatus();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "gagal memperpanjang sesi", "error");
    } finally {
      setActionLoading(null);
    }
  };

  const handleTogglePendaftaran = async (isOpen: boolean) => {
    setActionLoading(isOpen ? "buka-pendaftaran" : "tutup-pendaftaran");
    try {
      await apiFetch("/api/petugas/jam-operasional/pendaftaran", {
        method: "PATCH",
        body: JSON.stringify({ isOpen }),
      });
      showToast(
        isOpen ? "🔓 Pendaftaran pedagang berhasil dibuka" : "🔒 Pendaftaran pedagang berhasil ditutup"
      );
      await loadStatus();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "gagal mengubah status pendaftaran", "error");
    } finally {
      setActionLoading(null);
    }
  };

  const askTutupPendaftaran = () => {
    setConfirmDialog({
      title: "Tutup Pendaftaran",
      message:
        "Yakin mau tutup pendaftaran pedagang? Pedagang baru tidak akan bisa mendaftar lewat website pendaftaran UMKM sampai dibuka lagi.",
      confirmLabel: "Ya, Tutup",
      onConfirm: () => {
        setConfirmDialog(null);
        handleTogglePendaftaran(false);
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
        Gagal memuat data jam operasional: {loadError ?? "data tidak ditemukan"}
      </div>
    );
  }

  const sesi = status.sesi;
  const sesiSedangAktif = sesi?.aktif ?? false;
  const progress = sesi && sesi.totalMenit > 0 ? (sesi.sisaMenit / sesi.totalMenit) * CIRC : 0;

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
        <h2 className="text-headline-lg text-on-surface">Jam Operasional</h2>
        <p className="mt-xs max-w-2xl text-body-md text-on-surface-variant">
          Atur jadwal aktif dan durasi kegiatan Car Free Day.
        </p>
      </div>

      {/* Pendaftaran Pedagang */}
      <div className="rounded-lg border border-outline-variant bg-surface-container-lowest p-lg">
        <div className="flex flex-wrap items-center justify-between gap-sm">
          <h3 className="text-title-lg text-on-surface">Pendaftaran Pedagang</h3>
          <span
            className={`flex items-center gap-xs rounded-full px-sm py-1 text-label-sm ${
              status.pendaftaran.isOpen
                ? "bg-secondary-container/40 text-on-secondary-container"
                : "bg-error-container/40 text-on-error-container"
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${status.pendaftaran.isOpen ? "bg-secondary" : "bg-error"}`} />
            {status.pendaftaran.isOpen ? "Pendaftaran Dibuka" : "Pendaftaran Ditutup"}
          </span>
        </div>
        <p className="mt-xs text-body-md text-on-surface-variant">
          Buka pendaftaran supaya pedagang baru bisa mendaftar lewat website pendaftaran UMKM sebelum hari CFD berlangsung.
        </p>

        <div className="mt-md flex flex-wrap gap-sm border-t border-outline-variant pt-md">
          <button
            type="button"
            onClick={askTutupPendaftaran}
            disabled={!status.pendaftaran.isOpen || actionLoading !== null}
            className="flex items-center gap-sm rounded-md bg-error-container/60 px-lg py-sm text-label-md text-on-error-container transition-all hover:bg-error-container hover:shadow-md disabled:opacity-60"
          >
            <Lock className="h-[18px] w-[18px]" strokeWidth={2} />
            {actionLoading === "tutup-pendaftaran" ? "Menutup..." : "Tutup Pendaftaran"}
          </button>
          <button
            type="button"
            onClick={() => handleTogglePendaftaran(true)}
            disabled={status.pendaftaran.isOpen || actionLoading !== null}
            className="flex items-center gap-sm rounded-md bg-primary/10 px-lg py-sm text-label-md text-primary transition-all hover:bg-primary hover:text-on-primary disabled:opacity-60"
          >
            <LockOpen className="h-[18px] w-[18px]" strokeWidth={2} />
            {actionLoading === "buka-pendaftaran" ? "Membuka..." : "Buka Pendaftaran"}
          </button>
        </div>
      </div>

      {/* Status Sesi & Sisa Waktu */}
      <div className="grid grid-cols-1 gap-md lg:grid-cols-[1fr_280px]">
        <div className="rounded-lg border border-outline-variant bg-surface-container-lowest p-lg">
          <div className="flex items-center justify-between">
            <h3 className="text-title-lg text-on-surface">Status Sesi CFD</h3>
            {sesi ? (
              <span
                className={`flex items-center gap-xs rounded-full px-sm py-1 text-label-sm ${
                  sesiSedangAktif
                    ? "bg-secondary-container/40 text-on-secondary-container"
                    : "bg-surface-container-high text-on-surface-variant"
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full bg-secondary ${sesiSedangAktif ? "animate-pulse" : ""}`} />
                {sesi.status === "berlangsung" && "Sedang Berlangsung"}
                {sesi.status === "diperpanjang" && "Diperpanjang"}
                {sesi.status === "selesai_normal" && "Selesai Normal"}
                {sesi.status === "diakhiri_awal" && "Diakhiri Awal"}
              </span>
            ) : (
              <span className="rounded-full bg-surface-container-high px-sm py-1 text-label-sm text-on-surface-variant">
                Belum Diatur Hari Ini
              </span>
            )}
          </div>

          <div className="mt-md grid grid-cols-1 gap-sm sm:grid-cols-2">
            <div className="flex items-center gap-sm rounded-md bg-surface-container-low p-md">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary text-on-primary">
                <Clock className="h-[18px] w-[18px]" strokeWidth={2} />
              </span>
              <div className="flex-1">
                <p className="text-label-sm uppercase tracking-wide text-on-surface-variant">Jam Mulai</p>
                <input
                  type="time"
                  value={jamMulaiInput}
                  onChange={(e) => setJamMulaiInput(e.target.value)}
                  className="w-full bg-transparent text-title-lg text-on-surface outline-none"
                />
              </div>
            </div>
            <div className="flex items-center gap-sm rounded-md bg-error-container/30 p-md">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-error-container text-on-error-container">
                <Hourglass className="h-[18px] w-[18px]" strokeWidth={2} />
              </span>
              <div className="flex-1">
                <p className="text-label-sm uppercase tracking-wide text-on-surface-variant">Jam Selesai</p>
                <input
                  type="time"
                  value={jamSelesaiInput}
                  onChange={(e) => setJamSelesaiInput(e.target.value)}
                  className="w-full bg-transparent text-title-lg text-on-surface outline-none"
                />
              </div>
            </div>
          </div>

          <div className="mt-lg flex flex-wrap gap-sm border-t border-outline-variant pt-md">
            <button
              type="button"
              onClick={handleSimpanPerubahan}
              disabled={actionLoading !== null}
              className="flex items-center gap-sm rounded-md bg-primary px-lg py-sm text-label-md text-on-primary transition-all hover:bg-primary-container hover:shadow-md disabled:opacity-60"
            >
              <CalendarCheck2 className="h-[18px] w-[18px]" strokeWidth={2} />
              {actionLoading === "simpan" ? "Menyimpan..." : "Simpan Perubahan"}
            </button>

            {sesiSedangAktif && !showPerpanjang && (
              <button
                type="button"
                onClick={() => {
                  setJamPerpanjangInput(jamSelesaiInput);
                  setShowPerpanjang(true);
                }}
                disabled={actionLoading !== null}
                className="flex items-center gap-sm rounded-md bg-tertiary-container/30 px-lg py-sm text-label-md text-on-tertiary-container transition-all hover:bg-tertiary-container/60 hover:shadow-md disabled:opacity-60"
              >
                <Timer className="h-[18px] w-[18px]" strokeWidth={2} />
                Perpanjang Sesi
              </button>
            )}

            {sesiSedangAktif && (
              <button
                type="button"
                onClick={askAkhiriSesi}
                disabled={actionLoading !== null}
                className="flex items-center gap-sm rounded-md bg-error-container/60 px-lg py-sm text-label-md text-on-error-container transition-all hover:bg-error-container hover:shadow-md disabled:opacity-60"
              >
                <CircleX className="h-[18px] w-[18px]" strokeWidth={2} />
                {actionLoading === "akhiri" ? "Mengakhiri..." : "Akhiri Sesi Lebih Awal"}
              </button>
            )}
          </div>

          {/* Form inline "Perpanjang Sesi" -- cuma muncul setelah tombol di atas diklik */}
          {showPerpanjang && (
            <div className="mt-md flex flex-wrap items-end gap-sm rounded-md border border-outline-variant bg-surface-container-low p-md">
              <div className="flex flex-col gap-xs">
                <label htmlFor="jamPerpanjang" className="text-label-sm text-on-surface-variant">
                  Jam selesai baru (harus lebih lambat dari {formatJamTampilan(jamSelesaiInput)})
                </label>
                <input
                  id="jamPerpanjang"
                  type="time"
                  value={jamPerpanjangInput}
                  onChange={(e) => setJamPerpanjangInput(e.target.value)}
                  className={inputClass + " sm:w-40"}
                />
              </div>
              <button
                type="button"
                onClick={handlePerpanjang}
                disabled={actionLoading !== null}
                className="flex items-center gap-sm rounded-md bg-primary px-lg py-sm text-label-md text-on-primary transition-all hover:bg-primary-container disabled:opacity-60"
              >
                {actionLoading === "perpanjang" ? "Memproses..." : "Konfirmasi"}
              </button>
              <button
                type="button"
                onClick={() => setShowPerpanjang(false)}
                disabled={actionLoading !== null}
                className="rounded-md px-lg py-sm text-label-md text-on-surface-variant hover:bg-surface-container-high disabled:opacity-60"
              >
                Batal
              </button>
            </div>
          )}
        </div>

        <div className="flex flex-col items-center justify-center gap-sm rounded-lg border border-outline-variant bg-surface-container-lowest p-lg text-center">
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
              <span className="text-label-sm text-on-surface-variant">Sisa Waktu</span>
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

      {/* Riwayat Operasional */}
      <div className="rounded-lg border border-outline-variant bg-surface-container-lowest p-lg">
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
                    <td className="px-sm py-sm text-body-md text-on-surface-variant">{row.jamMulai}</td>
                    <td className="px-sm py-sm text-body-md text-on-surface-variant">{row.jamSelesai}</td>
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

      {/* Modal konfirmasi custom (ganti confirm() bawaan browser) */}
      {confirmDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-lg bg-surface-container-lowest p-lg shadow-xl">
            <div className="flex items-center gap-sm">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-error-container/60 text-on-error-container">
                <AlertTriangle className="h-[18px] w-[18px]" strokeWidth={2} />
              </span>
              <h3 className="text-title-lg text-on-surface">{confirmDialog.title}</h3>
            </div>
            <p className="mt-md text-body-md text-on-surface-variant">{confirmDialog.message}</p>
            <div className="mt-lg flex justify-end gap-sm">
              <button
                type="button"
                onClick={() => setConfirmDialog(null)}
                className="rounded-md px-lg py-sm text-label-md text-on-surface-variant hover:bg-surface-container-high"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={confirmDialog.onConfirm}
                className="rounded-md bg-error-container/60 px-lg py-sm text-label-md text-on-error-container hover:bg-error-container hover:shadow-md"
              >
                {confirmDialog.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}