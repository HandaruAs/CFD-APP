"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ArrowLeft } from "lucide-react";

// Tipe data form kita
export type PedagangFormValues = {
  name: string;
  email: string;
  phone: string;
  password: string;
  nik: string;
  namaUsaha: string;
  jenisDagangan: string;
  perkiraanHarga: string; // <-- TAMBAHAN
  alamat: string;
};

const EMPTY_FORM: PedagangFormValues = {
  name: "",
  email: "",
  phone: "",
  password: "",
  nik: "",
  namaUsaha: "",
  jenisDagangan: "",
  perkiraanHarga: "", // <-- TAMBAHAN
  alamat: "",
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
    setSaving(true);
    try {
      // 1. Ambil token dari localStorage
      const token = localStorage.getItem("cfd_token"); 

      if (!token) {
        throw new Error("Anda belum login. Silakan login kembali.");
      }

      console.log("🚀 Mengirim data ke backend:", values);

      // 2. Kirim request dengan header Authorization
      const res = await fetch("http://localhost:8080/api/admin/users/pedagang", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: values.name,
          email: values.email,
          phone: values.phone,
          password: values.password,
          nik: values.nik,
          nama_usaha: values.namaUsaha,
          jenis_dagangan: values.jenisDagangan,
          perkiraan_harga: values.perkiraanHarga, // <-- TAMBAHAN
          alamat: values.alamat,
        }),
      });

      // Jika response tidak oke (status bukan 200/201), ambil pesan error dari backend
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || `Gagal menyimpan data (Status: ${res.status})`);
      }

      // Jika sukses, kembali ke halaman tabel pedagang
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
              <input
                required
                maxLength={16}
                inputMode="numeric"
                value={values.nik}
                onChange={(e) => update("nik", e.target.value)}
                className={inputClass}
                placeholder="16 digit sesuai KTP"
              />
            </Field>
            <Field label="Nama Usaha" required>
              <input
                required
                value={values.namaUsaha}
                onChange={(e) => update("namaUsaha", e.target.value)}
                className={inputClass}
                placeholder="Contoh: Kedai Kopi Senja"
              />
            </Field>

            <div className="sm:col-span-2">
              <Field label="Jenis Dagangan" required>
                <input
                  required
                  value={values.jenisDagangan}
                  onChange={(e) => update("jenisDagangan", e.target.value)}
                  className={inputClass}
                  placeholder="Contoh: Kopi susu, teh, camilan ringan"
                />
              </Field>
            </div>

            {/* --- TAMBAHAN DROPDOWN PERKIRAAN HARGA --- */}
            <div className="sm:col-span-2">
              <Field label="Perkiraan Harga Produk" required>
                <select
                  required
                  value={values.perkiraanHarga}
                  onChange={(e) => update("perkiraanHarga", e.target.value)}
                  className={inputClass}
                >
                  <option value="">Pilih Kisaran Harga</option>
                  <option value="Rp5.000 - Rp10.000">Rp5.000 - Rp10.000</option>
                  <option value="Rp10.000 - Rp15.000">Rp10.000 - Rp15.000</option>
                  <option value="Rp15.000 - Rp20.000">Rp15.000 - Rp20.000</option>
                  <option value="Rp20.000 - Rp25.000">Rp20.000 - Rp25.000</option>
                  <option value="Rp25.000 - Rp30.000">Rp25.000 - Rp30.000</option>
                  <option value="Rp30.000 - Rp40.000">Rp30.000 - Rp40.000</option>
                  <option value="Rp40.000 - Rp50.000">Rp40.000 - Rp50.000</option>
                  <option value="Rp50.000 - Rp75.000">Rp50.000 - Rp75.000</option>
                  <option value="Rp75.000 - Rp100.000">Rp75.000 - Rp100.000</option>
                  <option value="> Rp100.000">Di atas Rp100.000</option>
                </select>
              </Field>
            </div>
            {/* ------------------------------------------------- */}

            <div className="sm:col-span-2">
              <Field label="Alamat" required>
                <textarea
                  required
                  rows={2}
                  value={values.alamat}
                  onChange={(e) => update("alamat", e.target.value)}
                  className={inputClass}
                />
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