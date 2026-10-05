"use client";

// Ubah kuota satu sesi: kuota total & jatah pedagang lama (jatah baru =
// sisanya). Disimpan lewat PUT /api/admin/events/:id -- data sesi lain
// (nama, tanggal, jam, jadwal pendaftaran) dikirim apa adanya.
//
// Aturan dari backend:
//   - kuota tidak boleh di bawah pedagang yang sudah terdaftar (per jatah);
//   - setelah pendaftaran dibuka, kuota total hanya boleh naik.
// Lokasi sesi otomatis muat sebanyak kuota yang baru.

import { useState } from "react";
import { Info, Loader2, X } from "lucide-react";
import { apiEvent, type SesiEvent } from "./sesi-utils";

interface Props {
  sesi: SesiEvent;
  onClose: () => void;
  onSaved: (pesan: string) => void;
}

export default function UbahKuotaModal({ sesi, onClose, onSaved }: Props) {
  const [kuotaTotal, setKuotaTotal] = useState(String(sesi.kuotaTotal));
  const [kuotaLama, setKuotaLama] = useState(String(sesi.kuotaLama));
  const [menyimpan, setMenyimpan] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const total = parseInt(kuotaTotal, 10) || 0;
  const lama = parseInt(kuotaLama, 10) || 0;
  const terisi = sesi.terisiLama + sesi.terisiBaru;

  async function simpan(e: React.FormEvent) {
    e.preventDefault();
    if (total < 1) {
      setError("Jumlah pedagang minimal 1.");
      return;
    }
    if (lama < 0 || lama > total) {
      setError("Jatah pedagang lama harus antara 0 dan jumlah pedagang.");
      return;
    }
    setMenyimpan(true);
    setError(null);
    try {
      await apiEvent(`/api/admin/events/${sesi.id}`, {
        method: "PUT",
        body: JSON.stringify({
          nama: sesi.nama,
          tanggal: sesi.tanggal.slice(0, 10),
          jamMulai: sesi.jamMulai,
          jamSelesai: sesi.jamSelesai,
          pendaftaranBukaAt: sesi.pendaftaranBukaAt,
          pendaftaranTutupAt: sesi.pendaftaranTutupAt,
          lepasKuotaAt: sesi.lepasKuotaAt,
          keterangan: sesi.keterangan,
          kuotaTotal: total,
          kuotaLama: lama,
        }),
      });
      onSaved(`✅ Jumlah pedagang sesi "${sesi.nama}" diperbarui`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan kuota.");
      setMenyimpan(false);
    }
  }

  return (
    <div className="pt-modal-overlay">
      <div className="pt-modal-box">
        <div className="flex items-center justify-between border-b border-outline-variant px-lg py-md">
          <div>
            <h2 className="text-title-lg text-on-surface">Ubah Jumlah Pedagang</h2>
            <p className="text-body-sm text-on-surface-variant">{sesi.nama}</p>
          </div>
          <button type="button" onClick={onClose} disabled={menyimpan} className="pt-modal-close" aria-label="Tutup">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={simpan} className="flex min-h-0 flex-col">
          <div className="min-h-0 flex-1 space-y-md overflow-y-auto px-lg py-lg">
            {error && (
              <div role="alert" className="rounded-xl bg-error-container/60 px-md py-sm text-body-sm text-on-error-container">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 gap-md sm:grid-cols-2">
              <div>
                <label htmlFor="ubah-kuota" className="pt-field-label mb-1 block">
                  Jumlah pedagang di sesi ini
                </label>
                <input
                  id="ubah-kuota"
                  type="number"
                  min={1}
                  value={kuotaTotal}
                  onChange={(e) => setKuotaTotal(e.target.value)}
                  className="pt-input"
                  autoFocus
                />
              </div>
              <div>
                <label htmlFor="ubah-kuota-lama" className="pt-field-label mb-1 block">
                  Dari jumlah itu, untuk pedagang lama
                </label>
                <input
                  id="ubah-kuota-lama"
                  type="number"
                  min={0}
                  value={kuotaLama}
                  onChange={(e) => setKuotaLama(e.target.value)}
                  className="pt-input"
                />
              </div>
            </div>
            <p className="text-label-sm text-on-surface-variant">
              Jatah pedagang baru: <strong className="text-on-surface">{Math.max(0, total - lama)}</strong>
            </p>

            <div className="rounded-xl bg-surface-container-low px-md py-sm text-body-sm text-on-surface-variant">
              <p>
                Sudah terdaftar: <strong className="text-on-surface">{terisi}</strong> pedagang (lama {sesi.terisiLama}, baru{" "}
                {sesi.terisiBaru})
              </p>
              {sesi.lokasi && (
                <p>
                  Lokasi: <strong className="text-on-surface">{sesi.lokasi}</strong>
                </p>
              )}
            </div>

            <p className="flex items-start gap-1.5 text-label-sm text-on-surface-variant">
              <Info className="h-3.5 w-3.5 shrink-0 translate-y-0.5" strokeWidth={2} />
              Jumlah tidak boleh di bawah pedagang yang sudah terdaftar. Setelah pendaftaran dibuka, jumlahnya hanya bisa
              dinaikkan.
            </p>
          </div>

          <div className="flex shrink-0 justify-end gap-sm border-t border-outline-variant px-lg py-md">
            <button type="button" onClick={onClose} disabled={menyimpan} className="pt-btn pt-btn-ghost">
              Batal
            </button>
            <button type="submit" disabled={menyimpan} className="pt-btn pt-btn-primary">
              {menyimpan && <Loader2 className="h-4 w-4 animate-spin" />}
              {menyimpan ? "Menyimpan..." : "Simpan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}