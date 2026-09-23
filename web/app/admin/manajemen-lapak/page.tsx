"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ArrowLeft, CreditCard, Tag, ShoppingCart, Table2, Copy, Check } from "lucide-react";

type StallType = "rombong" | "meja" | "";

type PedagangFormValues = {
  namaLengkap: string;
  email: string;
  phone: string;
  nik: string;
  tanggalLahir: string;
  alamat: string;
  namaUsaha: string;
  jenisDagangan: string;
  jenisLapak: StallType;
  lokasiLapak: string;
};

type AkunBaru = {
  pedagangId: string;
  email: string;
  password: string;
};

type Kecamatan = {
  kecamatan: string;
  jalan: { id: string; namaJalan: string }[];
};

const EMPTY_FORM: PedagangFormValues = {
  namaLengkap: "",
  email: "",
  phone: "",
  nik: "",
  tanggalLahir: "",
  alamat: "",
  namaUsaha: "",
  jenisDagangan: "",
  jenisLapak: "",
  lokasiLapak: "",
};

export default function TambahPedagangPage() {
  const router = useRouter();
  const [values, setValues] = useState<PedagangFormValues>(EMPTY_FORM);
  const [daftarJalan, setDaftarJalan] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [akunBaru, setAkunBaru] = useState<AkunBaru | null>(null);
  const [copied, setCopied] = useState(false);

  // Daftar jalan buat dropdown Lokasi Lapak
  useEffect(() => {
    async function fetchWilayah() {
      try {
        const token = localStorage.getItem("cfd_token");
        const res = await fetch("http://localhost:8080/api/admin/wilayah", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        const list: Kecamatan[] = data.data ?? [];
        setDaftarJalan(list.flatMap((k) => k.jalan.map((j) => `${j.namaJalan} (${k.kecamatan})`)));
      } catch {
        // Dropdown kosong saja kalau gagal
      }
    }
    fetchWilayah();
  }, []);

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

    setSaving(true);
    try {
      const token = localStorage.getItem("cfd_token");
      if (!token) throw new Error("Anda belum login. Silakan login kembali.");

      const res = await fetch("http://localhost:8080/api/admin/pedagang", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          namaLengkap: values.namaLengkap,
          email: values.email,
          phone: values.phone,
          nik: values.nik,
          tanggalLahir: values.tanggalLahir || undefined,
          alamat: values.alamat || undefined,
          namaUsaha: values.namaUsaha,
          jenisDagangan: values.jenisDagangan || undefined,
          jenisLapak: values.jenisLapak || undefined,
          lokasiLapak: values.lokasiLapak || undefined,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || `Gagal menyimpan data (Status: ${res.status})`);
      }

      // Password di-generate sistem, cuma bisa dilihat sekali di sini
      setAkunBaru(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan data pedagang.");
    } finally {
      setSaving(false);
    }
  }

  function handleCopy() {
    if (!akunBaru) return;
    navigator.clipboard.writeText(`Email: ${akunBaru.email}\nPassword: ${akunBaru.password}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  // ===== Tampilan setelah berhasil simpan =====
  if (akunBaru) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-slate-900 mb-6">Pedagang Berhasil Ditambahkan</h1>

        <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200 space-y-4">
          <p className="text-sm text-slate-600">
            Sampaikan akun ini ke pedagangnya. Password hanya ditampilkan sekali di halaman ini.
          </p>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
            <p>
              Email: <span className="font-semibold text-slate-900">{akunBaru.email}</span>
            </p>
            <p className="mt-1">
              Password: <span className="font-mono font-semibold text-slate-900">{akunBaru.password}</span>
            </p>
          </div>

          <div className="flex justify-between gap-3 border-t border-slate-100 pt-6">
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-2 rounded-lg border border-slate-200 px-6 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? "Tersalin" : "Salin Email & Password"}
            </button>
            <button
              type="button"
              onClick={() => router.push("/admin/manajemen-user/pedagang")}
              className="rounded-lg bg-blue-700 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-800"
            >
              Selesai
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ===== Form tambah =====
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
                value={values.namaLengkap}
                onChange={(e) => update("namaLengkap", e.target.value)}
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
            <Field label="No. Telepon">
              <input
                inputMode="numeric"
                maxLength={13}
                value={values.phone}
                onChange={(e) => update("phone", e.target.value.replace(/\D/g, "").slice(0, 13))}
                className={inputClass}
                placeholder="08xxxxxxxxxx (maks 13 digit)"
              />
            </Field>
            <Field label="Tanggal Lahir">
              <input
                type="date"
                value={values.tanggalLahir}
                onChange={(e) => update("tanggalLahir", e.target.value)}
                className={inputClass}
              />
            </Field>

            <div className="sm:col-span-2">
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
            </div>

            <div className="sm:col-span-2">
              <Field label="Alamat">
                <textarea
                  rows={2}
                  value={values.alamat}
                  onChange={(e) => update("alamat", e.target.value)}
                  className={inputClass}
                  placeholder="Alamat tempat tinggal"
                />
              </Field>
            </div>

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

            <Field label="Kategori Dagangan">
              <select
                value={values.jenisDagangan}
                onChange={(e) => update("jenisDagangan", e.target.value)}
                className={inputClass}
              >
                <option value="">Pilih Kategori</option>
                <option value="makanan_minuman">Makanan dan Minuman</option>
                <option value="bukan_makanan_minuman">Bukan Makanan dan Minuman</option>
              </select>
            </Field>
            <Field label="Lokasi Lapak">
              <select
                value={values.lokasiLapak}
                onChange={(e) => update("lokasiLapak", e.target.value)}
                className={inputClass}
              >
                <option value="">Pilih Jalan</option>
                {daftarJalan.map((label) => (
                  <option key={label} value={label}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>

            <div className="sm:col-span-2">
              <Field label="Pilihan Lapak">
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

          <p className="text-xs text-slate-500">
            Password tidak perlu diisi, sistem yang membuatnya otomatis dan menampilkannya sekali setelah data
            tersimpan. Pedagang ini otomatis tercatat sebagai <strong>Pedagang Lama</strong>.
          </p>

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