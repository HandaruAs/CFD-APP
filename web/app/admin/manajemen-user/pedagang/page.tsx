"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import {
  Users,
  Store,
  Search,
  FileText,
  FileSpreadsheet,
  Upload,
  UserPlus,
  Pencil,
  Trash2,
  Inbox,
  ChevronLeft,
  ChevronRight,
  Loader2,
  X,
  type LucideIcon,
} from "lucide-react";
import { ConfirmDialog } from "@/components/confirm-dialog";

const API_URL = "http://localhost:8080";

type PedagangItem = {
  pedagangId: string;
  userId: string; // users.id -- dipakai buat edit & hapus
  nik: string;
  namaLengkap: string;
  email: string;
  namaUsaha: string;
  kategori: string;
  kontak: string;
  lokasi: string;
  status: string;
  statusPedagang: "lama" | "baru";
};

type Kecamatan = {
  kecamatan: string;
  jalan: {
    id: string;
    namaJalan: string;
    ruas: { namaRuas: string; nomorMulai: number; nomorSelesai: number }[] | null;
  }[];
};

type ImportResult = {
  berhasil: number;
  gagal: number;
  errors: string[];
};

function authHeader() {
  const token = localStorage.getItem("cfd_token");
  return { Authorization: `Bearer ${token}` };
}

const LIMIT = 10;
// Export ngambil semua baris yang cocok filter aktif, bukan cuma halaman
// yang lagi tampil. Diasumsikan jumlah pedagang gak lebih dari ini.
const EXPORT_LIMIT = 10000;

type StatusFilter = "" | "lama" | "baru";

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

function statusLabel(it: PedagangItem) {
  return it.statusPedagang === "baru" ? "Pedagang Baru" : "Pedagang Lama";
}

