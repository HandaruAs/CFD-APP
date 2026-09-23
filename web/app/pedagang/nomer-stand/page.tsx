"use client";

import { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  MapPin,
  User,
  Save,
  ArrowLeft,
  CheckCircle2,
  Store,
  QrCode,
  AlertTriangle,
  Clock,
  CreditCard,
  Tag,
  ShoppingCart,
  Table2,
} from "lucide-react";

type StallType = "rombong" | "meja" | "";

interface HasilAlokasi {
  nomorStand: string;
  kecamatan: string;
  namaJalan: string;
  // Kosong kalau lapaknya dari jalan yang belum dibagi ruas.
  namaRuas: string;
}

const KATEGORI_LABEL: Record<string, string> = {
  makanan_minuman: "Makanan dan Minuman",
  bukan_makanan_minuman: "Bukan Makanan dan Minuman",
};

const LAPAK_LABEL: Record<string, string> = {
  rombong: "Rombong",
  meja: "Meja",
};

function apiUrl(path: string) {
  return `${process.env.NEXT_PUBLIC_API_URL}${path}`;
}

function authHeaders(): HeadersInit {
  const token = typeof window !== "undefined" ? localStorage.getItem("cfd_token") : null;
  return { Authorization: `Bearer ${token ?? ""}` };
}

