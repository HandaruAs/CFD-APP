"use client";

import { useEffect, useState } from "react";
import { Plus, Loader2, Trash2 } from "lucide-react";
import type { EventDTO, KecamatanLengkapData } from "../types";
import { listEvents, setEventAktif, deleteEvent } from "../api";
import TambahEventModal from "./TambahEventModal";
import { useConfirmDialog } from "./confirm-dialog";

interface Props {
  wilayah: KecamatanLengkapData[];
}

function formatTanggal(iso: string | null) {
  if (!iso) return "-";
  try {
    return new Date(iso).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

export default function EventTab({ wilayah }: Props) {
  const confirm = useConfirmDialog();
  const [events, setEvents] = useState<EventDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
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
    try {
      await setEventAktif(ev.id, !ev.isActive);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengubah status event.");
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
          await load();
        } finally {
          setDeletingId(null);
        }
      },
    });
  }

  return (
    <div>
      <div className="mb-lg flex items-center justify-between gap-md">
        <p className="text-body-sm text-on-surface-variant">Total {events.length} event</p>
        <button onClick={() => setShowModal(true)} className="pt-btn pt-btn-primary">
          <Plus className="h-4 w-4" />
          Tambah Event
        </button>
      </div>

      {error && (
        <div className="mb-lg rounded-xl bg-error-container/60 px-md py-sm text-body-sm text-on-error-container">
          {error}
        </div>
      )}

      {loading ? (
        <div className="pt-loading">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="text-body-sm">Memuat data...</span>
        </div>
      ) : events.length === 0 ? (
        <div className="pt-empty">
          <div className="pt-empty-icon">
            <Plus className="h-6 w-6" />
          </div>
          <p className="text-body-sm text-on-surface-variant">Belum ada event.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-outline-variant">
          <table className="min-w-full divide-y divide-outline-variant text-body-sm">
            <thead className="bg-surface-container-low">
              <tr>
                <Th>Nama Event</Th>
                <Th>Tanggal</Th>
                <Th>Jam</Th>
                <Th>Periode Pendaftaran</Th>
                <Th>Kuota</Th>
                <Th>Ruas Jalan</Th>
                <Th>Status</Th>
                <Th>Aksi</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/60 bg-surface-container-lowest">
              {events.map((ev) => {
                const terisi = (ev.jalan ?? []).reduce((s, j) => s + j.terisi, 0);
                return (
                  <tr key={ev.id} className="hover:bg-surface-container-low">
                    <td className="px-md py-sm font-medium text-on-surface">{ev.namaEvent}</td>
                    <td className="px-md py-sm text-on-surface-variant">{formatTanggal(ev.tanggal)}</td>
                    <td className="px-md py-sm text-on-surface-variant">
                      {ev.jamMulai} - {ev.jamSelesai}
                    </td>
                    <td className="px-md py-sm text-on-surface-variant">
                      {formatTanggal(ev.pendaftaranMulai)} – {formatTanggal(ev.pendaftaranSelesai)}
                    </td>
                    <td className="px-md py-sm text-on-surface-variant">
                      {terisi}/{ev.kuotaTotal}
                    </td>
                    <td className="px-md py-sm text-on-surface-variant">
                      {(ev.jalan ?? []).length > 0 ? ev.jalan.map((j) => j.namaJalan).join(", ") : "-"}
                    </td>
                    <td className="px-md py-sm">
                      <button
                        onClick={() => handleToggleAktif(ev)}
                        disabled={togglingId === ev.id}
                        className={`pt-pill ${ev.isActive ? "pt-pill-success" : "pt-pill-neutral"} disabled:opacity-50`}
                      >
                        <span className="pt-pill-dot" />
                        {ev.isActive ? "Aktif" : "Nonaktif"}
                      </button>
                    </td>
                    <td className="px-md py-sm text-right">
                      <button
                        onClick={() => handleDelete(ev)}
                        disabled={deletingId === ev.id}
                        title="Hapus event"
                        className="pt-btn pt-btn-ghost-danger min-h-0 px-sm py-1 text-label-sm disabled:opacity-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
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
            load();
          }}
        />
      )}
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-md py-sm text-left text-label-sm uppercase tracking-wide text-on-surface-variant">
      {children}
    </th>
  );
}