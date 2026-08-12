"use client";

import { useState } from "react";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Login gagal, coba lagi.");
        setLoading(false);
        return;
      }

      localStorage.setItem("cfd_token", data.token);
      document.cookie = `cfd_token=${data.token}; path=/; max-age=86400`;
      localStorage.setItem("cfd_user", JSON.stringify(data.user));
      if (remember) {
        localStorage.setItem("cfd_remember", "1");
      }

      const role = data.user?.role;

      // Pakai window.location (hard navigation) di sini, BUKAN router.push.
      // Next.js App Router nyimpen halaman yang pernah dikunjungi di
      // client-side router cache berdasarkan URL doang -- dia gak tau kalau
      // localStorage baru saja berubah. Kalau kita router.push() ke URL yang
      // sebelumnya pernah dibuka pas belum login, Next bisa nyuguhin versi
      // cache lama itu lagi (Sidebar gak remount, token baru "kelewat").
      // Hard navigation jamin komponennya mount dari nol dengan token yang
      // udah bener.
      if (role === "pedagang") {
        try {
          const pengajuanRes = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/api/pedagang/pengajuan`,
            { headers: { Authorization: `Bearer ${data.token}` } }
          );
          const pengajuanData = await pengajuanRes.json();

          if (pengajuanRes.ok && pengajuanData.has_pengajuan === false) {
            window.location.href = "/pedagang/pendaftaran";
          } else {
            window.location.href = "/pedagang/status-verifikasi";
          }
        } catch {
          window.location.href = "/pedagang/status-verifikasi";
        }
        return;
      }

      const dashboardByRole: Record<string, string> = {
        petugas: "/petugas",
        superadmin: "/admin",
      };
      window.location.href = dashboardByRole[role] ?? "/pedagang/status-verifikasi";
    } catch {
      setError("Tidak bisa terhubung ke server. Periksa koneksi kamu.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-b from-[#EAF0FB] via-[#F3F0FA] to-[#EEF1FA] px-4 py-12">
      <div className="w-full max-w-sm">
        {/* Heading */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-[#0B1B3A]">
            Masuk ke Akun Anda
          </h1>
          <p className="text-sm text-slate-500 mt-2 leading-relaxed">
            Silakan masukkan kredensial Anda untuk mengakses CFD Hub.
          </p>
        </div>

        {/* Card */}
        <div className="relative bg-white rounded-2xl shadow-[0_10px_40px_-12px_rgba(11,27,58,0.15)] overflow-hidden">
          <div className="h-1.5 w-full bg-gradient-to-r from-[#2563EB] via-[#3B82F6] to-[#22C55E]" />

          <form onSubmit={handleSubmit} className="p-7 space-y-5">
            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-3.5 py-2.5 text-sm text-red-600">
                {error}
              </div>
            )}

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-[#0B1B3A] mb-1.5"
              >
                Email atau Username
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                  <svg viewBox="0 0 24 24" fill="none" className="w-4.5 h-4.5" width="18" height="18">
                    <path
                      d="M12 12C14.2091 12 16 10.2091 16 8C16 5.79086 14.2091 4 12 4C9.79086 4 8 5.79086 8 8C8 10.2091 9.79086 12 12 12Z"
                      stroke="currentColor"
                      strokeWidth="1.6"
                    />
                    <path
                      d="M5 20C5 16.6863 8.13401 14 12 14C15.866 14 19 16.6863 19 20"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>
                <input
                  id="email"
                  type="text"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Masukkan email/username"
                  className="w-full rounded-lg border border-slate-200 bg-[#F8FAFC] pl-10 pr-3.5 py-2.5 text-sm text-[#0B1B3A] placeholder:text-slate-400 outline-none transition focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/15"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-[#0B1B3A] mb-1.5"
              >
                Kata Sandi
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                  <svg viewBox="0 0 24 24" fill="none" width="18" height="18">
                    <rect x="5" y="10" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.6" />
                    <path
                      d="M8 10V7C8 4.79086 9.79086 3 12 3C14.2091 3 16 4.79086 16 7V10"
                      stroke="currentColor"
                      strokeWidth="1.6"
                    />
                  </svg>
                </span>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan kata sandi"
                  className="w-full rounded-lg border border-slate-200 bg-[#F8FAFC] pl-10 pr-10 py-2.5 text-sm text-[#0B1B3A] placeholder:text-slate-400 outline-none transition focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/15"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  aria-label="Tampilkan kata sandi"
                >
                  <svg viewBox="0 0 24 24" fill="none" width="18" height="18">
                    <path
                      d="M2 12C2 12 5.5 5.5 12 5.5C18.5 5.5 22 12 22 12C22 12 18.5 18.5 12 18.5C5.5 18.5 2 12 2 12Z"
                      stroke="currentColor"
                      strokeWidth="1.6"
                    />
                    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6" />
                    {showPassword && (
                      <path d="M4 20L20 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                    )}
                  </svg>
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-[#3B82F6] focus:ring-[#3B82F6]/30"
                />
                Ingat Saya
              </label>

              <Link
                href="/auth/forgot-password"
                className="text-sm font-medium text-[#2563EB] hover:text-[#1D4ED8]"
              >
                Lupa Kata Sandi?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-[#0B1B6B] hover:bg-[#0A1657] py-3 text-sm font-semibold text-white transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                "Memproses..."
              ) : (
                <>
                  Masuk
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

        <p className="text-center text-sm text-slate-500 mt-6">
          Belum punya akun?{" "}
          <Link
            href="/auth/register"
            className="font-medium text-[#2563EB] hover:text-[#1D4ED8]"
          >
            Daftar di sini
          </Link>
        </p>
      </div>
    </div>
  );
}