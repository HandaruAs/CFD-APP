"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { createKecamatan } from "../api";

interface Props {
  onClose: () => void;
  onSaved: () => void;
}

export default function TambahKecamatanModal({ onClose, onSaved }: Props) {
  const [namaKecamatan, setNamaKecamatan] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await createKecamatan(namaKecamatan);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menambahkan kecamatan.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="pt-modal-overlay">
      <div className="pt-modal-box">
        <div className="flex items-center justify-between border-b border-outline-variant px-lg py-md">
          <h2 className="text-title-lg text-on-surface">Tambah Kecamatan</h2>
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
              Nama Kecamatan <span className="text-error">*</span>
            </label>
            <input
              required
              value={namaKecamatan}
              onChange={(e) => setNamaKecamatan(e.target.value)}
              placeholder="mis. Sukolilo"
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
