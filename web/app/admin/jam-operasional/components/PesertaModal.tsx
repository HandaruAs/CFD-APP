"use client";

// Daftar pedagang yang ikut satu sesi (GET /api/admin/events/:id/peserta).

import { useEffect, useState } from "react";
import { Loader2, Users, X } from "lucide-react";
import { apiEvent, type SesiEvent } from "./sesi-utils";

type Peserta = {
  id: string;
  namaLengkap: string | null;
  namaUsaha: string | null;
  kategori: "lama" | "baru";
  kuotaDipakai: "lama" | "baru";
  status: "terdaftar" | "check_in" | "check_out" | "batal" | "tidak_hadir";
  namaJalan: string;
  namaRuas: string;
  nomor: number;
};

const STATUS: Record<Peserta["status"], { label: string; pill: string }> = {
  terdaftar: { label: "Terdaftar", pill: "pt-pill-warning" },
  check_in: { label: "Check-in", pill: "pt-pill-success" },
  check_out: { label: "Check-out", pill: "pt-pill-neutral" },
  batal: { label: "Batal", pill: "pt-pill-danger" },
  tidak_hadir: { label: "Tidak Hadir", pill: "pt-pill-danger" },
};

export default function PesertaModal({ sesi, onClose }: { sesi: SesiEvent; onClose: () => void }) {
  const [list, setList] = useState<Peserta[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiEvent<{ data: Peserta[] }>(`/api/admin/events/${sesi.id}/peserta`)
      .then((res) => setList(res.data))
      .catch((err) => setError(err instanceof Error ? err.message : "Gagal memuat peserta."));
  }, [sesi.id]);

  return (
    <div className="pt-modal-overlay" onClick={onClose}>
      <div className="pt-modal-box max-w-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-outline-variant px-lg py-md">
          <div>
            <h2 className="text-title-lg text-on-surface">Peserta Sesi</h2>
            <p className="text-body-sm text-on-surface-variant">{sesi.nama}</p>
          </div>
          <button type="button" onClick={onClose} className="pt-modal-close" aria-label="Tutup">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-lg py-md">
          {error ? (
            <p role="alert" className="text-body-sm text-error">
              {error}
            </p>
          ) : !list ? (
            <div className="pt-loading">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : list.length === 0 ? (
            <div className="pt-empty">
              <span className="pt-empty-icon">
                <Users className="h-6 w-6" />
              </span>
              <p className="text-body-md text-on-surface-variant">Belum ada pedagang yang ikut sesi ini.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-outline-variant text-label-sm text-on-surface-variant">
                    <th className="px-sm py-sm font-medium">Pedagang</th>
                    <th className="px-sm py-sm font-medium">Kategori</th>
                    <th className="px-sm py-sm font-medium">Lokasi</th>
                    <th className="px-sm py-sm text-right font-medium">No.</th>
                    <th className="px-sm py-sm font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((p) => (
                    <tr key={p.id} className="border-b border-outline-variant last:border-0">
                      <td className="px-sm py-sm">
                        <p className="text-body-md text-on-surface">{p.namaLengkap ?? "-"}</p>
                        <p className="text-label-sm text-on-surface-variant">{p.namaUsaha ?? "-"}</p>
                      </td>
                      <td className="px-sm py-sm text-body-sm text-on-surface-variant">
                        {p.kategori === "lama" ? "Lama" : "Baru"}
                        {p.kategori !== p.kuotaDipakai && (
                          <span className="block text-label-sm">pakai kuota {p.kuotaDipakai}</span>
                        )}
                      </td>
                      <td className="px-sm py-sm text-body-sm text-on-surface-variant">
                        {p.namaJalan} · {p.namaRuas}
                      </td>
                      <td className="px-sm py-sm text-right text-body-md font-semibold tabular-nums text-on-surface">
                        {p.nomor}
                      </td>
                      <td className="px-sm py-sm">
                        <span className={`pt-pill ${STATUS[p.status].pill}`}>{STATUS[p.status].label}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
