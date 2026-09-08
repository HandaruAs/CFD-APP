// app/petugas/acak-lapak/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  Shuffle,
  MapPin,
  Milestone,
  Landmark,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Users,
  X,
  ChevronDown,
} from "lucide-react";

// ========== TYPES ==========
type JalanData = {
  id: string;
  kode_jalan: string;
  nama: string;
  kuota: number;
  terisi: number;
};

type KecamatanData = {
  kecamatan: string;
  jalan: JalanData[];
};

type InstansiData = {
  id: string;
  nama: string;
};

type Mode = "jalan" | "kecamatan" | "semua";

type HasilAcak =
  | { mode: "jalan"; nama_jalan: string; jumlah_diacak: number }
  | { mode: "kecamatan"; nama_kecamatan: string; jumlah_jalan: number; jumlah_diacak: number }
  | { mode: "semua"; jumlah_kecamatan: number; jumlah_jalan: number; jumlah_diacak: number };

// ========== API HELPER ==========
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

// ========== MODAL KONFIRMASI (teks besar, 2 tombol besar) ==========
function ModalKonfirmasi({
  open,
  title,
  message,
  confirmLabel,
  loading,
  danger,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  loading: boolean;
  danger?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!open || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-[2px] px-4 py-8"
      onClick={loading ? undefined : onClose}
    >
      <div
        className="relative w-full max-w-[30rem] rounded-2xl bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-4">
          <span
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${
              danger ? "bg-rose-100 text-rose-600" : "bg-blue-100 text-blue-600"
            }`}
          >
            <AlertTriangle className="h-6 w-6" strokeWidth={2} />
          </span>
          <div>
            <h3 className="text-xl font-bold text-slate-900">{title}</h3>
            <p className="mt-2 text-base leading-relaxed text-slate-600">{message}</p>
          </div>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            disabled={loading}
            onClick={onClose}
            className="h-14 rounded-xl px-6 text-base font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-50"
          >
            Batal
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={onConfirm}
            className={`flex h-14 items-center justify-center gap-2 rounded-xl px-6 text-base font-semibold text-white transition-all disabled:opacity-60 ${
              danger ? "bg-rose-600 hover:bg-rose-700" : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" strokeWidth={2} />
                Memproses...
              </>
            ) : (
              confirmLabel
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ========== KARTU PILIHAN MODE (besar, jelas, beda warna sesuai risiko) ==========
const MODE_TONE = {
  jalan: { ring: "border-blue-600 bg-blue-50", chip: "bg-blue-600 text-white" },
  kecamatan: { ring: "border-indigo-600 bg-indigo-50", chip: "bg-indigo-600 text-white" },
  semua: { ring: "border-rose-600 bg-rose-50", chip: "bg-rose-600 text-white" },
} as const;

function KartuMode({
  aktif,
  tone,
  icon: Icon,
  label,
  deskripsi,
  onClick,
}: {
  aktif: boolean;
  tone: keyof typeof MODE_TONE;
  icon: React.ElementType;
  label: string;
  deskripsi: string;
  onClick: () => void;
}) {
  const t = MODE_TONE[tone];
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-1 flex-col items-start gap-3 rounded-2xl border-2 p-6 text-left transition-all ${
        aktif ? `${t.ring} shadow-sm` : "border-slate-200 bg-white hover:border-slate-300"
      }`}
    >
      <span
        className={`flex h-12 w-12 items-center justify-center rounded-full ${
          aktif ? t.chip : "bg-slate-100 text-slate-500"
        }`}
      >
        <Icon className="h-6 w-6" strokeWidth={2} />
      </span>
      <span className="text-lg font-semibold text-slate-900">{label}</span>
      <span className="text-base leading-snug text-slate-500">{deskripsi}</span>
    </button>
  );
}

// ========== MAIN ==========
export default function AcakLapakPage() {
  const [lapakData, setLapakData] = useState<KecamatanData[]>([]);
  const [instansiList, setInstansiList] = useState<InstansiData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [mode, setMode] = useState<Mode>("jalan");
  const [kecamatanID, setKecamatanID] = useState<string>("");
  const [jalanID, setJalanID] = useState<string>("");

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [hasil, setHasil] = useState<HasilAcak | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [sisaLapak, instansi] = await Promise.all([
        apiFetch("/api/petugas/sisa-lapak"),
        apiFetch("/api/petugas/sisa-lapak/instansi"),
      ]);
      setLapakData(Array.isArray(sisaLapak) ? sisaLapak : []);
      setInstansiList(Array.isArray(instansi) ? instansi : []);
      setLoadError(null);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "gagal memuat data");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Reset pilihan jalan tiap ganti kecamatan / ganti mode, biar gak ke-
  // bawa dari pilihan sebelumnya.
  useEffect(() => {
    setJalanID("");
  }, [kecamatanID, mode]);

  const kecamatanTerpilih = instansiList.find((i) => i.id === kecamatanID) || null;

  // Jalan-jalan di kecamatan terpilih diambil dari data sisa-lapak, yang
  // dikelompokkan berdasarkan NAMA kecamatan -- makanya dicocokkan lewat
  // nama, bukan ID (backend sisa-lapak memang belum expose ID kecamatan
  // di endpoint ini, cuma di endpoint instansi).
  const jalanDiKecamatan = useMemo(() => {
    if (!kecamatanTerpilih) return [];
    return lapakData.find((k) => k.kecamatan === kecamatanTerpilih.nama)?.jalan || [];
  }, [lapakData, kecamatanTerpilih]);

  const totalPedagangDiKecamatan = jalanDiKecamatan.reduce((acc, j) => acc + j.terisi, 0);
  // Jalan yang beneran BISA diacak (minimal 2 pedagang) -- ini yang dipakai
  // buat validasi tombol, bukan total pedagang mentah. Sesuai logika
  // backend: shuffleJalanTx cuma benar-benar mengacak kalau 1 jalan punya
  // >= 2 klaim; jalan dengan 0-1 pedagang dilewati begitu saja.
  const jalanBisaDiacakDiKecamatan = jalanDiKecamatan.filter((j) => j.terisi >= 2);

  const totalPedagangSemua = lapakData.reduce(
    (acc, k) => acc + k.jalan.reduce((s, j) => s + j.terisi, 0),
    0
  );
  const totalJalanSemua = lapakData.reduce((acc, k) => acc + k.jalan.length, 0);
  const totalJalanBisaDiacakSemua = lapakData.reduce(
    (acc, k) => acc + k.jalan.filter((j) => j.terisi >= 2).length,
    0
  );

  const jalanTerpilih = jalanDiKecamatan.find((j) => j.id === jalanID) || null;

  const bisaLanjut =
    mode === "semua"
      ? totalJalanBisaDiacakSemua >= 1
      : mode === "kecamatan"
      ? !!kecamatanTerpilih && jalanBisaDiacakDiKecamatan.length >= 1
      : !!jalanTerpilih && jalanTerpilih.terisi >= 2;

  const bukaKonfirmasi = () => {
    setActionError(null);
    setHasil(null);
    setConfirmOpen(true);
  };

  const jalankanAcak = async () => {
    setProcessing(true);
    setActionError(null);
    try {
      if (mode === "jalan" && jalanTerpilih) {
        const res = await apiFetch(`/api/petugas/acak-lapak/jalan/${jalanTerpilih.id}`, {
          method: "POST",
        });
        setHasil({ mode: "jalan", nama_jalan: res.data.nama_jalan, jumlah_diacak: res.data.jumlah_diacak });
      } else if (mode === "kecamatan" && kecamatanTerpilih) {
        const res = await apiFetch(`/api/petugas/acak-lapak/kecamatan/${kecamatanTerpilih.id}`, {
          method: "POST",
        });
        setHasil({
          mode: "kecamatan",
          nama_kecamatan: res.data.nama_kecamatan,
          jumlah_jalan: res.data.jumlah_jalan,
          jumlah_diacak: res.data.jumlah_diacak,
        });
      } else if (mode === "semua") {
        const res = await apiFetch(`/api/petugas/acak-lapak/semua`, { method: "POST" });
        setHasil({
          mode: "semua",
          jumlah_kecamatan: res.data.jumlah_kecamatan,
          jumlah_jalan: res.data.jumlah_jalan,
          jumlah_diacak: res.data.jumlah_diacak,
        });
      }
      setConfirmOpen(false);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "gagal mengacak nomor lapak");
    } finally {
      setProcessing(false);
    }
  };

  const teksKonfirmasi = (): { title: string; message: string; confirmLabel: string } => {
    if (mode === "jalan" && jalanTerpilih) {
      return {
        title: `Acak nomor lapak di ${jalanTerpilih.nama}?`,
        message: `Ada ${jalanTerpilih.terisi} pedagang yang sudah lapor di jalan ini. Nomor lapak mereka akan diacak ulang secara acak. Pedagang yang sekarang dapat nomor kecil, bisa saja nanti dapat nomor besar, begitu juga sebaliknya.`,
        confirmLabel: "Ya, Acak Sekarang",
      };
    }
    if (mode === "kecamatan" && kecamatanTerpilih) {
      return {
        title: `Acak nomor lapak se-${kecamatanTerpilih.nama}?`,
        message: `Ada ${totalPedagangDiKecamatan} pedagang di ${jalanDiKecamatan.length} jalan yang ada di kecamatan ini. SEMUA nomor lapak mereka akan diacak ulang sekaligus. Jalan yang pedagangnya belum sampai 2 orang akan otomatis dilewati.`,
        confirmLabel: "Ya, Acak Sekecamatan",
      };
    }
    return {
      title: "Acak nomor lapak SELURUH Surabaya?",
      message: `Ini akan mengacak ulang nomor lapak untuk SEMUA pedagang yang sudah lapor hari ini, di ${totalJalanSemua} jalan. Total ada ${totalPedagangSemua} pedagang. Jalan yang pedagangnya belum sampai 2 orang akan otomatis dilewati. Pastikan kamu benar-benar yakin sebelum melanjutkan.`,
      confirmLabel: "Ya, Acak Semua",
    };
  };

  // ---------- LOADING & ERROR AWAL ----------
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-32 text-slate-500">
        <Loader2 className="h-9 w-9 animate-spin" strokeWidth={2} />
        <p className="text-lg font-medium">Memuat data lapak...</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="rounded-2xl border-2 border-rose-200 bg-rose-50 p-6 text-rose-800">
        <p className="text-lg font-semibold">Gagal memuat data</p>
        <p className="mt-1 text-base">{loadError}</p>
        <button
          onClick={loadData}
          className="mt-4 h-12 rounded-xl bg-rose-600 px-6 text-base font-semibold text-white hover:bg-rose-700"
        >
          Coba Lagi
        </button>
      </div>
    );
  }

  const konfirmasi = teksKonfirmasi();

  return (
    <div className="flex flex-col gap-8 pb-24">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-white shadow-sm">
            <Shuffle className="h-6 w-6" strokeWidth={2} />
          </span>
          <h2 className="text-3xl font-bold text-slate-900">Acak Nomor Lapak</h2>
        </div>
        <p className="mt-4 max-w-2xl text-lg leading-relaxed text-slate-600">
          Gunakan halaman ini untuk mengacak ulang nomor lapak pedagang yang sudah lapor,
          supaya tidak selalu pedagang yang sama dapat posisi paling depan. Pilih dulu mau
          diacak untuk 1 jalan saja, 1 kecamatan, atau seluruh Surabaya.
        </p>
      </div>

      {/* Hasil sukses terakhir */}
      {hasil && (
        <div className="flex items-start gap-4 rounded-2xl border-2 border-emerald-200 bg-emerald-50 p-6">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white">
            <CheckCircle2 className="h-6 w-6" strokeWidth={2} />
          </span>
          <div className="flex-1">
            <p className="text-lg font-semibold text-emerald-900">Berhasil diacak!</p>
            <p className="mt-1 text-base text-emerald-800">
              {hasil.mode === "jalan" &&
                `${hasil.jumlah_diacak} nomor lapak di ${hasil.nama_jalan} sudah diacak ulang.`}
              {hasil.mode === "kecamatan" &&
                `${hasil.jumlah_diacak} nomor lapak di ${hasil.jumlah_jalan} jalan, se-${hasil.nama_kecamatan}, sudah diacak ulang.`}
              {hasil.mode === "semua" &&
                `${hasil.jumlah_diacak} nomor lapak di ${hasil.jumlah_jalan} jalan, ${hasil.jumlah_kecamatan} kecamatan, sudah diacak ulang.`}
            </p>
          </div>
          <button
            onClick={() => setHasil(null)}
            aria-label="Tutup"
            className="rounded-full p-1 text-emerald-800 hover:bg-emerald-100"
          >
            <X className="h-5 w-5" strokeWidth={2} />
          </button>
        </div>
      )}

      {/* Pilih mode */}
      <div>
        <p className="mb-3 text-lg font-semibold text-slate-800">1. Mau diacak untuk apa?</p>
        <div className="flex flex-col gap-4 sm:flex-row">
          <KartuMode
            aktif={mode === "jalan"}
            tone="jalan"
            icon={Milestone}
            label="1 Jalan Saja"
            deskripsi="Acak nomor lapak pedagang di satu jalan tertentu."
            onClick={() => setMode("jalan")}
          />
          <KartuMode
            aktif={mode === "kecamatan"}
            tone="kecamatan"
            icon={MapPin}
            label="1 Kecamatan"
            deskripsi="Acak semua jalan yang ada di satu kecamatan sekaligus."
            onClick={() => setMode("kecamatan")}
          />
          <KartuMode
            aktif={mode === "semua"}
            tone="semua"
            icon={Landmark}
            label="Semua Surabaya"
            deskripsi="Acak semua pedagang di seluruh kecamatan hari ini."
            onClick={() => setMode("semua")}
          />
        </div>
      </div>

      {/* Pilih kecamatan (untuk mode jalan & kecamatan) */}
      {(mode === "jalan" || mode === "kecamatan") && (
        <div>
          <p className="mb-3 text-lg font-semibold text-slate-800">2. Pilih Kecamatan</p>
          {instansiList.length === 0 ? (
            <p className="text-base text-slate-500">Belum ada data kecamatan.</p>
          ) : (
            <div className="relative w-full" style={{ maxWidth: "36rem" }}>
              <select
                value={kecamatanID}
                onChange={(e) => setKecamatanID(e.target.value)}
                className="w-full appearance-none rounded-xl border-2 border-slate-300 bg-white pl-5 pr-12 text-lg text-slate-900 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                style={{ height: "56px" }}
              >
                <option value="">-- Pilih Kecamatan --</option>
                {instansiList.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.nama}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            </div>
          )}

          {mode === "kecamatan" && kecamatanTerpilih && (
            <p className="mt-3 flex items-center gap-2 text-base text-slate-600">
              <Users className="h-5 w-5 text-slate-400" strokeWidth={2} />
              {totalPedagangDiKecamatan} pedagang sudah lapor di {jalanDiKecamatan.length} jalan
              kecamatan ini ({jalanBisaDiacakDiKecamatan.length} jalan siap diacak).
            </p>
          )}
        </div>
      )}

      {/* Pilih jalan (cuma untuk mode jalan) */}
      {mode === "jalan" && kecamatanTerpilih && (
        <div>
          <p className="mb-3 text-lg font-semibold text-slate-800">3. Pilih Jalan</p>
          {jalanDiKecamatan.length === 0 ? (
            <p className="text-base text-slate-500">
              Belum ada jalan yang terdaftar di kecamatan ini.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {jalanDiKecamatan.map((j) => {
                const bisaDiacak = j.terisi >= 2;
                const aktif = jalanID === j.id;
                return (
                  <button
                    key={j.id}
                    type="button"
                    disabled={!bisaDiacak}
                    onClick={() => setJalanID(j.id)}
                    className={`flex items-center justify-between gap-4 rounded-xl border-2 p-5 text-left transition-all disabled:cursor-not-allowed disabled:opacity-50 ${
                      aktif
                        ? "border-blue-600 bg-blue-50 shadow-sm"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <div>
                      <p className="text-lg font-semibold text-slate-900">{j.nama}</p>
                      <p className="text-sm text-slate-500">{j.kode_jalan}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-slate-900">{j.terisi}</p>
                      <p className="text-sm text-slate-500">
                        {bisaDiacak ? "pedagang" : "belum cukup"}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Ringkasan mode semua */}
      {mode === "semua" && (
        <div className="flex gap-4 rounded-2xl border-2 border-rose-200 bg-rose-50 p-6">
          <AlertTriangle className="h-6 w-6 shrink-0 text-rose-600" strokeWidth={2} />
          <div>
            <p className="text-lg font-semibold text-rose-900">
              Ini akan mengacak SEMUA pedagang se-Surabaya
            </p>
            <p className="mt-1 text-base text-rose-800">
              Saat ini ada {totalPedagangSemua} pedagang yang sudah lapor, tersebar di{" "}
              {totalJalanSemua} jalan ({totalJalanBisaDiacakSemua} jalan siap diacak). Gunakan
              pilihan ini kalau memang mau mengacak semuanya sekaligus, bukan cuma sebagian.
            </p>
          </div>
        </div>
      )}

      {/* Error aksi */}
      {actionError && (
        <div className="rounded-2xl border-2 border-rose-200 bg-rose-50 p-6 text-rose-800">
          <p className="text-lg font-semibold">Gagal mengacak nomor lapak</p>
          <p className="mt-1 text-base">{actionError}</p>
        </div>
      )}

      {/* Tombol aksi utama -- besar & jelas, warna ikut level risiko mode */}
      <div className="sticky bottom-4 flex justify-center sm:justify-start">
        <button
          type="button"
          disabled={!bisaLanjut}
          onClick={bukaKonfirmasi}
          className={`flex w-full items-center justify-center gap-3 rounded-2xl px-8 text-lg font-semibold text-white shadow-lg transition-all hover:shadow-xl disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none ${
            mode === "semua" ? "bg-rose-600 hover:bg-rose-700" : "bg-blue-600 hover:bg-blue-700"
          }`}
          style={{ height: "64px", maxWidth: "28rem" }}
        >
          <Shuffle className="h-6 w-6" strokeWidth={2} />
          Acak Sekarang
        </button>
      </div>
      {!bisaLanjut && (
        <p className="text-center text-base text-slate-500 sm:text-left">
          {mode === "jalan" && !kecamatanTerpilih && "Pilih kecamatan dan jalan dulu di atas."}
          {mode === "jalan" &&
            kecamatanTerpilih &&
            !jalanTerpilih &&
            "Pilih salah satu jalan dulu di atas."}
          {mode === "jalan" &&
            jalanTerpilih &&
            jalanTerpilih.terisi < 2 &&
            "Jalan ini belum punya cukup pedagang untuk diacak (minimal 2)."}
          {mode === "kecamatan" && !kecamatanTerpilih && "Pilih kecamatan dulu di atas."}
          {mode === "kecamatan" &&
            kecamatanTerpilih &&
            jalanBisaDiacakDiKecamatan.length === 0 &&
            "Belum ada jalan di kecamatan ini yang punya cukup pedagang untuk diacak (minimal 2 per jalan)."}
          {mode === "semua" &&
            totalJalanBisaDiacakSemua === 0 &&
            "Belum ada jalan yang punya cukup pedagang untuk diacak hari ini (minimal 2 per jalan)."}
        </p>
      )}

      {/* Modal konfirmasi */}
      <ModalKonfirmasi
        open={confirmOpen}
        title={konfirmasi.title}
        message={konfirmasi.message}
        confirmLabel={konfirmasi.confirmLabel}
        loading={processing}
        danger={mode === "semua"}
        onConfirm={jalankanAcak}
        onClose={() => !processing && setConfirmOpen(false)}
      />
    </div>
  );
}