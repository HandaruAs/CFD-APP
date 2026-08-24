"use client";

import { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  CreditCard,
  Tag,
  ShoppingCart,
  Table2,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

type StallType = "rombong" | "meja" | "";

const REDIRECT_DELAY_SECONDS = 3;

const KATEGORI_LABEL: Record<string, string> = {
  makanan_minuman: "Makanan dan Minuman",
  bukan_makanan_minuman: "Bukan Makanan dan Minuman",
};

const LAPAK_LABEL: Record<string, string> = {
  rombong: "Rombong",
  meja: "Meja",
};

export default function PendaftaranPedagangPage() {
  const router = useRouter();
  const [redirectIn, setRedirectIn] = useState(REDIRECT_DELAY_SECONDS);

  // Cek dulu apakah user ini sudah pernah mengajukan usaha, sebelum
  // nampilin form -- daripada baru ketauan gagal pas submit.
  const [checkingExisting, setCheckingExisting] = useState(true);
  const [alreadyRegistered, setAlreadyRegistered] = useState(false);

  // Dialog konfirmasi "periksa kembali data" sebelum submit beneran.
  const [showConfirm, setShowConfirm] = useState(false);

  const [nik, setNik] = useState("");
  const [dob, setDob] = useState("");
  const [fullName, setFullName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [category, setCategory] = useState("");
  const [stallType, setStallType] = useState<StallType>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function checkExisting() {
      try {
        const token = localStorage.getItem("cfd_token");
        const baseUrl = process.env.NEXT_PUBLIC_API_URL;
        if (!token || !baseUrl) {
          setCheckingExisting(false);
          return;
        }

        const res = await fetch(`${baseUrl}/api/pedagang/pengajuan`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setAlreadyRegistered(Boolean(data.has_pengajuan));
        }
      } catch {
        // kalau gagal cek, biarin form tetap muncul -- backend tetap
        // nolak lewat 409 kalau ternyata sudah pernah daftar
      } finally {
        setCheckingExisting(false);
      }
    }
    checkExisting();
  }, []);

  useEffect(() => {
    if (!success) return;

    if (redirectIn <= 0) {
      router.push("/pedagang");
      return;
    }

    const timer = setTimeout(() => setRedirectIn((prev) => prev - 1), 1000);
    return () => clearTimeout(timer);
  }, [success, redirectIn, router]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (nik.trim().length !== 16) {
      setError("NIK harus terdiri dari 16 digit.");
      return;
    }
    if (!dob || !fullName || !businessName || !category || !stallType) {
      setError("Mohon lengkapi semua data terlebih dahulu.");
      return;
    }

    // Jangan langsung submit -- tampilin dialog konfirmasi dulu biar
    // user sempat ngecek ulang datanya.
    setShowConfirm(true);
  };

  const handleConfirmSubmit = async () => {
    setError(null);
    setLoading(true);
    try {
      const token = localStorage.getItem("cfd_token");
      if (!token) throw new Error("Anda belum login. Silakan login terlebih dahulu.");

      const baseUrl = process.env.NEXT_PUBLIC_API_URL;
      if (!baseUrl) throw new Error("NEXT_PUBLIC_API_URL belum diset di .env.local!");

      const res = await fetch(`${baseUrl}/api/pedagang/pengajuan`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          nik,
          nama_lengkap: fullName,
          tanggal_lahir: dob,
          nama_usaha: businessName,
          jenis_dagangan: category,
          jenis_lapak: stallType,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (res.status === 409) {
          // Backend bedain 2 pesan: NIK sudah terdaftar, atau user ini
          // sudah pernah mengajukan usaha sebelumnya.
          throw new Error(data.error || "Data sudah terdaftar sebelumnya.");
        }
        if (res.status === 401) {
          throw new Error("Sesi kamu sudah habis. Silakan login ulang.");
        }
        throw new Error(data.error || `Gagal menyimpan data (Status: ${res.status})`);
      }

      setSuccess(true);
      setShowConfirm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan. Silakan coba lagi.");
      setShowConfirm(false);
    } finally {
      setLoading(false);
    }
  };

  if (checkingExisting) {
    return (
      <main className="w-full min-h-screen flex items-center justify-center px-4 py-10 bg-[#f6f7fb]">
        <p className="text-[13px] text-[#767884]">Memeriksa status pendaftaran...</p>
      </main>
    );
  }

  if (alreadyRegistered) {
    return (
      <main className="w-full min-h-screen flex items-center justify-center px-4 py-10 bg-[#f6f7fb]">
        <div className="w-full max-w-[420px]">
          <section className="w-full bg-white rounded-2xl shadow-[0_2px_8px_-2px_rgba(23,29,64,0.06),0_12px_28px_-8px_rgba(23,29,64,0.12)] px-5 py-10 flex flex-col items-center text-center gap-3">
            <div className="w-16 h-16 rounded-2xl bg-[#eef2fd] flex items-center justify-center">
              <CheckCircle2 size={32} className="text-[#00288e]" />
            </div>
            <h3 className="text-[17px] font-bold text-[#00288e]">
              Kamu Sudah Terdaftar
            </h3>
            <p className="text-[13px] text-[#767884]">
              Kamu sudah pernah mengajukan usaha sebelumnya. Satu akun hanya
              bisa mengajukan usaha satu kali.
            </p>
            <button
              type="button"
              onClick={() => router.push("/pedagang")}
              className="mt-2 h-9 px-6 bg-[#00288e] text-white text-[12.5px] font-medium rounded-lg hover:bg-[#173bab] active:scale-[0.98] transition-all"
            >
              Ke Dashboard
            </button>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="w-full min-h-screen flex items-center justify-center px-4 py-10 bg-[#f6f7fb]">
      <div className="w-full max-w-[420px]">
        {/* Header */}
        {!success && (
          <div className="w-full text-center mb-5">
            <h1 className="text-[20px] leading-tight font-bold text-[#1a1d29] mb-1.5">
              Pendaftaran Pedagang Baru
            </h1>
            <p className="text-[12.5px] leading-5 text-[#767884] px-2 max-w-[380px] mx-auto">
              Lengkapi data berikut untuk mendaftar sebagai pedagang di CFD.
            </p>
          </div>
        )}

        {/* Form */}
        {!success && (
          <form
            onSubmit={handleSubmit}
            className="w-full bg-white rounded-2xl shadow-[0_2px_8px_-2px_rgba(23,29,64,0.06),0_12px_28px_-8px_rgba(23,29,64,0.12)] overflow-hidden"
          >
            <div className="px-4 pt-4 pb-2 text-center">
              <h2
                className="font-semibold text-[#1a1d29] leading-tight"
                style={{ fontSize: "18px", margin: 0 }}
              >
                Data Pedagang
              </h2>
              <div className="w-full h-px bg-[#ececf3] mt-2" />
            </div>

            <div className="px-4 pb-5 pt-2 flex flex-col gap-3">
              {/* NIK */}
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

              {/* Tanggal Lahir */}
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

              {/* Nama Lengkap */}
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

              {/* Nama Usaha */}
              <div className="w-full flex flex-col gap-1.5">
                <label htmlFor="businessName" className="text-[13px] font-medium text-[#4b4d5a]">
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

              {/* Kategori Dagangan */}
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
                  <option value="bukan_makanan_minuman">
                    Bukan Makanan dan Minuman
                  </option>
                </select>
              </div>

              {/* Pilihan Lapak */}
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
                    <span className="text-[13px] font-medium text-[#1a1d29]">
                      Rombong
                    </span>
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
                    <span className="text-[13px] font-medium text-[#1a1d29]">
                      Meja
                    </span>
                  </div>
                </div>
              </div>

              {error && (
                <p className="w-full flex items-center gap-1.5 text-[11.5px] text-[#ba1a1a]" role="alert">
                  <AlertTriangle size={13} />
                  {error}
                </p>
              )}

              <div className="w-full flex gap-2 pt-3 mt-1 border-t border-[#ececf3]">
                <button
                  type="button"
                  className="flex-1 h-9 bg-white text-[#4b4d5a] border border-[#e7e8f1] text-[12.5px] font-medium rounded-lg hover:bg-[#f5f7fe] active:scale-[0.98] transition-all"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 h-9 bg-[#00288e] text-white text-[12.5px] font-medium rounded-lg shadow-[0_4px_10px_-3px_rgba(0,40,142,0.4)] hover:bg-[#173bab] active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:active:scale-100"
                >
                  {loading && (
                    <span className="w-3.5 h-3.5 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                  )}
                  {loading ? "Menyimpan..." : "Simpan"}
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Tampilan sukses */}
        {success && (
          <section className="w-full bg-white rounded-2xl shadow-[0_2px_8px_-2px_rgba(23,29,64,0.06),0_12px_28px_-8px_rgba(23,29,64,0.12)] px-5 py-10 flex flex-col items-center text-center gap-3">
            <div className="w-16 h-16 rounded-2xl bg-[#d3f5e4] flex items-center justify-center">
              <CheckCircle2 size={32} className="text-[#16a34a]" />
            </div>
            <h3 className="text-[17px] font-bold text-[#00288e]">Berhasil</h3>
            <p className="text-[13px] text-[#767884]">
              Selamat Pendaftaran Anda Berhasil.
            </p>
            <p className="text-[12px] text-[#8fa3d6]">
              Mengarahkan ke dashboard dalam {redirectIn} detik...
            </p>
          </section>
        )}
      </div>

      {/* Dialog konfirmasi -- periksa ulang data sebelum benar-benar dikirim */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm">
          <div className="w-full max-w-[420px] rounded-2xl bg-white shadow-xl overflow-hidden">
            <div className="px-5 pt-5 pb-3 text-center border-b border-[#ececf3]">
              <h3 className="text-[16px] font-bold text-[#1a1d29]">
                Periksa Kembali Data Kamu
              </h3>
              <p className="text-[12px] text-[#767884] mt-1">
                Pastikan semua data di bawah ini sudah benar sebelum dikirim.
                Data yang sudah diverifikasi tidak bisa diubah sembarangan.
              </p>
            </div>

            <div className="px-5 py-4 flex flex-col gap-2.5">
              <ConfirmRow label="NIK" value={nik} />
              <ConfirmRow
                label="Tanggal Lahir"
                value={
                  dob
                    ? new Date(dob).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })
                    : "-"
                }
              />
              <ConfirmRow label="Nama Lengkap" value={fullName} />
              <ConfirmRow label="Nama Usaha" value={businessName} />
              <ConfirmRow
                label="Kategori Dagangan"
                value={KATEGORI_LABEL[category] ?? category}
              />
              <ConfirmRow
                label="Pilihan Lapak"
                value={LAPAK_LABEL[stallType] ?? stallType}
              />

              {error && (
                <p className="w-full flex items-center gap-1.5 text-[11.5px] text-[#ba1a1a]" role="alert">
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
                onClick={handleConfirmSubmit}
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

function ConfirmRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 text-[13px]">
      <span className="text-[#767884]">{label}</span>
      <span className="font-medium text-[#1a1d29] text-right">{value || "-"}</span>
    </div>
  );
}