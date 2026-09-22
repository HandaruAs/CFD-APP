"use client";

import { useState } from "react";
import { X } from "lucide-react";
import type { JalanLengkapData } from "../types";
import { assignJalanKeEventAktif } from "../api";

interface Props {
  jalan: JalanLengkapData;
  onClose: () => void;
  onSaved: () => void;
}

export default function AssignKuotaEventModal({ jalan, onClose, onSaved }: Props) {
  const [kuota, setKuota] = useState(String(jalan.kuotaEvent || jalan.kapasitas || ""));
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const nKuota = parseInt(kuota, 10) || 0;
    if (nKuota > jalan.kapasitas) {
      setError(`Kuota (${nKuota}) tidak boleh melebihi kapasitas jalan ini (${jalan.kapasitas}).`);
      return;
    }
    setSubmitting(true);
    try {
      await assignJalanKeEventAktif(jalan.id, nKuota);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengatur kuota.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="pt-modal-overlay" onClick={onClose}>
      <div className="pt-modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-outline-variant px-lg py-md">
          <h2 className="text-title-lg text-on-surface">Atur Kuota Event — {jalan.namaJalan}</h2>
          <button type="button" onClick={onClose} className="pt-modal-close" aria-label="Tutup">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-md px-lg py-lg">
          <p className="text-body-sm text-on-surface-variant">
            Nambahin/nyesuain kuota jalan ini ke <strong>event yang lagi aktif</strong> -- cocok buat jalan yang
            dibuat setelah event-nya diaktifkan, gak perlu edit ulang event dari awal.
          </p>

          {error && (
            <div className="rounded-xl bg-error-container/60 px-md py-sm text-body-sm text-on-error-container">
              {error}
            </div>
          )}

          <div>
            <label className="pt-field-label mb-1 block">
              Kuota <span className="text-error">*</span>
            </label>
            <input
              required
              type="number"
              min={1}
              max={jalan.kapasitas}
              value={kuota}
              onChange={(e) => setKuota(e.target.value)}
              className="pt-input"
            />
            <p className="mt-xs text-label-sm text-on-surface-variant">
              Kapasitas jalan ini: {jalan.kapasitas} (batas maksimal). Sekarang kepakai di event aktif: {jalan.kuotaEvent}.
            </p>
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