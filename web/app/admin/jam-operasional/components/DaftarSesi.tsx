"use client";

// Sesi Terjadwal -- sesi yang sudah dibuat lewat Tambah Sesi dan BELUM
// selesai (akan datang atau sedang berlangsung). Acak lapak dilakukan di
// form Tambah Sesi, jadi di sini cukup tombol Hapus. Status dihitung dari jam
// yang diisi saat Tambah Sesi; tidak ada aktif/nonaktif manual. Sesi yang
// keliru cukup dihapus lalu dibuat ulang. Begitu jam selesainya lewat,
// sesi pindah ke Riwayat Sesi.

import { CalendarDays, CalendarPlus, Trash2 } from "lucide-react";
import type { EventDTO } from "../../manajemen-lapak/types";
import { deleteEvent } from "../../manajemen-lapak/api";
import { useConfirmDialog } from "../../manajemen-lapak/components/confirm-dialog";
import { jamTampil, statusSesi, tanggalPanjang, tanggalRingkas, todayISO } from "./sesi-utils";

interface Props {
  /** Sesi yang belum selesai, sudah diurutkan dari yang paling dekat. */
  sesiList: EventDTO[];
  now: Date;
  loading: boolean;
  error: string | null;
  onTambah: () => void;
  /** Muat ulang daftar setelah sesi dihapus. */
  onBerubah: () => Promise<void> | void;
}

export default function DaftarSesi({ sesiList, now, loading, error, onTambah, onBerubah }: Props) {
  const confirm = useConfirmDialog();
  const hariIni = todayISO();

  function hapus(s: EventDTO) {
    const terisi = (s.jalan ?? []).reduce((n, j) => n + j.terisi, 0);
    confirm({
      title: `Hapus sesi "${s.namaEvent}"?`,
      description: "Tindakan ini tidak bisa dibatalkan.",
      details: [
        `${(s.jalan ?? []).length} jalan dilepas dari sesi ini`,
        terisi > 0 ? `${terisi} lapak sudah terisi pedagang` : undefined,
      ].filter(Boolean) as string[],
      variant: "danger",
      confirmLabel: "Hapus Sesi",
      confirmingLabel: "Menghapus...",
      onConfirm: async () => {
        await deleteEvent(s.id);
        await onBerubah();
      },
    });
  }

  return (
    <div className="pt-card">
      <div className="mb-md">
        <h3 className="pt-section-title">Sesi Terjadwal</h3>
        <p className="pt-section-desc">
          Sesi yang sudah dibuat dan belum selesai. Sesi mulai dan selesai otomatis sesuai jamnya.
        </p>
      </div>

      {error && (
        <div role="alert" className="mb-md rounded-xl bg-error-container/60 px-md py-sm text-body-sm text-on-error-container">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex flex-col gap-sm" aria-busy="true">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-surface-container-high" />
          ))}
        </div>
      ) : sesiList.length === 0 ? (
        <div className="pt-empty rounded-xl border border-dashed border-outline-variant">
          <div className="pt-empty-icon">
            <CalendarDays className="h-6 w-6" />
          </div>
          <p className="text-body-md font-semibold text-on-surface">Belum ada sesi terjadwal</p>
          <p className="text-body-sm text-on-surface-variant">Tambah sesi, pilih cakupannya, lalu acak lapaknya.</p>
          <button type="button" onClick={onTambah} className="pt-btn pt-btn-secondary mt-sm">
            <CalendarPlus className="h-4 w-4" />
            Tambah Sesi
          </button>
        </div>
      ) : (
        <ul className="flex flex-col gap-sm">
          {sesiList.map((s) => {
            const tgl = s.tanggal?.slice(0, 10) ?? "";
            const t = tanggalRingkas(tgl);
            const berlangsung = statusSesi(s, now) === "berlangsung";
            const jalan = s.jalan ?? [];
            const terisi = jalan.reduce((n, j) => n + j.terisi, 0);
            return (
              <li
                key={s.id}
                className={`flex flex-wrap items-center gap-md rounded-xl border p-md ${
                  berlangsung ? "border-primary/40 bg-primary/5" : "border-outline-variant bg-surface-container-lowest"
                }`}
              >
                {/* Kalender kecil -- memudahkan memindai banyak sesi sekaligus */}
                <div
                  aria-hidden="true"
                  className={`flex w-14 shrink-0 flex-col items-center rounded-lg py-xs leading-tight ${
                    berlangsung ? "bg-primary text-on-primary" : "bg-surface-container-high text-on-surface"
                  }`}
                >
                  <span className="text-label-sm capitalize opacity-90">{t.hari}</span>
                  <span className="text-title-lg font-semibold tabular-nums">{t.tgl}</span>
                  <span className="text-label-sm opacity-90">{t.bulan}</span>
                </div>

                <div className="min-w-0 flex-1 basis-48">
                  <div className="flex flex-wrap items-center gap-xs">
                    <p className="text-body-lg font-semibold text-on-surface">{s.namaEvent}</p>
                    {berlangsung ? (
                      <span className="pt-pill pt-pill-success py-0.5">
                        <span className="pt-pill-dot is-pulse" />
                        Berlangsung
                      </span>
                    ) : (
                      tgl === hariIni && <span className="pt-pill pt-pill-neutral py-0.5">Hari ini</span>
                    )}
                  </div>
                  <p className="text-body-sm text-on-surface-variant">
                    <span className="sr-only">{tanggalPanjang(tgl)}, </span>
                    {jamTampil(s.jamMulai)} – {jamTampil(s.jamSelesai)} WIB
                  </p>
                  <p className="text-label-sm text-on-surface-variant" title={jalan.map((j) => j.namaJalan).join(", ")}>
                    {jalan.length === 0
                      ? "Belum ada jalan yang diikutkan"
                      : `${jalan.length} jalan · ${terisi} lapak terisi`}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-xs">
                  <button
                    type="button"
                    onClick={() => hapus(s)}
                    title="Hapus sesi"
                    aria-label={`Hapus sesi ${s.namaEvent}`}
                    className="pt-btn pt-btn-ghost-danger pt-btn-icon"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
