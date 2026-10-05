"use client";

// Riwayat Sesi -- pengganti "Riwayat Operasional". Isinya sesi yang sudah
// selesai, diakhiri, atau dibatalkan. Diambil dari daftar sesi yang sama
// (GET /api/admin/events); statusnya ditentukan backend.

import { useState } from "react";
import { History } from "lucide-react";
import { jamTampil, tanggalRingkas, type SesiEvent, type StatusEvent } from "./sesi-utils";

const STATUS_RIWAYAT: Partial<Record<StatusEvent, { label: string; pill: string }>> = {
  selesai_normal: { label: "Selesai", pill: "pt-pill-success" },
  diakhiri_awal: { label: "Diakhiri awal", pill: "pt-pill-warning" },
  dibatalkan: { label: "Dibatalkan", pill: "pt-pill-danger" },
};

function StatusPill({ status }: { status: StatusEvent }) {
  const st = STATUS_RIWAYAT[status] ?? { label: status, pill: "pt-pill-neutral" };
  return <span className={`pt-pill ${st.pill} py-0.5`}>{st.label}</span>;
}

const PER_HALAMAN = 10;

function tanggalTabel(iso: string) {
  const t = tanggalRingkas(iso);
  const d = new Date(`${iso.slice(0, 10)}T00:00:00`);
  const bulanTahun = Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("id-ID", { month: "short", year: "numeric" });
  return `${t.hari}, ${t.tgl} ${bulanTahun}`;
}

export default function RiwayatSesi({ sesiList, loading }: { sesiList: SesiEvent[]; loading: boolean }) {
  const [tampil, setTampil] = useState(PER_HALAMAN);
  const baris = sesiList.slice(0, tampil);

  return (
    <div className="pt-card">
      <div className="mb-md flex items-center gap-sm">
        <History className="h-[18px] w-[18px] text-on-surface-variant" strokeWidth={2} />
        <h3 className="pt-section-title">Riwayat Sesi</h3>
        <span className="ml-auto text-label-sm text-on-surface-variant">{sesiList.length} sesi selesai</span>
      </div>

      {loading ? (
        <div className="h-24 animate-pulse rounded-xl bg-surface-container-high" aria-busy="true" />
      ) : sesiList.length === 0 ? (
        <p className="py-8 text-center text-body-md text-on-surface-variant">
          Belum ada sesi yang selesai. Sesi otomatis masuk ke sini begitu jam selesainya lewat.
        </p>
      ) : (
        <>
          {/* Tabel -- tablet ke atas */}
          <div className="hidden overflow-x-auto sm:block">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-outline-variant text-label-sm text-on-surface-variant">
                  <th className="px-sm py-sm font-medium">Tanggal</th>
                  <th className="px-sm py-sm font-medium">Sesi</th>
                  <th className="px-sm py-sm font-medium">Jam</th>
                  <th className="px-sm py-sm font-medium">Status</th>
                  <th className="px-sm py-sm font-medium">Lokasi</th>
                  <th className="px-sm py-sm text-right font-medium">Pedagang</th>
                </tr>
              </thead>
              <tbody>
                {baris.map((s) => {
                  return (
                    <tr
                      key={s.id}
                      className="border-b border-outline-variant transition-colors last:border-0 hover:bg-surface-container-low/50"
                    >
                      <td className="whitespace-nowrap px-sm py-sm text-body-md text-on-surface">{tanggalTabel(s.tanggal)}</td>
                      <td className="px-sm py-sm text-body-md font-medium text-on-surface">{s.nama}</td>
                      <td className="whitespace-nowrap px-sm py-sm text-body-md tabular-nums text-on-surface-variant">
                        {s.jamMulai ? `${jamTampil(s.jamMulai)} – ${jamTampil(s.jamSelesai)}` : "-"}
                      </td>
                      <td className="px-sm py-sm">
                        <StatusPill status={s.status} />
                      </td>
                      <td className="px-sm py-sm text-body-sm text-on-surface-variant">{s.lokasi ?? "-"}</td>
                      <td className="px-sm py-sm text-right text-body-md tabular-nums text-on-surface">
                        {s.terisiLama + s.terisiBaru}/{s.kuotaTotal}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Kartu -- mobile */}
          <div className="flex flex-col gap-sm sm:hidden">
            {baris.map((s) => {
              return (
                <div key={s.id} className="rounded-xl border border-outline-variant bg-surface-container-low p-md">
                  <div className="flex items-center justify-between gap-sm">
                    <p className="text-body-md font-medium text-on-surface">{s.nama}</p>
                    <StatusPill status={s.status} />
                  </div>
                  <p className="mt-0.5 text-body-sm text-on-surface-variant">
                    {tanggalTabel(s.tanggal)}
                    {s.jamMulai && ` · ${jamTampil(s.jamMulai)} – ${jamTampil(s.jamSelesai)}`}
                  </p>
                  <p className="mt-0.5 text-label-sm text-on-surface-variant">
                    {s.lokasi ?? "Lokasi belum diacak"} · {s.terisiLama + s.terisiBaru}/{s.kuotaTotal} pedagang
                  </p>
                </div>
              );
            })}
          </div>

          {sesiList.length > tampil && (
            <div className="mt-md flex justify-center">
              <button type="button" onClick={() => setTampil((n) => n + PER_HALAMAN)} className="pt-btn pt-btn-ghost">
                Tampilkan {Math.min(PER_HALAMAN, sesiList.length - tampil)} lagi
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}