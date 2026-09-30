// app/admin/jam-operasional/page.tsx
"use client";

// Jam Operasional -- tempat membuat & mengelola sesi CFD.
//   - Tambah Sesi : nama, tanggal, jam mulai/selesai, dan cakupan acak
//                   (Se-Surabaya / Kecamatan / Jalan / Ruas). Admin klik
//                   "Acak Lapak" dulu (diacak di frontend), lalu "Simpan
//                   Sesi" mengirim SATU request berisi sesi + hasil acak.
//                   Boleh lebih dari satu sesi di tanggal yang sama.
//   - Sesi Terjadwal : sesi yang belum selesai, dengan tombol Hapus.
//   - Riwayat Sesi : sesi yang jam selesainya sudah lewat.
// Status sesi murni dihitung dari jam yang diisi di Tambah Sesi -- tidak
// ada lagi timer, aktif/nonaktif manual, ubah jam, akhiri lebih awal, atau
// buka lagi. Sesi yang keliru cukup dihapus lalu dibuat ulang.

import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, AlertTriangle, Loader2, X, Info, Edit, CalendarPlus, Tag } from "lucide-react";
import type { EventDTO, KecamatanLengkapData } from "../manajemen-lapak/types";
import { getWilayah, listEvents } from "../manajemen-lapak/api";
import TambahSesiModal from "./components/TambahSesiModal";
import DaftarSesi from "./components/DaftarSesi";
import RiwayatSesi from "./components/RiwayatSesi";
import { mulaiSesi, statusSesi } from "./components/sesi-utils";

// Pengaturan dari GET /api/petugas/jam-operasional. Halaman ini sekarang
// cuma memakai bagian "pendaftaran" (kode event); "sesi" & "riwayat" dari
// endpoint itu tidak dipakai lagi.
type PengaturanOperasional = {
  pendaftaran: {
    isOpen: boolean;
    linkPendaftaran: string | null;
    jamBuka?: string | null;
    jamTutup?: string | null;
    kodeEvent: string;
  };
};

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

