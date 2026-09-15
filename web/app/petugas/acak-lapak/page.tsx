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

type GenScope = "kota" | "kecamatan" | "jalan";
type HasilGenerate = {
  scope: string;
  scopeLabel: string;
  jumlahJalan: number;
  jumlahSlotDibuat: number;
  jumlahSlotAda: number;
};

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
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  loading: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  // Lazy initializer -- ngecek `window` langsung pas render pertama di
  // client, tanpa perlu effect+setState sama sekali (jadi gak kena
  // ESLint react-hooks/set-state-in-effect).
  const [mounted] = useState(() => typeof window !== "undefined");
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
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600">
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
            className="flex h-14 items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 text-base font-semibold text-white transition-all hover:bg-blue-700 disabled:opacity-60"
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

// ========== KARTU PILIHAN CAKUPAN ==========
const SCOPE_TONE = {
  jalan: { ring: "border-blue-600 bg-blue-50", chip: "bg-blue-600 text-white" },
  kecamatan: { ring: "border-indigo-600 bg-indigo-50", chip: "bg-indigo-600 text-white" },
  kota: { ring: "border-emerald-600 bg-emerald-50", chip: "bg-emerald-600 text-white" },
} as const;

function KartuScope({
  aktif,
  tone,
  icon: Icon,
  label,
  deskripsi,
  onClick,
}: {
  aktif: boolean;
  tone: keyof typeof SCOPE_TONE;
  icon: React.ElementType;
  label: string;
  deskripsi: string;
  onClick: () => void;
}) {
  const t = SCOPE_TONE[tone];
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

  const [genScope, setGenScope] = useState<GenScope>("kota");
  const [genKecamatanID, setGenKecamatanID] = useState<string>("");
  const [genJalanID, setGenJalanID] = useState<string>("");
  const [genConfirmOpen, setGenConfirmOpen] = useState(false);
  const [genProcessing, setGenProcessing] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [genHasil, setGenHasil] = useState<HasilGenerate | null>(null);

  const loadData = async () => {
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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setGenJalanID("");
  }, [genKecamatanID, genScope]);

  const genKecamatanTerpilih = instansiList.find((i) => i.id === genKecamatanID) || null;
  const genJalanDiKecamatan = useMemo(() => {
    if (!genKecamatanTerpilih) return [];
    return lapakData.find((k) => k.kecamatan === genKecamatanTerpilih.nama)?.jalan || [];
  }, [lapakData, genKecamatanTerpilih]);
  const genJalanTerpilih = genJalanDiKecamatan.find((j) => j.id === genJalanID) || null;

  const genBisaLanjut =
    genScope === "kota" ? true : genScope === "kecamatan" ? !!genKecamatanTerpilih : !!genJalanTerpilih;

  const genBukaKonfirmasi = () => {
    setGenError(null);
    setGenHasil(null);
    setGenConfirmOpen(true);
  };

  const genTeksKonfirmasi = (): { title: string; message: string } => {
    if (genScope === "kota") {
      return {
        title: "Siapkan lokasi lapak se-Surabaya?",
        message:
          "Sistem akan mengisi pool lokasi buat SEMUA jalan yang terdaftar, sejumlah sisa kapasitas yang belum disiapkan. Aman diklik ulang -- gak akan bikin lokasi dobel.",
      };
    }
    if (genScope === "kecamatan" && genKecamatanTerpilih) {
      return {
        title: `Siapkan lokasi lapak se-${genKecamatanTerpilih.nama}?`,
        message:
          "Sistem akan mengisi pool lokasi buat semua jalan di kecamatan ini, sejumlah sisa kapasitas yang belum disiapkan.",
      };
    }
    return {
      title: `Siapkan lokasi lapak di ${genJalanTerpilih?.nama ?? "jalan ini"}?`,
      message:
        "Sistem akan mengisi pool lokasi buat jalan ini saja, sejumlah sisa kapasitas yang belum disiapkan.",
    };
  };

  const jalankanGenerateSlot = async () => {
    setGenProcessing(true);
    setGenError(null);
    try {
      const res = await apiFetch("/api/petugas/acak-lapak/generate-slot", {
        method: "POST",
        body: JSON.stringify({
          scope: genScope,
          ...(genScope === "kecamatan" ? { kecamatanId: genKecamatanID } : {}),
          ...(genScope === "jalan" ? { jalanId: genJalanID } : {}),
        }),
      });
      setGenHasil(res.data);
      setGenConfirmOpen(false);
    } catch (err) {
      setGenError(err instanceof Error ? err.message : "gagal menyiapkan lokasi lapak");
    } finally {
      setGenProcessing(false);
    }
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
          onClick={() => {
            setIsLoading(true);
            loadData();
          }}
          className="mt-4 h-12 rounded-xl bg-rose-600 px-6 text-base font-semibold text-white hover:bg-rose-700"
        >
          Coba Lagi
        </button>
      </div>
    );
  }

  const konfirmasi = genTeksKonfirmasi();

  return (
    <div className="flex flex-col gap-8 pb-24">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-white shadow-sm">
            <Shuffle className="h-6 w-6" strokeWidth={2} />
          </span>
          <h2 className="text-3xl font-bold text-slate-900">Acak Lapak</h2>
        </div>
        <p className="mt-4 max-w-2xl text-lg leading-relaxed text-slate-600">
          Siapkan pool lokasi lapak SEBELUM ada pedagang yang daftar -- begitu pedagang submit
          pendaftaran usaha, lokasi & nomor stan-nya langsung diambil dari pool yang kamu siapkan
          di sini, acak, gak perlu diatur manual per pedagang.
        </p>
      </div>

      {/* Hasil sukses terakhir */}
      {genHasil && (
        <div className="flex items-start gap-4 rounded-2xl border-2 border-emerald-200 bg-emerald-50 p-6">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white">
            <CheckCircle2 className="h-6 w-6" strokeWidth={2} />
          </span>
          <div className="flex-1">
            <p className="text-lg font-semibold text-emerald-900">Lokasi berhasil disiapkan!</p>
            <p className="mt-1 text-base text-emerald-800">
              {genHasil.jumlahSlotDibuat} lokasi baru ditambahkan ke pool ({genHasil.scopeLabel},{" "}
              {genHasil.jumlahJalan} jalan). Total sekarang ada {genHasil.jumlahSlotAda} lokasi
              siap diklaim pedagang.
            </p>
          </div>
          <button
            onClick={() => setGenHasil(null)}
            aria-label="Tutup"
            className="rounded-full p-1 text-emerald-800 hover:bg-emerald-100"
          >
            <X className="h-5 w-5" strokeWidth={2} />
          </button>
        </div>
      )}

      {/* Pilih cakupan */}
      <div>
        <p className="mb-3 text-lg font-semibold text-slate-800">1. Cakupan lokasi yang disiapkan?</p>
        <div className="flex flex-col gap-4 sm:flex-row">
          <KartuScope
            aktif={genScope === "kota"}
            tone="kota"
            icon={Landmark}
            label="Se-Surabaya"
            deskripsi="Siapkan lokasi di semua jalan yang terdaftar."
            onClick={() => setGenScope("kota")}
          />
          <KartuScope
            aktif={genScope === "kecamatan"}
            tone="kecamatan"
            icon={MapPin}
            label="1 Kecamatan"
            deskripsi="Siapkan lokasi buat semua jalan di satu kecamatan."
            onClick={() => setGenScope("kecamatan")}
          />
          <KartuScope
            aktif={genScope === "jalan"}
            tone="jalan"
            icon={Milestone}
            label="1 Jalan Saja"
            deskripsi="Siapkan lokasi buat satu jalan tertentu."
            onClick={() => setGenScope("jalan")}
          />
        </div>
      </div>

      {/* Pilih kecamatan (untuk scope kecamatan & jalan) */}
      {(genScope === "kecamatan" || genScope === "jalan") && (
        <div>
          <p className="mb-3 text-lg font-semibold text-slate-800">2. Pilih Kecamatan</p>
          {instansiList.length === 0 ? (
            <p className="text-base text-slate-500">Belum ada data kecamatan.</p>
          ) : (
            <div className="relative w-full" style={{ maxWidth: "36rem" }}>
              <select
                value={genKecamatanID}
                onChange={(e) => setGenKecamatanID(e.target.value)}
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
        </div>
      )}

      {/* Pilih jalan (cuma untuk scope jalan) */}
      {genScope === "jalan" && genKecamatanTerpilih && (
        <div>
          <p className="mb-3 text-lg font-semibold text-slate-800">3. Pilih Jalan</p>
          {genJalanDiKecamatan.length === 0 ? (
            <p className="text-base text-slate-500">Belum ada jalan terdaftar di kecamatan ini.</p>
          ) : (
            <div className="relative w-full" style={{ maxWidth: "36rem" }}>
              <select
                value={genJalanID}
                onChange={(e) => setGenJalanID(e.target.value)}
                className="w-full appearance-none rounded-xl border-2 border-slate-300 bg-white pl-5 pr-12 text-lg text-slate-900 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                style={{ height: "56px" }}
              >
                <option value="">-- Pilih Jalan --</option>
                {genJalanDiKecamatan.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.nama} (kuota {j.kuota})
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            </div>
          )}
        </div>
      )}

      {/* Error aksi */}
      {genError && (
        <div className="rounded-2xl border-2 border-rose-200 bg-rose-50 p-6 text-rose-800">
          <p className="text-lg font-semibold">Gagal menyiapkan lokasi lapak</p>
          <p className="mt-1 text-base">{genError}</p>
        </div>
      )}

      {/* Tombol aksi utama */}
      <div className="sticky bottom-4 flex justify-center sm:justify-start">
        <button
          type="button"
          disabled={!genBisaLanjut}
          onClick={genBukaKonfirmasi}
          className="flex w-full items-center justify-center gap-3 rounded-2xl bg-blue-600 px-8 text-lg font-semibold text-white shadow-lg transition-all hover:bg-blue-700 hover:shadow-xl disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none"
          style={{ height: "64px", maxWidth: "28rem" }}
        >
          <Shuffle className="h-6 w-6" strokeWidth={2} />
          Siapkan Lokasi
        </button>
      </div>
      {!genBisaLanjut && (
        <p className="text-center text-base text-slate-500 sm:text-left">
          {genScope === "kecamatan" && "Pilih kecamatan dulu di atas."}
          {genScope === "jalan" && !genKecamatanTerpilih && "Pilih kecamatan dan jalan dulu di atas."}
          {genScope === "jalan" && genKecamatanTerpilih && !genJalanTerpilih && "Pilih salah satu jalan dulu di atas."}
        </p>
      )}

      {/* Modal konfirmasi */}
      <ModalKonfirmasi
        open={genConfirmOpen}
        title={konfirmasi.title}
        message={konfirmasi.message}
        confirmLabel="Ya, Siapkan Lokasi"
        loading={genProcessing}
        onConfirm={jalankanGenerateSlot}
        onClose={() => !genProcessing && setGenConfirmOpen(false)}
      />
    </div>
  );
}