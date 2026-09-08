// app/petugas/jam-operasional/page.tsx
"use client";

import { useEffect, useState } from "react";
import {
  Clock,
  Hourglass,
  History,
  Lock,
  LockOpen,
  Check,
  AlertTriangle,
  Loader2,
  X,
  Info,
  Edit,
  MapPin,
  Store,
  Plus,
  CalendarDays,
  Save,
  Trash2,
  ChevronUp,
  ChevronDown,
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
  };
  riwayat: Riwayat[];
};

// ========== TIPE SESI PER-WILAYAH (BARU) ==========
type Scope = "kota" | "kecamatan" | "jalan";
type JalanRingkas = {
  id: string;
  nama: string;
  kecamatanId: string;
  kecamatanNama: string;
};
type SesiWilayah = {
  id: string;
  namaSesi: string;
  tanggal: string;
  jamMulai: string;
  jamSelesaiRencana: string;
  status: "berlangsung" | "selesai_normal" | "diperpanjang" | "diakhiri_awal" | string;
  aktif: boolean;
  sisaMenit: number;
  totalMenit: number;
  scope: Scope;
  scopeLabel: string;
  jalan: JalanRingkas[];
};
type WilayahSaya = {
  kecamatanId: string | null;
  kecamatanNama: string | null;
  jalanId: string | null;
  jalanNama: string | null;
  bebas: boolean;
};

// ========== TIPE JADWAL MINGGUAN (BARU) ==========
type HariValue = "senin" | "selasa" | "rabu" | "kamis" | "jumat" | "sabtu" | "minggu";
type JadwalMingguan = {
  hari: HariValue;
  jamMulai: string;
  jamSelesaiRencana: string;
  isActive: boolean;
};

// ========== TIPE UNTUK SISA LAPAK ==========
type JalanData = {
  id: string;
  kode_jalan: string;
  nama: string;
  kuota: number;
  terisi: number;
};
type KecamatanData = {
  kecamatanId: string | null;
  kecamatan: string;
  jalan: JalanData[];
};

// ========== STYLE (class pt-pill-* didefinisikan di petugas.css) ==========
const STATUS_STYLE: Record<StatusRiwayat, { label: string; pill: string; icon: typeof Check }> = {
  normal: { label: "Selesai Normal", pill: "pt-pill-success", icon: Check },
  diperpanjang: { label: "Diperpanjang", pill: "pt-pill-warning", icon: Clock },
  "diakhiri-awal": { label: "Diakhiri Awal", pill: "pt-pill-danger", icon: AlertTriangle },
};

const SESI_WILAYAH_STATUS_STYLE: Record<string, { label: string; pill: string }> = {
  berlangsung: { label: "Berlangsung", pill: "pt-pill-success" },
  diperpanjang: { label: "Diperpanjang", pill: "pt-pill-warning" },
  selesai_normal: { label: "Selesai Normal", pill: "pt-pill-neutral" },
  diakhiri_awal: { label: "Diakhiri Awal", pill: "pt-pill-danger" },
};
const SESI_WILAYAH_STATUS_DEFAULT = { label: "-", pill: "pt-pill-neutral" };

