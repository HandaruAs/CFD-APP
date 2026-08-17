"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ArrowLeft } from "lucide-react";

type EditPedagangValues = {
  name: string;
  email: string;
  phone: string;
  nik: string;
  namaUsaha: string;
  jenisDagangan: string;
  alamat: string;
};

export default function EditPedagangPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const router = useRouter();
  const [values, setValues] = useState<EditPedagangValues | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      if (!id) {
        if (!cancelled) {
          setError("ID tidak ditemukan di URL");
          setLoading(false);
        }
        return;
      }

      try {
        const token = localStorage.getItem("cfd_token");
        if (!token) throw new Error("Token tidak ditemukan, silakan login kembali.");

        const res = await fetch(
          `http://localhost:8080/api/admin/users/pedagang/${id}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || "Gagal mengambil data dari server");
        }

        const data = await res.json();
        
        if (!cancelled) {
          setValues({
            name: data.name || "",
            email: data.email || "",
            phone: data.phone || "",
            nik: data.nik || "",
            namaUsaha: data.namaUsaha || "",
            jenisDagangan: data.jenisDagangan || "",
            alamat: data.alamat || "",
          });
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Gagal memuat data");
          setLoading(false);
        }
      }
    }
    
    fetchData();

    return () => {
      cancelled = true;
    };
  }, [id]);

  function update<K extends keyof EditPedagangValues>(key: K, value: EditPedagangValues[K]) {
    if (!values) return;
    setValues((prev) => (prev ? { ...prev, [key]: value } : null));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!values) return;
    setError("");
    setSaving(true);
    try {
      const token = localStorage.getItem("cfd_token");
      if (!token) throw new Error("Token tidak ditemukan");

      const res = await fetch(`http://localhost:8080/api/admin/users/pedagang/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: values.name,
          phone: values.phone,
          nama_usaha: values.namaUsaha,
          jenis_dagangan: values.jenisDagangan,
          alamat: values.alamat,
        }),
      });
      
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Gagal menyimpan perubahan");
      }
      
      router.push("/admin/manajemen-user/pedagang");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan perubahan.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="p-6 text-center text-slate-600">Memuat data...</div>;
  }

  if (error || !values) {
    return <div className="p-6 text-red-600">Error: {error || "Data tidak ditemukan"}</div>;
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
        <h1 className="text-2xl font-bold text-slate-900">Edit Pedagang</h1>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-600">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* NIK DISABLE (Read-only) */}
            <Field label="NIK">
              <input
                disabled
                value={values.nik}
                className={`${inputClass} bg-gray-100 cursor-not-allowed opacity-70`}
              />
            </Field>
            {/* Email DISABLE (Read-only) */}
            <Field label="Email">
              <input
                disabled
                type="email"
                value={values.email}
                className={`${inputClass} bg-gray-100 cursor-not-allowed opacity-70`}
              />
            </Field>

            <Field label="Nama Lengkap" required>
              <input
                required
                value={values.name}
                onChange={(e) => update("name", e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="No. Telepon" required>
              <input
                required
                value={values.phone}
                onChange={(e) => update("phone", e.target.value)}
                className={inputClass}
              />
            </Field>

            <Field label="Nama Usaha" required>
              <input
                required
                value={values.namaUsaha}
                onChange={(e) => update("namaUsaha", e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Jenis Dagangan" required>
              <input
                required
                value={values.jenisDagangan}
                onChange={(e) => update("jenisDagangan", e.target.value)}
                className={inputClass}
              />
            </Field>

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
              Simpan Perubahan
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