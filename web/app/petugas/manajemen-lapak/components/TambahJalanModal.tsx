"use client";

import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { createJalanBaru } from "../api";
import type { KecamatanLengkapData } from "../types";

interface Props {
  wilayah: KecamatanLengkapData[];
  initialKecamatanId?: string | null;
  onClose: () => void;
  onSaved: () => void;
}

// Kode Jalan di-generate otomatis dari Kecamatan + Nama Jalan, misal:
// Kecamatan "Genteng" + "Jalan Kertajaya" -> "GENTENG-KERTAJAYA"
// Digabung sama kecamatan (bukan cuma nama jalan) karena kode_jalan
// unique global di DB -- nama jalan yang sama di kecamatan berbeda
// (mis. dua "Jalan Pemuda") bakal bentrok kalau cuma dari nama jalan.
// Kalau perlu diedit manual, lakukan langsung di tabel Kecamatan
// (bukan di form tambah ini).
function bersihkan(teks: string): string {
  return teks
    .replace(/\bjalan\b/gi, "")
    .replace(/\braya\b/gi, "")
    .replace(/[^a-zA-Z0-9\s]/g, "")
    .trim()
    .replace(/\s+/g, "")
    .toUpperCase();
}

function generateKodeJalan(namaKecamatan: string, namaJalan: string): string {
  const kec = bersihkan(namaKecamatan);
  const jln = bersihkan(namaJalan);
  if (!kec || !jln) return "";
  return `${kec}-${jln}`;
}

export default function TambahJalanModal({ wilayah, initialKecamatanId, onClose, onSaved }: Props) {
  // Hanya kecamatan dengan ID instansi valid yang bisa dipilih -- "Tanpa
  // Kecamatan" (kecamatanId null) bukan kecamatan asli, jadi disaring.
  const kecamatanOptions = useMemo(
    () => wilayah.filter((k): k is KecamatanLengkapData & { kecamatanId: string } => !!k.kecamatanId),
    [wilayah]
  );

  const [kecamatanId, setKecamatanId] = useState(
    initialKecamatanId && kecamatanOptions.some((k) => k.kecamatanId === initialKecamatanId)
      ? initialKecamatanId
      : kecamatanOptions[0]?.kecamatanId ?? ""
  );
  const [namaJalan, setNamaJalan] = useState("");
  const [kapasitas, setKapasitas] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const namaKecamatanTerpilih = kecamatanOptions.find((k) => k.kecamatanId === kecamatanId)?.kecamatan ?? "";
  const kodeJalan = useMemo(
    () => generateKodeJalan(namaKecamatanTerpilih, namaJalan),
    [namaKecamatanTerpilih, namaJalan]
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!kecamatanId) {
      setError("Pilih kecamatan dulu.");
      return;
    }
    if (!kodeJalan) {
      setError("Nama jalan belum menghasilkan kode jalan yang valid.");
      return;
    }

    setSubmitting(true);
    try {
      await createJalanBaru({
        kecamatanId,
        kodeJalan,
        namaJalan,
        kapasitas: parseInt(kapasitas, 10) || 0,
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menambahkan jalan.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="pt-modal-overlay">
      <div className="pt-modal-box">
        <div className="flex items-center justify-between border-b border-outline-variant px-lg py-md">
          <h2 className="text-title-lg text-on-surface">Tambah Jalan</h2>
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
              Kecamatan <span className="text-error">*</span>
            </label>
            <select
              required
              value={kecamatanId}
              onChange={(e) => setKecamatanId(e.target.value)}
              className="pt-input"
              disabled={kecamatanOptions.length === 0}
            >
              {kecamatanOptions.length === 0 && <option value="">Belum ada kecamatan</option>}
              {kecamatanOptions.map((k) => (
                <option key={k.kecamatanId} value={k.kecamatanId}>
                  {k.kecamatan}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="pt-field-label mb-1 block">
              Nama Jalan <span className="text-error">*</span>
            </label>
            <input
              required
              value={namaJalan}
              onChange={(e) => setNamaJalan(e.target.value)}
              className="pt-input"
              placeholder="Jalan Kertajaya"
            />
          </div>
          <div className="grid grid-cols-2 gap-md">
            <div>
              <label className="pt-field-label mb-1 block">Kode Jalan</label>
              <input
                readOnly
                value={kodeJalan}
                placeholder="Terisi otomatis"
                className="pt-input cursor-not-allowed bg-surface-container-high text-on-surface-variant"
                title="Otomatis dari Kecamatan + Nama Jalan. Untuk edit manual, ubah langsung di tabel Kecamatan."
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
          <div className="flex justify-end gap-sm border-t border-outline-variant pt-lg">
            <button type="button" onClick={onClose} className="pt-btn pt-btn-ghost">
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting || !kecamatanId}
              className="pt-btn pt-btn-primary"
            >
              {submitting ? "Menyimpan..." : "Simpan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}