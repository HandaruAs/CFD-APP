"use client";

import { useEffect, useState } from "react";
import { Search, Loader2, ClipboardCheck, Printer, Pencil, Trash2 } from "lucide-react";
import type { KecamatanLengkapData, EventDTO, RegistrasiItem } from "../types";
import { getRegistrasi, listEvents } from "../api";

const LIMIT = 10;

interface Props {
  wilayah: KecamatanLengkapData[];
}

export default function RegistrasiTab({ wilayah }: Props) {
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [ruasId, setRuasId] = useState("");
  const [eventId, setEventId] = useState("");
  const [page, setPage] = useState(1);
  const [events, setEvents] = useState<EventDTO[]>([]);

  useEffect(() => {
    listEvents()
      .then((res) => setEvents(res.data ?? []))
      .catch(() => {});
  }, []);

  const [items, setItems] = useState<RegistrasiItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [belumTersedia, setBelumTersedia] = useState(false);

  // Daftar ruas buat dropdown filter -- diratain dari semua jalan.
  const daftarRuas = wilayah.flatMap((k) =>
    k.jalan.flatMap((j) => (j.ruas ?? []).map((r) => ({ id: r.id, label: `${j.namaJalan} - ${r.namaRuas}` })))
  );

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await getRegistrasi({ search, ruasId, eventId, page, limit: LIMIT });
      setItems(res.data ?? []);
      setTotal(res.total ?? 0);
      setBelumTersedia(false);
    } catch (err) {
      // Endpoint backend-nya belum ada (masih dikerjakan tim lain) --
      // tampilkan state "belum tersedia" yang tenang, bukan error merah.
      setBelumTersedia(true);
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, ruasId, eventId, page]);

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  }

  function handleFilterChange(setter: (v: string) => void) {
    return (v: string) => {
      setPage(1);
      setter(v);
    };
  }

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  return (
    <div>
      <form onSubmit={handleSearchSubmit} className="mb-lg flex flex-wrap items-center gap-sm">
        <div className="flex flex-1 min-w-[220px] items-center gap-sm rounded-md bg-surface-container-low px-md py-sm">
          <Search className="h-4 w-4 text-on-surface-variant" strokeWidth={2} />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Nama, NIK, usaha, atau kode registrasi..."
            className="w-full bg-transparent text-body-md text-on-surface placeholder:text-on-surface-variant focus:outline-none"
          />
        </div>

        <select
          value={ruasId}
          onChange={(e) => handleFilterChange(setRuasId)(e.target.value)}
          className="pt-input w-auto"
        >
          <option value="">Semua ruas</option>
          {daftarRuas.map((r) => (
            <option key={r.id} value={r.id}>
              {r.label}
            </option>
          ))}
        </select>

        <select
          value={eventId}
          onChange={(e) => handleFilterChange(setEventId)(e.target.value)}
          className="pt-input w-auto"
        >
          <option value="">Semua event</option>
          {events.map((ev) => (
            <option key={ev.id} value={ev.id}>
              {ev.namaEvent} - {ev.tanggal}
            </option>
          ))}
        </select>

        <button type="submit" className="pt-btn pt-btn-primary">
          Filter
        </button>

        <button type="button" className="pt-btn pt-btn-secondary ml-auto">
          <Printer className="h-4 w-4" />
          Cetak Laporan
        </button>
      </form>

      {belumTersedia && (
        <div className="pt-empty">
          <div className="pt-empty-icon">
            <ClipboardCheck className="h-6 w-6" />
          </div>
          <p className="text-body-sm text-on-surface-variant">
            Data registrasi belum tersedia -- endpoint-nya masih dikerjakan tim lain. Filter di atas sudah siap,
            tinggal disambungkan begitu endpoint-nya jadi.
          </p>
        </div>
      )}

      {error && (
        <div className="mb-lg rounded-xl bg-error-container/60 px-md py-sm text-body-sm text-on-error-container">
          {error}
        </div>
      )}

      {loading ? (
        <div className="pt-loading">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="text-body-sm">Memuat data registrasi...</span>
        </div>
      ) : !belumTersedia && items.length === 0 ? (
        <div className="pt-empty">
          <div className="pt-empty-icon">
            <ClipboardCheck className="h-6 w-6" />
          </div>
          <p className="text-body-sm text-on-surface-variant">Tidak ada data registrasi.</p>
        </div>
      ) : !belumTersedia ? (
        <div className="overflow-x-auto rounded-xl border border-outline-variant">
          <table className="min-w-full divide-y divide-outline-variant text-body-sm">
            <thead className="bg-surface-container-low">
              <tr>
                <Th>Kode / Event</Th>
                <Th>NIK / Pedagang</Th>
                <Th>Usaha</Th>
                <Th>Lokasi</Th>
                <Th>Waktu</Th>
                <Th className="text-right">Aksi</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/60 bg-surface-container-lowest">
              {items.map((it) => (
                <tr key={it.id} className="hover:bg-surface-container-low">
                  <td className="px-md py-sm">
                    <span className="font-medium text-on-surface">{it.kodeRegistrasi}</span>
                    <div className="text-label-sm text-on-surface-variant">
                      {it.namaEvent} - {it.tanggalEvent}
                    </div>
                  </td>
                  <td className="px-md py-sm">
                    <span className="text-on-surface-variant">{it.nik}</span>
                    <div className="font-medium text-on-surface">{it.namaLengkap}</div>
                  </td>
                  <td className="px-md py-sm text-on-surface-variant">
                    {it.namaUsaha}
                    <div className="text-label-sm text-on-surface-variant/70">{it.kategori}</div>
                  </td>
                  <td className="px-md py-sm">
                    <span className="pt-pill pt-pill-neutral py-1 text-label-sm">{it.lokasi}</span>
                  </td>
                  <td className="px-md py-sm text-on-surface-variant">{it.waktu}</td>
                  <td className="px-md py-sm text-right">
                    <button className="pt-btn pt-btn-ghost min-h-0 px-sm py-1 text-label-sm">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button className="pt-btn pt-btn-ghost-danger min-h-0 px-sm py-1 text-label-sm">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {!belumTersedia && totalPages > 1 && (
        <div className="mt-lg flex items-center justify-end gap-sm text-body-sm">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="pt-btn pt-btn-ghost min-h-0 px-md py-1.5"
          >
            Sebelumnya
          </button>
          <span className="text-on-surface-variant">
            Halaman {page} dari {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="pt-btn pt-btn-ghost min-h-0 px-md py-1.5"
          >
            Berikutnya
          </button>
        </div>
      )}
    </div>
  );
}

function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <th className={`px-md py-sm text-left text-label-sm uppercase tracking-wide text-on-surface-variant ${className}`}>
      {children}
    </th>
  );
}
