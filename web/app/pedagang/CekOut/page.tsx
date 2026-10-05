"use client";

import { Store, Wallet, MapPin, User, Loader2, CheckCircle2, AlertTriangle, Clock } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

// Data dari GET /api/pedagang/events/checkout -- checkout sekarang PER EVENT.
// Backend memilih satu event: yang wajib di-checkout (event sudah selesai)
// didahulukan, lalu yang sedang berjalan, lalu checkout terakhir hari ini.
interface DataCheckout {
  eventId: string;
  namaEvent: string;
  tanggal: string;
  jamMulai: string;
  jamSelesai: string;
  wajibCheckout: boolean;
  kecamatan: string;
  namaJalan: string;
  namaRuas: string;
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
  jamSelesaiSesi?: string;
  sesiSudahSelesai: boolean;
}

const EMPTY_DATA: DataCheckout = {
  eventId: "",
  namaEvent: "",
  tanggal: "",
  jamMulai: "",
  jamSelesai: "",
  wajibCheckout: false,
  kecamatan: "",
  namaJalan: "",
  namaRuas: "",
  nomorStan: "",
  nik: "",
  namaLengkap: "",
  tanggalLahir: "",
  namaUsaha: "",
  kategoriUsaha: "",
  jenisLapak: "",
  sudahCheckIn: false,
  sudahCheckOut: false,
  jamSelesaiSesi: undefined,
  sesiSudahSelesai: false,
};

const KATEGORI_LABEL: Record<string, string> = {
  makanan_minuman: "Makanan dan Minuman",
  bukan_makanan_minuman: "Bukan Makanan dan Minuman",
};

const LAPAK_LABEL: Record<string, string> = {
  rombong: "Rombong",
  meja: "Meja",
};

