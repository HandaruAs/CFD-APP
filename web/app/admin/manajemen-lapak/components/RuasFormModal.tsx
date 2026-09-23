"use client";

import { useMemo, useState } from "react";
import { X } from "lucide-react";
import type { KecamatanLengkapData, RuasData } from "../types";
import { createRuas, updateRuas } from "../api";

interface Props {
  wilayah: KecamatanLengkapData[];
  ruas: RuasData | null; // null = mode tambah
  initialJalanId?: string; // dipakai kalau modal dibuka dari konteks 1 jalan tertentu
  initialNamaJalan?: string;
  lockJalan?: boolean; // true = dropdown Jalan disembunyikan, jalan udah fix dari initialJalanId
  onClose: () => void;
  onSaved: () => void;
}

export default function RuasFormModal({ wilayah, ruas, initialJalanId, initialNamaJalan, lockJalan, onClose, onSaved }: Props) {
  const [jalanId, setJalanId] = useState(initialJalanId ?? "");
  const [namaRuas, setNamaRuas] = useState(ruas?.namaRuas ?? "");
  const [kuota, setKuota] = useState(String(ruas?.kuota ?? ""));
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Daftar jalan buat dropdown -- cuma dipakai pas mode tambah (ruas === null),
  // karena ruas yang udah ada gak bisa dipindah ke jalan lain lewat sini.
  const daftarJalan = useMemo(
    () => wilayah.flatMap((k) => k.jalan.map((j) => ({ ...j, kecamatan: k.kecamatan }))),
    [wilayah]
  );
  const jalanTerpilih = daftarJalan.find((j) => j.id === jalanId);
  const namaJalanTampil = ruas ? initialNamaJalan ?? "" : lockJalan ? initialNamaJalan ?? "" : jalanTerpilih?.namaJalan ?? "";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!ruas && !jalanId) {
      setError("Pilih jalan dulu.");
      return;
    }

    const nKuota = parseInt(kuota, 10);

    setSubmitting(true);
    try {
      if (ruas) {
        await updateRuas(ruas.id, {
          namaRuas,
          kuota: nKuota,
        });
      } else {
        await createRuas({ jalanId, namaRuas, kuota: nKuota });
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan ruas.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="pt-modal-overlay">
      <div className="pt-modal-box">
        <div className="flex items-center justify-between border-b border-outline-variant px-lg py-md">
          <h2 className="text-title-lg text-on-surface">
            {ruas ? "Ubah Data" : "Tambah Data"}
            {namaJalanTampil ? ` — ${namaJalanTampil}` : ""}
          </h2>
          <button type="button" onClick={onClose} className="pt-modal-close" aria-label="Tutup">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-md px-lg py-lg">
          {error && (
            <div className="rounded-xl bg-error-container/60 px-md py-sm text-body-sm text-on-error-container">
              {error}
            </div>
          )}

          {!ruas && !lockJalan && (
            <div>
              <label className="pt-field-label mb-1 block">
                Jalan <span className="text-error">*</span>
              </label>
              <select required value={jalanId} onChange={(e) => setJalanId(e.target.value)} className="pt-input">
                <option value="">Pilih jalan...</option>
                {daftarJalan.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.namaJalan} ({j.kecamatan})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-md">
            <div>
              <label className="pt-field-label mb-1 block">
                Nama Ruas <span className="text-error">*</span>
              </label>
              <input
                required
                value={namaRuas}
                onChange={(e) => setNamaRuas(e.target.value)}
                placeholder="Jl. Progo"
                className="pt-input"
              />
            </div>
            <div>
              <label className="pt-field-label mb-1 block">
                Kuota <span className="text-error">*</span>
              </label>
              <input
                required
                type="number"
                min={1}
                value={kuota}
                onChange={(e) => setKuota(e.target.value)}
                className="pt-input"
              />
            </div>
          </div>

          <p className="-mt-sm text-label-sm text-on-surface-variant">
            Urutan &amp; nomor lapak ruas ini ditentukan otomatis (petugas cuma isi nama &amp; kuota) -- termasuk
            siapa yang menempatinya (lama/baru), bisa dilihat di tabel Ruas Jalan setelah disimpan.
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