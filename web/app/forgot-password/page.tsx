"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // TODO: ganti dengan endpoint API kirim instruksi reset password
      // const res = await fetch("/api/auth/forgot-password", {
      //   method: "POST",
      //   headers: { "Content-Type": "application/json" },
      //   body: JSON.stringify({ email }),
      // });
      // console.log({ email });

      // Setelah instruksi terkirim, arahkan ke halaman verifikasi OTP
      // sambil membawa email lewat query param
      router.push(`/forgot-password/verify?email=${encodeURIComponent(email)}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-b from-[#EAF0FB] via-[#F3F0FA] to-[#EEF1FA] px-4 py-12">
      <div className="w-full max-w-sm">
        {/* Card */}
        <div className="bg-white rounded-2xl shadow-[0_10px_40px_-12px_rgba(11,27,58,0.15)] p-7 sm:p-8">
          {/* Icon */}
          <div className="flex justify-center mb-5">
            <div className="w-14 h-14 rounded-2xl bg-[#EFF3FE] flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="none" width="26" height="26">
                <rect
                  x="6"
                  y="11"
                  width="12"
                  height="9"
                  rx="2"
                  stroke="#2563EB"
                  strokeWidth="1.7"
                />
                <path
                  d="M9 11V8C9 6.5 10 5 12 5"
                  stroke="#2563EB"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                />
                <path
                  d="M9 5.5C9.8 4.6 10.9 4 12 4C14.2 4 16 5.8 16 8"
                  stroke="#2563EB"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeDasharray="1 3"
                />
                <circle cx="12" cy="15" r="1.4" fill="#2563EB" />
              </svg>
            </div>
          </div>

          {/* Heading */}
          <h1 className="text-2xl font-bold text-[#0B1B3A] text-center">
            Lupa Kata Sandi?
          </h1>
          <p className="text-sm text-slate-500 text-center mt-2 mb-7 leading-relaxed">
            Masukkan email yang terdaftar untuk menerima instruksi
            pemulihan kata sandi.
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-[#0B1B3A] mb-1.5"
              >
                Alamat Email
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                  <svg viewBox="0 0 24 24" fill="none" width="18" height="18">
                    <rect
                      x="3"
                      y="5"
                      width="18"
                      height="14"
                      rx="2"
                      stroke="currentColor"
                      strokeWidth="1.6"
                    />
                    <path
                      d="M3.5 6.5L12 13L20.5 6.5"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@email.com"
                  className="w-full rounded-lg border border-slate-200 bg-[#F8FAFC] pl-10 pr-3.5 py-2.5 text-sm text-[#0B1B3A] placeholder:text-slate-400 outline-none transition focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/15"
                />
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-[#0B1B6B] hover:bg-[#0A1657] py-3 text-sm font-semibold text-white transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                "Mengirim..."
              ) : (
                <>
                  Kirim Instruksi
                  <svg viewBox="0 0 24 24" fill="none" width="16" height="16">
                    <path
                      d="M5 12H19M19 12L13 6M19 12L13 18"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Link kembali */}
        <p className="text-center text-sm mt-6">
          <a
            href="/login"
            className="inline-flex items-center gap-1.5 font-medium text-[#2563EB] hover:text-[#1D4ED8]"
          >
            <svg viewBox="0 0 24 24" fill="none" width="14" height="14">
              <path
                d="M19 12H5M5 12L11 6M5 12L11 18"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Kembali ke Halaman Masuk
          </a>
        </p>
      </div>
    </div>
  );
}