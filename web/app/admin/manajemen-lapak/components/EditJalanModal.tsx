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

// EditJalanModal -- edit kode/nama jalan yang SUDAH ADA.
// Beda dari TambahJalanModal (bikin baru): di sini kode jalan gak
// di-generate ulang otomatis (biar gak diam-diam berubah dan bentrok
// sama data lain yang udah nunjuk ke kode lama), tapi tetap bisa
// diedit manual kalau memang perlu. Kapasitas/kuota tidak diatur di
// sini -- kuota diatur per sesi di Jam Operasional.
export default function EditJalanModal({ jalan, onClose, onSaved }: Props) {
  const [namaJalan, setNamaJalan] = useState(jalan.namaJalan);
  const [kodeJalan, setKodeJalan] = useState(jalan.kodeJalan);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    setSubmitting(true);
    try {
      await updateJalanBaru(jalan.id, {
        kodeJalan,
        namaJalan,
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