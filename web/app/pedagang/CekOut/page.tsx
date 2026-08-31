"use client";

import { Store, Wallet, MapPin, User, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface DataCheckout {
  kecamatan: string;
  namaJalan: string;
  nomorStan: string;
  nik: string;
  namaLengkap: string;
  tanggalLahir: string;
  namaUsaha: string;
  kategoriUsaha: string;
  jenisLapak: string;
  sudahCheckIn: boolean;
  sudahCheckOut: boolean;
  omset?: number;
}

const EMPTY_DATA: DataCheckout = {
  kecamatan: "",
  namaJalan: "",
  nomorStan: "",
  nik: "",
  namaLengkap: "",
  tanggalLahir: "",
  namaUsaha: "",
  kategoriUsaha: "",
  jenisLapak: "",
  sudahCheckIn: false,
  sudahCheckOut: false,
};

const KATEGORI_LABEL: Record<string, string> = {
  makanan_minuman: "Makanan dan Minuman",
  bukan_makanan_minuman: "Bukan Makanan dan Minuman",
};

const LAPAK_LABEL: Record<string, string> = {
  rombong: "Rombong",
  meja: "Meja",
};

export default function MerchantCheckoutPage() {
  const router = useRouter();

  const [dataPedagang, setDataPedagang] = useState<DataCheckout>(EMPTY_DATA);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [omset, setOmset] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  // Ambil data checkout (lokasi lapak, data diri, data usaha, status
  // check-in/check-out) dari backend begitu halaman dibuka.
  useEffect(() => {
    async function fetchDataCheckout() {
      const token = localStorage.getItem("cfd_token");
      const baseUrl = process.env.NEXT_PUBLIC_API_URL;

      if (!token || !baseUrl) {
        setLoadError("Sesi login tidak ditemukan, silakan login ulang.");
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`${baseUrl}/api/pedagang/checkout`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json();

        if (!res.ok) {
          setLoadError(json?.error ?? "Gagal mengambil data checkout.");
          setLoading(false);
          return;
        }

        setDataPedagang({
          kecamatan: json.kecamatan ?? "",
          namaJalan: json.namaJalan ?? "",
          nomorStan: json.nomorStan ?? "",
          nik: json.nik ?? "",
          namaLengkap: json.namaLengkap ?? "",
          tanggalLahir: json.tanggalLahir ?? "",
          namaUsaha: json.namaUsaha ?? "",
          kategoriUsaha: json.kategoriUsaha ?? "",
          jenisLapak: json.jenisLapak ?? "",
          sudahCheckIn: !!json.sudahCheckIn,
          sudahCheckOut: !!json.sudahCheckOut,
          omset: json.omset,
        });

        if (json.sudahCheckOut) {
          setSubmitted(true);
        }
      } catch {
        setLoadError("Gagal terhubung ke server. Cek koneksi internet kamu.");
      } finally {
        setLoading(false);
      }
    }

    fetchDataCheckout();
  }, []);

  const handleOmsetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const cleanValue = e.target.value.replace(/[^0-9]/g, "");
    const formattedValue = cleanValue ? Number(cleanValue).toLocaleString("id-ID") : "";
    setOmset(formattedValue);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    const omsetNumber = Number(omset.replace(/\./g, ""));
    if (!omsetNumber || omsetNumber <= 0) {
      setSubmitError("Isi total omset hari ini terlebih dahulu.");
      return;
    }

    const token = localStorage.getItem("cfd_token");
    const baseUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!token || !baseUrl) {
      setSubmitError("Sesi login tidak ditemukan, silakan login ulang.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${baseUrl}/api/pedagang/checkout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ omset: omsetNumber }),
      });
      const json = await res.json();

      if (!res.ok) {
        setSubmitError(json?.error ?? "Gagal menyimpan cek-out.");
        setSubmitting(false);
        return;
      }

      setSubmitted(true);
    } catch {
      setSubmitError("Gagal terhubung ke server. Cek koneksi internet kamu.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8f9ff] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-[#5b5e6d]">
          <Loader2 className="w-6 h-6 animate-spin text-[#00288e]" />
          <p className="text-sm">Memuat data checkout...</p>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-[#f8f9ff] flex items-center justify-center p-4">
        <div className="max-w-[420px] w-full bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-6 text-center flex flex-col items-center gap-3">
          <AlertTriangle className="w-8 h-8 text-amber-500" />
          <p className="text-sm text-[#0b1c30]">{loadError}</p>
          <button
            onClick={() => router.push("/pedagang/profil")}
            className="mt-2 h-9 px-5 rounded-full text-sm font-medium text-white bg-[#00288e] hover:bg-[#1e40af] transition-colors"
          >
            Kembali
          </button>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#f8f9ff] flex items-center justify-center p-4">
        <div className="max-w-[420px] w-full bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-6 text-center flex flex-col items-center gap-3">
          <CheckCircle2 className="w-10 h-10 text-emerald-600" />
          <h2 className="font-semibold text-[#0b1c30] text-lg">Cek-out Berhasil</h2>
          <p className="text-sm text-[#5b5e6d]">
            Terima kasih sudah berjualan hari ini di {dataPedagang.namaJalan || "lapak kamu"}.
          </p>
          <button
            onClick={() => router.push("/pedagang/profil")}
            className="mt-2 h-9 px-5 rounded-full text-sm font-medium text-white bg-[#00288e] hover:bg-[#1e40af] transition-colors"
          >
            Kembali ke Profil
          </button>
        </div>
      </div>
    );
  }

  if (!dataPedagang.sudahCheckIn) {
    return (
      <div className="min-h-screen bg-[#f8f9ff] flex items-center justify-center p-4">
        <div className="max-w-[420px] w-full bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-6 text-center flex flex-col items-center gap-3">
          <AlertTriangle className="w-8 h-8 text-amber-500" />
          <p className="text-sm text-[#0b1c30]">
            Kamu belum check-in hari ini. Minta petugas untuk scan QR kamu terlebih dahulu
            sebelum bisa cek-out.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f9ff] text-[#0b1c30] font-sans flex flex-col">
      {/* Header dengan status sesi */}
      <header className="bg-white border-b border-[#E2E8F0] px-4 py-3 shadow-sm">
        <div className="max-w-[600px] mx-auto flex items-center justify-between gap-4">
          <div className="flex-1 text-center">
            <h1 className="text-xl font-bold text-[#0b1c30]">Cek-out Pedagang</h1>
            <p className="text-sm text-[#5b5e6d]">
              Selesaikan sesi jualan hari ini dengan mencatat total pendapatan kotor.
            </p>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 md:p-6 flex justify-center bg-[#f8f9ff]">
        <form onSubmit={handleSubmit} className="w-full max-w-[600px] flex flex-col gap-4">
          {/* Detail Lokasi */}
          <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-[0_2px_10px_-4px_rgba(11,28,48,0.08)] p-4">
            <div className="flex items-center gap-2 mb-3">
              <MapPin className="w-4 h-4 text-[#00288e]" />
              <h2 className="font-semibold text-[#0b1c30] text-base">Detail Lokasi</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#00288e] mb-1">
                  Kecamatan
                </label>
                <input
                  type="text"
                  value={dataPedagang.kecamatan}
                  readOnly
                  placeholder="-"
                  className="w-full h-9 px-3 rounded-lg border border-[#c9d6f5] bg-[#eaf0ff] text-sm cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#00288e] mb-1">
                  Nama Jalan
                </label>
                <input
                  type="text"
                  value={dataPedagang.namaJalan}
                  readOnly
                  placeholder="-"
                  className="w-full h-9 px-3 rounded-lg border border-[#c9d6f5] bg-[#eaf0ff] text-sm cursor-not-allowed"
                />
              </div>
              <div className="md:col-span-2 max-w-[200px]">
                <label className="block text-xs font-semibold text-[#00288e] mb-1">
                  Nomor Stan
                </label>
                <input
                  type="text"
                  value={dataPedagang.nomorStan}
                  readOnly
                  placeholder="-"
                  className="w-full h-9 px-3 rounded-lg border border-[#c9d6f5] bg-[#eaf0ff] text-sm font-medium cursor-not-allowed"
                />
              </div>
            </div>
          </div>

          {/* Data Pedagang */}
          <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-[0_2px_10px_-4px_rgba(11,28,48,0.08)] p-4">
            <div className="flex items-center gap-2 mb-3">
              <User className="w-4 h-4 text-[#00288e]" />
              <h2 className="font-semibold text-[#0b1c30] text-base">Data Pedagang</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#00288e] mb-1">
                  NIK
                </label>
                <input
                  type="text"
                  value={dataPedagang.nik}
                  readOnly
                  placeholder="-"
                  className="w-full h-9 px-3 rounded-lg border border-[#c9d6f5] bg-[#eaf0ff] text-sm cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#00288e] mb-1">
                  Nama Lengkap
                </label>
                <input
                  type="text"
                  value={dataPedagang.namaLengkap}
                  readOnly
                  placeholder="-"
                  className="w-full h-9 px-3 rounded-lg border border-[#c9d6f5] bg-[#eaf0ff] text-sm cursor-not-allowed"
                />
              </div>
              <div className="md:col-span-2 max-w-[200px]">
                <label className="block text-xs font-semibold text-[#00288e] mb-1">
                  Tanggal Lahir
                </label>
                <input
                  type="text"
                  value={dataPedagang.tanggalLahir}
                  readOnly
                  placeholder="-"
                  className="w-full h-9 px-3 rounded-lg border border-[#c9d6f5] bg-[#eaf0ff] text-sm cursor-not-allowed"
                />
              </div>
            </div>
          </div>

          {/* Data Usaha */}
          <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-[0_2px_10px_-4px_rgba(11,28,48,0.08)] p-4">
            <div className="flex items-center gap-2 mb-3">
              <Store className="w-4 h-4 text-[#00288e]" />
              <h2 className="font-semibold text-[#0b1c30] text-base">Data Usaha</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-[#00288e] mb-1">
                  Nama Usaha
                </label>
                <input
                  type="text"
                  value={dataPedagang.namaUsaha}
                  readOnly
                  placeholder="-"
                  className="w-full h-9 px-3 rounded-lg border border-[#c9d6f5] bg-[#eaf0ff] text-sm cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#00288e] mb-1">
                  Kategori Usaha
                </label>
                <input
                  type="text"
                  value={KATEGORI_LABEL[dataPedagang.kategoriUsaha] ?? dataPedagang.kategoriUsaha}
                  readOnly
                  placeholder="-"
                  className="w-full h-9 px-3 rounded-lg border border-[#c9d6f5] bg-[#eaf0ff] text-sm cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#00288e] mb-1">
                  Jenis Lapak
                </label>
                <div className="h-9 px-3 rounded-lg border border-[#c9d6f5] bg-[#eaf0ff] flex items-center">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-[#d1fae5] text-[#047857] text-xs font-semibold">
                    {LAPAK_LABEL[dataPedagang.jenisLapak] ?? (dataPedagang.jenisLapak || "-")}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Laporan Akhir Sesi */}
          <div className="bg-[#eff4ff] rounded-xl border border-[#dbe4ff] p-4">
            <div className="flex items-center gap-2 mb-3">
              <Wallet className="w-4 h-4 text-[#00288e]" />
              <h2 className="font-semibold text-[#0b1c30] text-base">Laporan Akhir Sesi</h2>
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="omset" className="text-sm font-semibold text-[#0b1c30]">
                Total Omset Hari Ini (Rp)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-[#5b5e6d] text-sm font-medium">Rp</span>
                </div>
                <input
                  id="omset"
                  name="omset"
                  type="text"
                  value={omset}
                  onChange={handleOmsetChange}
                  placeholder="Contoh: 500.000"
                  className="w-full h-10 pl-9 pr-3 rounded-lg border border-[#CBD5E1] bg-white text-sm focus:outline-none focus:border-[#00288e] focus:ring-2 focus:ring-[#00288e]/15 transition-colors"
                />
              </div>
              {submitError && (
                <p className="text-xs text-red-600 mt-1">{submitError}</p>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => router.back()}
              className="h-10 px-6 rounded-full text-sm font-medium text-[#00288e] border border-[#00288e] bg-white hover:bg-[#eff4ff] transition-colors focus:outline-none focus:ring-2 focus:ring-[#00288e] focus:ring-offset-2"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="h-10 px-6 rounded-full text-sm font-medium text-white bg-[#00288e] hover:bg-[#1e40af] transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-[#00288e] focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center gap-2"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Cek-out
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}