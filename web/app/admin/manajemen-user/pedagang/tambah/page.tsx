"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ArrowLeft, CreditCard, Tag, ShoppingCart, Table2 } from "lucide-react";

type StallType = "rombong" | "meja" | "";

export type PedagangFormValues = {
  name: string;
  email: string;
  phone: string;
  password: string;
  nik: string;
  tanggalLahir: string;
  namaUsaha: string;
  jenisDagangan: string;
  jenisLapak: StallType;
};

const EMPTY_FORM: PedagangFormValues = {
  name: "",
  email: "",
  phone: "",
  password: "",
  nik: "",
  tanggalLahir: "",
  namaUsaha: "",
  jenisDagangan: "",
  jenisLapak: "",
};

export default function TambahPedagangPage() {
  const router = useRouter();
  const [values, setValues] = useState<PedagangFormValues>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function update<K extends keyof PedagangFormValues>(key: K, value: PedagangFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (values.nik.trim().length !== 16) {
      setError("NIK harus terdiri dari 16 digit.");
      return;
    }
    if (!values.jenisLapak) {
      setError("Mohon pilih jenis lapak.");
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem("cfd_token");
      if (!token) throw new Error("Anda belum login. Silakan login kembali.");

      const res = await fetch("http://localhost:8080/api/admin/users/pedagang", {
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
          nik: values.nik,
          tanggal_lahir: values.tanggalLahir,
          nama_usaha: values.namaUsaha,
          jenis_dagangan: values.jenisDagangan,
          jenis_lapak: values.jenisLapak,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Gagal menyimpan data (Status: ${res.status})`);
      }

      router.push("/admin/manajemen-user/pedagang");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan data pedagang.");
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
        <h1 className="text-2xl font-bold text-slate-900">Tambah Pedagang Baru</h1>
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

            <Field label="NIK" required>
              <div className="relative">
                <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  required
                  maxLength={16}
                  inputMode="numeric"
                  value={values.nik}
                  onChange={(e) => update("nik", e.target.value.replace(/\D/g, ""))}
                  className={`${inputClass} pl-9`}
                  placeholder="16 digit sesuai KTP"
                />
              </div>
            </Field>
            <Field label="Tanggal Lahir" required>
              <input
                required
                type="date"
                value={values.tanggalLahir}
                onChange={(e) => update("tanggalLahir", e.target.value)}
                className={inputClass}
              />
            </Field>

            <div className="sm:col-span-2">
              <Field label="Nama Usaha" required>
                <div className="relative">
                  <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    required
                    value={values.namaUsaha}
                    onChange={(e) => update("namaUsaha", e.target.value)}
                    className={`${inputClass} pl-9`}
                    placeholder="Contoh: Kedai Kopi Senja"
                  />
                </div>
              </Field>
            </div>

            <div className="sm:col-span-2">
              <Field label="Kategori Dagangan" required>
                <select
                  required
                  value={values.jenisDagangan}
                  onChange={(e) => update("jenisDagangan", e.target.value)}
                  className={inputClass}
                >
                  <option value="" disabled>
                    Pilih Kategori
                  </option>
                  <option value="makanan_minuman">Makanan dan Minuman</option>
                  <option value="bukan_makanan_minuman">Bukan Makanan dan Minuman</option>
                </select>
              </Field>
            </div>

            <div className="sm:col-span-2">
              <Field label="Pilihan Lapak" required>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => update("jenisLapak", "rombong")}
                    className={`flex flex-col items-center gap-1 py-3 px-2 rounded-lg border transition-colors ${
                      values.jenisLapak === "rombong"
                        ? "border-blue-600 bg-blue-50"
                        : "border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <ShoppingCart className="h-5 w-5 text-blue-700" />
                    <span className="text-sm font-medium text-slate-900">Rombong</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => update("jenisLapak", "meja")}
                    className={`flex flex-col items-center gap-1 py-3 px-2 rounded-lg border transition-colors ${
                      values.jenisLapak === "meja"
                        ? "border-blue-600 bg-blue-50"
                        : "border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <Table2 className="h-5 w-5 text-blue-700" />
                    <span className="text-sm font-medium text-slate-900">Meja</span>
                  </button>
                </div>
              </Field>
            </div>
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
              Simpan Pedagang
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