"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { PublicNavbar } from "@/components/public-navbar";
import { PublicFooter } from "@/components/public-footer";
import {
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  IdCard,
  Store,
  CheckCircle2,
  QrCode,
  AlertCircle,
  Loader2,
} from "lucide-react";

/* =========================================================
   Wizard 3-langkah -- SATU halaman, SATU route (/daftar-lapak),
   ditautkan dari tombol besar di landing page. Gak pindah-pindah
   halaman: cuma ganti "step" yang lagi ditampilin.

   1) Register akun          -> POST /api/register lalu auto-login
                                 (POST /api/login) biar langsung
                                 dapat token, tanpa user harus
                                 login manual di step berikutnya.
   2) Pendaftaran usaha       -> POST /api/pedagang/pengajuan
   3) Pilih lokasi & klaim    -> POST /api/pedagang/lapak/klaim

   Field & endpoint SENGAJA disamain persis dengan yang dipakai
   di web/app/Auth/register, web/app/Auth/login,
   web/app/pedagang/pendaftaran, dan web/app/pedagang/nomer-stand --
   biar kontrak API-nya konsisten satu sumber kebenaran.

   Navbar-nya PublicNavbar yang sama kayak landing page (bukan
   AppShell/Sidebar dashboard -- route ini didaftarin di
   PUBLIC_PATHS di app-shell.tsx).
========================================================= */

type Step = 1 | 2 | 3;

interface HasilAlokasi {
  nomorStand: string;
  kecamatan: string;
  namaJalan: string;
  // Kosong kalau lapaknya dari jalan yang belum dibagi ruas.
  namaRuas: string;
}

const KATEGORI_OPTIONS = [
  { value: "makanan_minuman", label: "Makanan dan Minuman" },
  { value: "bukan_makanan_minuman", label: "Bukan Makanan dan Minuman" },
];

const LAPAK_OPTIONS = [
  { value: "rombong", label: "Rombong" },
  { value: "meja", label: "Meja" },
];

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

