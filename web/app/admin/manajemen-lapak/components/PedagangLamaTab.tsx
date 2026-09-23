"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, Loader2, Users, FileText, FileSpreadsheet, Plus, Upload } from "lucide-react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import type { KecamatanLengkapData, PedagangLamaItem } from "../types";
import { getPedagangLama } from "../api";
import TambahPedagangModal from "./TambahPedagangModal";
import ImportPedagangModal from "./ImportPedagangModal";

const LIMIT = 10;
// Batas "ambil semua" buat export -- diasumsikan gak bakal ada
// pedagang lebih dari ini dalam satu filter. Export tetap ngikutin
// filter yang lagi aktif di layar (search/ruas/status), bukan cuma
// 10 baris yang lagi ketampil di halaman saat ini.
const EXPORT_LIMIT = 10000;

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

interface Props {
  wilayah: KecamatanLengkapData[];
}

export default function PedagangLamaTab({ wilayah }: Props) {
  const [items, setItems] = useState<PedagangLamaItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [ruasKey, setRuasKey] = useState(""); // "jalanId:nomorMulai:nomorSelesai"
  const [statusFilter, setStatusFilter] = useState<"" | "lama" | "baru">("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showTambah, setShowTambah] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [exporting, setExporting] = useState<"pdf" | "excel" | null>(null);

  // Daftar ruas buat dropdown filter -- diratain dari semua kecamatan/jalan.
  const daftarRuas = useMemo(
    () =>
      wilayah.flatMap((k) =>
        k.jalan.flatMap((j) =>
          (j.ruas ?? []).map((r) => ({
            key: `${j.id}:${r.nomorMulai}:${r.nomorSelesai}`,
            label: `${j.namaJalan} - ${r.namaRuas}`,
          }))
        )
      ),
    [wilayah]
  );

  // Dipakai baik oleh load() (1 halaman, buat tabel) maupun export
  // (semua baris yang cocok filter, gak dibatasi halaman).
  function buildFilterParams(limit: number, pageNum: number) {
    const [jalanId, nomorMulai, nomorSelesai] = ruasKey ? ruasKey.split(":") : [undefined, undefined, undefined];
    return {
      search,
      jalanId,
      nomorMulai: nomorMulai !== undefined ? Number(nomorMulai) : undefined,
      nomorSelesai: nomorSelesai !== undefined ? Number(nomorSelesai) : undefined,
      status: statusFilter || undefined,
      page: pageNum,
      limit,
    };
  }

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await getPedagangLama(buildFilterParams(LIMIT, page));
      setItems(res.data ?? []);
      setTotal(res.total ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat data pedagang.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, ruasKey, statusFilter, page]);

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  }

  function handleReset() {
    setSearchInput("");
    setSearch("");
    setRuasKey("");
    setStatusFilter("");
    setPage(1);
  }

  function statusLabel(it: PedagangLamaItem) {
    return it.statusPedagang === "baru" ? "Pedagang Baru" : "Pedagang Lama";
  }

  // Export selalu ngambil ULANG semua data yang cocok filter yang lagi
  // aktif (bukan cuma `items` yang lagi ketampil di halaman ini),
  // biar hasil export lengkap walau tabelnya lagi di halaman 2/3/dst.
  async function handleExportPdf() {
    setError(null);
    setExporting("pdf");
    try {
      const res = await getPedagangLama(buildFilterParams(EXPORT_LIMIT, 1));
      const rows = res.data ?? [];

      const doc = new jsPDF({ orientation: "landscape" });
      doc.setFontSize(14);
      doc.text("Laporan Data Pedagang", 14, 15);
      doc.setFontSize(9);
      doc.text(`Dicetak: ${todayStr()} -- Total: ${rows.length} pedagang`, 14, 21);

      autoTable(doc, {
        startY: 26,
        head: [["Lokasi", "NIK / No. KK", "Pedagang", "Usaha", "Kategori", "Kontak", "Status"]],
        body: rows.map((it) => [
          it.lokasi,
          it.nik,
          it.namaLengkap,
          it.namaUsaha,
          it.kategori,
          it.kontak || "-",
          statusLabel(it),
        ]),
        styles: { fontSize: 8 },
        headStyles: { fillColor: [40, 60, 90] },
      });

      doc.save(`laporan-pedagang-${todayStr()}.pdf`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal membuat file PDF.");
    } finally {
      setExporting(null);
    }
  }

  async function handleExportExcel() {
    setError(null);
    setExporting("excel");
    try {
      const res = await getPedagangLama(buildFilterParams(EXPORT_LIMIT, 1));
      const rows = res.data ?? [];

      const sheetData = rows.map((it) => ({
        Lokasi: it.lokasi,
        "NIK / No. KK": it.nik,
        Pedagang: it.namaLengkap,
        Usaha: it.namaUsaha,
        Kategori: it.kategori,
        Kontak: it.kontak || "-",
        Status: statusLabel(it),
      }));

      const worksheet = XLSX.utils.json_to_sheet(sheetData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Pedagang");
      XLSX.writeFile(workbook, `laporan-pedagang-${todayStr()}.xlsx`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal membuat file Excel.");
    } finally {
      setExporting(null);
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  return (
    <div>
      <form onSubmit={handleSearchSubmit} className="mb-md flex flex-wrap items-center gap-sm">
        <div className="flex flex-1 min-w-[220px] items-center gap-sm rounded-md bg-surface-container-low px-md py-sm">
          <Search className="h-4 w-4 text-on-surface-variant" strokeWidth={2} />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Nama, NIK, atau usaha..."
            className="w-full bg-transparent text-body-md text-on-surface placeholder:text-on-surface-variant focus:outline-none"
          />
        </div>

        <select
          value={ruasKey}
          onChange={(e) => {
            setPage(1);
            setRuasKey(e.target.value);
          }}
          className="pt-input w-auto"
        >
          <option value="">Semua ruas</option>
          {daftarRuas.map((r) => (
            <option key={r.key} value={r.key}>
              {r.label}
            </option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => {
            setPage(1);
            setStatusFilter(e.target.value as "" | "lama" | "baru");
          }}
          className="pt-input w-auto"
        >
          <option value="">Semua status</option>
          <option value="lama">Pedagang Lama</option>
          <option value="baru">Pedagang Baru</option>
        </select>

        <button type="submit" className="pt-btn pt-btn-primary">
          Filter
        </button>
        <button type="button" onClick={handleReset} className="pt-btn pt-btn-ghost">
          Reset
        </button>
      </form>

      <div className="mb-lg flex flex-wrap items-center justify-between gap-sm">
        <div className="flex flex-wrap gap-sm">
          <button
            type="button"
            onClick={handleExportPdf}
            disabled={exporting !== null}
            className="pt-btn pt-btn-secondary disabled:opacity-50"
          >
            <FileText className="h-4 w-4" />
            {exporting === "pdf" ? "Membuat PDF..." : "Export PDF"}
          </button>
          <button
            type="button"
            onClick={handleExportExcel}
            disabled={exporting !== null}
            className="pt-btn pt-btn-secondary disabled:opacity-50"
          >
            <FileSpreadsheet className="h-4 w-4" />
            {exporting === "excel" ? "Membuat Excel..." : "Export Excel"}
          </button>
          <button type="button" onClick={() => setShowImport(true)} className="pt-btn pt-btn-secondary">
            <Upload className="h-4 w-4" />
            Import File
          </button>
          <button type="button" onClick={() => setShowTambah(true)} className="pt-btn pt-btn-primary">
            <Plus className="h-4 w-4" />
            Tambah
          </button>
        </div>
        <span className="text-body-sm text-on-surface-variant">Total {total} pedagang</span>
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
      ) : items.length === 0 ? (
        <div className="pt-empty">
          <div className="pt-empty-icon">
            <Users className="h-6 w-6" />
          </div>
          <p className="text-body-sm text-on-surface-variant">Tidak ada data pedagang.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-outline-variant">
          <table className="min-w-full divide-y divide-outline-variant text-body-sm">
            <thead className="bg-surface-container-low">
              <tr>
                <Th>Lokasi</Th>
                <Th>NIK / No. KK</Th>
                <Th>Pedagang</Th>
                <Th>Usaha</Th>
                <Th>Kontak</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/60 bg-surface-container-lowest">
              {items.map((it) => (
                <tr key={it.pedagangId} className="hover:bg-surface-container-low">
                  <td className="px-md py-sm">
                    <span className="pt-pill pt-pill-neutral py-1 text-label-sm">{it.lokasi}</span>
                  </td>
                  <td className="px-md py-sm text-on-surface-variant">{it.nik}</td>
                  <td className="px-md py-sm font-medium text-on-surface">{it.namaLengkap}</td>
                  <td className="px-md py-sm text-on-surface-variant">
                    {it.namaUsaha}
                    <div className="text-label-sm text-on-surface-variant/70">{it.kategori}</div>
                  </td>
                  <td className="px-md py-sm text-on-surface-variant">{it.kontak || "-"}</td>
                  <td className="px-md py-sm">
                    <span className={`pt-pill ${it.statusPedagang === "baru" ? "pt-pill-warning" : "pt-pill-success"}`}>
                      <span className="pt-pill-dot" />
                      {statusLabel(it)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
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

      {showTambah && (
        <TambahPedagangModal
          wilayah={wilayah}
          onClose={() => setShowTambah(false)}
          onSaved={() => {
            setShowTambah(false);
            setPage(1);
            load();
          }}
        />
      )}

      {showImport && (
        <ImportPedagangModal
          onClose={() => setShowImport(false)}
          onSaved={() => {
            setPage(1);
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