const HARI_LIST: { value: HariValue; label: string }[] = [
  { value: "senin", label: "Senin" },
  { value: "selasa", label: "Selasa" },
  { value: "rabu", label: "Rabu" },
  { value: "kamis", label: "Kamis" },
  { value: "jumat", label: "Jumat" },
  { value: "sabtu", label: "Sabtu" },
  { value: "minggu", label: "Minggu" },
];

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
function todayISO() {
  const d = new Date();
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 10);
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

  // ===== STATE SESI PER-WILAYAH (BARU) =====
  const [wilayahSaya, setWilayahSaya] = useState<WilayahSaya | null>(null);
  const [sesiWilayahList, setSesiWilayahList] = useState<SesiWilayah[]>([]);
  const [isLoadingSesiWilayah, setIsLoadingSesiWilayah] = useState(true);
  const [sesiWilayahError, setSesiWilayahError] = useState<string | null>(null);

  const [showBuatSesiModal, setShowBuatSesiModal] = useState(false);
  const [formScope, setFormScope] = useState<Scope>("jalan");
  const [formKecamatanId, setFormKecamatanId] = useState("");
  const [formJalanId, setFormJalanId] = useState("");
  const [formTanggal, setFormTanggal] = useState(todayISO());
  const [formJamMulai, setFormJamMulai] = useState("06:00");
  const [formJamSelesai, setFormJamSelesai] = useState("11:00");
  const [isSubmittingSesi, setIsSubmittingSesi] = useState(false);

  // ===== STATE JADWAL MINGGUAN (BARU) =====
  const [jadwalList, setJadwalList] = useState<JadwalMingguan[]>([]);
  const [isLoadingJadwal, setIsLoadingJadwal] = useState(true);
  const [jadwalError, setJadwalError] = useState<string | null>(null);
  const [editingHari, setEditingHari] = useState<HariValue | null>(null);
  const [jadwalDraft, setJadwalDraft] = useState({ jamMulai: "06:00", jamSelesaiRencana: "11:00", isActive: true });
  const [savingHari, setSavingHari] = useState<HariValue | null>(null);

  // "checkIn*" di sini map ke field API "pendaftaran" (lihat catatan di
  // tipe StatusOperasional di atas) -- ini jendela waktu buat pedagang
  // check-in / ambil nomor stand, bukan buat isi form pendaftaran akun.
  const [checkInJamBuka, setCheckInJamBuka] = useState("00:00");
  const [checkInJamTutup, setCheckInJamTutup] = useState("23:59");
  const [isTogglingCheckIn, setIsTogglingCheckIn] = useState(false);
  const [isSavingCheckIn, setIsSavingCheckIn] = useState(false);
  const [showEditJamCheckInModal, setShowEditJamCheckInModal] = useState(false);

  // ===== STATE UNTUK SISA LAPAK =====
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

  const isFriday = new Date().getDay() === 5;
  const [checkInSudahDiubahHariIni, setCheckInSudahDiubahHariIni] = useState(false);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // ===== LOAD STATUS (pendaftaran / check-in + riwayat) =====
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
      setCheckInSudahDiubahHariIni(false);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "gagal memuat data");
    } finally {
      setIsLoadingPage(false);
    }
  };

  // ===== LOAD WILAYAH SAYA =====
  const loadWilayahSaya = async () => {
    try {
      const data = (await apiFetch("/api/petugas/wilayah-saya")) as WilayahSaya;
      setWilayahSaya(data);
    } catch {
      // non-fatal -- form buat sesi baru cuma dibatasi kalau ini gagal
      setWilayahSaya(null);
    }
  };

  // ===== LOAD SESI PER-WILAYAH =====
  const loadSesiWilayah = async () => {
    try {
      const data = await apiFetch("/api/petugas/jam-operasional/sesi-wilayah");
      setSesiWilayahList(Array.isArray(data.sesi) ? data.sesi : []);
      setSesiWilayahError(null);
    } catch (err) {
      setSesiWilayahError(err instanceof Error ? err.message : "gagal memuat sesi wilayah");
      setSesiWilayahList([]);
    } finally {
      setIsLoadingSesiWilayah(false);
    }
  };

  // ===== LOAD JADWAL MINGGUAN =====
  const loadJadwalMingguan = async () => {
    try {
      const data = await apiFetch("/api/petugas/jam-operasional/jadwal-mingguan");
      setJadwalList(Array.isArray(data.jadwal) ? data.jadwal : []);
      setJadwalError(null);
    } catch (err) {
      setJadwalError(err instanceof Error ? err.message : "gagal memuat jadwal mingguan");
    } finally {
      setIsLoadingJadwal(false);
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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadStatus();
    loadWilayahSaya();
    loadSesiWilayah();
    loadJadwalMingguan();
    loadSisaLapak();
    const interval = setInterval(() => {
      loadStatus();
      loadSesiWilayah();
      loadSisaLapak();
    }, 60_000);
    return () => clearInterval(interval);
  }, []);

  // ===== HANDLER: BUAT SESI WILAYAH BARU =====
  const scopeOptionsTersedia: { value: Scope; label: string }[] = !wilayahSaya
    ? []
    : wilayahSaya.bebas
    ? [
        { value: "kota", label: "Se-Surabaya" },
        { value: "kecamatan", label: "1 Kecamatan" },
        { value: "jalan", label: "1 Jalan" },
      ]
    : wilayahSaya.jalanId
    ? [{ value: "jalan", label: `Jl. ${wilayahSaya.jalanNama ?? ""}` }]
    : wilayahSaya.kecamatanId
    ? [
        { value: "kecamatan", label: `Kec. ${wilayahSaya.kecamatanNama ?? ""}` },
        { value: "jalan", label: "1 Jalan di kecamatan saya" },
      ]
    : [];

  const daftarKecamatanForm = lapakData
    .filter((k) => k.kecamatanId)
    .map((k) => ({ id: k.kecamatanId as string, nama: k.kecamatan }));

  const daftarJalanForm = wilayahSaya?.jalanId
    ? []
    : wilayahSaya?.bebas
    ? lapakData.flatMap((k) => k.jalan.map((j) => ({ id: j.id, label: `${j.nama} — ${k.kecamatan}` })))
    : lapakData
        .filter((k) => k.kecamatanId === wilayahSaya?.kecamatanId)
        .flatMap((k) => k.jalan.map((j) => ({ id: j.id, label: j.nama })));

  const openBuatSesiModal = () => {
    if (!wilayahSaya) {
      showToast("Data wilayah petugas belum siap, coba lagi sebentar", "error");
      return;
    }
    const defaultScope: Scope = wilayahSaya.bebas
      ? "kota"
      : wilayahSaya.kecamatanId && !wilayahSaya.jalanId
      ? "kecamatan"
      : "jalan";
    setFormScope(defaultScope);
    setFormKecamatanId(wilayahSaya.kecamatanId ?? "");
    setFormJalanId(wilayahSaya.jalanId ?? "");
    setFormTanggal(todayISO());
    setFormJamMulai("06:00");
    setFormJamSelesai("11:00");
    setShowBuatSesiModal(true);
  };

  const handleSubmitSesiWilayah = async () => {
    if (!formTanggal || !formJamMulai || !formJamSelesai) {
      showToast("Lengkapi tanggal dan jam terlebih dahulu", "error");
      return;
    }
    const body: Record<string, unknown> = {
      scope: formScope,
      tanggal: formTanggal,
      jamMulai: formJamMulai,
      jamSelesaiRencana: formJamSelesai,
    };
    if (formScope === "kecamatan") {
      const kecId = wilayahSaya?.bebas ? formKecamatanId : wilayahSaya?.kecamatanId;
      if (!kecId) {
        showToast("Pilih kecamatan terlebih dahulu", "error");
        return;
      }
      body.kecamatanId = kecId;
    }
    if (formScope === "jalan") {
      const jalId = wilayahSaya?.jalanId ?? formJalanId;
      if (!jalId) {
        showToast("Pilih jalan terlebih dahulu", "error");
        return;
      }
      body.jalanId = jalId;
    }

    setIsSubmittingSesi(true);
    try {
      await apiFetch("/api/petugas/jam-operasional/sesi-wilayah", {
        method: "POST",
        body: JSON.stringify(body),
      });
      showToast("✅ Sesi CFD berhasil dibuat", "success");
      setShowBuatSesiModal(false);
      await loadSesiWilayah();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "gagal membuat sesi", "error");
    } finally {
      setIsSubmittingSesi(false);
    }
  };

  // ===== HANDLER: HAPUS SESI WILAYAH =====
  const handleHapusSesi = (sesi: SesiWilayah) => {
    setConfirmDialog({
      title: "Hapus Sesi CFD",
      message: `Yakin ingin menghapus sesi "${sesi.namaSesi}"? Tindakan ini tidak bisa dibatalkan.`,
      confirmLabel: "Ya, Hapus",
      danger: true,
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          await apiFetch(`/api/petugas/jam-operasional/sesi-wilayah/${sesi.id}`, {
            method: "DELETE",
          });
          showToast("✅ Sesi CFD berhasil dihapus", "success");
          await loadSesiWilayah();
        } catch (err) {
          showToast(err instanceof Error ? err.message : "gagal menghapus sesi", "error");
        }
      },
    });
  };

  // ===== HANDLER: JADWAL MINGGUAN =====
  const startEditJadwal = (hari: HariValue, row?: JadwalMingguan) => {
    setEditingHari(hari);
    setJadwalDraft({
      jamMulai: row ? row.jamMulai.slice(0, 5) : "06:00",
      jamSelesaiRencana: row ? row.jamSelesaiRencana.slice(0, 5) : "11:00",
      isActive: row ? row.isActive : true,
    });
  };

  const handleSimpanJadwalHari = async (hari: HariValue) => {
    setSavingHari(hari);
    try {
      await apiFetch("/api/petugas/jam-operasional/jadwal-mingguan", {
        method: "PATCH",
        body: JSON.stringify({
          hari,
          jamMulai: jadwalDraft.jamMulai,
          jamSelesaiRencana: jadwalDraft.jamSelesaiRencana,
          isActive: jadwalDraft.isActive,
        }),
      });
      showToast("✅ Jadwal mingguan berhasil disimpan", "success");
      setEditingHari(null);
      await loadJadwalMingguan();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "gagal menyimpan jadwal mingguan", "error");
    } finally {
      setSavingHari(null);
    }
  };

  // ===== HANDLER CHECK-IN PEDAGANG =====
  const handleToggleCheckIn = async () => {
    if (!status) return;
    const newState = !status.pendaftaran.isOpen;
    const jamTutupDisplay = status.pendaftaran.jamTutup
      ? ` pada jam ${formatJamTampilan(status.pendaftaran.jamTutup)} WIB`
      : "";

    setConfirmDialog({
      title: `Konfirmasi ${newState ? "Buka" : "Tutup"} Check-in`,
      message: newState
        ? "Apakah Anda yakin ingin membuka check-in pedagang?"
        : `Apakah Anda yakin ingin menutup check-in pedagang${jamTutupDisplay}?`,
      confirmLabel: `Ya, ${newState ? "Buka" : "Tutup"}`,
      danger: !newState,
      onConfirm: async () => {
        setConfirmDialog(null);
        setIsTogglingCheckIn(true);
        try {
          await apiFetch("/api/petugas/jam-operasional/pendaftaran", {
            method: "PATCH",
            body: JSON.stringify({ isOpen: newState }),
          });
          showToast(`Check-in ${newState ? "dibuka" : "ditutup"} ✅`, "success");
          await loadStatus();
        } catch (err) {
          showToast(err instanceof Error ? err.message : "Gagal mengubah status check-in", "error");
        } finally {
          setIsTogglingCheckIn(false);
        }
      },
    });
  };

  const handleSimpanCheckIn = async () => {
    if (!status) return;
    setConfirmDialog({
      title: "Konfirmasi Perubahan Check-in",
      message: "Apakah Anda yakin dengan perubahan pengaturan check-in ini?",
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
            }),
          });
          showToast("✅ Pengaturan check-in berhasil disimpan", "success");
          setShowEditJamCheckInModal(false);
          await loadStatus();
        } catch (err) {
          showToast(err instanceof Error ? err.message : "Gagal menyimpan pengaturan check-in", "error");
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

  // Sesi wilayah yang lagi aktif (buat ditampilin di timer) -- kalau
  // ada lebih dari satu yang aktif bersamaan, ambil yang paling
  // cepat berakhir (sisaMenit terkecil).
  const sesiAktifWilayah = sesiWilayahList
    .filter((s) => s.aktif)
    .sort((a, b) => a.sisaMenit - b.sisaMenit)[0];
  const progress =
    sesiAktifWilayah && sesiAktifWilayah.totalMenit > 0
      ? (sesiAktifWilayah.sisaMenit / sesiAktifWilayah.totalMenit) * CIRC
      : 0;

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
          Atur sesi CFD per wilayah (kota / kecamatan / jalan) dan jadwal mingguan otomatis. Kelola check-in pedagang
          secara terpisah.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-md lg:grid-cols-[1fr_300px]">
        {/* ===== SESI CFD PER WILAYAH + CHECK-IN (satu card, timer di samping) ===== */}
        <div className="pt-card">
          <div className="flex flex-wrap items-center justify-between gap-sm">
            <h3 className="pt-section-title">Sesi CFD per Wilayah</h3>
            <button type="button" onClick={openBuatSesiModal} className="pt-btn pt-btn-primary">
              <Plus className="h-4 w-4" strokeWidth={2} />
              Buat Sesi Baru
            </button>
          </div>

          {isLoadingSesiWilayah ? (
            <div className="pt-loading">
              <Loader2 className="h-6 w-6 animate-spin" strokeWidth={2} />
              <p className="text-body-sm">Memuat sesi...</p>
            </div>
          ) : sesiWilayahError ? (
            <div className="mt-sm rounded-xl border border-error-container bg-error-container/20 px-md py-sm text-body-sm text-on-error-container">
              Gagal memuat sesi: {sesiWilayahError}
            </div>
          ) : sesiWilayahList.length === 0 ? (
            <p className="mt-sm py-8 text-center text-body-md text-on-surface-variant">
              Belum ada sesi CFD yang diatur untuk wilayahmu.
            </p>
          ) : (
            <div className="mt-md flex flex-col gap-sm">
              {sesiWilayahList.map((s) => {
                const style = SESI_WILAYAH_STATUS_STYLE[s.status] ?? SESI_WILAYAH_STATUS_DEFAULT;
                return (
                  <div
                    key={s.id}
                    className="flex flex-col gap-sm rounded-xl border border-outline-variant bg-surface-container-low p-md sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-sm">
                        <p className="text-title-md text-on-surface">{s.namaSesi}</p>
                        <span className={`pt-pill ${style.pill}`}>
                          <span className={`pt-pill-dot ${s.aktif ? "is-pulse" : ""}`} />
                          {style.label}
                        </span>
                      </div>
                      <p className="mt-1 flex items-center gap-1 text-body-sm text-on-surface-variant">
                        <MapPin className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
                        {s.scopeLabel} · {s.tanggal}
                      </p>
                      <p className="mt-0.5 text-body-sm text-on-surface-variant">
                        {formatJamTampilan(s.jamMulai)} – {formatJamTampilan(s.jamSelesaiRencana)} WIB
                        {s.aktif && (
                          <>
                            {" "}
                            · sisa <strong className="text-on-surface">{formatSisaWaktu(s.sisaMenit)}</strong>
                          </>
                        )}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleHapusSesi(s)}
                      title={`Hapus sesi ${s.namaSesi}`}
                      aria-label={`Hapus sesi ${s.namaSesi}`}
                      className="pt-btn pt-btn-icon pt-btn-ghost-danger self-end sm:self-center"
                    >
                      <Trash2 className="h-4 w-4" strokeWidth={2} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* ===== CHECK-IN PEDAGANG (nested di card yang sama) ===== */}
          <div className="mt-lg border-t border-outline-variant pt-lg">
            <div className="flex flex-wrap items-center justify-between gap-sm">
              <h4 className="pt-section-title">Pengaturan Check-in Pedagang</h4>
              <button
                type="button"
                onClick={() => setShowEditJamCheckInModal(true)}
                className="pt-btn pt-btn-ghost"
              >
                <Edit className="h-4 w-4" strokeWidth={2} />
                Edit Jam
              </button>
            </div>

            <div className="mt-sm rounded-xl border border-outline-variant bg-surface-container-lowest p-md">
              {/* Baris status + toggle buka/tutup */}
              <div className="flex flex-col gap-sm sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-sm">
                  {status.pendaftaran.isOpen ? (
                    <LockOpen className="h-5 w-5 shrink-0 text-secondary" strokeWidth={2} />
                  ) : (
                    <Lock className="h-5 w-5 shrink-0 text-error" strokeWidth={2} />
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
                <div className="flex items-center gap-sm self-end sm:self-center">
                  {isTogglingCheckIn && <Loader2 className="h-4 w-4 animate-spin text-on-surface-variant" strokeWidth={2} />}
                  <span className="text-label-md text-on-surface-variant">
                    {status.pendaftaran.isOpen ? "Tutup" : "Buka"}
                  </span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={status.pendaftaran.isOpen}
                    aria-label={status.pendaftaran.isOpen ? "Tutup check-in pedagang" : "Buka check-in pedagang"}
                    onClick={handleToggleCheckIn}
                    disabled={isTogglingCheckIn}
                    className={`pt-switch ${status.pendaftaran.isOpen ? "is-on" : ""}`}
                  >
                    <span className="pt-switch-knob" />
                  </button>
                </div>
              </div>

              {/* Ringkasan jam saat ini -- kotak sama seperti sebelumnya, tapi
                  cuma tampilan (baca saja); ubahnya lewat tombol "Edit Jam" di atas */}
              <div className="mt-md grid grid-cols-1 gap-sm border-t border-outline-variant pt-md sm:grid-cols-2">
                <div className="flex items-center gap-sm rounded-lg bg-surface-container-low p-md">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-secondary-container text-on-secondary-container">
                    <Clock className="h-[18px] w-[18px]" strokeWidth={2} />
                  </span>
                  <div>
                    <p className="text-label-sm uppercase tracking-wide text-on-surface-variant">Jam Buka Check-in</p>
                    <p className="text-title-lg font-semibold text-on-surface">{formatJamTampilan(checkInJamBuka)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-sm rounded-lg bg-error-container/30 p-md">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-error-container text-on-error-container">
                    <Hourglass className="h-[18px] w-[18px]" strokeWidth={2} />
                  </span>
                  <div>
                    <p className="text-label-sm uppercase tracking-wide text-on-surface-variant">Jam Tutup Check-in</p>
                    <p className="text-title-lg font-semibold text-on-surface">{formatJamTampilan(checkInJamTutup)}</p>
                  </div>
                </div>
              </div>
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
                {sesiAktifWilayah ? formatSisaWaktu(sesiAktifWilayah.sisaMenit) : "--:--"}
              </span>
              <span className="text-label-sm text-on-surface-variant">Sisa Waktu CFD</span>
            </div>
          </div>
          <p className="text-label-sm text-on-surface-variant">
            {sesiAktifWilayah ? (
              <>
                {sesiAktifWilayah.scopeLabel} akan berakhir pada{" "}
                <strong className="text-on-surface">{formatJamTampilan(sesiAktifWilayah.jamSelesaiRencana)} WIB</strong>
              </>
            ) : (
              "Belum ada sesi yang sedang berlangsung"
            )}
          </p>
        </div>
      </div>

      {/* ===== JADWAL MINGGUAN (BARU) ===== */}
      <div className="pt-card">
        <div className="mb-md flex flex-wrap items-center gap-sm">
          <CalendarDays className="h-[18px] w-[18px] text-on-surface-variant" strokeWidth={2} />
          <h3 className="pt-section-title">Jadwal Mingguan (Otomatis)</h3>
          <span className="ml-auto text-label-sm text-on-surface-variant">
            Dipakai sistem buat auto-mulai/selesai sesi tiap minggu
          </span>
        </div>

        {isLoadingJadwal ? (
          <div className="pt-loading">
            <Loader2 className="h-6 w-6 animate-spin" strokeWidth={2} />
            <p className="text-body-sm">Memuat jadwal...</p>
          </div>
        ) : jadwalError ? (
          <div className="rounded-xl border border-error-container bg-error-container/20 px-md py-sm text-body-sm text-on-error-container">
            Gagal memuat jadwal mingguan: {jadwalError}
          </div>
        ) : (
          <div className="flex flex-col gap-sm">
            {HARI_LIST.map((hari) => {
              const row = jadwalList.find((j) => j.hari === hari.value);
              const isEditing = editingHari === hari.value;
              return (
                <div key={hari.value} className="rounded-xl border border-outline-variant bg-surface-container-low p-md">
                  {isEditing ? (
                    <div className="flex flex-col gap-sm">
                      <p className="text-title-md text-on-surface">{hari.label}</p>
                      <div className="grid grid-cols-1 gap-sm sm:grid-cols-2">
                        <div>
                          <span className="pt-field-label">Jam Mulai</span>
                          <div className="mt-1">
                            <TimeStepper
                              value={jadwalDraft.jamMulai}
                              onChange={(next) => setJadwalDraft((d) => ({ ...d, jamMulai: next }))}
                            />
                          </div>
                        </div>
                        <div>
                          <span className="pt-field-label">Jam Selesai</span>
                          <div className="mt-1">
                            <TimeStepper
                              value={jadwalDraft.jamSelesaiRencana}
                              onChange={(next) => setJadwalDraft((d) => ({ ...d, jamSelesaiRencana: next }))}
                            />
                          </div>
                        </div>
                      </div>
                      <label className="flex cursor-pointer items-center gap-sm text-body-sm text-on-surface-variant">
                        <input
                          type="checkbox"
                          checked={jadwalDraft.isActive}
                          onChange={(e) => setJadwalDraft((d) => ({ ...d, isActive: e.target.checked }))}
                          className="h-5 w-5 accent-primary"
                        />
                        Aktifkan jadwal hari ini
                      </label>
                      <div className="flex justify-end gap-sm pt-1">
                        <button type="button" onClick={() => setEditingHari(null)} className="pt-btn pt-btn-ghost">
                          Batal
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSimpanJadwalHari(hari.value)}
                          disabled={savingHari === hari.value}
                          className="pt-btn pt-btn-primary"
                        >
                          {savingHari === hari.value ? (
                            <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
                          ) : (
                            <Save className="h-4 w-4" strokeWidth={2} />
                          )}
                          Simpan
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center justify-between gap-sm">
                      <div className="flex flex-wrap items-center gap-sm sm:gap-md">
                        <p className="w-24 shrink-0 text-title-md text-on-surface">{hari.label}</p>
                        <p className="text-body-md text-on-surface-variant">
                          {row ? (
                            <>
                              {formatWaktuTabel(formatJamTampilan(row.jamMulai))} –{" "}
                              {formatWaktuTabel(formatJamTampilan(row.jamSelesaiRencana))}
                            </>
                          ) : (
                            "Belum diatur"
                          )}
                        </p>
                        <span className={`pt-pill ${row?.isActive ? "pt-pill-success" : "pt-pill-neutral"}`}>
                          {row?.isActive ? "Aktif" : "Nonaktif"}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => startEditJadwal(hari.value, row)}
                        className="pt-btn pt-btn-ghost"
                      >
                        <Edit className="h-4 w-4" strokeWidth={2} />
                        Edit
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
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

      {/* ===== SISA KUOTA LAPAK PER WILAYAH ===== */}
      <div className="pt-card">
        <div className="mb-md flex items-center gap-sm">
          <Store className="h-[18px] w-[18px] text-on-surface-variant" strokeWidth={2} />
          <h3 className="pt-section-title">Sisa Kuota Lapak per Wilayah</h3>
          <span className="ml-auto text-label-sm text-on-surface-variant">
            {isLoadingLapak ? "Memuat..." : `Total ${totalKuota} lapak, ${sisaTotal} tersisa`}
          </span>
        </div>

        {isLoadingLapak ? (
          <div className="pt-loading">
            <Loader2 className="h-6 w-6 animate-spin" strokeWidth={2} />
            <p className="text-body-sm">Memuat data lapak...</p>
          </div>
        ) : lapakError ? (
          <div className="rounded-xl border border-error-container bg-error-container/20 px-md py-sm text-body-sm text-on-error-container">
            Gagal memuat data lapak: {lapakError}
          </div>
        ) : lapakData.length === 0 ? (
          <p className="text-center text-body-md text-on-surface-variant">Belum ada data kuota lapak yang diatur.</p>
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
                      const levelColor = sisa === 0 ? "bg-error" : sisa / jalan.kuota <= 0.2 ? "bg-tertiary" : "bg-secondary";
                      return (
                        <div key={jalan.id} className="rounded border border-outline-variant bg-surface-container-lowest p-2">
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

      {/* Modal Buat Sesi Wilayah Baru */}
      {showBuatSesiModal && (
        <ModalShell
          onClose={() => setShowBuatSesiModal(false)}
          title="Buat Sesi CFD Baru"
          description="Sesi menentukan kapan pedagang bisa check-in di wilayah yang dipilih."
          footer={
            <div className="flex justify-end gap-sm">
              <button type="button" onClick={() => setShowBuatSesiModal(false)} className="pt-btn pt-btn-ghost">
                Batal
              </button>
              <button
                type="button"
                onClick={handleSubmitSesiWilayah}
                disabled={isSubmittingSesi}
                className="pt-btn pt-btn-primary"
              >
                {isSubmittingSesi && <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />}
                {isSubmittingSesi ? "Menyimpan..." : "Buat Sesi"}
              </button>
            </div>
          }
        >
          <div className="flex flex-col gap-sm">
            {scopeOptionsTersedia.length > 1 && (
              <div>
                <label className="pt-field-label">Cakupan Sesi</label>
                <select
                  value={formScope}
                  onChange={(e) => setFormScope(e.target.value as Scope)}
                  className="pt-input mt-1"
                >
                  {scopeOptionsTersedia.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {scopeOptionsTersedia.length === 1 && (
              <div className="rounded-md bg-surface-container-low px-sm py-2 text-label-sm text-on-surface-variant">
                Cakupan: <strong className="text-on-surface">{scopeOptionsTersedia[0].label}</strong>
              </div>
            )}

            {formScope === "kecamatan" && wilayahSaya?.bebas && (
              <div>
                <label className="pt-field-label">Kecamatan</label>
                <select
                  value={formKecamatanId}
                  onChange={(e) => setFormKecamatanId(e.target.value)}
                  className="pt-input mt-1"
                >
                  <option value="">Pilih kecamatan</option>
                  {daftarKecamatanForm.map((k) => (
                    <option key={k.id} value={k.id}>
                      {k.nama}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {formScope === "jalan" && !wilayahSaya?.jalanId && (
              <div>
                <label className="pt-field-label">Jalan</label>
                <select
                  value={formJalanId}
                  onChange={(e) => setFormJalanId(e.target.value)}
                  className="pt-input mt-1"
                >
                  <option value="">Pilih jalan</option>
                  {daftarJalanForm.map((j) => (
                    <option key={j.id} value={j.id}>
                      {j.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="pt-field-label">Tanggal</label>
              <input
                type="date"
                value={formTanggal}
                onChange={(e) => setFormTanggal(e.target.value)}
                className="pt-input mt-1"
              />
            </div>
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
          </div>
        </ModalShell>
      )}

      {/* Modal Edit Jam Check-in */}
      {showEditJamCheckInModal && (
        <ModalShell
          onClose={() => setShowEditJamCheckInModal(false)}
          title="Edit Jam Check-in"
          description="Atur jendela waktu pedagang bisa check-in dan mengambil nomor stand."
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
          <div className="grid grid-cols-1 gap-sm sm:grid-cols-2">
            <div className="rounded-lg bg-surface-container-low p-md">
              <div className="flex items-center gap-sm">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-secondary-container text-on-secondary-container">
                  <Clock className="h-[18px] w-[18px]" strokeWidth={2} />
                </span>
                <p className="text-label-sm uppercase tracking-wide text-on-surface-variant">Jam Buka Check-in</p>
              </div>
              <div className="mt-sm">
                <TimeStepper value={checkInJamBuka} onChange={setCheckInJamBuka} disabled={!canEditCheckIn} />
              </div>
            </div>
            <div className="rounded-lg bg-error-container/30 p-md">
              <div className="flex items-center gap-sm">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-error-container text-on-error-container">
                  <Hourglass className="h-[18px] w-[18px]" strokeWidth={2} />
                </span>
                <p className="text-label-sm uppercase tracking-wide text-on-surface-variant">Jam Tutup Check-in</p>
              </div>
              <div className="mt-sm">
                <TimeStepper value={checkInJamTutup} onChange={setCheckInJamTutup} disabled={!canEditCheckIn} />
              </div>
            </div>
          </div>

          {isFriday && checkInSudahDiubahHariIni && (
            <div className="mt-sm flex items-center gap-sm rounded-lg bg-surface-container-high px-md py-sm text-label-sm text-on-surface-variant">
              <Info className="h-4 w-4 shrink-0" strokeWidth={2} />
              Pengaturan check-in sudah diubah hari ini (hanya sekali pada hari Jumat)
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