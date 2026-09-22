"use client";

import { useMemo, useState } from "react";
import { X, Copy, Check } from "lucide-react";
import type { CreatePedagangResult, KecamatanLengkapData } from "../types";
import { createPedagang } from "../api";

interface Props {
  wilayah: KecamatanLengkapData[];
  onClose: () => void;
  onSaved: () => void;
}

export default function TambahPedagangModal({ wilayah, onClose, onSaved }: Props) {
  const [namaLengkap, setNamaLengkap] = useState("");
  const [nik, setNik] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [namaUsaha, setNamaUsaha] = useState("");
  const [jenisDagangan, setJenisDagangan] = useState("");
  const [jenisLapak, setJenisLapak] = useState("");
  const [alamat, setAlamat] = useState("");
  const [tanggalLahir, setTanggalLahir] = useState("");
  const [lokasiLapak, setLokasiLapak] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<CreatePedagangResult | null>(null);
  const [copied, setCopied] = useState(false);

  // Daftar jalan buat dropdown Lokasi Lapak -- diratain dari data
  // kecamatan/jalan yang udah ada, bukan input teks bebas lagi.
  const daftarJalan = useMemo(
    () => wilayah.flatMap((k) => k.jalan.map((j) => ({ label: `${j.namaJalan} (${k.kecamatan})` }))),
    [wilayah]
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await createPedagang({
        namaLengkap,
        nik,
        email,
        phone,
        namaUsaha,
        jenisDagangan: jenisDagangan || undefined,
        jenisLapak: jenisLapak || undefined,
        alamat: alamat || undefined,
        tanggalLahir: tanggalLahir || undefined,
        lokasiLapak: lokasiLapak || undefined,
      });
      setResult(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menambahkan pedagang.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleCopy() {
    if (!result) return;
    navigator.clipboard.writeText(`Email: ${result.email}\nPassword: ${result.password}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  // Setelah berhasil, tampilan modal ganti jadi kasih tau akun yang
  // ke-generate -- ini satu-satunya kesempatan password-nya kelihatan.
  if (result) {
    return (
      <div className="pt-modal-overlay">
        <div className="pt-modal-box">
          <div className="flex items-center justify-between border-b border-outline-variant px-lg py-md">
            <h2 className="text-title-lg text-on-surface">Pedagang Berhasil Ditambahkan</h2>
            <button type="button" onClick={onClose} className="pt-modal-close" aria-label="Tutup">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="space-y-md px-lg py-lg">
            <p className="text-body-sm text-on-surface-variant">
              Sampaikan akun ini ke pedagangnya -- password cuma ditampilkan sekali di sini, gak disimpan di mana pun
              dalam bentuk yang bisa dibaca lagi.
            </p>
            <div className="rounded-xl border border-outline-variant bg-surface-container-low p-md">
              <p className="text-body-sm">
                Email: <span className="font-medium text-on-surface">{result.email}</span>
              </p>
              <p className="text-body-sm">
                Password: <span className="font-mono font-medium text-on-surface">{result.password}</span>
              </p>
            </div>
            <button type="button" onClick={handleCopy} className="pt-btn pt-btn-secondary">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? "Tersalin" : "Salin Email & Password"}
            </button>
            <div className="flex justify-end border-t border-outline-variant pt-lg">
              <button
                type="button"
                onClick={() => {
                  onSaved();
                  onClose();
                }}
                className="pt-btn pt-btn-primary"
              >
                Selesai
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-modal-overlay">
      <div className="pt-modal-box">
        <div className="flex items-center justify-between border-b border-outline-variant px-lg py-md">
          <h2 className="text-title-lg text-on-surface">Tambah Data Pedagang</h2>
          <button type="button" onClick={onClose} className="pt-modal-close" aria-label="Tutup">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="max-h-[70vh] space-y-md overflow-y-auto px-lg py-lg">
          {error && (
            <div className="rounded-xl bg-error-container/60 px-md py-sm text-body-sm text-on-error-container">
              {error}
            </div>
          )}

          <div>
            <label className="pt-field-label mb-1 block">
              Nama Lengkap <span className="text-error">*</span>
            </label>
            <input required value={namaLengkap} onChange={(e) => setNamaLengkap(e.target.value)} className="pt-input" />
          </div>

          <div className="grid grid-cols-2 gap-md">
            <div>
              <label className="pt-field-label mb-1 block">
                NIK <span className="text-error">*</span>
              </label>
              <input
                required
                value={nik}
                onChange={(e) => setNik(e.target.value.replace(/\D/g, "").slice(0, 16))}
                maxLength={16}
                inputMode="numeric"
                placeholder="16 digit"
                className="pt-input"
              />
            </div>
            <div>
              <label className="pt-field-label mb-1 block">
                Email <span className="text-error">*</span>
              </label>
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="pedagang@email.com"
                className="pt-input"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-md">
            <div>
              <label className="pt-field-label mb-1 block">Kontak</label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 13))}
                maxLength={13}
                inputMode="numeric"
                className="pt-input"
                placeholder="08xxx (maks 13 digit)"
              />
            </div>
            <div>
              <label className="pt-field-label mb-1 block">Tanggal Lahir</label>
              <input type="date" value={tanggalLahir} onChange={(e) => setTanggalLahir(e.target.value)} className="pt-input" />
            </div>
          </div>

          <div>
            <label className="pt-field-label mb-1 block">Alamat</label>
            <textarea
              value={alamat}
              onChange={(e) => setAlamat(e.target.value)}
              rows={2}
              className="pt-input"
            />
          </div>

          <div className="grid grid-cols-2 gap-md">
            <div>
              <label className="pt-field-label mb-1 block">
                Nama Usaha <span className="text-error">*</span>
              </label>
              <input required value={namaUsaha} onChange={(e) => setNamaUsaha(e.target.value)} className="pt-input" />
            </div>
            <div>
              <label className="pt-field-label mb-1 block">Jenis Dagangan</label>
              <select value={jenisDagangan} onChange={(e) => setJenisDagangan(e.target.value)} className="pt-input">
                <option value="">-- pilih --</option>
                <option value="makanan_minuman">Makanan/Minuman</option>
                <option value="bukan_makanan_minuman">Bukan Makanan/Minuman</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-md">
            <div>
              <label className="pt-field-label mb-1 block">Jenis Lapak</label>
              <select value={jenisLapak} onChange={(e) => setJenisLapak(e.target.value)} className="pt-input">
                <option value="">-- pilih --</option>
                <option value="rombong">Rombong</option>
                <option value="meja">Meja</option>
              </select>
            </div>
            <div>
              <label className="pt-field-label mb-1 block">Lokasi Lapak</label>
              <select value={lokasiLapak} onChange={(e) => setLokasiLapak(e.target.value)} className="pt-input">
                <option value="">-- pilih jalan --</option>
                {daftarJalan.map((j) => (
                  <option key={j.label} value={j.label}>
                    {j.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <p className="text-label-sm text-on-surface-variant">
            Password gak perlu diisi -- sistem yang generate otomatis, ditampilkan sekali setelah data tersimpan.
            Pedagang ini otomatis tercatat sebagai <strong>Pedagang Lama</strong>.
          </p>

          <div className="flex justify-end gap-sm border-t border-outline-variant pt-lg">
            <button type="button" onClick={onClose} className="pt-btn pt-btn-ghost">
              Batal
            </button>
            <button type="submit" disabled={submitting} className="pt-btn pt-btn-primary">
              {submitting ? "Menyimpan..." : "Simpan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
