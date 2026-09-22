"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { updateJalanBaru } from "../api";
import type { JalanLengkapData } from "../types";

interface Props {
  jalan: JalanLengkapData;
  onClose: () => void;
  onSaved: () => void;
}

// EditJalanModal -- edit kode/nama/kapasitas jalan yang SUDAH ADA.
// Beda dari TambahJalanModal (bikin baru): di sini kode jalan gak
// di-generate ulang otomatis (biar gak diam-diam berubah dan bentrok
// sama data lain yang udah nunjuk ke kode lama), tapi tetap bisa
// diedit manual kalau memang perlu. Kuota jalan ini di event yang
// aktif TETAP diatur lewat modal terpisah ("Atur Kuota Event", ikon
// Settings2) -- gak digabung di sini biar tanggung jawabnya jelas:
// kapasitas = batas fisik jalan (di sini), kuota = alokasi ke 1 event
// tertentu (di modal satunya).
export default function EditJalanModal({ jalan, onClose, onSaved }: Props) {
  const [namaJalan, setNamaJalan] = useState(jalan.namaJalan);
  const [kodeJalan, setKodeJalan] = useState(jalan.kodeJalan);
  const [kapasitas, setKapasitas] = useState(String(jalan.kapasitas));
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const nKapasitas = parseInt(kapasitas, 10) || 0;
    if (nKapasitas <= 0) {
      setError("Kapasitas harus lebih dari 0.");
      return;
    }
    if (jalan.terisi > 0 && nKapasitas < jalan.terisi) {
      setError(`Kapasitas tidak boleh kurang dari ${jalan.terisi} (jumlah lapak yang sudah terisi di jalan ini).`);
      return;
    }

    setSubmitting(true);
    try {
      await updateJalanBaru(jalan.id, {
        kodeJalan,
        namaJalan,
        kapasitas: nKapasitas,
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memperbarui jalan.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="pt-modal-overlay" onClick={onClose}>
      <div className="pt-modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-outline-variant px-lg py-md">
          <h2 className="text-title-lg text-on-surface">Edit Jalan — {jalan.namaJalan}</h2>
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
          <div>
            <label className="pt-field-label mb-1 block">
              Nama Jalan <span className="text-error">*</span>
            </label>
            <input
              required
              value={namaJalan}
              onChange={(e) => setNamaJalan(e.target.value)}
              className="pt-input"
            />
          </div>
          <div className="grid grid-cols-2 gap-md">
            <div>
              <label className="pt-field-label mb-1 block">
                Kode Jalan <span className="text-error">*</span>
              </label>
              <input
                required
                value={kodeJalan}
                onChange={(e) => setKodeJalan(e.target.value.toUpperCase())}
                className="pt-input"
              />
            </div>
            <div>
              <label className="pt-field-label mb-1 block">
                Kapasitas <span className="text-error">*</span>
              </label>
              <input
                required
                type="number"
                min={1}
                value={kapasitas}
                onChange={(e) => setKapasitas(e.target.value)}
                className="pt-input"
              />
            </div>
          </div>
          <p className="text-label-sm text-on-surface-variant">
            Kuota jalan ini di sebuah event diatur terpisah lewat tombol{" "}
            <span className="font-medium text-on-surface">Atur Kuota Event</span> di tabel Jalan.
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