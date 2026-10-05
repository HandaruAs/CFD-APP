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
  RotateCcw,
  X,
  type LucideIcon,
} from "lucide-react";
import { ConfirmDialog } from "@/components/confirm-dialog";

// Sama dengan halaman admin lain -- sebelumnya hardcode localhost:8080,
// jadi halaman ini tidak jalan saat aplikasi di-deploy.
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

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
    ruas: { id: string; namaRuas: string; urutan: number }[] | null;
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

const LABEL_KATEGORI: Record<string, string> = {
  makanan_minuman: "Makanan & Minuman",
  bukan_makanan_minuman: "Bukan Makanan & Minuman",
};
const labelKategori = (k: string) => LABEL_KATEGORI[k] ?? (k && k !== "-" ? k : "-");

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
  // id ruas (master_ruas). Dicocokkan ke LOKASI TERAKHIR pedagang di event,
  // sama dengan kolom "Lokasi terakhir" di tabel.
  const [ruasId, setRuasId] = useState("");
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

  // Pilihan ruas dikelompokkan per kecamatan (optgroup), diurutkan per
  // jalan lalu urutan ruas. Kecamatan/jalan tanpa ruas tidak ditampilkan.
  const grupRuas = useMemo(
    () =>
      wilayah
        .map((k) => ({
          kecamatan: k.kecamatan,
          ruas: [...(k.jalan ?? [])]
            .sort((a, b) => a.namaJalan.localeCompare(b.namaJalan, "id"))
            .flatMap((j) =>
              [...(j.ruas ?? [])]
                .sort((a, b) => a.urutan - b.urutan)
                .map((r) => ({ id: r.id, label: `${j.namaJalan} · ${r.namaRuas}` }))
            ),
        }))
        .filter((g) => g.ruas.length > 0),
    [wilayah]
  );

  // Query string sesuai filter yang lagi aktif (dipakai tabel & export)
  function buildQuery(limit: number, pageNum: number) {
    const qs = new URLSearchParams();
    if (search) qs.set("search", search);
    if (ruasId) qs.set("ruasId", ruasId);
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

  const queryKey = JSON.stringify([search, ruasId, statusFilter, page, reloadSignal]);

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
          labelKategori(it.kategori),
          it.kontak || "-",
          statusLabel(it),
        ]),
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [0, 40, 142], textColor: 255, fontStyle: "bold" },
        alternateRowStyles: { fillColor: [243, 246, 255] },
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
          Kategori: labelKategori(it.kategori),
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

  const statCards: { label: string; value: number | null; icon: LucideIcon; warna: string; filter: StatusFilter }[] = [
    { label: "Total Pedagang", value: stats.total, icon: Users, warna: "bg-primary-fixed text-on-primary-fixed", filter: "" },
    { label: "Pedagang Baru", value: stats.baru, icon: UserPlus, warna: "bg-tertiary-fixed text-on-tertiary-fixed", filter: "baru" },
    { label: "Pedagang Lama", value: stats.lama, icon: Store, warna: "bg-secondary-container/60 text-on-secondary-container", filter: "lama" },
  ];

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));
  const dari = total === 0 ? 0 : (page - 1) * LIMIT + 1;
  const sampai = Math.min(page * LIMIT, total);
  const adaFilter = Boolean(searchInput || ruasId || statusFilter);

  function resetFilter() {
    setSearchInput("");
    setSearch("");
    setRuasId("");
    setStatusFilter("");
    setPage(1);
  }

  // Nomor halaman ringkas: 1 … 4 5 6 … 12
  const nomorHalaman = useMemo(() => {
    const set = new Set([1, totalPages, page - 1, page, page + 1].filter((n) => n >= 1 && n <= totalPages));
    const urut = [...set].sort((a, b) => a - b);
    const hasil: (number | "…")[] = [];
    urut.forEach((n, i) => {
      if (i > 0 && n - urut[i - 1] > 1) hasil.push("…");
      hasil.push(n);
    });
    return hasil;
  }, [page, totalPages]);

  return (
    <div className="flex flex-col gap-lg pb-xl">
      {/* ===== HEADER ===== */}
      <div className="flex flex-wrap items-end justify-between gap-md">
        <div>
          <h2 className="text-headline-lg text-on-surface">Manajemen User Pedagang</h2>
          <p className="mt-xs max-w-2xl text-body-md text-on-surface-variant">
            Kelola akun dan data pedagang CFD: tambah manual, import dari file, filter per ruas, dan export laporan.
          </p>
        </div>
        <button
          type="button"
          onClick={() => router.push("/admin/manajemen-user/pedagang/tambah")}
          className="pt-btn pt-btn-primary"
        >
          <UserPlus className="h-4 w-4" strokeWidth={2.2} />
          Tambah Pedagang
        </button>
      </div>

      {/* ===== KARTU STATISTIK (klik = filter status) ===== */}
      <div className="grid grid-cols-1 gap-md sm:grid-cols-3">
        {statCards.map((c) => {
          const aktif = statusFilter === c.filter;
          return (
            <button
              key={c.label}
              type="button"
              onClick={() => {
                setStatusFilter(c.filter);
                setPage(1);
              }}
              aria-pressed={aktif}
              className={`flex items-center justify-between gap-md rounded-2xl border bg-surface-container-lowest p-lg text-left transition-[border-color,box-shadow] hover:shadow-md ${
                aktif ? "border-primary ring-2 ring-primary/15" : "border-outline-variant"
              }`}
            >
              <div>
                <p className="text-label-md text-on-surface-variant">{c.label}</p>
                <p className="mt-1 text-headline-lg tabular-nums text-on-surface">{c.value ?? "–"}</p>
                {c.value !== null && stats.total ? (
                  <p className="text-label-sm text-on-surface-variant">
                    {c.filter === "" ? "Klik untuk tampilkan semua" : `${Math.round((c.value / stats.total) * 100)}% dari total`}
                  </p>
                ) : null}
              </div>
              <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${c.warna}`}>
                <c.icon className="h-6 w-6" strokeWidth={2} />
              </span>
            </button>
          );
        })}
      </div>

      {error && (
        <div role="alert" className="rounded-xl border border-error-container bg-error-container/30 px-md py-sm text-body-sm text-on-error-container">
          {error}
        </div>
      )}

      {/* ===== TABEL + TOOLBAR ===== */}
      <section className="overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-lowest">
        <div className="flex flex-col gap-sm border-b border-outline-variant p-md">
          <div className="flex flex-wrap items-center gap-sm">
            <label className="relative min-w-[220px] flex-1">
              <span className="sr-only">Cari pedagang</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Cari nama, NIK, atau usaha"
                className="pt-input !py-2.5 pl-9"
              />
            </label>
            <select
              value={ruasId}
              onChange={(e) => {
                setRuasId(e.target.value);
                setPage(1);
              }}
              className="pt-input !w-auto !py-2.5"
              aria-label="Filter ruas (lokasi terakhir)"
              title="Menampilkan pedagang yang lokasi event terakhirnya di ruas ini"
            >
              <option value="">Semua ruas</option>
              {grupRuas.map((g) => (
                <optgroup key={g.kecamatan} label={g.kecamatan}>
                  {g.ruas.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as StatusFilter);
                setPage(1);
              }}
              className="pt-input !w-auto !py-2.5"
              aria-label="Filter status"
            >
              <option value="">Semua status</option>
              <option value="baru">Pedagang Baru</option>
              <option value="lama">Pedagang Lama</option>
            </select>
            {adaFilter && (
              <button type="button" onClick={resetFilter} className="pt-btn pt-btn-ghost">
                <RotateCcw className="h-4 w-4" />
                Reset
              </button>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-sm">
            <button type="button" onClick={handleExportPdf} disabled={exporting !== null} className="pt-btn pt-btn-ghost border border-outline-variant">
              {exporting === "pdf" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
              {exporting === "pdf" ? "Membuat PDF..." : "Export PDF"}
            </button>
            <button type="button" onClick={handleExportExcel} disabled={exporting !== null} className="pt-btn pt-btn-ghost border border-outline-variant">
              {exporting === "excel" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
              {exporting === "excel" ? "Membuat Excel..." : "Export Excel"}
            </button>
            <button type="button" onClick={() => setShowImport(true)} className="pt-btn pt-btn-ghost border border-outline-variant">
              <Upload className="h-4 w-4" />
              Import File
            </button>
            <span className="ml-auto text-label-sm font-normal text-on-surface-variant">
              Export mengikuti filter yang sedang aktif.
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] text-left">
            <thead className="bg-surface-container-low text-label-md">
              <tr>
                <th className="px-lg py-sm font-medium">Pedagang</th>
                <th className="px-md py-sm font-medium">NIK / No. KK</th>
                <th className="px-md py-sm font-medium">Usaha</th>
                <th className="px-md py-sm font-medium">Lokasi terakhir</th>
                <th className="px-md py-sm font-medium">Kontak</th>
                <th className="px-md py-sm font-medium">Status</th>
                <th className="px-lg py-sm text-right font-medium">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={7} className="px-lg py-sm">
                      <div className="h-11 animate-pulse rounded-xl bg-surface-container-high" />
                    </td>
                  </tr>
                ))
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-lg py-xl">
                    <div className="flex flex-col items-center gap-sm text-center">
                      <span className="pt-empty-icon">
                        <Inbox className="h-6 w-6" />
                      </span>
                      <p className="text-body-md font-semibold text-on-surface">Tidak ada data pedagang</p>
                      <p className="text-body-sm text-on-surface-variant">
                        {adaFilter ? "Coba ubah atau reset filter." : "Tambah pedagang baru atau import dari file."}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                items.map((it) => (
                  <tr key={it.pedagangId}>
                    <td className="px-lg py-sm">
                      <div className="flex items-center gap-sm">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-label-md font-semibold text-primary">
                          {inisial(it.namaLengkap)}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-body-md font-semibold text-on-surface">{it.namaLengkap}</p>
                          <p className="truncate text-label-sm font-normal text-on-surface-variant">{it.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-md py-sm font-mono text-body-sm text-on-surface-variant">{it.nik}</td>
                    <td className="px-md py-sm">
                      <p className="text-body-md text-on-surface">{it.namaUsaha}</p>
                      <p className="text-label-sm font-normal text-on-surface-variant">{labelKategori(it.kategori)}</p>
                    </td>
                    <td className="px-md py-sm">
                      {it.lokasi && it.lokasi !== "-" ? (
                        <span className="whitespace-nowrap rounded-full bg-surface-container-low px-sm py-1 text-label-sm text-on-surface-variant">
                          {it.lokasi}
                        </span>
                      ) : (
                        <span className="text-label-sm font-normal text-outline">Belum pernah klaim</span>
                      )}
                    </td>
                    <td className="px-md py-sm text-body-sm text-on-surface-variant">{it.kontak || "–"}</td>
                    <td className="px-md py-sm">
                      <span className={`pt-pill !px-sm !py-1 !text-label-sm ${it.statusPedagang === "baru" ? "pt-pill-warning" : "pt-pill-success"}`}>
                        <span className="pt-pill-dot" aria-hidden="true" />
                        {statusLabel(it)}
                      </span>
                    </td>
                    <td className="px-lg py-sm">
                      <div className="flex items-center justify-end gap-xs">
                        <button
                          type="button"
                          onClick={() => router.push(`/admin/manajemen-user/pedagang/edit/${it.userId}`)}
                          className="flex h-9 w-9 items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:bg-primary/10 hover:text-primary"
                          aria-label={`Edit ${it.namaLengkap}`}
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(it)}
                          className="flex h-9 w-9 items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:bg-error-container/50 hover:text-error"
                          aria-label={`Hapus ${it.namaLengkap}`}
                          title="Hapus"
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

        {/* ===== PAGINATION ===== */}
        <div className="flex flex-wrap items-center justify-between gap-sm border-t border-outline-variant px-lg py-sm">
          <p className="text-body-sm text-on-surface-variant">
            {total > 0 ? (
              <>
                Menampilkan <span className="font-semibold tabular-nums text-on-surface">{dari}–{sampai}</span> dari{" "}
                <span className="font-semibold tabular-nums text-on-surface">{total}</span> pedagang
              </>
            ) : (
              "Tidak ada data"
            )}
          </p>
          <nav className="flex items-center gap-xs" aria-label="Halaman">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container-high disabled:opacity-40 disabled:hover:bg-transparent"
              aria-label="Halaman sebelumnya"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            {nomorHalaman.map((n, i) =>
              n === "…" ? (
                <span key={`e${i}`} className="px-1 text-on-surface-variant">
                  …
                </span>
              ) : (
                <button
                  key={n}
                  type="button"
                  onClick={() => setPage(n)}
                  aria-current={n === page ? "page" : undefined}
                  className={`flex h-9 min-w-9 items-center justify-center rounded-lg px-2 text-label-md tabular-nums transition-colors ${
                    n === page ? "bg-primary text-on-primary" : "text-on-surface-variant hover:bg-surface-container-high"
                  }`}
                >
                  {n}
                </button>
              )
            )}
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container-high disabled:opacity-40 disabled:hover:bg-transparent"
              aria-label="Halaman berikutnya"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </nav>
        </div>
      </section>

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

function inisial(nama: string) {
  const b = nama.trim().split(/\s+/).filter(Boolean);
  return b.length ? (b[0][0] + (b.length > 1 ? b[b.length - 1][0] : "")).toUpperCase() : "?";
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
    <div className="pt-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="judul-import">
      <div className="pt-modal-box !max-w-[34rem]">
        <div className="flex items-center justify-between border-b border-outline-variant px-lg py-md">
          <h2 id="judul-import" className="text-title-lg text-on-surface">
            Import Pedagang dari File
          </h2>
          <button type="button" onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container-high" aria-label="Tutup">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-md overflow-y-auto px-lg py-md">
          <p className="text-body-sm text-on-surface-variant">
            Upload file <strong>.csv</strong> atau <strong>.json</strong>. Semua pedagang dari file ini otomatis tercatat sebagai{" "}
            <strong>Pedagang Lama</strong>.
          </p>
          <div className="rounded-xl bg-surface-container-low p-md text-label-sm font-normal text-on-surface-variant">
            <p className="font-semibold text-on-surface">Format CSV (baris pertama header):</p>
            <code className="mt-1 block break-all font-mono">
              nama_lengkap,nik,email,nama_usaha,jenis_dagangan,phone,alamat,lokasi_lapak,tanggal_lahir,jenis_lapak
            </code>
            <p className="mt-sm">
              Kolom nama_lengkap, nik, email, dan nama_usaha wajib diisi; sisanya boleh kosong. Dari Excel, simpan dulu sebagai
              CSV (File → Save As → CSV).
            </p>
          </div>

          <label
            className={`flex cursor-pointer flex-col items-center gap-xs rounded-xl border-2 border-dashed px-md py-lg text-center transition-colors ${
              file ? "border-primary bg-primary/5" : "border-outline-variant hover:border-primary/50 hover:bg-surface-container-low"
            }`}
          >
            <Upload className={`h-6 w-6 ${file ? "text-primary" : "text-on-surface-variant"}`} />
            <span className="text-body-sm font-semibold text-on-surface">{file ? file.name : "Pilih file CSV atau JSON"}</span>
            <span className="text-label-sm font-normal text-on-surface-variant">
              {file ? `${Math.max(1, Math.round(file.size / 1024))} KB · klik untuk ganti file` : "Klik untuk memilih dari komputer"}
            </span>
            <input type="file" accept=".csv,.json" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="sr-only" />
          </label>

          {error && (
            <div role="alert" className="rounded-xl border border-error-container bg-error-container/30 px-md py-sm text-body-sm text-on-error-container">
              {error}
            </div>
          )}

          {result && (
            <div
              className={`rounded-xl px-md py-sm text-body-sm ${
                result.gagal === 0 ? "bg-secondary-container/40 text-on-secondary-container" : "bg-tertiary-fixed/60 text-on-tertiary-fixed"
              }`}
            >
              <p>
                Berhasil: <strong>{result.berhasil}</strong> &middot; Gagal: <strong>{result.gagal}</strong>
              </p>
              {result.errors?.length > 0 && (
                <ul className="mt-sm max-h-40 list-disc space-y-1 overflow-y-auto pl-5 text-label-sm font-normal">
                  {result.errors.map((msg, i) => (
                    <li key={i}>{msg}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <div className="flex justify-end gap-sm border-t border-outline-variant pt-md">
            <button type="button" onClick={onClose} className="pt-btn pt-btn-ghost">
              {result ? "Tutup" : "Batal"}
            </button>
            <button type="submit" disabled={submitting || !file} className="pt-btn pt-btn-primary">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {submitting ? "Mengimpor..." : "Import"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}