export default function ManajemenUserPedagangPage() {
  const router = useRouter();

  // ---- data pendukung ----
  const [wilayah, setWilayah] = useState<Kecamatan[]>([]);
  const [stats, setStats] = useState<{ total: number | null; lama: number | null; baru: number | null }>({
    total: null,
    lama: null,
    baru: null,
  });

  // ---- tabel & filter ----
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [ruasKey, setRuasKey] = useState(""); // "jalanId:nomorMulai:nomorSelesai"
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("");
  const [reloadSignal, setReloadSignal] = useState(0);
  // Hasil fetch disimpan bareng "key" filter-nya. Selama key hasil beda
  // dari key filter sekarang, berarti data baru masih dimuat -- jadi gak
  // perlu setLoading(true) di dalam effect.
  const [result, setResult] = useState<{ key: string; items: PedagangItem[]; total: number; error: string | null }>({
    key: "",
    items: [],
    total: 0,
    error: null,
  });
  const [actionError, setActionError] = useState<string | null>(null);

  // ---- aksi ----
  const [exporting, setExporting] = useState<"pdf" | "excel" | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<PedagangItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    async function fetchWilayah() {
      try {
        const res = await fetch(`${API_URL}/api/admin/wilayah`, { headers: authHeader() });
        if (!res.ok) return;
        const data = await res.json();
        setWilayah(data.data ?? []);
      } catch {
        // Dropdown ruas kosong saja kalau gagal
      }
    }
    fetchWilayah();
  }, []);

  useEffect(() => {
    // Hitung jumlah pedagang dari endpoint list yang sama dengan tabel
    // (limit=1, cukup ambil field "total"), supaya angka di kartu selalu
    // cocok dengan isi tabel saat difilter per status.
    async function hitung(status?: "lama" | "baru") {
      const qs = new URLSearchParams({ page: "1", limit: "1" });
      if (status) qs.set("status", status);
      const res = await fetch(`${API_URL}/api/admin/pedagang?${qs.toString()}`, { headers: authHeader() });
      if (!res.ok) throw new Error("gagal");
      const data = await res.json();
      return (data.total ?? 0) as number;
    }

    async function fetchStats() {
      try {
        const [total, lama, baru] = await Promise.all([hitung(), hitung("lama"), hitung("baru")]);
        setStats({ total, lama, baru });
      } catch {
        // Biarkan "-" jika gagal
      }
    }
    fetchStats();
  }, [reloadSignal]);

  // Debounce pencarian 400ms, sama seperti tabel user lain di admin.
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

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

  // Query string sesuai filter yang lagi aktif (dipakai tabel & export)
  function buildQuery(limit: number, pageNum: number) {
    const qs = new URLSearchParams();
    if (search) qs.set("search", search);
    if (ruasKey) {
      const [jalanId, mulai, selesai] = ruasKey.split(":");
      qs.set("jalanId", jalanId);
      qs.set("nomorMulai", mulai);
      qs.set("nomorSelesai", selesai);
    }
    if (statusFilter) qs.set("status", statusFilter);
    qs.set("page", String(pageNum));
    qs.set("limit", String(limit));
    return qs.toString();
  }

  async function fetchPedagang(limit: number, pageNum: number): Promise<{ data: PedagangItem[]; total: number }> {
    const res = await fetch(`${API_URL}/api/admin/pedagang?${buildQuery(limit, pageNum)}`, { headers: authHeader() });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Gagal memuat data pedagang.");
    return { data: data.data ?? [], total: data.total ?? 0 };
  }

  const queryKey = JSON.stringify([search, ruasKey, statusFilter, page, reloadSignal]);

  useEffect(() => {
    let cancelled = false;
    fetchPedagang(LIMIT, page)
      .then((res) => {
        if (!cancelled) setResult({ key: queryKey, items: res.data ?? [], total: res.total ?? 0, error: null });
      })
      .catch((err) => {
        if (!cancelled)
          setResult({
            key: queryKey,
            items: [],
            total: 0,
            error: err instanceof Error ? err.message : "Gagal memuat data pedagang.",
          });
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryKey]);

  const loading = result.key !== queryKey;
  const items = result.items;
  const total = result.total;
  const error = actionError ?? (loading ? null : result.error);

  function reload(resetPage = false) {
    if (resetPage) setPage(1);
    setReloadSignal((n) => n + 1);
  }

  async function fetchAllForExport() {
    const res = await fetchPedagang(EXPORT_LIMIT, 1);
    return res.data;
  }

  async function handleExportPdf() {
    setActionError(null);
    setExporting("pdf");
    try {
      const rows = await fetchAllForExport();
      const doc = new jsPDF({ orientation: "landscape" });
      doc.setFontSize(14);
      doc.text("Laporan Data Pedagang", 14, 15);
      doc.setFontSize(9);
      doc.text(`Dicetak: ${todayStr()} -- Total: ${rows.length} pedagang`, 14, 21);
      autoTable(doc, {
        startY: 26,
        head: [["Lokasi", "NIK / No. KK", "Pedagang", "Email", "Usaha", "Kategori", "Kontak", "Status"]],
        body: rows.map((it) => [
          it.lokasi,
          it.nik,
          it.namaLengkap,
          it.email,
          it.namaUsaha,
          it.kategori,
          it.kontak || "-",
          statusLabel(it),
        ]),
        styles: { fontSize: 8 },
        headStyles: { fillColor: [30, 58, 138] },
      });
      doc.save(`data-pedagang-${todayStr()}.pdf`);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Gagal membuat file PDF.");
    } finally {
      setExporting(null);
    }
  }

  async function handleExportExcel() {
    setActionError(null);
    setExporting("excel");
    try {
      const rows = await fetchAllForExport();
      const sheet = XLSX.utils.json_to_sheet(
        rows.map((it) => ({
          Lokasi: it.lokasi,
          "NIK / No. KK": it.nik,
          Pedagang: it.namaLengkap,
          Email: it.email,
          Usaha: it.namaUsaha,
          Kategori: it.kategori,
          Kontak: it.kontak || "-",
          Status: statusLabel(it),
        }))
      );
      const book = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(book, sheet, "Pedagang");
      XLSX.writeFile(book, `data-pedagang-${todayStr()}.xlsx`);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Gagal membuat file Excel.");
    } finally {
      setExporting(null);
    }
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/users/pedagang/${deleteTarget.userId}`, {
        method: "DELETE",
        headers: authHeader(),
      });
      if (!res.ok) throw new Error("Gagal menghapus data");
      setDeleteTarget(null);
      reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Gagal menghapus pedagang.");
      setDeleteTarget(null);
    } finally {
      setIsDeleting(false);
    }
  }

  const statCards: { label: string; value: number | null; icon: LucideIcon; bg: string; color: string; sub?: string }[] = [
    { label: "Total Pedagang", value: stats.total, icon: Users, bg: "bg-blue-50", color: "text-blue-700" },
    { label: "Pedagang Lama", value: stats.lama, icon: Store, bg: "bg-emerald-50", color: "text-emerald-600" },
    { label: "Pedagang Baru", value: stats.baru, icon: UserPlus, bg: "bg-amber-50", color: "text-amber-600" },
  ];

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));
  const selectCls =
    "rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15";
  const secondaryBtn =
    "flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50";

  return (
    <div>
      {/* Heading */}
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-slate-900">Manajemen User Pedagang</h1>
          <p className="mt-2 text-base text-slate-500">
            Kelola akun dan data pedagang CFD: tambah manual, import dari file, filter per ruas, dan export laporan.
          </p>
        </div>
        <button
          type="button"
          onClick={() => router.push("/admin/manajemen-user/pedagang/tambah")}
          className="flex items-center gap-2 rounded-lg bg-blue-900 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-950"
        >
          <UserPlus className="h-4 w-4" strokeWidth={2.2} />
          Tambah Pedagang
        </button>
      </div>

      {/* Stat cards */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {statCards.map((c) => (
          <div key={c.label} className="relative rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className={`absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-lg ${c.bg}`}>
              <c.icon className={`h-5 w-5 ${c.color}`} strokeWidth={2.2} />
            </div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{c.label}</p>
            <p className="mt-2 text-4xl font-bold text-slate-900">{c.value ?? "-"}</p>
            {c.sub && <p className="mt-1.5 text-sm font-medium text-slate-500">{c.sub}</p>}
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Cari nama, NIK, atau usaha..."
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-3 pl-10 pr-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15"
          />
        </div>
        <select
          value={ruasKey}
          onChange={(e) => {
            setRuasKey(e.target.value);
            setPage(1);
          }}
          className={selectCls}
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
            setStatusFilter(e.target.value as StatusFilter);
            setPage(1);
          }}
          className={selectCls}
        >
          <option value="">Semua status</option>
          <option value="lama">Pedagang Lama</option>
          <option value="baru">Pedagang Baru</option>
        </select>
      </div>

      {/* Aksi massal */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button type="button" onClick={handleExportPdf} disabled={exporting !== null} className={secondaryBtn}>
          <FileText className="h-4 w-4" />
          {exporting === "pdf" ? "Membuat PDF..." : "Export PDF"}
        </button>
        <button type="button" onClick={handleExportExcel} disabled={exporting !== null} className={secondaryBtn}>
          <FileSpreadsheet className="h-4 w-4" />
          {exporting === "excel" ? "Membuat Excel..." : "Export Excel"}
        </button>
        <button type="button" onClick={() => setShowImport(true)} className={secondaryBtn}>
          <Upload className="h-4 w-4" />
          Import File
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {/* Tabel */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/60 text-left">
                {["LOKASI", "NIK / NO. KK", "PEDAGANG", "USAHA", "KONTAK", "STATUS"].map((h) => (
                  <th key={h} className="whitespace-nowrap px-5 py-3.5 text-xs font-bold tracking-wide text-slate-500">
                    {h}
                  </th>
                ))}
                <th className="px-5 py-3.5 text-right text-xs font-bold tracking-wide text-slate-500">AKSI</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-sm text-slate-400">
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" /> Memuat data...
                    </span>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-16">
                    <div className="flex flex-col items-center gap-2 text-center">
                      <Inbox className="h-9 w-9 text-slate-300" strokeWidth={1.6} />
                      <p className="text-base font-semibold text-slate-600">Tidak ada data pedagang</p>
                      <p className="text-sm text-slate-400">Coba ubah filter, atau tambah pedagang baru.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                items.map((it) => (
                  <tr key={it.pedagangId} className="border-b border-slate-100 transition last:border-0 hover:bg-slate-50/60">
                    <td className="px-5 py-4">
                      <span className="whitespace-nowrap rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                        {it.lokasi}
                      </span>
                    </td>
                    <td className="px-5 py-4 font-medium text-slate-600">{it.nik}</td>
                    <td className="px-5 py-4">
                      <p className="font-semibold text-slate-900">{it.namaLengkap}</p>
                      <p className="text-sm text-slate-400">{it.email}</p>
                    </td>
                    <td className="px-5 py-4 text-slate-600">
                      {it.namaUsaha}
                      <p className="text-xs text-slate-400">{it.kategori}</p>
                    </td>
                    <td className="px-5 py-4 font-medium text-slate-600">{it.kontak || "-"}</td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${
                          it.statusPedagang === "baru" ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"
                        }`}
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-current" />
                        {statusLabel(it)}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => router.push(`/admin/manajemen-user/pedagang/edit/${it.userId}`)}
                          className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-blue-700"
                          aria-label={`Edit ${it.namaLengkap}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(it)}
                          className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
                          aria-label={`Hapus ${it.namaLengkap}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between border-t border-slate-200 px-5 py-4">
          <p className="text-sm font-medium text-slate-500">
            {total > 0 ? `Menampilkan ${items.length} dari ${total}` : "Tidak ada data"}
          </p>
          <div className="flex items-center gap-1.5 text-sm">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent"
              aria-label="Halaman sebelumnya"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-900 font-semibold text-white">{page}</span>
            <span className="px-1 text-slate-400">/ {totalPages}</span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent"
              aria-label="Halaman berikutnya"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {showImport && <ImportPedagangModal onClose={() => setShowImport(false)} onSaved={() => reload(true)} />}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Konfirmasi Hapus"
        message={`Apakah Anda yakin ingin menghapus pedagang "${deleteTarget?.namaLengkap}"? Tindakan ini tidak dapat dibatalkan.`}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
        isLoading={isDeleting}
      />
    </div>
  );
}