function qrCodeUrl(pedagangId: string) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(
    pedagangId
  )}`;
}

// dob bisa berupa "yyyy-MM-dd" (dari <input type="date"> kalau baru
// diisi) atau string ISO dari backend (kalau sudah pernah daftar) --
// dua-duanya bisa langsung diparse Date, jadi 1 fungsi ini cukup.
function formatTanggalLahir(raw: string): string {
  if (!raw) return "-";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

/// Halaman gabungan "Daftar Usaha" + "Pilih Lokasi Stan (Check-in)".
/// Dulu 2 halaman terpisah (/pedagang/pendaftaran dan
/// /pedagang/nomer-stand) -- sekarang satu alur:
///   - Belum pernah daftar  -> form data usaha (editable) + lokasi,
///     submit sekali langsung bikin pengajuan usaha DAN klaim lapak.
///   - Sudah pernah daftar  -> data usaha ditampilkan read-only,
///     tinggal pilih lokasi lalu klaim.
///   - Sudah klaim lapak    -> tampilan konfirmasi + QR (gak berubah).
export default function DaftarDanCheckInPage() {
  const router = useRouter();

  // --- Status pendaftaran (apakah user ini sudah punya pengajuan usaha) ---
  const [checkingPendaftar, setCheckingPendaftar] = useState(true);
  const [sudahDaftar, setSudahDaftar] = useState(false);
  const [pedagangId, setPedagangId] = useState("");

  // --- Status sesi klaim (dibuka petugas atau tidak) ---
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [sesiKlaimDibuka, setSesiKlaimDibuka] = useState(true);
  const [pesanSesiKlaim, setPesanSesiKlaim] = useState<string | null>(null);

  // --- Data usaha. Kalau BELUM daftar, ini diisi manual lewat form.
  // Kalau SUDAH daftar, diisi dari data yang udah ada & ditampilkan
  // read-only (gak bisa diubah lagi di halaman ini). ---
  const [nik, setNik] = useState("");
  const [dob, setDob] = useState("");
  const [fullName, setFullName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [category, setCategory] = useState("");
  const [stallType, setStallType] = useState<StallType>("");

  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasil, setHasil] = useState<HasilAlokasi | null>(null);

  useEffect(() => {
    async function fetchDataPendaftar() {
      try {
        const res = await fetch(apiUrl("/api/pedagang/pengajuan"), {
          headers: authHeaders(),
        });
        if (!res.ok) {
          setCheckingPendaftar(false);
          return;
        }
        const data = await res.json();
        if (!data.has_pengajuan) {
          setCheckingPendaftar(false);
          return;
        }
        setSudahDaftar(true);
        setPedagangId(data.id ?? "");
        setNik(data.nik ?? "");
        setDob(data.tanggal_lahir ?? "");
        setFullName(data.nama_lengkap ?? "");
        setBusinessName(data.nama_usaha ?? "");
        setCategory(data.jenis_dagangan ?? "");
        setStallType((data.jenis_lapak as StallType) ?? "");
      } catch {
        // gagal fetch -- anggap belum daftar, biarin form kosong
      } finally {
        setCheckingPendaftar(false);
      }
    }
    fetchDataPendaftar();
  }, []);

  useEffect(() => {
    async function fetchStatus() {
      try {
        const res = await fetch(apiUrl("/api/pedagang/lapak/status"), {
          headers: authHeaders(),
        });
        if (!res.ok) {
          setCheckingStatus(false);
          return;
        }
        const data = await res.json();
        setSesiKlaimDibuka(Boolean(data.sesi_aktif));
        setPesanSesiKlaim(data.pesan_sesi ?? null);
        if (data.sudah_klaim) {
          setHasil({
            nomorStand: data.nomor_lapak ?? "-",
            kecamatan: data.nama_kecamatan ?? "-",
            namaJalan: data.nama_jalan ?? "-",
            namaRuas: data.nama_ruas ?? "",
          });
        }
      } catch {
        // biarin user isi form seperti biasa
      } finally {
        setCheckingStatus(false);
      }
    }
    fetchStatus();
  }, []);

  // Polling check-in setelah dapet hasil klaim -- sama kayak sebelumnya.
  useEffect(() => {
    if (!hasil) return;
    let cancelled = false;

    async function checkStatus() {
      try {
        const res = await fetch(apiUrl("/api/pedagang/check-in/status"), {
          headers: authHeaders(),
        });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && data.sudah_check_in) {
          router.push("/pedagang/CekOut");
        }
      } catch {
        // coba lagi di polling berikutnya
      }
    }

    checkStatus();
    const interval = setInterval(checkStatus, 5000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [hasil, router]);

  function validationError(): string | null {
    if (!sudahDaftar) {
      if (nik.trim().length !== 16) return "NIK harus terdiri dari 16 digit.";
      if (!dob || !fullName || !businessName || !category || !stallType) {
        return "Mohon lengkapi semua data usaha terlebih dahulu.";
      }
    }
    return null;
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const err = validationError();
    if (err) {
      setError(err);
      return;
    }
    setError(null);

    // Sudah pernah daftar -- data usaha gak diubah di sini, jadi gak
    // perlu dialog konfirmasi lagi, langsung proses klaim lokasi.
    if (sudahDaftar) {
      void processKlaim();
      return;
    }

    // Belum pernah daftar -- submit ini SEKALIGUS bikin pengajuan
    // usaha (NIK dkk gak bisa asal diubah lagi setelahnya), makanya
    // tetap ditampilin dialog konfirmasi dulu sebelum beneran dikirim.
    setShowConfirm(true);
  };

  async function processPendaftaranLaluKlaim() {
    setError(null);
    setLoading(true);
    try {
      const resDaftar = await fetch(apiUrl("/api/pedagang/pengajuan"), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          nik,
          nama_lengkap: fullName,
          tanggal_lahir: dob,
          nama_usaha: businessName,
          jenis_dagangan: category,
          jenis_lapak: stallType,
        }),
      });
      const dataDaftar = await resDaftar.json().catch(() => ({}));

      if (!resDaftar.ok) {
        if (resDaftar.status === 409) {
          throw new Error(dataDaftar.error || "Data sudah terdaftar sebelumnya.");
        }
        if (resDaftar.status === 401) {
          throw new Error("Sesi kamu sudah habis. Silakan login ulang.");
        }
        throw new Error(
          dataDaftar.error || `Gagal menyimpan data usaha (Status: ${resDaftar.status})`
        );
      }

      // Pengajuan berhasil dibuat -- tandain sudah daftar SEKARANG.
      // Kalau langkah klaim di bawah gagal (mis. lapak keburu penuh),
      // form gak akan nyuruh pedagang isi ulang data usaha dari nol --
      // dia otomatis pindah ke tampilan "sudah daftar, tinggal pilih
      // lokasi lagi".
      setSudahDaftar(true);
      setPedagangId(dataDaftar.pengajuan_id ?? "");
      setShowConfirm(false);

      await processKlaim();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan. Silakan coba lagi.");
      setLoading(false);
      setShowConfirm(false);
    }
  }

  async function processKlaim() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(apiUrl("/api/pedagang/lapak/klaim"), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Gagal mengklaim lapak");
      }
      setHasil({
        nomorStand: data.nomor_lapak,
        kecamatan: data.nama_kecamatan,
        namaJalan: data.nama_jalan,
        namaRuas: data.nama_ruas ?? "",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan. Silakan coba lagi.");
    } finally {
      setLoading(false);
      setShowConfirm(false);
    }
  }

  const handleBack = () => router.back();
  const isLoadingAwal = checkingPendaftar || checkingStatus;

  return (
    <main className="w-full min-h-screen flex items-start justify-center px-4 py-10 bg-[#f6f7fb]">
      <div className="w-full max-w-[720px]">
        <div className="mb-5">
          <div className="flex items-center gap-3 mb-1">
            <button
              type="button"
              onClick={handleBack}
              className="text-[#4b4d5a] hover:text-[#1a1d29] transition-colors"
              aria-label="Kembali"
            >
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-[22px] leading-tight font-bold text-[#1a1d29]">
              {hasil
                ? "Alokasi Stan Dikonfirmasi"
                : sudahDaftar
                ? "Pilih Lokasi Stan"
                : "Daftar & Pilih Lokasi Stan"}
            </h1>
          </div>
          <p className="text-[13px] text-[#767884] pl-8">
            {hasil
              ? "Stan Anda telah berhasil dialokasikan. Silakan tunjukkan kode QR ini kepada petugas."
              : sudahDaftar
              ? "Silakan pilih lokasi stan untuk partisipasi Anda di Car Free Day."
              : "Lengkapi data usaha dan pilih lokasi stan Anda untuk berpartisipasi di Car Free Day."}
          </p>
        </div>

        {isLoadingAwal && !hasil && (
          <div className="w-full bg-white rounded-2xl border border-[#e7e8f1] p-8 text-center text-[13px] text-[#767884]">
            Memuat data...
          </div>
        )}

        {hasil && !isLoadingAwal && (
          <div className="flex flex-col gap-4">
            <div className="w-full bg-[#e3f8ee] border border-[#bfeed7] rounded-xl px-4 py-3 flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-[#16a34a] flex items-center justify-center shrink-0 mt-0.5">
                <CheckCircle2 size={15} className="text-white" strokeWidth={2.5} />
              </div>
              <div>
                <p className="text-[13.5px] font-semibold text-[#0f7a44]">Alokasi Berhasil</p>
                <p className="text-[12.5px] text-[#1a7a52]">
                  Detail stan telah disimpan ke dalam sistem.
                </p>
              </div>
            </div>

            <div className="w-full bg-[#fef9e7] border border-[#fce8b2] rounded-xl px-4 py-3 flex items-start gap-3">
              <Clock className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-[13.5px] font-semibold text-[#b45309]">
                  Menunggu Verifikasi Petugas
                </p>
                <p className="text-[12.5px] text-[#92400e]">
                  Tunjukkan QR code ini ke petugas untuk melakukan check-in. Halaman akan
                  otomatis berpindah setelah check-in berhasil.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-4">
                <div className="w-full bg-white rounded-2xl border border-[#e7e8f1] shadow-[0_2px_8px_-2px_rgba(23,29,64,0.06)] overflow-hidden">
                  <div className="h-1 w-full bg-[#00288e]" />
                  <div className="px-5 py-5 text-center">
                    <p className="text-[10.5px] font-semibold text-[#00288e] tracking-wide uppercase mb-1">
                      Nomor Stan
                    </p>
                    <p className="text-[32px] font-bold text-[#00288e] leading-none mb-4">
                      {hasil.nomorStand}
                    </p>
                    <div className="w-full h-px bg-[#ececf3] mb-4" />
                    <div className="flex flex-col gap-2 text-left">
                      <div className="flex items-center justify-between">
                        <span className="text-[12px] text-[#a3743f]">Kecamatan</span>
                        <span className="text-[13px] font-semibold text-[#1a1d29]">
                          {hasil.kecamatan}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[12px] text-[#a3743f]">Nama Jalan</span>
                        <span className="text-[13px] font-semibold text-[#1a1d29]">
                          {hasil.namaJalan}
                        </span>
                      </div>
                      {/* Baris Ruas cuma muncul kalau lapaknya memang punya ruas. */}
                      {hasil.namaRuas && (
                        <div className="flex items-center justify-between">
                          <span className="text-[12px] text-[#a3743f]">Ruas</span>
                          <span className="text-[13px] font-semibold text-[#1a1d29]">
                            {hasil.namaRuas}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="w-full bg-white rounded-2xl border border-[#e7e8f1] shadow-[0_2px_8px_-2px_rgba(23,29,64,0.06)] p-5 text-center">
                  <h3 className="text-[14px] font-semibold text-[#1a1d29] mb-3">
                    Verifikasi Pedagang
                  </h3>
                  <div className="w-full aspect-square max-w-[180px] mx-auto rounded-xl overflow-hidden border border-[#e7e8f1] bg-[#f3f4f8] flex items-center justify-center mb-3">
                    {pedagangId ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={qrCodeUrl(pedagangId)}
                        alt="Kode QR verifikasi pedagang"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <QrCode size={56} className="text-[#a3a5b3]" />
                    )}
                  </div>
                  <p className="text-[12px] text-[#767884]">
                    <span className="font-medium text-[#1a1d29]">Pindai</span> untuk
                    memverifikasi identitas pedagang dan alokasi stan.
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <div className="w-full bg-white rounded-2xl border border-[#e7e8f1] shadow-[0_2px_8px_-2px_rgba(23,29,64,0.06)] p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <User size={17} className="text-[#00288e]" />
                    <h3 className="text-[14px] font-semibold text-[#1a1d29]">Data Pedagang</h3>
                  </div>
                  <div className="flex flex-col gap-3">
                    <ReadOnlyField label="NIK" value={nik} />
                    <ReadOnlyField label="Nama Lengkap" value={fullName} />
                    <ReadOnlyField label="Tanggal Lahir" value={formatTanggalLahir(dob)} />
                  </div>
                </div>

                <div className="w-full bg-white rounded-2xl border border-[#e7e8f1] shadow-[0_2px_8px_-2px_rgba(23,29,64,0.06)] p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Store size={17} className="text-[#00288e]" />
                    <h3 className="text-[14px] font-semibold text-[#1a1d29]">Data Usaha</h3>
                  </div>
                  <div className="flex flex-col gap-3">
                    <ReadOnlyField label="Nama Usaha" value={businessName} />
                    <ReadOnlyField
                      label="Kategori Usaha"
                      value={KATEGORI_LABEL[category] ?? category}
                    />
                    <ReadOnlyField
                      label="Pilihan Lapak"
                      value={LAPAK_LABEL[stallType] ?? stallType}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {!hasil && !isLoadingAwal && !sesiKlaimDibuka && (
          <div className="w-full bg-white rounded-2xl border border-[#e7e8f1] shadow-[0_2px_8px_-2px_rgba(23,29,64,0.06)] p-8 flex flex-col items-center text-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-[#fdecec] flex items-center justify-center">
              <AlertTriangle size={28} className="text-[#ba1a1a]" />
            </div>
            <h3 className="text-[16px] font-bold text-[#1a1d29]">Sesi Klaim Belum Dibuka</h3>
            <p className="text-[13px] text-[#767884] max-w-[360px]">
              {pesanSesiKlaim ?? "Sesi klaim lapak hari ini belum dibuka oleh petugas."}
            </p>
            <button
              type="button"
              onClick={handleBack}
              className="mt-2 h-9 px-6 bg-[#00288e] text-white text-[12.5px] font-medium rounded-lg hover:bg-[#173bab] active:scale-[0.98] transition-all"
            >
              Kembali
            </button>
          </div>
        )}

        {!hasil && !isLoadingAwal && sesiKlaimDibuka && (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* --- Data Usaha: editable kalau belum daftar, read-only kalau sudah --- */}
            <section className="w-full bg-white rounded-2xl border border-[#e7e8f1] shadow-[0_2px_8px_-2px_rgba(23,29,64,0.06)] p-5">
              <div className="flex items-center gap-2 mb-1">
                <User size={18} className="text-[#00288e]" />
                <h2 className="text-[15px] font-semibold text-[#1a1d29]">
                  {sudahDaftar ? "Data Pendaftar" : "Data Usaha"}
                </h2>
              </div>

              {sudahDaftar ? (
                <p className="text-[12.5px] text-[#767884] mb-4">
                  Data ini diambil dari pendaftaran Anda sebelumnya dan tidak dapat diubah
                  di halaman ini.
                </p>
              ) : (
                <p className="text-[12.5px] text-[#767884] mb-4">
                  Data ini hanya perlu diisi sekali. Setelah dikirim, NIK dan data usaha
                  tidak dapat diubah sembarangan.
                </p>
              )}

              {sudahDaftar ? (
                <div className="flex flex-col gap-3">
                  <ReadOnlyField label="NIK" value={nik} />
                  <ReadOnlyField label="Tanggal Lahir" value={formatTanggalLahir(dob)} />
                  <ReadOnlyField label="Nama Lengkap" value={fullName} />
                  <ReadOnlyField label="Nama Usaha (UMKM)" value={businessName} />
                  <ReadOnlyField label="Kategori" value={KATEGORI_LABEL[category] ?? category} />
                  <ReadOnlyField
                    label="Jenis Lapak"
                    value={LAPAK_LABEL[stallType] ?? stallType}
                  />
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <div className="w-full flex flex-col gap-1.5">
                    <label htmlFor="nik" className="text-[13px] font-medium text-[#4b4d5a]">
                      NIK (Nomor Induk Kependudukan)
                    </label>
                    <div className="relative">
                      <CreditCard
                        size={15}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8fa3d6]"
                      />
                      <input
                        id="nik"
                        type="text"
                        inputMode="numeric"
                        maxLength={16}
                        placeholder="Masukkan 16 digit NIK"
                        value={nik}
                        onChange={(e) => setNik(e.target.value.replace(/\D/g, ""))}
                        className="w-full box-border h-10 pl-9 pr-3 bg-[#eff4ff] rounded-lg text-[13px] text-[#1a1d29] placeholder:text-[#8fa3d6] shadow-[inset_0_1px_2px_rgba(23,29,64,0.05)] border border-[#c9d6f5] focus:outline-none focus:bg-white focus:border-[#00288e] focus:ring-2 focus:ring-[#00288e]/15 transition-all"
                      />
                    </div>
                  </div>

                  <div className="w-full flex flex-col gap-1.5">
                    <label htmlFor="dob" className="text-[13px] font-medium text-[#4b4d5a]">
                      Tanggal Lahir
                    </label>
                    <input
                      id="dob"
                      type="date"
                      value={dob}
                      onChange={(e) => setDob(e.target.value)}
                      className="w-full box-border h-10 px-3 bg-[#eff4ff] rounded-lg text-[13px] text-[#1a1d29] shadow-[inset_0_1px_2px_rgba(23,29,64,0.05)] border border-[#c9d6f5] focus:outline-none focus:bg-white focus:border-[#00288e] focus:ring-2 focus:ring-[#00288e]/15 transition-all"
                    />
                  </div>

                  <div className="w-full flex flex-col gap-1.5">
                    <label htmlFor="fullName" className="text-[13px] font-medium text-[#4b4d5a]">
                      Nama Lengkap
                    </label>
                    <input
                      id="fullName"
                      type="text"
                      placeholder="Sesuai KTP"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full box-border h-10 px-3 bg-[#eff4ff] rounded-lg text-[13px] text-[#1a1d29] placeholder:text-[#8fa3d6] shadow-[inset_0_1px_2px_rgba(23,29,64,0.05)] border border-[#c9d6f5] focus:outline-none focus:bg-white focus:border-[#00288e] focus:ring-2 focus:ring-[#00288e]/15 transition-all"
                    />
                  </div>

                  <div className="w-full flex flex-col gap-1.5">
                    <label
                      htmlFor="businessName"
                      className="text-[13px] font-medium text-[#4b4d5a]"
                    >
                      Nama Usaha
                    </label>
                    <div className="relative">
                      <Tag
                        size={15}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8fa3d6]"
                      />
                      <input
                        id="businessName"
                        type="text"
                        placeholder="Contoh: Kedai Kopi Senja"
                        value={businessName}
                        onChange={(e) => setBusinessName(e.target.value)}
                        className="w-full box-border h-10 pl-9 pr-3 bg-[#eff4ff] rounded-lg text-[13px] text-[#1a1d29] placeholder:text-[#8fa3d6] shadow-[inset_0_1px_2px_rgba(23,29,64,0.05)] border border-[#c9d6f5] focus:outline-none focus:bg-white focus:border-[#00288e] focus:ring-2 focus:ring-[#00288e]/15 transition-all"
                      />
                    </div>
                  </div>

                  <div className="w-full flex flex-col gap-1.5">
                    <label htmlFor="category" className="text-[13px] font-medium text-[#4b4d5a]">
                      Kategori Dagangan
                    </label>
                    <select
                      id="category"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full box-border h-10 px-3 bg-[#eff4ff] rounded-lg text-[13px] text-[#1a1d29] shadow-[inset_0_1px_2px_rgba(23,29,64,0.05)] border border-[#c9d6f5] focus:outline-none focus:bg-white focus:border-[#00288e] focus:ring-2 focus:ring-[#00288e]/15 transition-all appearance-none bg-no-repeat"
                      style={{
                        backgroundImage:
                          "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'><path d='M2 4l4 4 4-4' stroke='%235b5d6b' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round'/></svg>\")",
                        backgroundPosition: "right 0.75rem center",
                      }}
                    >
                      <option value="" disabled>
                        Pilih Kategori
                      </option>
                      <option value="makanan_minuman">Makanan dan Minuman</option>
                      <option value="bukan_makanan_minuman">Bukan Makanan dan Minuman</option>
                    </select>
                  </div>

                  <div className="w-full flex flex-col gap-1.5">
                    <label className="text-[13px] font-medium text-[#4b4d5a]">
                      Pilihan Lapak
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <div
                        onClick={() => setStallType("rombong")}
                        role="button"
                        className={`flex flex-col items-center gap-1 py-2.5 px-2 rounded-xl border cursor-pointer transition-all ${
                          stallType === "rombong"
                            ? "border-[#00288e] bg-[#eef2fd] shadow-[0_0_0_1px_#00288e]"
                            : "border-[#e2e5f1] bg-white hover:border-[#b9c2e8] hover:bg-[#f8f9ff]"
                        }`}
                      >
                        <ShoppingCart size={18} className="text-[#00288e]" />
                        <span className="text-[13px] font-medium text-[#1a1d29]">Rombong</span>
                      </div>
                      <div
                        onClick={() => setStallType("meja")}
                        role="button"
                        className={`flex flex-col items-center gap-1 py-2.5 px-2 rounded-xl border cursor-pointer transition-all ${
                          stallType === "meja"
                            ? "border-[#00288e] bg-[#eef2fd] shadow-[0_0_0_1px_#00288e]"
                            : "border-[#e2e5f1] bg-white hover:border-[#b9c2e8] hover:bg-[#f8f9ff]"
                        }`}
                      >
                        <Table2 size={18} className="text-[#00288e]" />
                        <span className="text-[13px] font-medium text-[#1a1d29]">Meja</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </section>

            {/* --- Lokasi Penempatan: otomatis dari pool petugas, gak ada pilihan lagi --- */}
            <section className="w-full bg-white rounded-2xl border border-[#e7e8f1] shadow-[0_2px_8px_-2px_rgba(23,29,64,0.06)] p-5">
              <div className="flex items-center gap-2 mb-2">
                <MapPin size={18} className="text-[#00288e]" />
                <h2 className="text-[15px] font-semibold text-[#1a1d29]">Lokasi Penempatan</h2>
              </div>
              <p className="text-[12.5px] text-[#767884] leading-relaxed">
                Lokasi & nomor stan kamu diambil otomatis dari daftar lokasi yang sudah disiapkan
                petugas. Klik tombol di bawah buat langsung dapat nomor stan.
              </p>
            </section>

            {error && (
              <p className="w-full text-[12.5px] text-[#ba1a1a]" role="alert">
                {error}
              </p>
            )}

            <div className="w-full flex gap-3">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 sm:flex-none sm:w-auto sm:min-w-[220px] h-11 px-5 bg-[#00288e] text-white text-[13px] font-medium rounded-lg shadow-[0_4px_10px_-3px_rgba(0,40,142,0.4)] hover:bg-[#173bab] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:active:scale-100"
              >
                {loading ? (
                  <span className="w-3.5 h-3.5 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                ) : (
                  <Save size={15} />
                )}
                {loading
                  ? "Menyimpan..."
                  : sudahDaftar
                  ? "Simpan Pilihan Stan"
                  : "Daftar & Pilih Lokasi Stan"}
              </button>
              <button
                type="button"
                onClick={() => router.back()}
                className="flex-1 sm:flex-none sm:w-auto h-11 px-5 bg-white text-[#4b4d5a] border border-[#e2e5f1] text-[13px] font-medium rounded-lg hover:bg-[#f5f7fe] active:scale-[0.98] transition-all"
              >
                Batal
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Dialog konfirmasi -- cuma muncul kalau ini pendaftaran pertama
          kali (data usaha ikut dikirim, bukan cuma lokasi). */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm">
          <div className="w-full max-w-[420px] rounded-2xl bg-white shadow-xl overflow-hidden">
            <div className="px-5 pt-5 pb-3 text-center border-b border-[#ececf3]">
              <h3 className="text-[16px] font-bold text-[#1a1d29]">
                Periksa Kembali Data Kamu
              </h3>
              <p className="text-[12px] text-[#767884] mt-1">
                Pastikan semua data di bawah ini sudah benar sebelum dikirim. Data yang
                sudah dikirim tidak bisa diubah sembarangan.
              </p>
            </div>

            <div className="px-5 py-4 flex flex-col gap-2.5">
              <ConfirmRow label="NIK" value={nik} />
              <ConfirmRow label="Tanggal Lahir" value={formatTanggalLahir(dob)} />
              <ConfirmRow label="Nama Lengkap" value={fullName} />
              <ConfirmRow label="Nama Usaha" value={businessName} />
              <ConfirmRow label="Kategori Dagangan" value={KATEGORI_LABEL[category] ?? category} />
              <ConfirmRow label="Pilihan Lapak" value={LAPAK_LABEL[stallType] ?? stallType} />

              {error && (
                <p
                  className="w-full flex items-center gap-1.5 text-[11.5px] text-[#ba1a1a]"
                  role="alert"
                >
                  <AlertTriangle size={13} />
                  {error}
                </p>
              )}
            </div>

            <div className="px-5 pb-5 flex gap-2">
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                disabled={loading}
                className="flex-1 h-9 bg-white text-[#4b4d5a] border border-[#e7e8f1] text-[12.5px] font-medium rounded-lg hover:bg-[#f5f7fe] active:scale-[0.98] transition-all disabled:opacity-50"
              >
                Periksa Lagi
              </button>
              <button
                type="button"
                onClick={() => void processPendaftaranLaluKlaim()}
                disabled={loading}
                className="flex-1 h-9 bg-[#00288e] text-white text-[12.5px] font-medium rounded-lg shadow-[0_4px_10px_-3px_rgba(0,40,142,0.4)] hover:bg-[#173bab] active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:active:scale-100"
              >
                {loading && (
                  <span className="w-3.5 h-3.5 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                )}
                {loading ? "Mengirim..." : "Ya, Kirim"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="w-full flex flex-col gap-1.5">
      <label className="text-[12px] font-medium text-[#4b4d5a] uppercase tracking-wide">
        {label}
      </label>
      <div className="w-full h-9 px-3 flex items-center bg-[#eff4ff] rounded-lg text-[13px] text-[#1a1d29] border border-[#e2e5f1]">
        {value || "-"}
      </div>
    </div>
  );
}

function ConfirmRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 text-[13px]">
      <span className="text-[#767884]">{label}</span>
      <span className="font-medium text-[#1a1d29] text-right">{value || "-"}</span>
    </div>
  );
}