function formatTanggal(iso: string) {
  if (!iso) return "";
  const d = new Date(`${iso.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

function apiUrl(path: string) {
  return `${process.env.NEXT_PUBLIC_API_URL}${path}`;
}

function authHeaders(): HeadersInit {
  const token = typeof window !== "undefined" ? localStorage.getItem("cfd_token") : null;
  return { Authorization: `Bearer ${token ?? ""}` };
}

export default function MerchantCheckoutPage() {
  const router = useRouter();

  const [dataPedagang, setDataPedagang] = useState<DataCheckout>(EMPTY_DATA);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [omset, setOmset] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  // "Jam sekarang", cuma dipakai buat nampilin teks hitung mundur.
  const [now, setNow] = useState<number>(() => Date.now());

  async function fetchDataCheckout() {
    const token = localStorage.getItem("cfd_token");
    const baseUrl = process.env.NEXT_PUBLIC_API_URL;

    if (!token || !baseUrl) {
      setLoadError("Sesi login tidak ditemukan, silakan login ulang.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(apiUrl("/api/pedagang/events/checkout"), {
        headers: authHeaders(),
      });
      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        setLoadError(body?.error ?? "Gagal mengambil data checkout.");
        setLoading(false);
        return;
      }

      setLoadError(null);
      // data null = belum check-in di event mana pun (dan belum ada checkout hari ini)
      const json = body?.data;
      if (!json) {
        setDataPedagang(EMPTY_DATA);
        return;
      }
      setDataPedagang({
        eventId: json.eventId ?? "",
        namaEvent: json.namaEvent ?? "",
        tanggal: json.tanggal ?? "",
        jamMulai: json.jamMulai ?? "",
        jamSelesai: json.jamSelesai ?? "",
        wajibCheckout: !!json.wajibCheckout,
        kecamatan: json.namaKecamatan ?? "",
        namaJalan: json.namaJalan ?? "",
        namaRuas: json.namaRuas ?? "",
        nomorStan: json.kodeStan ?? (json.nomor != null ? String(json.nomor) : ""),
        nik: json.nik ?? "",
        namaLengkap: json.namaLengkap ?? "",
        tanggalLahir: json.tanggalLahir ?? "",
        namaUsaha: json.namaUsaha ?? "",
        kategoriUsaha: json.kategoriUsaha ?? "",
        jenisLapak: json.jenisLapak ?? "",
        sudahCheckIn: !!json.sudahCheckIn,
        sudahCheckOut: !!json.sudahCheckOut,
        omset: json.omset,
        jamSelesaiSesi: json.jamSelesaiSesi,
        sesiSudahSelesai: !!json.sesiSudahSelesai,
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

  // Ambil data checkout dari backend saat halaman dibuka.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchDataCheckout();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Polling status sesi + countdown tick
  useEffect(() => {
    // Jangan polling kalau belum check-in, sudah selesai, atau sudah submit
    if (!dataPedagang.sudahCheckIn || dataPedagang.sesiSudahSelesai || submitted) {
      return;
    }

    // Polling ke backend setiap 15 detik
    const pollId = setInterval(() => {
      fetchDataCheckout();
    }, 15000);

    // Countdown tick tiap detik (cuma untuk tampilan)
    const tickId = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => {
      clearInterval(pollId);
      clearInterval(tickId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataPedagang.sudahCheckIn, dataPedagang.sesiSudahSelesai, submitted]);

  // Refresh saat tab kembali aktif (opsional, mempercepat update)
  useEffect(() => {
    if (!dataPedagang.sudahCheckIn || dataPedagang.sesiSudahSelesai || submitted) {
      return;
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        fetchDataCheckout();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataPedagang.sudahCheckIn, dataPedagang.sesiSudahSelesai, submitted]);

  // Teks hitung mundur doang -- boleh dikit meleset dari jam server, gak
  // masalah karena cuma dekorasi. Yang nentuin boleh/gaknya submit tetap
  // `dataPedagang.sesiSudahSelesai` dari backend.
  const countdownText = (() => {
    if (dataPedagang.sesiSudahSelesai || submitted) return "";
    if (!dataPedagang.jamSelesaiSesi || !dataPedagang.sudahCheckIn) return "";

    const sesiBerakhir = new Date(dataPedagang.jamSelesaiSesi).getTime();
    const diffMs = sesiBerakhir - now;
    if (diffMs <= 0) return "Menunggu konfirmasi dari server...";

    const diffMins = Math.floor(diffMs / 60000);
    const diffSecs = Math.floor((diffMs % 60000) / 1000);
    return `Check-out dapat dilakukan dalam ${diffMins}m ${diffSecs}d`;
  })();

  const canCheckout = dataPedagang.sesiSudahSelesai && !dataPedagang.sudahCheckOut;

  const handleOmsetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const cleanValue = e.target.value.replace(/[^0-9]/g, "");
    const formattedValue = cleanValue ? Number(cleanValue).toLocaleString("id-ID") : "";
    setOmset(formattedValue);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!canCheckout) {
      setSubmitError("Check-out belum dapat dilakukan. Tunggu hingga event berakhir.");
      return;
    }

    const omsetNumber = Number(omset.replace(/\./g, ""));
    if (!omsetNumber || omsetNumber <= 0) {
      setSubmitError("Isi total omset event ini terlebih dahulu.");
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
      const res = await fetch(apiUrl(`/api/pedagang/events/${dataPedagang.eventId}/checkout`), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(),
        },
        body: JSON.stringify({ omset: omsetNumber }),
      });
      const json = await res.json().catch(() => ({}));

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
            Terima kasih sudah berjualan di {dataPedagang.namaEvent || "event ini"}
            {dataPedagang.namaJalan ? ` (${dataPedagang.namaJalan})` : ""}.
          </p>
          {dataPedagang.omset != null && (
            <p className="text-sm text-[#0b1c30]">
              Omset tercatat: <strong>Rp {Number(dataPedagang.omset).toLocaleString("id-ID")}</strong>
            </p>
          )}
          <button
            onClick={() => router.push("/pedagang/nomer-stand")}
            className="mt-2 h-9 px-5 rounded-full text-sm font-medium text-white bg-[#00288e] hover:bg-[#1e40af] transition-colors"
          >
            Kembali ke Event Saya
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
            Kamu belum check-in di event mana pun. Minta petugas memindai QR di kartu event kamu terlebih
            dahulu sebelum bisa cek-out.
          </p>
          <button
            onClick={() => router.push("/pedagang/nomer-stand")}
            className="mt-2 h-9 px-5 rounded-full text-sm font-medium text-white bg-[#00288e] hover:bg-[#1e40af] transition-colors"
          >
            Ke Event Saya
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f9ff] text-[#0b1c30] font-sans flex flex-col">
      <header className="bg-white border-b border-[#E2E8F0] px-4 py-3 shadow-sm">
        <div className="max-w-[600px] mx-auto flex items-center justify-between gap-4">
          <div className="flex-1 text-center">
            <h1 className="text-xl font-bold text-[#0b1c30]">Cek-out Pedagang</h1>
            <p className="text-sm font-semibold text-[#00288e]">{dataPedagang.namaEvent}</p>
            <p className="text-sm text-[#5b5e6d]">
              {formatTanggal(dataPedagang.tanggal)} · {dataPedagang.jamMulai.replace(":", ".")} –{" "}
              {dataPedagang.jamSelesai.replace(":", ".")} WIB
            </p>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 md:p-6 flex justify-center bg-[#f8f9ff]">
        <form onSubmit={handleSubmit} className="w-full max-w-[600px] flex flex-col gap-4">
          {dataPedagang.wajibCheckout && (
            <div role="alert" className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-4">
              <AlertTriangle className="w-5 h-5 shrink-0 text-amber-500" />
              <p className="text-sm text-amber-800">
                Event ini sudah selesai tapi kamu belum cek-out. Isi omset dulu supaya kamu bisa ikut dan check-in di event
                berikutnya.
              </p>
            </div>
          )}

          <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-[0_2px_10px_-4px_rgba(11,28,48,0.08)] p-4">
            <div className="flex items-center gap-2 mb-3">
              <MapPin className="w-4 h-4 text-[#00288e]" />
              <h2 className="font-semibold text-[#0b1c30] text-base">Detail Lokasi</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#00288e] mb-1">Kecamatan</label>
                <input type="text" value={dataPedagang.kecamatan} readOnly placeholder="-" className="w-full h-9 px-3 rounded-lg border border-[#c9d6f5] bg-[#eaf0ff] text-sm cursor-not-allowed" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#00288e] mb-1">Nama Jalan</label>
                <input type="text" value={dataPedagang.namaJalan} readOnly placeholder="-" className="w-full h-9 px-3 rounded-lg border border-[#c9d6f5] bg-[#eaf0ff] text-sm cursor-not-allowed" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#00288e] mb-1">Ruas</label>
                <input type="text" value={dataPedagang.namaRuas} readOnly placeholder="-" className="w-full h-9 px-3 rounded-lg border border-[#c9d6f5] bg-[#eaf0ff] text-sm cursor-not-allowed" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#00288e] mb-1">Nomor Stan</label>
                <input type="text" value={dataPedagang.nomorStan} readOnly placeholder="-" className="w-full h-9 px-3 rounded-lg border border-[#c9d6f5] bg-[#eaf0ff] text-sm font-medium cursor-not-allowed" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-[0_2px_10px_-4px_rgba(11,28,48,0.08)] p-4">
            <div className="flex items-center gap-2 mb-3">
              <User className="w-4 h-4 text-[#00288e]" />
              <h2 className="font-semibold text-[#0b1c30] text-base">Data Pedagang</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#00288e] mb-1">NIK</label>
                <input type="text" value={dataPedagang.nik} readOnly placeholder="-" className="w-full h-9 px-3 rounded-lg border border-[#c9d6f5] bg-[#eaf0ff] text-sm cursor-not-allowed" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#00288e] mb-1">Nama Lengkap</label>
                <input type="text" value={dataPedagang.namaLengkap} readOnly placeholder="-" className="w-full h-9 px-3 rounded-lg border border-[#c9d6f5] bg-[#eaf0ff] text-sm cursor-not-allowed" />
              </div>
              <div className="md:col-span-2 max-w-[200px]">
                <label className="block text-xs font-semibold text-[#00288e] mb-1">Tanggal Lahir</label>
                <input type="text" value={dataPedagang.tanggalLahir} readOnly placeholder="-" className="w-full h-9 px-3 rounded-lg border border-[#c9d6f5] bg-[#eaf0ff] text-sm cursor-not-allowed" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-[0_2px_10px_-4px_rgba(11,28,48,0.08)] p-4">
            <div className="flex items-center gap-2 mb-3">
              <Store className="w-4 h-4 text-[#00288e]" />
              <h2 className="font-semibold text-[#0b1c30] text-base">Data Usaha</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-[#00288e] mb-1">Nama Usaha</label>
                <input type="text" value={dataPedagang.namaUsaha} readOnly placeholder="-" className="w-full h-9 px-3 rounded-lg border border-[#c9d6f5] bg-[#eaf0ff] text-sm cursor-not-allowed" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#00288e] mb-1">Kategori Usaha</label>
                <input type="text" value={KATEGORI_LABEL[dataPedagang.kategoriUsaha] ?? dataPedagang.kategoriUsaha} readOnly placeholder="-" className="w-full h-9 px-3 rounded-lg border border-[#c9d6f5] bg-[#eaf0ff] text-sm cursor-not-allowed" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#00288e] mb-1">Jenis Lapak</label>
                <div className="h-9 px-3 rounded-lg border border-[#c9d6f5] bg-[#eaf0ff] flex items-center">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-[#d1fae5] text-[#047857] text-xs font-semibold">
                    {LAPAK_LABEL[dataPedagang.jenisLapak] ?? (dataPedagang.jenisLapak || "-")}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-[#eff4ff] rounded-xl border border-[#dbe4ff] p-4">
            <div className="flex items-center gap-2 mb-3">
              <Wallet className="w-4 h-4 text-[#00288e]" />
              <h2 className="font-semibold text-[#0b1c30] text-base">Laporan Akhir Event</h2>
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="omset" className="text-sm font-semibold text-[#0b1c30]">
                Total Omset Event Ini (Rp)
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
                  disabled={!canCheckout}
                />
              </div>
              <div className="flex items-center gap-2 mt-1">
                <Clock className={`w-4 h-4 ${canCheckout ? 'text-emerald-600' : 'text-amber-500'}`} />
                <p className={`text-xs ${canCheckout ? 'text-emerald-700' : 'text-amber-600'}`}>
                  {canCheckout
                    ? "Check-out sudah dapat dilakukan!"
                    : countdownText || "Menunggu waktu check-out..."}
                </p>
              </div>
              {submitError && (
                <p className="text-xs text-red-600 mt-1">{submitError}</p>
              )}
            </div>
          </div>

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
              disabled={submitting || !canCheckout}
              className="h-10 px-6 rounded-full text-sm font-medium text-white bg-[#00288e] hover:bg-[#1e40af] transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-[#00288e] focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center gap-2"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {canCheckout ? "Cek-out" : "Tunggu Waktu"}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}