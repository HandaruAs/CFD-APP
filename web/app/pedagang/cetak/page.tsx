"use client";

import { useState, FormEvent } from "react";
import { Printer, ScanLine, Store, MapPin, Clock, ArrowLeft, QrCode } from "lucide-react";

interface HasilCetak {
  nama?: string;
  nomorStand?: string;
  zona?: string;
  waktuCetak?: string;
  fotoUrl?: string;
}

export default function CetakUlangQRPage() {
  const [nik, setNik] = useState("");
  const [dob, setDob] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasil, setHasil] = useState<HasilCetak | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (nik.trim().length !== 16) {
      setError("NIK harus terdiri dari 16 digit.");
      return;
    }
    if (!dob) {
      setError("Silakan pilih tanggal lahir.");
      return;
    }

    // Sementara belum ambil dari API, langsung tampilkan data dummy
    // untuk cek tampilan. Nanti tinggal ganti bagian ini dengan fetch ke backend.
    setLoading(true);
    setTimeout(() => {
      const now = new Date();
      setHasil({
        nama: "Pedagang Contoh",
        nomorStand: "B-24",
        zona: "Zona A",
        waktuCetak: now.toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
        }) + " WIB",
        fotoUrl: "",
      });
      setLoading(false);
    }, 300);
  };

  const handleReset = () => {
    setHasil(null);
    setNik("");
    setDob("");
    setError(null);
  };

  return (
    <main className="w-full min-h-screen flex items-center justify-center px-4 py-10 bg-[#f6f7fb]">
      <div className="w-full max-w-[900px]">
        {/* Header */}
        <div className="w-full text-center mb-5">
          <h1 className="text-[20px] leading-tight font-bold text-[#1a1d29] mb-1.5">
            {hasil ? "Cetak Ulang Berhasil" : "Cetak Ulang Kode QR"}
          </h1>
          <p className="text-[12.5px] leading-5 text-[#767884] px-2 max-w-[460px] mx-auto">
            {hasil
              ? "Kode QR merchant telah diverifikasi dan siap dicetak ulang."
              : "Silakan masukkan NIK dan Tanggal Lahir Anda untuk memverifikasi data dan mencetak ulang kode QR merchant Anda."}
          </p>
        </div>

        {/* Form hanya tampil selama belum ada hasil */}
        {!hasil && (
          <form
            onSubmit={handleSubmit}
            className="w-full max-w-[320px] mx-auto bg-white rounded-2xl shadow-[0_2px_8px_-2px_rgba(23,29,64,0.06),0_12px_28px_-8px_rgba(23,29,64,0.12)] overflow-hidden"
          >
            <div className="px-4 pt-4 pb-2 text-center">
              <h2
                className="font-semibold text-[#1a1d29] leading-tight"
                style={{ fontSize: "18px", margin: 0 }}
              >
                Verifikasi Data
              </h2>
              <div className="w-full h-px bg-[#ececf3] mt-2" />
            </div>

            <div className="px-4 pb-5 pt-2 flex flex-col gap-3">
              <div className="w-full flex flex-col gap-1.5">
                <label
                  htmlFor="nik"
                  className="text-[13px] font-medium text-[#4b4d5a]"
                >
                  NIK (Nomor Induk Kependudukan)
                </label>
                <input
                  id="nik"
                  type="text"
                  inputMode="numeric"
                  maxLength={16}
                  placeholder="Masukkan 16 digit NIK"
                  value={nik}
                  onChange={(e) => setNik(e.target.value.replace(/\D/g, ""))}
                  className="w-full box-border h-10 px-3 bg-[#eff4ff] rounded-lg text-[13px] text-[#1a1d29] placeholder:text-[#8fa3d6] shadow-[inset_0_1px_2px_rgba(23,29,64,0.05)] border border-[#c9d6f5] focus:outline-none focus:bg-white focus:border-[#00288e] focus:ring-2 focus:ring-[#00288e]/15 transition-all"
                />
              </div>

              <div className="w-full flex flex-col gap-1.5">
                <label
                  htmlFor="dob"
                  className="text-[13px] font-medium text-[#4b4d5a]"
                >
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

              {error && (
                <p className="w-full text-[11.5px] text-[#ba1a1a]" role="alert">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full box-border h-9 mt-1 bg-[#00288e] text-white text-[12.5px] font-medium rounded-lg shadow-[0_4px_10px_-3px_rgba(0,40,142,0.4)] hover:bg-[#173bab] active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:active:scale-100"
              >
                <Printer size={13} />
                {loading ? "Memproses..." : "Cetak Data"}
              </button>
            </div>
          </form>
        )}

        {/* Hasil cetak muncul langsung di bawah, menggantikan form */}
        {hasil && (
          <>
            <section className="w-full max-w-[420px] mx-auto bg-[#eef2fd] border border-[#dbe3f9] rounded-2xl px-4 py-4 flex flex-col items-center text-center gap-3">
              <h3 className="text-[12.5px] font-semibold text-[#00288e]">
                Identitas Pedagang Terverifikasi
              </h3>

              <div className="w-40 h-40 rounded-2xl overflow-hidden border border-[#dbe3f9] bg-white flex items-center justify-center">
                {hasil.fotoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={hasil.fotoUrl}
                    alt="Kode QR merchant"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <QrCode size={64} className="text-[#a3a5b3]" />
                )}
              </div>

              <div className="w-full bg-white border border-[#e7e8f1] rounded-xl p-3 text-left">
                <p className="text-[10px] font-semibold text-[#9698a3] tracking-wide uppercase mb-2">
                  Detail Lokasi
                </p>

                <div className="flex items-center gap-3 pb-2.5 mb-2.5 border-b border-[#f0f1f6]">
                  <div className="w-7 h-7 rounded-lg bg-[#e8f5ef] flex items-center justify-center shrink-0">
                    <Store size={13} className="text-[#006c49]" />
                  </div>
                  <div>
                    <p className="text-[10px] text-[#9698a3]">Nomor Stand</p>
                    <p className="text-[12px] font-semibold text-[#1a1d29]">
                      {hasil.nomorStand || "-"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 pb-2.5 mb-2.5 border-b border-[#f0f1f6]">
                  <div className="w-7 h-7 rounded-lg bg-[#e8f5ef] flex items-center justify-center shrink-0">
                    <MapPin size={13} className="text-[#006c49]" />
                  </div>
                  <div>
                    <p className="text-[10px] text-[#9698a3]">Zona</p>
                    <p className="text-[12px] font-semibold text-[#1a1d29]">
                      {hasil.zona || "-"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-[#e8f5ef] flex items-center justify-center shrink-0">
                    <Clock size={13} className="text-[#006c49]" />
                  </div>
                  <div>
                    <p className="text-[10px] text-[#9698a3]">Waktu Cetak</p>
                    <p className="text-[12px] font-semibold text-[#1a1d29]">
                      {hasil.waktuCetak || "-"}
                    </p>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleReset}
                className="w-full h-9 bg-white text-[#00288e] border border-[#e7e8f1] text-[12px] font-medium rounded-lg hover:bg-[#f5f7fe] active:scale-[0.98] transition-all flex items-center justify-center gap-1.5"
              >
                <ScanLine size={13} />
                Selesai &amp; Cetak Lagi
              </button>
            </section>

            <div className="w-full flex justify-center mt-3">
              <button
                type="button"
                onClick={handleReset}
                className="px-4 h-8 bg-[#eef2fd] text-[#4b4d5a] text-[11.5px] font-medium rounded-lg hover:bg-[#dbe3f9] active:scale-95 transition-all flex items-center gap-1.5"
              >
                <ArrowLeft size={12} />
                Kembali ke Beranda
              </button>
            </div>
          </>
        )}

        {/* Tombol reset kalau ada error setelah submit gagal */}
        {!hasil && error && (
          <div className="w-full flex justify-center mt-3.5">
            <button
              type="button"
              onClick={handleReset}
              className="px-4 h-8 text-[#767884] text-[12px] rounded-lg hover:bg-[#eceef7] active:scale-95 transition-all"
            >
              Reset Form
            </button>
          </div>
        )}
      </div>
    </main>
  );
}