function StepDot({ n, active, done }: { n: number; active: boolean; done: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold transition-colors ${
          done
            ? "bg-[#16a34a] text-white"
            : active
            ? "bg-[#00288e] text-white"
            : "bg-[#eef1f7] text-[#767884]"
        }`}
      >
        {done ? <CheckCircle2 size={16} /> : n}
      </span>
    </div>
  );
}

export default function DaftarLapakPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // ---- Step 1: akun ----
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // ---- Step 2: data usaha ----
  const [nik, setNik] = useState("");
  const [dob, setDob] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [category, setCategory] = useState("");
  const [stallType, setStallType] = useState("");

  // ---- Step 3: hasil ----
  const [pedagangId, setPedagangId] = useState("");
  const [hasil, setHasil] = useState<HasilAlokasi | null>(null);

  // ---------- STEP 1: Register + auto-login ----------
  const handleStep1 = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

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

    setLoading(true);
    try {
      const resRegister = await fetch(apiUrl("/api/register"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: fullName, email, password }),
      });
      const dataRegister = await resRegister.json();
      if (!resRegister.ok) {
        throw new Error(dataRegister.error || "Pendaftaran akun gagal, silakan coba lagi.");
      }

      // Auto-login biar user gak perlu isi form login lagi -- langsung
      // dapat token buat lanjut ke step 2 & 3.
      const resLogin = await fetch(apiUrl("/api/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const dataLogin = await resLogin.json();
      if (!resLogin.ok) {
        throw new Error("Akun berhasil dibuat, tapi auto-login gagal. Silakan login manual.");
      }

      localStorage.setItem("cfd_token", dataLogin.token);
      document.cookie = `cfd_token=${dataLogin.token}; path=/; max-age=86400`;
      localStorage.setItem("cfd_user", JSON.stringify(dataLogin.user));

      setStep(2);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  // ---------- STEP 2: Data usaha, LANGSUNG lanjut klaim lokasi ----------
  // Mode/kecamatan picker dihapus -- lokasi & nomor stan sekarang diambil
  // otomatis dari pool yang udah disiapin admin (lihat app/admin/acak-lapak).
  // Jadi begitu data usaha kesimpan, langsung lanjut klaim tanpa jeda form
  // tambahan.
  const handleStep2 = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!nik.trim() || !dob || !businessName.trim() || !category || !stallType) {
      setError("Semua field wajib diisi.");
      return;
    }
    if (nik.trim().length !== 16) {
      setError("NIK harus 16 digit.");
      return;
    }

    setLoading(true);
    try {
      const resPengajuan = await fetch(apiUrl("/api/pedagang/pengajuan"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(),
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
      const dataPengajuan = await resPengajuan.json();
      if (!resPengajuan.ok) {
        throw new Error(dataPengajuan.error || "Gagal menyimpan data usaha.");
      }

      const resKlaim = await fetch(apiUrl("/api/pedagang/lapak/klaim"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(),
        },
      });
      const dataKlaim = await resKlaim.json();
      if (!resKlaim.ok) {
        throw new Error(dataKlaim.error || "Gagal mengklaim lapak.");
      }

      setHasil({
        nomorStand: dataKlaim.nomor_lapak,
        kecamatan: dataKlaim.nama_kecamatan,
        namaJalan: dataKlaim.nama_jalan,
        namaRuas: dataKlaim.nama_ruas ?? "",
      });
      setPedagangId(dataPengajuan.pengajuan_id ?? "");
      setStep(3);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <PublicNavbar />
      <main className="w-full min-h-screen flex items-start justify-center px-4 py-10 bg-[#f6f7fb]">
        <div className="w-full max-w-[560px]">
          <div className="mb-6">
            <h1 className="text-[24px] leading-tight font-bold text-[#1a1d29]">
              Daftar &amp; Dapatkan Nomor Stan
            </h1>
            <p className="text-[13px] text-[#767884] mt-1">
              Tiga langkah singkat: buat akun, isi data usaha, lalu dapatkan lokasi lapak Anda.
            </p>
          </div>

          {/* Step indicator */}
          {step < 3 && (
            <div className="flex items-center gap-2 mb-6">
              <StepDot n={1} active={step === 1} done={step > 1} />
              <div className={`h-0.5 flex-1 rounded ${step > 1 ? "bg-[#16a34a]" : "bg-[#e2e5f1]"}`} />
              <StepDot n={2} active={step === 2} done={step > 2} />
            </div>
          )}

          {error && (
            <div className="mb-4 flex items-start gap-2 rounded-xl border border-[#f3c6c6] bg-[#fdecec] px-4 py-3 text-[12.5px] text-[#ba1a1a]">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* ===================== STEP 1 ===================== */}
          {step === 1 && (
            <form
              onSubmit={handleStep1}
              className="w-full bg-white rounded-2xl border border-[#e7e8f1] shadow-[0_2px_8px_-2px_rgba(23,29,64,0.06)] p-5 flex flex-col gap-4"
            >
              <div className="flex items-center gap-2">
                <User size={18} className="text-[#00288e]" />
                <h2 className="text-[15px] font-semibold text-[#1a1d29]">Buat Akun</h2>
              </div>

              <Field label="Nama Lengkap" icon={<User size={15} />}>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Sesuai KTP"
                  className="w-full box-border h-10 pl-9 pr-3 bg-[#eff4ff] rounded-lg text-[13px] text-[#1a1d29] border border-[#c9d6f5] focus:outline-none focus:bg-white focus:border-[#00288e] focus:ring-2 focus:ring-[#00288e]/15 transition-all"
                />
              </Field>

              <Field label="Email" icon={<Mail size={15} />}>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@email.com"
                  className="w-full box-border h-10 pl-9 pr-3 bg-[#eff4ff] rounded-lg text-[13px] text-[#1a1d29] border border-[#c9d6f5] focus:outline-none focus:bg-white focus:border-[#00288e] focus:ring-2 focus:ring-[#00288e]/15 transition-all"
                />
              </Field>

              <Field label="Kata Sandi" icon={<Lock size={15} />}>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimal 8 karakter"
                  className="w-full box-border h-10 pl-9 pr-9 bg-[#eff4ff] rounded-lg text-[13px] text-[#1a1d29] border border-[#c9d6f5] focus:outline-none focus:bg-white focus:border-[#00288e] focus:ring-2 focus:ring-[#00288e]/15 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#a3a5b3]"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </Field>

              <Field label="Konfirmasi Kata Sandi" icon={<Lock size={15} />}>
                <input
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Ulangi kata sandi"
                  className="w-full box-border h-10 pl-9 pr-3 bg-[#eff4ff] rounded-lg text-[13px] text-[#1a1d29] border border-[#c9d6f5] focus:outline-none focus:bg-white focus:border-[#00288e] focus:ring-2 focus:ring-[#00288e]/15 transition-all"
                />
              </Field>

              <SubmitButton loading={loading} label="Lanjut ke Data Usaha" />

              <p className="text-center text-[12px] text-[#767884]">
                Sudah punya akun?{" "}
                <a href="/auth/login" className="text-[#00288e] font-medium hover:underline">
                  Masuk di sini
                </a>
              </p>
            </form>
          )}

          {/* ===================== STEP 2 ===================== */}
          {step === 2 && (
            <form
              onSubmit={handleStep2}
              className="w-full bg-white rounded-2xl border border-[#e7e8f1] shadow-[0_2px_8px_-2px_rgba(23,29,64,0.06)] p-5 flex flex-col gap-4"
            >
              <div className="flex items-center gap-2">
                <Store size={18} className="text-[#00288e]" />
                <h2 className="text-[15px] font-semibold text-[#1a1d29]">Data Usaha</h2>
              </div>

              <Field label="NIK" icon={<IdCard size={15} />}>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={16}
                  value={nik}
                  onChange={(e) => setNik(e.target.value.replace(/\D/g, ""))}
                  placeholder="16 digit NIK"
                  className="w-full box-border h-10 pl-9 pr-3 bg-[#eff4ff] rounded-lg text-[13px] text-[#1a1d29] border border-[#c9d6f5] focus:outline-none focus:bg-white focus:border-[#00288e] focus:ring-2 focus:ring-[#00288e]/15 transition-all"
                />
              </Field>

              <div className="w-full flex flex-col gap-1.5">
                <label className="text-[12px] font-medium text-[#4b4d5a] uppercase tracking-wide">
                  Tanggal Lahir
                </label>
                <input
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  className="w-full box-border h-10 px-3 bg-[#eff4ff] rounded-lg text-[13px] text-[#1a1d29] border border-[#c9d6f5] focus:outline-none focus:bg-white focus:border-[#00288e] focus:ring-2 focus:ring-[#00288e]/15 transition-all"
                />
              </div>

              <Field label="Nama Usaha (UMKM)" icon={<Store size={15} />}>
                <input
                  type="text"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="Contoh: Warung Bu Sri"
                  className="w-full box-border h-10 pl-9 pr-3 bg-[#eff4ff] rounded-lg text-[13px] text-[#1a1d29] border border-[#c9d6f5] focus:outline-none focus:bg-white focus:border-[#00288e] focus:ring-2 focus:ring-[#00288e]/15 transition-all"
                />
              </Field>

              <div className="w-full flex flex-col gap-1.5">
                <label className="text-[12px] font-medium text-[#4b4d5a] uppercase tracking-wide">
                  Kategori Usaha
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {KATEGORI_OPTIONS.map((opt) => (
                    <OptionCard
                      key={opt.value}
                      selected={category === opt.value}
                      onClick={() => setCategory(opt.value)}
                      title={opt.label}
                    />
                  ))}
                </div>
              </div>

              <div className="w-full flex flex-col gap-1.5">
                <label className="text-[12px] font-medium text-[#4b4d5a] uppercase tracking-wide">
                  Jenis Lapak
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {LAPAK_OPTIONS.map((opt) => (
                    <OptionCard
                      key={opt.value}
                      selected={stallType === opt.value}
                      onClick={() => setStallType(opt.value)}
                      title={opt.label}
                    />
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="h-11 px-5 bg-white text-[#4b4d5a] border border-[#e2e5f1] text-[13px] font-medium rounded-lg hover:bg-[#f5f7fe] transition-all"
                >
                  Kembali
                </button>
                <div className="flex-1">
                  <SubmitButton loading={loading} label="Dapatkan Nomor Stan" />
                </div>
              </div>
            </form>
          )}

          {/* ===================== STEP 3: HASIL ===================== */}
          {step === 3 && hasil && (
            <div className="flex flex-col gap-4">
              <div className="w-full bg-[#e3f8ee] border border-[#bfeed7] rounded-xl px-4 py-3 flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-[#16a34a] flex items-center justify-center shrink-0 mt-0.5">
                  <CheckCircle2 size={15} className="text-white" strokeWidth={2.5} />
                </div>
                <div>
                  <p className="text-[13.5px] font-semibold text-[#0f7a44]">Pendaftaran Berhasil!</p>
                  <p className="text-[12.5px] text-[#1a7a52]">
                    Akun, data usaha, dan lokasi lapak Anda sudah tersimpan.
                  </p>
                </div>
              </div>

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
                      <span className="text-[13px] font-semibold text-[#1a1d29]">{hasil.kecamatan}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] text-[#a3743f]">Nama Jalan</span>
                      <span className="text-[13px] font-semibold text-[#1a1d29]">{hasil.namaJalan}</span>
                    </div>
                    {/* Baris Ruas cuma muncul kalau lapaknya memang punya ruas. */}
                    {hasil.namaRuas && (
                      <div className="flex items-center justify-between">
                        <span className="text-[12px] text-[#a3743f]">Ruas</span>
                        <span className="text-[13px] font-semibold text-[#1a1d29]">{hasil.namaRuas}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="w-full bg-white rounded-2xl border border-[#e7e8f1] shadow-[0_2px_8px_-2px_rgba(23,29,64,0.06)] p-5 text-center">
                <h3 className="text-[14px] font-semibold text-[#1a1d29] mb-3">Verifikasi Pedagang</h3>
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
                  Tunjukkan kode QR ini ke petugas di lokasi CFD untuk check-in.
                </p>
              </div>

              <button
                type="button"
                onClick={() => router.push("/pedagang/nomer-stand")}
                className="h-11 px-5 bg-[#00288e] text-white text-[13px] font-medium rounded-lg hover:bg-[#173bab] active:scale-[0.98] transition-all"
              >
                Buka Dasbor Pedagang
              </button>
            </div>
          )}
        </div>
      </main>
      <PublicFooter />
    </>
  );
}

function Field({
  label,
  icon,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="w-full flex flex-col gap-1.5">
      <label className="text-[12px] font-medium text-[#4b4d5a] uppercase tracking-wide">{label}</label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a3a5b3]">{icon}</span>
        {children}
      </div>
    </div>
  );
}

function OptionCard({
  selected,
  onClick,
  title,
  desc,
}: {
  selected: boolean;
  onClick: () => void;
  title: string;
  desc?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left rounded-lg border px-3 py-2.5 transition-all ${
        selected
          ? "border-[#00288e] bg-[#eff4ff] ring-2 ring-[#00288e]/15"
          : "border-[#e2e5f1] bg-white hover:border-[#00288e]/40"
      }`}
    >
      <p className="text-[13px] font-semibold text-[#1a1d29]">{title}</p>
      {desc && <p className="text-[11.5px] mt-0.5 text-[#767884]">{desc}</p>}
    </button>
  );
}

function SubmitButton({ loading, label }: { loading: boolean; label: string }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="w-full h-11 px-5 bg-[#00288e] text-white text-[13px] font-medium rounded-lg shadow-[0_4px_10px_-3px_rgba(0,40,142,0.4)] hover:bg-[#173bab] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:active:scale-100"
    >
      {loading && <Loader2 size={15} className="animate-spin" />}
      {loading ? "Memproses..." : label}
    </button>
  );
}