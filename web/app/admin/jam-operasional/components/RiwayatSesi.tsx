"use client";

// Riwayat Sesi -- pengganti "Riwayat Operasional". Isinya sesi yang sudah
// dibuat lewat Tambah Sesi dan jam selesainya sudah lewat. Diambil dari
// daftar sesi yang sama (GET /api/petugas/manajemen-lapak/event), bukan
// dari riwayat /jam-operasional lagi.

import { useState } from "react";
import { History } from "lucide-react";
import type { EventDTO } from "../../manajemen-lapak/types";
import { jamTampil, tanggalRingkas } from "./sesi-utils";

const PER_HALAMAN = 10;

function tanggalTabel(iso: string) {
  const t = tanggalRingkas(iso);
  const d = new Date(`${iso.slice(0, 10)}T00:00:00`);
  const bulanTahun = Number.isNaN(d.getTime())
    ? ""
    : d.toLocaleDateString("id-ID", { month: "short", year: "numeric" });
  return `${t.hari}, ${t.tgl} ${bulanTahun}`;
}

export default function RiwayatSesi({ sesiList, loading }: { sesiList: EventDTO[]; loading: boolean }) {
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
                  <th className="px-sm py-sm font-medium">Jalan</th>
                  <th className="px-sm py-sm text-right font-medium">Lapak terisi</th>
                </tr>
              </thead>
              <tbody>
                {baris.map((s) => {
                  const jalan = s.jalan ?? [];
                  return (
                    <tr
                      key={s.id}
                      className="border-b border-outline-variant transition-colors last:border-0 hover:bg-surface-container-low/50"
                    >
                      <td className="whitespace-nowrap px-sm py-sm text-body-md text-on-surface">{tanggalTabel(s.tanggal)}</td>
                      <td className="px-sm py-sm text-body-md font-medium text-on-surface">{s.namaEvent}</td>
                      <td className="whitespace-nowrap px-sm py-sm text-body-md tabular-nums text-on-surface-variant">
                        {s.jamMulai ? `${jamTampil(s.jamMulai)} – ${jamTampil(s.jamSelesai)}` : "-"}
                      </td>
                      <td
                        className="max-w-[16rem] truncate px-sm py-sm text-body-md text-on-surface-variant"
                        title={jalan.map((j) => j.namaJalan).join(", ")}
                      >
                        {jalan.length === 0 ? "-" : jalan.map((j) => j.namaJalan).join(", ")}
                      </td>
                      <td className="px-sm py-sm text-right text-body-md tabular-nums text-on-surface">
                        {jalan.reduce((n, j) => n + j.terisi, 0)}
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
              const jalan = s.jalan ?? [];
              return (
                <div key={s.id} className="rounded-xl border border-outline-variant bg-surface-container-low p-md">
                  <p className="text-body-md font-medium text-on-surface">{s.namaEvent}</p>
                  <p className="mt-0.5 text-body-sm text-on-surface-variant">
                    {tanggalTabel(s.tanggal)}
                    {s.jamMulai && ` · ${jamTampil(s.jamMulai)} – ${jamTampil(s.jamSelesai)}`}
                  </p>
                  <p className="mt-0.5 text-label-sm text-on-surface-variant">
                    {jalan.length} jalan · {jalan.reduce((n, j) => n + j.terisi, 0)} lapak terisi
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
