"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowLeft, Eye, EyeOff, Info, Loader2, UserPlus } from "lucide-react";

type PetugasFormValues = {
  name: string;
  email: string;
  phone: string;
  password: string;
};

const EMPTY_FORM: PetugasFormValues = {
  name: "",
  email: "",
  phone: "",
  password: "",
};

export default function TambahPetugasPage() {
  const router = useRouter();
  const [values, setValues] = useState<PetugasFormValues>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [lihatPassword, setLihatPassword] = useState(false);

  function update<K extends keyof PetugasFormValues>(key: K, value: PetugasFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  const passwordPendek = values.password.length > 0 && values.password.length < 8;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (values.password.length < 8) {
      setError("Password minimal 8 karakter.");
      return;
    }
    setSaving(true);
    try {
      const token = localStorage.getItem("cfd_token");
      if (!token) throw new Error("Anda belum login");

      const baseUrl = process.env.NEXT_PUBLIC_API_URL;
      if (!baseUrl) {
        throw new Error("NEXT_PUBLIC_API_URL belum diset di .env.local!");
      }

      const res = await fetch(`${baseUrl}/api/admin/users/petugas?role=petugas`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: values.name.trim(),
          email: values.email.trim(),
          phone: values.phone.trim(),
          password: values.password,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Gagal menyimpan data (Status: ${res.status})`);
      }

      router.push("/admin/manajemen-user/petugas");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan data petugas.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-lg pb-xl">
      <div className="flex items-center gap-sm">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex h-10 w-10 items-center justify-center rounded-xl text-on-surface-variant hover:bg-surface-container-high"
          aria-label="Kembali"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h2 className="text-headline-md text-on-surface">Tambah Petugas Baru</h2>
          <p className="text-body-sm text-on-surface-variant">Akun baru langsung aktif dan bisa dipakai login.</p>
        </div>
      </div>

      <section className="pt-card flex flex-col gap-lg">
        <div className="flex items-start gap-sm rounded-xl bg-primary-fixed/50 px-md py-sm text-body-sm text-on-primary-fixed">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            Petugas bisa masuk ke aplikasi dengan email dan password di bawah. Berikan password awal ini langsung ke
            petugas yang bersangkutan.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-lg">
          {error && (
            <div role="alert" className="flex items-start gap-sm rounded-xl bg-error-container/50 px-md py-sm text-body-sm text-on-error-container">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 gap-md sm:grid-cols-2">
            <Field label="Nama Lengkap" required>
              <input
                required
                value={values.name}
                onChange={(e) => update("name", e.target.value)}
                className="pt-input"
                placeholder="Sesuai KTP"
                autoComplete="name"
              />
            </Field>
            <Field label="Email" required hint="Dipakai untuk login.">
              <input
                required
                type="email"
                value={values.email}
                onChange={(e) => update("email", e.target.value)}
                className="pt-input"
                placeholder="nama@email.com"
                autoComplete="off"
              />
            </Field>
            <Field label="No. Telepon" required>
              <input
                required
                type="tel"
                inputMode="tel"
                value={values.phone}
                onChange={(e) => update("phone", e.target.value)}
                className="pt-input"
                placeholder="08xxxxxxxxxx"
              />
            </Field>
            <Field
              label="Password Awal"
              required
              hint={passwordPendek ? undefined : "Minimal 8 karakter. Minta petugas menggantinya setelah login."}
            >
              <div className="relative">
                <input
                  required
                  type={lihatPassword ? "text" : "password"}
                  value={values.password}
                  onChange={(e) => update("password", e.target.value)}
                  className={`pt-input pr-12 ${passwordPendek ? "!border-error" : ""}`}
                  placeholder="Minimal 8 karakter"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setLihatPassword((v) => !v)}
                  className="absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container-high"
                  aria-label={lihatPassword ? "Sembunyikan password" : "Tampilkan password"}
                >
                  {lihatPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {passwordPendek && (
                <span className="text-label-sm font-normal text-error">
                  Kurang {8 - values.password.length} karakter lagi.
                </span>
              )}
            </Field>
          </div>

          <div className="flex flex-col-reverse gap-sm border-t border-outline-variant pt-md sm:flex-row sm:justify-end">
            <button type="button" onClick={() => router.back()} className="pt-btn pt-btn-ghost justify-center border border-outline-variant">
              Batal
            </button>
            <button type="submit" disabled={saving} className="pt-btn pt-btn-primary justify-center">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
              {saving ? "Menyimpan..." : "Simpan Petugas"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-xs">
      <span className="text-label-md text-on-surface">
        {label} {required && <span className="text-error">*</span>}
      </span>
      {children}
      {hint && <span className="text-label-sm font-normal text-on-surface-variant">{hint}</span>}
    </label>
  );
}