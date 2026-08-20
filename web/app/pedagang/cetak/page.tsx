"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";

export default function CetakUlangQRPage() {
  const router = useRouter();
  const [nik, setNik] = useState("");
  const [dob, setDob] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

    setLoading(true);
    try {
      // TODO: sesuaikan endpoint dengan API verifikasi merchant yang sebenarnya
      const res = await fetch("/api/merchant/qr-reprint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nik, dob }),
      });

      if (!res.ok) {
        throw new Error("Data tidak ditemukan. Periksa kembali NIK dan tanggal lahir Anda.");
      }

      // Data hasil verifikasi (nomor stand, QR) idealnya dikembalikan oleh API.
      // Sesuaikan field di bawah ini dengan response API yang sebenarnya.
      const data = await res.json().catch(() => ({}));

      const query = new URLSearchParams({
        nik,
        ...(data.qrUrl ? { qrUrl: data.qrUrl } : {}),
        ...(data.nomorStand ? { nomorStand: data.nomorStand } : {}),
        ...(data.zona ? { zona: data.zona } : {}),
      });

      router.push(`/pedagang/cetak/hasil_cetak?${query.toString()}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="w-full min-h-screen flex flex-col items-center px-4 py-10 md:py-14">
      <div className="w-full max-w-[384px] mx-auto">
        {/* Header */}
        <div className="w-full text-center mb-7">
          <h2 className="text-[20px] leading-tight font-semibold text-[#0b1c30] mb-1.5">
            Cetak Ulang Kode QR
          </h2>
          <p className="text-[13px] leading-5 text-[#767784] px-2">
            Masukkan NIK dan tanggal lahir untuk verifikasi.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-3.5">
          <div className="w-full flex flex-col gap-1.5">
            <label
              htmlFor="nik"
              className="text-[11px] font-medium text-[#767784] tracking-wide"
            >
              NIK
            </label>
            <input
              id="nik"
              type="text"
              inputMode="numeric"
              maxLength={16}
              placeholder="16 digit NIK"
              value={nik}
              onChange={(e) => setNik(e.target.value.replace(/\D/g, ""))}
              className="w-full box-border h-10 px-3.5 border border-[#e2e4ee] rounded-md text-sm text-[#0b1c30] placeholder:text-[#a8aab8] focus:outline-none focus:border-[#00288e] focus:ring-1 focus:ring-[#00288e] transition-colors bg-white"
            />
          </div>

          <div className="w-full flex flex-col gap-1.5">
            <label
              htmlFor="dob"
              className="text-[11px] font-medium text-[#767784] tracking-wide"
            >
              Tanggal lahir
            </label>
            <input
              id="dob"
              type="date"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              className="w-full box-border h-10 px-3.5 border border-[#e2e4ee] rounded-md text-sm text-[#0b1c30] focus:outline-none focus:border-[#00288e] focus:ring-1 focus:ring-[#00288e] transition-colors bg-white"
            />
          </div>

          {error && (
            <p className="w-full text-[12px] text-[#ba1a1a]" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full box-border h-10 mt-1 bg-[#00288e] text-white text-sm font-medium rounded-md hover:bg-[#173bab] active:scale-[0.98] transition-all flex items-center justify-center disabled:opacity-50 disabled:active:scale-100"
          >
            {loading ? "Memproses..." : "Cetak Data"}
          </button>
        </form>
      </div>
    </main>
  );
}