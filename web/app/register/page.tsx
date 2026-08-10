"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  User,
  Store,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  Building2,
  ArrowRight,
} from "lucide-react";

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [agreed, setAgreed] = useState(false);

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
              usaha Car Free Day. Daftarkan usaha Anda untuk mendapatkan akses
              ruang dagang yang terstruktur dan transparan.
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
            Lengkapi data di bawah ini untuk mendaftarkan usaha Anda.
          </p>

          <form className="mt-6 space-y-4" onSubmit={(e) => e.preventDefault()}>
            <TextField
              label="Nama Lengkap"
              name="fullName"
              placeholder="Masukkan nama lengkap"
              icon={<User className="h-4 w-4" />}
            />

            <TextField
              label="Nama Usaha"
              name="businessName"
              placeholder="Masukkan nama usaha"
              icon={<Store className="h-4 w-4" />}
            />

            <TextField
              label="Alamat Email"
              name="email"
              type="email"
              placeholder="nama@email.com"
              icon={<Mail className="h-4 w-4" />}
            />

            <TextField
              label="Kata Sandi"
              name="password"
              type={showPassword ? "text" : "password"}
              placeholder="Minimal 8 karakter"
              icon={<Lock className="h-4 w-4" />}
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
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#1c3f7c] py-3 text-sm font-semibold text-white transition-colors hover:bg-[#152f5e] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1c3f7c] focus-visible:ring-offset-2"
            >
              Daftar
              <ArrowRight className="h-4 w-4" />
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
}: {
  label: string;
  name: string;
  type?: string;
  placeholder: string;
  icon: React.ReactNode;
  rightIcon?: React.ReactNode;
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
          className="w-full border-none bg-transparent text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-0"
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
 */