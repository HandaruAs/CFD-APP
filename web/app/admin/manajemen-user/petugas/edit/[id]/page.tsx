"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowLeft, Loader2, Lock, Save } from "lucide-react";

type EditPetugasValues = {
  name: string;
  email: string;
  phone: string;
};

export default function EditPetugasPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const router = useRouter();
  const [values, setValues] = useState<EditPetugasValues | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  // Dipisah: sebelumnya satu state "error" dipakai untuk gagal memuat DAN gagal
  // menyimpan, jadi kalau simpan gagal seluruh form hilang diganti teks error.
  const [loadError, setLoadError] = useState("");
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      if (!id) {
        if (!cancelled) {
          setLoadError("ID tidak ditemukan di URL");
          setLoading(false);
        }
        return;
      }

      try {
        const token = localStorage.getItem("cfd_token");
        if (!token) throw new Error("Token tidak ditemukan, silakan login kembali.");

        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/users/petugas/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || "Gagal mengambil data dari server");
        }

        const data = await res.json();

        if (!cancelled) {
          setValues({
            name: data.name || "",
            email: data.email || "",
            phone: data.phone || "",
          });
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : "Gagal memuat data");
          setLoading(false);
        }
      }
    }

    fetchData();

    return () => {
      cancelled = true;
    };
  }, [id]);

  function update<K extends keyof EditPetugasValues>(key: K, value: EditPetugasValues[K]) {
    setValues((prev) => (prev ? { ...prev, [key]: value } : null));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!values) return;
    setSaveError("");
    setSaving(true);
    try {
      const token = localStorage.getItem("cfd_token");
      if (!token) throw new Error("Token tidak ditemukan");

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/users/petugas/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: values.name.trim(),
          phone: values.phone.trim(),
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Gagal menyimpan perubahan");
      }

      router.push("/admin/manajemen-user/petugas");
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Gagal menyimpan perubahan.");
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
          <h2 className="text-headline-md text-on-surface">Edit Petugas</h2>
          <p className="text-body-sm text-on-surface-variant">Ubah nama dan nomor telepon akun petugas.</p>
        </div>
      </div>

      {loading ? (
        <div className="h-[280px] animate-pulse rounded-2xl bg-surface-container-high" aria-busy="true" />
      ) : loadError || !values ? (
        <div role="alert" className="pt-card flex flex-col items-center gap-sm text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-error-container text-on-error-container">
            <AlertCircle className="h-6 w-6" />
          </span>
          <p className="text-body-md font-semibold text-on-surface">Data petugas tidak bisa dimuat</p>
          <p className="text-body-sm text-on-surface-variant">{loadError || "Data tidak ditemukan."}</p>
          <button type="button" onClick={() => router.push("/admin/manajemen-user/petugas")} className="pt-btn pt-btn-ghost border border-outline-variant">
            Kembali ke daftar petugas
          </button>
        </div>
      ) : (
        <section className="pt-card">
          <form onSubmit={handleSubmit} className="flex flex-col gap-lg">
            {saveError && (
              <div role="alert" className="flex items-start gap-sm rounded-xl bg-error-container/50 px-md py-sm text-body-sm text-on-error-container">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                {saveError}
              </div>
            )}

            <div className="grid grid-cols-1 gap-md sm:grid-cols-2">
              <Field label="Email" hint="Email dipakai untuk login dan tidak bisa diubah.">
                <div className="relative">
                  <input disabled type="email" value={values.email} className="pt-input pr-10" />
                  <Lock className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant" />
                </div>
              </Field>

              <Field label="Nama Lengkap" required>
                <input required value={values.name} onChange={(e) => update("name", e.target.value)} className="pt-input" autoComplete="name" />
              </Field>

              <Field label="No. Telepon" required>
                <input
                  required
                  type="tel"
                  inputMode="tel"
                  value={values.phone}
                  onChange={(e) => update("phone", e.target.value)}
                  className="pt-input"
                />
              </Field>
            </div>

            <div className="flex flex-col-reverse gap-sm border-t border-outline-variant pt-md sm:flex-row sm:justify-end">
              <button type="button" onClick={() => router.back()} className="pt-btn pt-btn-ghost justify-center border border-outline-variant">
                Batal
              </button>
              <button type="submit" disabled={saving} className="pt-btn pt-btn-primary justify-center">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {saving ? "Menyimpan..." : "Simpan Perubahan"}
              </button>
            </div>
          </form>
        </section>
      )}
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