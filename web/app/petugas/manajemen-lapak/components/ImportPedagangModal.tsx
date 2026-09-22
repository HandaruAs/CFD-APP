"use client";

import { useState } from "react";
import { X, Upload } from "lucide-react";
import type { ImportPedagangResult } from "../types";
import { importPedagang } from "../api";

interface Props {
  onClose: () => void;
  onSaved: () => void;
}

export default function ImportPedagangModal({ onClose, onSaved }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportPedagangResult | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setError("Pilih file dulu.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const res = await importPedagang(file);
      setResult(res);
      if (res.gagal === 0) {
        onSaved();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengimpor file.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="pt-modal-overlay">
      <div className="pt-modal-box">
        <div className="flex items-center justify-between border-b border-outline-variant px-lg py-md">
          <h2 className="text-title-lg text-on-surface">Import Pedagang dari File</h2>
          <button type="button" onClick={onClose} className="pt-modal-close" aria-label="Tutup">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-md px-lg py-lg">
          <p className="text-body-sm text-on-surface-variant">
            Upload file <strong>.csv</strong> atau <strong>.json</strong>. Semua pedagang dari file ini otomatis
            tercatat sebagai <strong>Pedagang Lama</strong>.
          </p>
          <p className="text-label-sm text-on-surface-variant">
            Format CSV (baris pertama header):
            <br />
            <code>nama_lengkap,nik,email,nama_usaha,jenis_dagangan,phone,alamat,lokasi_lapak,tanggal_lahir,jenis_lapak</code>
            <br />
            Kolom nama_lengkap, nik, email, nama_usaha wajib ada isinya; sisanya boleh dikosongin.
            <br />
            Excel: simpan dulu sebagai CSV (File → Save As → CSV) sebelum di-upload.
          </p>

          <input
            type="file"
            accept=".csv,.json"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="pt-input"
          />

          {error && (
            <div className="rounded-xl bg-error-container/60 px-md py-sm text-body-sm text-on-error-container">
              {error}
            </div>
          )}

          {result && (
            <div
              className={`rounded-xl px-md py-sm text-body-sm ${
                result.gagal === 0 ? "bg-secondary-container/40 text-on-secondary-container" : "bg-tertiary-container/30"
              }`}
            >
              <p>
                Berhasil: <strong>{result.berhasil}</strong> &middot; Gagal: <strong>{result.gagal}</strong>
              </p>
              {result.errors.length > 0 && (
                <ul className="mt-sm list-disc space-y-1 pl-lg text-label-sm">
                  {result.errors.map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <div className="flex justify-end gap-sm border-t border-outline-variant pt-lg">
            <button type="button" onClick={onClose} className="pt-btn pt-btn-ghost">
              {result ? "Tutup" : "Batal"}
            </button>
            <button type="submit" disabled={submitting} className="pt-btn pt-btn-primary">
              <Upload className="h-4 w-4" />
              {submitting ? "Mengimpor..." : "Import"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
