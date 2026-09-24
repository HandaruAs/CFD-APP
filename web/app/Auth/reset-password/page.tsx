"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!token) {
      setErrorMsg("Sesi reset password tidak valid, ulangi dari awal.");
      return;
    }
    if (password.length < 8) {
      setErrorMsg("Password minimal 8 karakter.");
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg("Konfirmasi password tidak sama.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("http://localhost:8080/api/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reset_token: token, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || "Gagal mereset password");
        return;
      }

      setSuccessMsg("Password berhasil diubah! Mengarahkan ke halaman login...");
      setTimeout(() => {
        router.push("/auth/login");
      }, 1500);
    } catch {
      setErrorMsg("Terjadi kesalahan, coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-b from-[#EAF0FB] via-[#F3F0FA] to-[#EEF1FA] px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-2xl shadow-[0_10px_40px_-12px_rgba(11,27,58,0.15)] p-7 sm:p-8">
          {/* Icon */}
          <div className="flex justify-center mb-5">
            <div className="w-14 h-14 rounded-2xl bg-[#EFF3FE] flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="none" width="26" height="26">
                <rect
                  x="5"
                  y="11"
                  width="14"
                  height="9"
                  rx="2"
                  stroke="#2563EB"
                  strokeWidth="1.7"
                />
                <path
                  d="M8 11V8C8 5.8 9.8 4 12 4C14.2 4 16 5.8 16 8V11"
                  stroke="#2563EB"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                />
                <circle cx="12" cy="15.3" r="1.4" fill="#2563EB" />
              </svg>
            </div>
          </div>

          {/* Heading */}
          <h1 className="text-2xl font-bold text-[#0B1B3A] text-center">
            Buat Password Baru
          </h1>
          <p className="text-sm text-slate-500 text-center mt-2 mb-6 leading-relaxed">
            Password baru minimal 8 karakter. Pastikan mudah kamu ingat.
          </p>

          {/* Notifikasi sukses */}
          {successMsg && (
            <div className="mb-4 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm px-3.5 py-2.5 text-center">
              {successMsg}
            </div>
          )}

          {/* Notifikasi error */}
          {errorMsg && (
            <div className="mb-4 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm px-3.5 py-2.5 text-center">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Password baru */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-[#0B1B3A] mb-1.5"
              >
                Password Baru
              </label>
              <input
                id="password"
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimal 8 karakter"
                className="w-full rounded-lg border border-slate-200 bg-[#F8FAFC] px-3.5 py-2.5 text-sm text-[#0B1B3A] placeholder:text-slate-400 outline-none transition focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/15"
              />
            </div>

            {/* Konfirmasi password */}
            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-[#0B1B3A] mb-1.5"
              >
                Konfirmasi Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Ulangi password baru"
                className="w-full rounded-lg border border-slate-200 bg-[#F8FAFC] px-3.5 py-2.5 text-sm text-[#0B1B3A] placeholder:text-slate-400 outline-none transition focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/15"
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-[#0B1B6B] hover:bg-[#0A1657] py-3 text-sm font-semibold text-white transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? "Menyimpan..." : "Simpan Password Baru"}
            </button>
          </form>
        </div>

        {/* Link kembali */}
        <p className="text-center text-sm mt-6">
          <a
            href="/auth/login"
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