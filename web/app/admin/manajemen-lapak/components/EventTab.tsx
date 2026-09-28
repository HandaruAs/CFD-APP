"use client";

import { useEffect, useState } from "react";
import { CalendarDays, CalendarPlus, Loader2, Plus, Trash2 } from "lucide-react";
import type { EventDTO, KecamatanLengkapData } from "../types";
import { listEvents, setEventAktif, deleteEvent } from "../api";
import TambahEventModal from "./TambahEventModal";
import { useConfirmDialog } from "./confirm-dialog";

interface Props {
  wilayah: KecamatanLengkapData[];
  // Dipanggil setelah event diaktifkan/dinonaktifkan/dihapus, supaya
  // ringkasan "Lapak terisi (event aktif)" di atas ikut diperbarui.
  onEventBerubah?: () => void;
}

function formatTanggal(iso: string | null, denganHari = false) {
  if (!iso) return "-";
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("id-ID", {
    ...(denganHari ? { weekday: "short" as const } : {}),
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
const jam = (j: string) => (j ?? "").slice(0, 5).replace(":", ".");

export default function EventTab({ wilayah, onEventBerubah }: Props) {
  const confirm = useConfirmDialog();
  const [events, setEvents] = useState<EventDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // diam = true: muat ulang di belakang layar tanpa mengganti tabel dengan
  // skeleton. Dipakai setelah aksi (aktif/nonaktif, hapus), supaya halaman
  // tidak terlihat seperti di-refresh.
  async function load(diam = false) {
    if (!diam) setLoading(true);
    setError(null);
    try {
      const res = await listEvents();
      setEvents(res.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat daftar event.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleToggleAktif(ev: EventDTO) {
    setTogglingId(ev.id);
    // Ubah tampilan dulu (optimistic), baru sinkron dengan server.
    setEvents((list) => list.map((e) => (e.id === ev.id ? { ...e, isActive: !ev.isActive } : e)));
    try {
      await setEventAktif(ev.id, !ev.isActive);
      await load(true);
      onEventBerubah?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengubah status event.");
      await load(true); // kembalikan ke kondisi sebenarnya di server
    } finally {
      setTogglingId(null);
    }
  }

  function handleDelete(ev: EventDTO) {
    const terisi = (ev.jalan ?? []).reduce((s, j) => s + j.terisi, 0);
    confirm({
      title: `Hapus event "${ev.namaEvent}"?`,
      description: "Tindakan ini tidak bisa dibatalkan.",
      details: [
        `${(ev.jalan ?? []).length} ruas jalan ikut dilepas dari event ini`,
        terisi > 0
          ? `${terisi} pedagang sudah check-in di event ini -- riwayatnya tetap aman di tab Laporan`
          : undefined,
      ].filter(Boolean) as string[],
      variant: "danger",
      confirmLabel: "Hapus Event",
      confirmingLabel: "Menghapus...",
      onConfirm: async () => {
        setDeletingId(ev.id);
        try {
          await deleteEvent(ev.id);
          await load(true);
          onEventBerubah?.();
        } finally {
          setDeletingId(null);
        }
      },
    });
  }

  const jumlahAktif = events.filter((e) => e.isActive).length;

  return (
    <div>
      <div className="mb-lg flex flex-wrap items-center justify-between gap-md">
        <div>
          <h3 className="text-title-md text-on-surface">Daftar Event</h3>
          <p className="text-body-sm text-on-surface-variant">
            {loading ? "Memuat..." : `${events.length} event · ${jumlahAktif} aktif`}. Klik status untuk mengaktifkan atau
            menonaktifkan event.
          </p>
        </div>
        <button type="button" onClick={() => setShowModal(true)} className="pt-btn pt-btn-primary">
          <Plus className="h-4 w-4" />
          Tambah Event
        </button>
      </div>

      {error && (
        <div role="alert" className="mb-lg rounded-xl bg-error-container/60 px-md py-sm text-body-sm text-on-error-container">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex flex-col gap-sm" aria-busy="true">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-xl bg-surface-container-high" />
          ))}
        </div>
      ) : events.length === 0 ? (
        <div className="pt-empty rounded-xl border border-dashed border-outline-variant">
          <div className="pt-empty-icon">
            <CalendarDays className="h-6 w-6" />
          </div>
          <p className="text-body-md font-semibold text-on-surface">Belum ada event</p>
          <p className="text-body-sm text-on-surface-variant">Buat event pertama untuk mulai membagi kuota lapak per jalan.</p>
          <button type="button" onClick={() => setShowModal(true)} className="pt-btn pt-btn-secondary mt-sm">
            <CalendarPlus className="h-4 w-4" />
            Buat Event
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-outline-variant">
          <table className="min-w-full divide-y divide-outline-variant text-body-sm">
            <thead className="bg-surface-container-low">
              <tr>
                <Th>Event</Th>
                <Th>Jam</Th>
                <Th>Periode Pendaftaran</Th>
                <Th>Kuota Terisi</Th>
                <Th>Ruas Jalan</Th>
                <Th>Status</Th>
                <Th className="text-right">Aksi</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/60 bg-surface-container-lowest">
              {events.map((ev) => {
                const terisi = (ev.jalan ?? []).reduce((s, j) => s + j.terisi, 0);
                const persen = ev.kuotaTotal > 0 ? Math.min(100, Math.round((terisi / ev.kuotaTotal) * 100)) : 0;
                const jalan = ev.jalan ?? [];
                return (
                  <tr
                    key={ev.id}
                    className={ev.isActive ? "bg-secondary-container/10 shadow-[inset_3px_0_0_var(--color-secondary)]" : ""}
                  >
                    <td className="px-md py-sm">
                      <p className="font-semibold text-on-surface">{ev.namaEvent}</p>
                      <p className="text-label-sm font-normal text-on-surface-variant">{formatTanggal(ev.tanggal, true)}</p>
                    </td>
                    <td className="whitespace-nowrap px-md py-sm tabular-nums text-on-surface-variant">
                      {ev.jamMulai ? `${jam(ev.jamMulai)} – ${jam(ev.jamSelesai)}` : "Belum diatur"}
                    </td>
                    <td className="whitespace-nowrap px-md py-sm text-on-surface-variant">
                      {ev.pendaftaranMulai || ev.pendaftaranSelesai
                        ? `${formatTanggal(ev.pendaftaranMulai)} – ${formatTanggal(ev.pendaftaranSelesai)}`
                        : "Tidak dibatasi"}
                    </td>
                    <td className="min-w-[140px] px-md py-sm">
                      {ev.kuotaTotal > 0 ? (
                        <>
                          <p className="tabular-nums text-on-surface">
                            <span className="font-semibold">{terisi}</span>
                            <span className="text-on-surface-variant"> / {ev.kuotaTotal}</span>
                          </p>
                          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-container-high">
                            <div className="h-full rounded-full bg-primary" style={{ width: `${persen}%` }} />
                          </div>
                        </>
                      ) : (
                        <>
                          <p className="tabular-nums text-on-surface">
                            <span className="font-semibold">{terisi}</span> terisi
                          </p>
                          <p className="text-label-sm font-normal text-on-surface-variant">Kuota belum diatur</p>
                        </>
                      )}
                    </td>
                    <td className="px-md py-sm text-on-surface-variant">
                      {jalan.length === 0 ? (
                        "-"
                      ) : (
                        <span title={jalan.map((j) => j.namaJalan).join(", ")}>
                          {jalan
                            .slice(0, 2)
                            .map((j) => j.namaJalan)
                            .join(", ")}
                          {jalan.length > 2 && (
                            <span className="ml-1 rounded-full bg-surface-container-high px-sm py-0.5 text-label-sm">
                              +{jalan.length - 2}
                            </span>
                          )}
                        </span>
                      )}
                    </td>
                    <td className="px-md py-sm">
                      <button
                        type="button"
                        onClick={() => handleToggleAktif(ev)}
                        disabled={togglingId === ev.id}
                        title={ev.isActive ? "Klik untuk menonaktifkan" : "Klik untuk mengaktifkan"}
                        className={`pt-pill ${ev.isActive ? "pt-pill-success" : "pt-pill-neutral"} cursor-pointer transition-shadow hover:shadow-md disabled:opacity-50`}
                      >
                        {togglingId === ev.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <span className={`pt-pill-dot ${ev.isActive ? "is-pulse" : ""}`} />
                        )}
                        {ev.isActive ? "Aktif" : "Nonaktif"}
                      </button>
                    </td>
                    <td className="px-md py-sm text-right">
                      <button
                        type="button"
                        onClick={() => handleDelete(ev)}
                        disabled={deletingId === ev.id}
                        title="Hapus event"
                        aria-label={`Hapus event ${ev.namaEvent}`}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:bg-error-container/50 hover:text-error disabled:opacity-50"
                      >
                        {deletingId === ev.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <TambahEventModal
          wilayah={wilayah}
          onClose={() => setShowModal(false)}
          onSaved={() => {
            setShowModal(false);
            load(true);
            onEventBerubah?.();
          }}
        />
      )}
    </div>
  );
}

function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <th className={`whitespace-nowrap px-md py-sm text-left text-label-md font-medium text-on-surface-variant ${className}`}>{children}</th>;
}