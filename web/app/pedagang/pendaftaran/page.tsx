"use client";

import { useState, FormEvent } from "react";
import {
  CreditCard,
  Tag,
  ShoppingCart,
  Table2,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

type StallType = "rombong" | "meja" | "";

export default function PendaftaranPedagangPage() {
  const [nik, setNik] = useState("");
  const [dob, setDob] = useState("");
  const [fullName, setFullName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [category, setCategory] = useState("");
  const [stallType, setStallType] = useState<StallType>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
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

    setLoading(true);

    // Sementara belum ada API pendaftaran yang beneran, jadi langsung
    // anggap berhasil supaya bisa cek tampilan. Nanti tinggal ganti
    // bagian ini dengan fetch ke backend yang sebenarnya.
    setTimeout(() => {
      setSuccess(true);
      setLoading(false);
    }, 500);

    /* 
    // TODO: ganti dengan pemanggilan API yang sebenarnya nanti
    try {
      const res = await fetch("/api/pedagang/daftar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nik, dob, fullName, businessName, category, stallType }),
      });
      if (!res.ok) throw new Error("Gagal menyimpan data. Silakan coba lagi.");
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
    */
  };

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
          </section>
        )}
      </div>
    </main>
  );
}