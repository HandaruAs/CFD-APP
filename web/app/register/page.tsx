"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  Building2,
  ArrowRight,
  AlertCircle,
} from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();

  // Form register AKUN saja (nama, email, password) — sesuai backend
  // RegisterPedagangRequest. NIK/nama usaha/jenis dagangan/alamat itu
  // form "pengajuan usaha" yang terpisah, diisi dari dashboard setelah
  // user login, BUKAN di sini.
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreed, setAgreed] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // Validasi di sisi client dulu, biar user dapat feedback cepat
    // sebelum request ke server (backend tetap validasi ulang semuanya).
    if (!fullName.trim() || !email.trim() || !password || !confirmPassword) {
      setError("Semua field wajib diisi.");
      return;
    }
    if (password.length < 8) {
      setError("Kata sandi minimal 8 karakter.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Konfirmasi kata sandi tidak cocok.");
      return;
    }
    if (!agreed) {
      setError("Kamu harus menyetujui Syarat & Ketentuan serta Kebijakan Privasi.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: fullName,
          email,
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        // Backend balikin { "error": "..." }, contoh: "email sudah terdaftar"
        setError(data.error || "Pendaftaran gagal, silakan coba lagi.");
        setLoading(false);
        return;
      }

      // Register cuma bikin akun (role pedagang), belum ada pengajuan
      // usaha & belum login (belum ada token). Arahkan ke halaman login
      // dengan flag biar bisa ditampilkan pesan sukses di sana.
      router.push("/login?registered=1");
    } catch (err) {
      console.error("Gagal menghubungi server:", err);
      setError("Tidak bisa terhubung ke server. Coba lagi nanti.");
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#eef1f7] p-6">
      <div className="grid w-full max-w-5xl grid-cols-1 overflow-hidden rounded-2xl bg-white shadow-xl md:grid-cols-2">
        {/* Left panel — placeholder putih, siap diisi gambar sendiri nanti */}
        {/* Mobile: pendek. Desktop (md+): panel penuh dengan deskripsi & fitur. */}
        <div className="relative flex h-48 flex-col justify-between overflow-hidden border-b border-slate-100 bg-white p-6 text-slate-900 sm:h-56 sm:p-8 md:h-auto md:border-b-0 md:border-r md:p-10">
          {/* Logo */}
          <div className="relative z-10">
            <span className="text-lg font-bold tracking-tight">CFD Hub</span>
          </div>

          {/* Area foto — ganti file di public/images/cfd-hero.jpg buat ganti fotonya */}
          <div className="relative z-10 mt-16 hidden h-40 overflow-hidden rounded-lg bg-slate-100 md:block">
            <Image
              src="/images/cfd-hero.jpg"
              alt="CFD Hub"
              fill
              className="object-cover"
            />
          </div>

          {/* Judul — selalu tampil, ukuran menyesuaikan layar */}
          <div className="relative z-10 mt-auto space-y-2 md:mt-16 md:space-y-4">
            <h1 className="text-xl font-bold leading-tight text-[#1c3f7c] sm:text-2xl md:text-3xl">
              Pendaftaran Akun
              <span className="hidden md:inline">
                <br />
                Baru
              </span>
              <span className="md:hidden"> Baru</span>
            </h1>
            {/* Paragraf & fitur — cuma tampil di desktop biar mobile tidak kepanjangan */}
            <p className="hidden max-w-sm text-sm leading-relaxed text-slate-500 md:block">
              Bergabunglah dengan CFD Hub, platform resmi manajemen pelaku
              usaha Car Free Day. Buat akun dulu, lalu lengkapi pengajuan
              usaha dari dashboard untuk mendapatkan akses ruang dagang.
            </p>
          </div>

          {/* Feature list — desktop only */}
          <div className="relative z-10 mt-10 hidden space-y-5 md:block">
            <Feature
              icon={<ShieldCheck className="h-4 w-4" />}
              title="Proses Resmi"
              description="Terintegrasi langsung dengan sistem manajemen pemerintah daerah."
            />
            <Feature
              icon={<Building2 className="h-4 w-4" />}
              title="Manajemen Usaha"
              description="Kelola izin, lokasi, dan profil usaha Anda dalam satu portal."
            />
          </div>
        </div>

        {/* Right panel — form */}
        <div className="flex flex-col justify-center px-8 py-10 sm:px-12">
          <h2 className="text-2xl font-bold text-slate-900">Daftar Akun</h2>
          <p className="mt-1 text-sm text-slate-500">
            Buat akun dulu — data usaha (NIK, jenis dagangan, dll) diisi
            belakangan dari dashboard.
          </p>

          {error && (
            <div className="mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <TextField
              label="Nama Lengkap"
              name="fullName"
              placeholder="Masukkan nama lengkap"
              icon={<User className="h-4 w-4" />}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              disabled={loading}
            />

            <TextField
              label="Alamat Email"
              name="email"
              type="email"
              placeholder="nama@email.com"
              icon={<Mail className="h-4 w-4" />}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />

            <TextField
              label="Kata Sandi"
              name="password"
              type={showPassword ? "text" : "password"}
              placeholder="Minimal 8 karakter"
              icon={<Lock className="h-4 w-4" />}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              rightIcon={
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="text-slate-400 hover:text-slate-600"
                  aria-label={
                    showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"
                  }
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              }
            />

            <TextField
              label="Konfirmasi Kata Sandi"
              name="confirmPassword"
              type={showConfirm ? "text" : "password"}
              placeholder="Ulangi kata sandi"
              icon={<Lock className="h-4 w-4" />}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={loading}
              rightIcon={
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  className="text-slate-400 hover:text-slate-600"
                  aria-label={
                    showConfirm ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"
                  }
                >
                  {showConfirm ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              }
            />

            <label className="flex items-start gap-2 pt-1 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                disabled={loading}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#1c3f7c] focus:ring-[#1c3f7c]"
              />
              <span>
                Saya menyetujui{" "}
                <a href="#" className="text-[#1c3f7c] hover:underline">
                  Syarat &amp; Ketentuan
                </a>{" "}
                serta{" "}
                <a href="#" className="text-[#1c3f7c] hover:underline">
                  Kebijakan Privasi
                </a>{" "}
                yang berlaku.
              </span>
            </label>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#1c3f7c] py-3 text-sm font-semibold text-white transition-colors hover:bg-[#152f5e] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1c3f7c] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                "Memproses..."
              ) : (
                <>
                  Daftar
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            Sudah punya akun?{" "}
            <Link
              href="/login"
              className="font-medium text-[#1c3f7c] hover:underline"
            >
              Login di sini
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}

function TextField({
  label,
  name,
  type = "text",
  placeholder,
  icon,
  rightIcon,
  value,
  onChange,
  disabled,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder: string;
  icon: React.ReactNode;
  rightIcon?: React.ReactNode;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
}) {
  return (
    <div>
      <label
        htmlFor={name}
        className="mb-1.5 block text-sm font-medium text-slate-700"
      >
        {label}
      </label>
      <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 focus-within:border-[#1c3f7c] focus-within:ring-1 focus-within:ring-[#1c3f7c]">
        <span className="text-slate-400">{icon}</span>
        <input
          id={name}
          name={name}
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          disabled={disabled}
          required
          className="w-full border-none bg-transparent text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-0 disabled:opacity-60"
        />
        {rightIcon}
      </div>
    </div>
  );
}

function Feature({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-emerald-100 text-emerald-600">
        {icon}
      </div>
      <div>
        <p className="text-sm font-semibold text-slate-800">{title}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
          {description}
        </p>
      </div>
    </div>
  );
}

/**
 * Cara ganti fotonya:
 * 1. Taruh file foto di public/images/cfd-hero.jpg (timpa file yang ada,
 *    atau pakai nama lain lalu update `src` di RegisterPage di atas).
 * 2. Save — foto langsung muncul, nggak perlu ubah kode lain.
 *
 * Kalau belum ada file di public/images/cfd-hero.jpg, area ini bakal
 * kosong/error gambar — pastikan filenya sudah ditaruh dulu.
 *
 * Env yang dibutuhkan (.env.local):
 * NEXT_PUBLIC_API_URL=http://localhost:8080
 */