// Modal import file CSV/JSON. Semua pedagang dari file otomatis jadi "Pedagang Lama".
function ImportPedagangModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ImportResult | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setError("Pilih file dulu.");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`${API_URL}/api/admin/pedagang/import`, {
        method: "POST",
        headers: authHeader(),
        body: form,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Gagal mengimpor file (Status: ${res.status})`);
      setResult(data);
      if (data.berhasil > 0) onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengimpor file.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">Import Pedagang dari File</h2>
          <button type="button" onClick={onClose} className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100" aria-label="Tutup">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
          <p className="text-sm text-slate-600">
            Upload file <strong>.csv</strong> atau <strong>.json</strong>. Semua pedagang dari file ini otomatis tercatat
            sebagai <strong>Pedagang Lama</strong>.
          </p>
          <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
            <p className="font-semibold text-slate-600">Format CSV (baris pertama header):</p>
            <code className="mt-1 block break-all">
              nama_lengkap,nik,email,nama_usaha,jenis_dagangan,phone,alamat,lokasi_lapak,tanggal_lahir,jenis_lapak
            </code>
            <p className="mt-2">
              Kolom nama_lengkap, nik, email, dan nama_usaha wajib diisi; sisanya boleh kosong. Dari Excel, simpan dulu
              sebagai CSV (File → Save As → CSV).
            </p>
          </div>

          <input
            type="file"
            accept=".csv,.json"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm"
          />

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
          )}

          {result && (
            <div
              className={`rounded-lg border px-4 py-3 text-sm ${
                result.gagal === 0 ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-900"
              }`}
            >
              <p>
                Berhasil: <strong>{result.berhasil}</strong> &middot; Gagal: <strong>{result.gagal}</strong>
              </p>
              {result.errors?.length > 0 && (
                <ul className="mt-2 list-disc space-y-1 pl-5 text-xs">
                  {result.errors.map((msg, i) => (
                    <li key={i}>{msg}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
            <button type="button" onClick={onClose} className="rounded-lg px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100">
              {result ? "Tutup" : "Batal"}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 rounded-lg bg-blue-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-950 disabled:opacity-60"
            >
              <Upload className="h-4 w-4" />
              {submitting ? "Mengimpor..." : "Import"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}