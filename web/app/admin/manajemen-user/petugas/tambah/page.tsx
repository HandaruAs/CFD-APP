"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ArrowLeft } from "lucide-react";

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

  function update<K extends keyof PetugasFormValues>(key: K, value: PetugasFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
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
          name: values.name,
          email: values.email,
          phone: values.phone,
          password: values.password,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
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
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-2xl font-bold text-slate-900">Tambah Petugas Baru</h1>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-600">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Nama Lengkap" required>
              <input
                required
                value={values.name}
                onChange={(e) => update("name", e.target.value)}
                className={inputClass}
                placeholder="Sesuai KTP"
              />
            </Field>
            <Field label="Email" required>
              <input
                required
                type="email"
                value={values.email}
                onChange={(e) => update("email", e.target.value)}
                className={inputClass}
                placeholder="nama@email.com"
              />
            </Field>
            <Field label="No. Telepon" required>
              <input
                required
                value={values.phone}
                onChange={(e) => update("phone", e.target.value)}
                className={inputClass}
                placeholder="08xxxxxxxxxx"
              />
            </Field>
            <Field label="Password Awal" required>
              <input
                required
                type="password"
                value={values.password}
                onChange={(e) => update("password", e.target.value)}
                className={inputClass}
                placeholder="Minimal 8 karakter"
              />
            </Field>
          </div>

          <div className="flex justify-end gap-3 border-t border-slate-100 pt-6 mt-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="rounded-lg border border-slate-200 px-6 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 rounded-lg bg-blue-700 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Simpan Petugas
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const inputClass =
  "w-full rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15";

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-slate-700">
        {label} {required && <span className="text-red-500">*</span>}
      </span>
      {children}
    </label>
  );
}