// ===== MAIN =====
export default function JamOperasionalPage() {
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // ===== SESI =====
  const [sesiList, setSesiList] = useState<EventDTO[]>([]);
  const [sesiLoading, setSesiLoading] = useState(true);
  const [sesiError, setSesiError] = useState<string | null>(null);
  const [wilayah, setWilayah] = useState<KecamatanLengkapData[]>([]);
  const [showTambahSesi, setShowTambahSesi] = useState(false);
  // "Jam sekarang" diperbarui tiap menit supaya sesi otomatis pindah dari
  // terjadwal -> berlangsung -> riwayat tanpa perlu muat ulang halaman.
  const [now, setNow] = useState(() => new Date());

  // Muat daftar sesi + data wilayah (jalan & ruas, dipakai Tambah Sesi dan
  // Acak Lapak). Mengembalikan daftar terbaru supaya pemanggil bisa langsung
  // mencari sesi yang baru dibuat.
  const loadSesi = useCallback(async (): Promise<EventDTO[]> => {
    setSesiError(null);
    try {
      const [ev, wil] = await Promise.all([listEvents(), getWilayah()]);
      const list = ev.data ?? [];
      setSesiList(list);
      setWilayah(wil.data ?? []);
      return list;
    } catch (err) {
      setSesiError(err instanceof Error ? err.message : "Gagal memuat daftar sesi.");
      return [];
    } finally {
      setSesiLoading(false);
    }
  }, []);

  const { terjadwal, riwayat } = useMemo(() => {
    const terjadwal: EventDTO[] = [];
    const riwayat: EventDTO[] = [];
    for (const s of sesiList) {
      if (statusSesi(s, now) === "selesai") riwayat.push(s);
      else terjadwal.push(s);
    }
    terjadwal.sort((a, b) => mulaiSesi(a).getTime() - mulaiSesi(b).getTime());
    riwayat.sort((a, b) => mulaiSesi(b).getTime() - mulaiSesi(a).getTime());
    return { terjadwal, riwayat };
  }, [sesiList, now]);

  // ===== KODE EVENT =====
  const [pengaturan, setPengaturan] = useState<PengaturanOperasional | null>(null);
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
  // Dipertahankan dari versi sebelumnya: di hari Jumat kode event cuma
  // boleh diubah sekali.
  const isFriday = new Date().getDay() === 5;
  const [checkInSudahDiubahHariIni, setCheckInSudahDiubahHariIni] = useState(false);
  const canEditCheckIn = !(isFriday && checkInSudahDiubahHariIni);

  const loadPengaturan = useCallback(async () => {
    try {
      const data = (await apiFetch("/api/petugas/jam-operasional")) as PengaturanOperasional;
      setPengaturan(data);
      if (data.pendaftaran.kodeEvent) setKodeEvent(data.pendaftaran.kodeEvent);
      setCheckInSudahDiubahHariIni(false);
    } catch {
      // Kartu kode event cukup menampilkan nilai bawaan kalau gagal dimuat.
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadSesi();
    loadPengaturan();
    const interval = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(interval);
  }, [loadSesi, loadPengaturan]);

  // Kode event: isOpen/jamBuka/jamTutup dikirim apa adanya (tidak diubah)
  // supaya kontrak PATCH ke backend tetap sama.
  const handleSimpanCheckIn = async () => {
    if (!pengaturan) return;
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
              isOpen: pengaturan.pendaftaran.isOpen,
              jamBuka: pengaturan.pendaftaran.jamBuka ?? "00:00",
              jamTutup: (pengaturan.pendaftaran.jamTutup ?? "23:59").slice(0, 5),
              kodeEvent,
            }),
          });
          showToast("✅ Kode event berhasil disimpan", "success");
          setShowEditJamCheckInModal(false);
          await loadPengaturan();
        } catch (err) {
          showToast(err instanceof Error ? err.message : "Gagal menyimpan kode event", "error");
        } finally {
          setIsSavingCheckIn(false);
        }
      },
    });
  };

  const kodeTampil = pengaturan?.pendaftaran.kodeEvent || "CFD";

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

      <div className="flex flex-wrap items-end justify-between gap-md">
        <div>
          <h2 className="text-headline-lg text-on-surface">Jam Operasional</h2>
          <p className="mt-xs max-w-2xl text-body-md text-on-surface-variant">
            Buat sesi dan acak lapaknya langsung dari form Tambah Sesi.
          </p>
        </div>
        <button type="button" onClick={() => setShowTambahSesi(true)} className="pt-btn pt-btn-primary">
          <CalendarPlus className="h-4 w-4" strokeWidth={2} />
          Tambah Sesi
        </button>
      </div>

      <div className="grid grid-cols-1 items-start gap-md lg:grid-cols-[1fr_300px]">
        <DaftarSesi
          sesiList={terjadwal}
          now={now}
          loading={sesiLoading}
          error={sesiError}
          onTambah={() => setShowTambahSesi(true)}
          onBerubah={async () => {
            await loadSesi();
            showToast("✅ Sesi berhasil dihapus", "success");
          }}
        />

        {/* ===== KODE EVENT ===== */}
        <div className="pt-card flex flex-col">
          <div className="flex items-center justify-between gap-sm">
            <h3 className="pt-section-title">Kode Event</h3>
            <button type="button" onClick={() => setShowEditJamCheckInModal(true)} className="pt-btn pt-btn-ghost">
              <Edit className="h-4 w-4" strokeWidth={2} />
              Edit
            </button>
          </div>
          <div className="mt-sm flex flex-wrap items-center gap-sm">
            <span className="inline-flex items-center gap-1 rounded-full bg-primary-container px-2.5 py-0.5 text-label-md font-medium text-on-primary-container">
              <Tag className="h-3.5 w-3.5" strokeWidth={2.5} />
              {kodeTampil}
            </span>
            {pengaturan?.pendaftaran.linkPendaftaran && (
              <a
                href={pengaturan.pendaftaran.linkPendaftaran}
                target="_blank"
                rel="noopener noreferrer"
                className="text-label-sm text-primary underline hover:opacity-80"
              >
                Link Pendaftaran
              </a>
            )}
          </div>
          <p className="mt-sm text-label-sm text-on-surface-variant">
            Awalan nomor lapak hasil acak, mis. &quot;{kodeTampil}-001234&quot;. Ganti sebelum acak lapak kalau
            sesinya bukan CFD.
          </p>
        </div>
      </div>

      <RiwayatSesi sesiList={riwayat} loading={sesiLoading} />

      {showTambahSesi && (
        <TambahSesiModal
          wilayah={wilayah}
          kodeEvent={kodeTampil}
          onClose={() => setShowTambahSesi(false)}
          onSaved={(pesan) => {
            setShowTambahSesi(false);
            loadSesi();
            showToast(pesan, "success");
          }}
        />
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
