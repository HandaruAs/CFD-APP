"use client";

import { useState } from "react";
import { X, Loader2, CheckCircle2 } from "lucide-react";
import type { EventDTO, KecamatanLengkapData } from "../types";
import { updateKuotaJalanEvent } from "../api";

interface Props {
  event: EventDTO;
  wilayah: KecamatanLengkapData[];
  onClose: () => void;
  onSaved: () => void;
}

interface BarisKuota {
  jalanId: string;
  namaJalan: string;
  terisi: number;
  kapasitas: number;
  kuota: string;
  dirty: boolean;
  saved: boolean;
}

// Edit kuota per jalan untuk SATU event tertentu (aktif ATAU belum),
// jadi petugas gak perlu nunggu event-nya diaktifkan dulu buat
// nyesuain kuota yang udah disiapkan pas Tambah Event. Beda dari
// AssignKuotaEventModal yang khusus buat jalan baru yang nyusul masuk
// ke event yang LAGI aktif.
export default function EditKuotaEventModal({ event, wilayah, onClose, onSaved }: Props) {
  const kapasitasByJalanId = new Map<string, number>();
  for (const k of wilayah) {
    for (const j of k.jalan ?? []) kapasitasByJalanId.set(j.id, j.kapasitas);
  }

  const [rows, setRows] = useState<BarisKuota[]>(
    (event.jalan ?? []).map((j) => ({
      jalanId: j.jalanId,
      namaJalan: j.namaJalan,
      terisi: j.terisi,
      kapasitas: kapasitasByJalanId.get(j.jalanId) ?? j.kuota,
      kuota: String(j.kuota),
      dirty: false,
      saved: false,
    }))
  );
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  function setKuota(jalanId: string, kuota: string) {
    setRows((prev) => prev.map((r) => (r.jalanId === jalanId ? { ...r, kuota, dirty: true, saved: false } : r)));
  }

  async function handleSimpan(row: BarisKuota) {
    setError(null);
    const nKuota = parseInt(row.kuota, 10) || 0;
    if (nKuota < row.terisi) {
      setError(`Kuota "${row.namaJalan}" tidak boleh kurang dari ${row.terisi} (sudah check-in di jalan ini).`);
      return;
    }
    if (nKuota > row.kapasitas) {
      setError(`Kuota "${row.namaJalan}" tidak boleh melebihi kapasitas jalan ini (${row.kapasitas}).`);
      return;
    }
    setSavingId(row.jalanId);
    try {
      await updateKuotaJalanEvent(event.id, row.jalanId, nKuota);
      setRows((prev) => prev.map((r) => (r.jalanId === row.jalanId ? { ...r, dirty: false, saved: true } : r)));
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan kuota.");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="pt-modal-overlay" onClick={onClose}>
      <div className="pt-modal-box max-w-lg" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-outline-variant px-lg py-md">
          <h2 className="text-title-lg text-on-surface">Edit Kuota Jalan — {event.namaEvent}</h2>
          <button type="button" onClick={onClose} className="pt-modal-close" aria-label="Tutup">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-md px-lg py-lg">
          <p className="text-body-sm text-on-surface-variant">
            Kuota tiap jalan di event ini bisa diubah kapan saja -- event{" "}
            <strong>{event.isActive ? "sedang aktif" : "belum aktif"}</strong>, tidak perlu menunggu diaktifkan
            dulu. Kuota tidak bisa diturunkan di bawah jumlah pedagang yang sudah check-in.
          </p>

          {error && (
            <div className="rounded-xl bg-error-container/60 px-md py-sm text-body-sm text-on-error-container">
              {error}
            </div>
          )}

          {rows.length === 0 ? (
            <p className="text-body-sm text-on-surface-variant">Event ini belum punya jalan yang diikutkan.</p>
          ) : (
            <div className="max-h-80 space-y-sm overflow-y-auto">
              {rows.map((row) => (
                <div
                  key={row.jalanId}
                  className="flex items-center gap-sm rounded-xl border border-outline-variant p-sm"
                >
                  <div className="flex-1">
                    <p className="text-body-sm font-medium text-on-surface">{row.namaJalan}</p>
                    <p className="text-label-sm text-on-surface-variant">
                      Terisi {row.terisi} &middot; Kapasitas {row.kapasitas}
                    </p>
                  </div>
                  <input
                    type="number"
                    min={row.terisi}
                    max={row.kapasitas}
                    value={row.kuota}
                    onChange={(e) => setKuota(row.jalanId, e.target.value)}
                    className="pt-input w-24 py-1.5"
                  />
                  <button
                    type="button"
                    onClick={() => handleSimpan(row)}
                    disabled={!row.dirty || savingId === row.jalanId}
                    className="pt-btn pt-btn-secondary min-h-0 px-sm py-1.5 text-label-sm disabled:opacity-50"
                  >
                    {savingId === row.jalanId ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : row.saved ? (
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    ) : null}
                    Simpan
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end border-t border-outline-variant pt-lg">
            <button type="button" onClick={onClose} className="pt-btn pt-btn-ghost">
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
