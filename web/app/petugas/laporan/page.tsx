// app/petugas/laporan/page.tsx
"use client";

import { useEffect, useState, useRef } from "react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
// xlsx-js-style = SheetJS yang mendukung gaya sel (bold, warna, border)
import * as XLSX from "xlsx-js-style";
import {
  Search,
  ChevronRight,
  ChevronLeft,
  UserCheck,
  LogOut,
  DollarSign,
  TrendingUp,
  CheckCircle2,
  XCircle,
  Loader2,
  Calendar,
  FileSpreadsheet,
  Store,
  RefreshCw,
  X,
  MapPin,
  User,
  ClipboardList,
  FileText,
  ChevronDown,
} from "lucide-react";

// ============================================================
// TYPES
// ============================================================

type StatusKehadiran = "check-in" | "check-out" | "belum-hadir";

type KehadiranItem = {
  id: string;
  pedagangId: string;
  namaUsaha: string;
  pemilik: string;
  inisial: string;
  kategori: string;
  lokasiLapak: string;
  waktuCheckin: string;
  waktuCheckout?: string | null;
  omset?: number | null;
  metode: string;
  status: StatusKehadiran;
};

type LaporanResponse = {
  totalTerdaftar: number;
  totalCheckin: number;
  totalCheckout: number;
  totalOmset: number;
  rataOmset: number;
  persenHadir: number;
  data: KehadiranItem[] | null;
  page: number;
  limit: number;
  total: number;
};

// Detail 1 baris kehadiran -- NIK & email sudah disensor dari backend.
type DetailKehadiran = {
  kehadiran: {
    id: string;
    tanggal: string;
    namaSesi: string;
    waktuCheckin: string;
    waktuCheckout: string | null;
    omset: number | null;
    status: StatusKehadiran;
    dicatatOleh: string;
  };
  lokasi: {
    namaJalan: string;
    kecamatan: string;
    nomorLapak: string;
    lokasiLapak: string;
  };
  usaha: {
    namaUsaha: string;
    jenisDagangan: string;
    jenisLapak: string;
  };
  pribadi: {
    namaLengkap: string;
    nik: string;
    email: string;
    tanggalLahir: string;
    statusPedagang: "lama" | "baru";
  };
};

type StatsResponse = {
  totalTerdaftar: number;
  totalCheckin: number;
  totalCheckout: number;
  totalOmset: number;
  rataOmset: number;
  persenHadir: number;
};

// ============================================================
// STYLES
// ============================================================

const KATEGORI_STYLE: Record<string, { label: string; bg: string; text: string }> = {
  kuliner: { label: "Kuliner", bg: "bg-tertiary-container/15", text: "text-on-tertiary-container" },
  kerajinan: { label: "Kerajinan", bg: "bg-primary-container/20", text: "text-on-primary-container" },
  ritel: { label: "Ritel", bg: "bg-surface-container-high", text: "text-on-surface-variant" },
};

const STATUS_STYLE: Record<StatusKehadiran, { label: string; bg: string; text: string; icon: typeof CheckCircle2 }> = {
  "check-in": {
    label: "Check-in",
    bg: "bg-secondary-container/40",
    text: "text-on-secondary-container",
    icon: UserCheck,
  },
  "check-out": {
    label: "Check-out ✓",
    bg: "bg-primary-container/20",
    text: "text-on-primary-container",
    icon: LogOut,
  },
  "belum-hadir": {
    label: "Belum Hadir",
    bg: "bg-error-container/60",
    text: "text-on-error-container",
    icon: XCircle,
  },
};

// ============================================================
// API HELPER
// ============================================================

function apiUrl(path: string) {
  const base = process.env.NEXT_PUBLIC_API_URL;
  if (!base) throw new Error("NEXT_PUBLIC_API_URL belum diset!");
  return `${base}${path}`;
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem("cfd_token");
  if (!token) throw new Error("belum login");
  const res = await fetch(apiUrl(path), {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers ?? {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `request gagal (status ${res.status})`);
  return data as T;
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function LaporanPage() {
  const [data, setData] = useState<KehadiranItem[]>([]);
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [totalData, setTotalData] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const [lapakTerisi, setLapakTerisi] = useState(0);

  // Baris yang diklik -> tampilkan modal detail pedagang
  const [selectedKehadiranId, setSelectedKehadiranId] = useState<string | null>(null);

  // ========== REAL-TIME POLLING ==========
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isPolling, setIsPolling] = useState(true);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // ============================================================
  // FETCH DATA
  // ============================================================

  const fetchData = async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    setError(null);

    try {
      const queryParams = new URLSearchParams({
        startDate,
        endDate,
        search: searchTerm,
        page: String(page),
        limit: String(limit),
      });

      const laporanData = await apiFetch<LaporanResponse>(
        `/api/petugas/laporan?${queryParams.toString()}`
      );

      const dataArray = laporanData.data || [];
      setData(dataArray);
      setTotalData(laporanData.total || 0);

      const uniqueLokasi = new Set(
        dataArray
          .filter((item) => item.lokasiLapak && item.status !== "belum-hadir")
          .map((item) => item.lokasiLapak)
      );
      setLapakTerisi(uniqueLokasi.size);

      const statsData = await apiFetch<StatsResponse>(
        `/api/petugas/laporan/stats?startDate=${startDate}&endDate=${endDate}`
      );
      setStats(statsData);

      setLastUpdated(new Date());

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Gagal memuat data laporan";
      if (showLoading) {
        setError(errorMsg);
        showToast(errorMsg, "error");
      }
    } finally {
      if (showLoading) setIsLoading(false);
    }
  };

  // ========== POLLING SETUP ==========
  useEffect(() => {
    // Fetch pertama kali
    fetchData(true);

    // Setup interval polling setiap 30 detik
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    pollingIntervalRef.current = setInterval(() => {
      if (isPolling) {
        // Fetch data tanpa loading indicator (agar tidak berkedip)
        fetchData(false);
      }
    }, 30000); // 30 detik

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [startDate, endDate, page, searchTerm, isPolling]);

  // ============================================================
  // HANDLERS
  // ============================================================

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    // fetch akan otomatis terpanggil karena useEffect bergantung pada page & searchTerm
  };

  // ========== UNDUH LAPORAN (PDF / EXCEL) ==========
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [exporting, setExporting] = useState<"pdf" | "excel" | null>(null);
  const exportMenuRef = useRef<HTMLDivElement | null>(null);

  // Tutup menu kalau klik di luar
  useEffect(() => {
    if (!showExportMenu) return;
    const onClick = (e: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setShowExportMenu(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [showExportMenu]);

  // Ambil SEMUA baris sesuai filter tanggal & pencarian (bukan cuma halaman yang tampil)
  const fetchSemuaUntukExport = async () => {
    const queryParams = new URLSearchParams({
      startDate,
      endDate,
      search: searchTerm,
      page: "1",
      limit: "10000",
    });
    return apiFetch<LaporanResponse>(`/api/petugas/laporan?${queryParams.toString()}`);
  };

  const periodeLabel = startDate === endDate ? startDate : `${startDate} s/d ${endDate}`;
  const namaFile = `laporan-kehadiran-${startDate}${startDate === endDate ? "" : `_${endDate}`}`;

  const barisExport = (k: KehadiranItem) => ({
    "Check-in": k.waktuCheckin || "-",
    Usaha: k.namaUsaha || "-",
    Pemilik: k.pemilik || "-",
    Kategori: labelKategori(k.kategori),
    Lokasi: k.lokasiLapak || "-",
    Status: (STATUS_STYLE[k.status] || STATUS_STYLE["belum-hadir"]).label.replace(" ✓", ""),
    "Check-out": k.waktuCheckout || "-",
    Omset: k.omset ?? 0,
  });

  const handleExport = async (format: "pdf" | "excel") => {
    setShowExportMenu(false);
    setExporting(format);
    try {
      const res = await fetchSemuaUntukExport();
      const rows = (res.data ?? []).map(barisExport);

      if (rows.length === 0) {
        showToast("Tidak ada data kehadiran pada periode ini", "error");
        return;
      }

      if (format === "pdf") {
        const doc = new jsPDF({ orientation: "landscape" });
        doc.setFontSize(14);
        doc.text("Laporan Kehadiran Pedagang CFD", 14, 15);
        doc.setFontSize(9);
        doc.text(`Periode: ${periodeLabel}`, 14, 21);
        doc.text(
          `Check-in: ${res.totalCheckin}   Check-out: ${res.totalCheckout}   Total omset: Rp ${res.totalOmset.toLocaleString("id-ID")}`,
          14,
          26
        );
        autoTable(doc, {
          startY: 31,
          head: [Object.keys(rows[0])],
          body: rows.map((r) => [
            ...Object.values(r).slice(0, 7).map(String),
            r.Omset ? `Rp ${r.Omset.toLocaleString("id-ID")}` : "-",
          ]),
          styles: { fontSize: 8 },
          headStyles: { fillColor: [30, 58, 138] },
        });
        doc.save(`${namaFile}.pdf`);
      } else {
        buatExcelLaporan(rows, res, periodeLabel, `${namaFile}.xlsx`);
      }

      showToast(`Laporan ${format === "pdf" ? "PDF" : "Excel"} berhasil diunduh`, "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Gagal mengunduh laporan", "error");
    } finally {
      setExporting(null);
    }
  };

  const handleManualRefresh = () => {
    fetchData(true);
    showToast("🔄 Data diperbarui", "success");
  };

  const handlePrevPage = () => {
    if (page > 1) setPage(page - 1);
  };

  const handleNextPage = () => {
    const totalPages = Math.ceil(totalData / limit);
    if (page < totalPages) setPage(page + 1);
  };

  const totalPages = Math.ceil(totalData / limit);

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="flex flex-col gap-lg">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 rounded-lg px-md py-sm shadow-lg animate-in slide-in-from-bottom-5 ${
            toast.type === "success"
              ? "bg-secondary-container/90 text-on-secondary-container"
              : "bg-error-container/90 text-on-error-container"
          }`}
        >
          <p className="text-label-md">{toast.message}</p>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-md">
        <div>
          <h2 className="text-headline-lg text-on-surface">Laporan Kehadiran Pedagang</h2>
          <p className="mt-xs max-w-2xl text-body-md text-on-surface-variant">
            Daftar pedagang yang sudah check-in, check-out, dan omset CFD.
            {lastUpdated && (
              <span className="ml-2 text-label-sm text-on-surface-variant/60">
                Terakhir diperbarui: {lastUpdated.toLocaleTimeString("id-ID")}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-sm">
          <button
            type="button"
            onClick={handleManualRefresh}
            disabled={isLoading}
            className="flex items-center gap-sm rounded-md bg-surface-container-high px-md py-sm text-label-md text-on-surface-variant transition-all hover:bg-surface-container hover:shadow-md disabled:opacity-60"
            title="Refresh data"
          >
            <RefreshCw className={`h-[18px] w-[18px] ${isLoading ? "animate-spin" : ""}`} strokeWidth={2} />
            Refresh
          </button>
          <div className="relative" ref={exportMenuRef}>
            <button
              type="button"
              onClick={() => setShowExportMenu((v) => !v)}
              disabled={exporting !== null}
              className="flex items-center gap-sm rounded-md bg-primary px-md py-sm text-label-md text-on-primary transition-all hover:bg-primary-container hover:shadow-md disabled:opacity-60"
              aria-haspopup="menu"
              aria-expanded={showExportMenu}
            >
              {exporting ? (
                <Loader2 className="h-[18px] w-[18px] animate-spin" strokeWidth={2} />
              ) : (
                <FileSpreadsheet className="h-[18px] w-[18px]" strokeWidth={2} />
              )}
              {exporting ? "Mengunduh..." : "Unduh Laporan"}
              <ChevronDown className="h-4 w-4" strokeWidth={2} />
            </button>

            {showExportMenu && (
              <div
                role="menu"
                className="absolute right-0 z-20 mt-xs w-48 overflow-hidden rounded-md border border-outline-variant bg-surface-container-lowest shadow-lg"
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => handleExport("pdf")}
                  className="flex w-full items-center gap-sm px-md py-sm text-left text-label-md text-on-surface hover:bg-surface-container-low"
                >
                  <FileText className="h-4 w-4 text-error" strokeWidth={2} />
                  Unduh sebagai PDF
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => handleExport("excel")}
                  className="flex w-full items-center gap-sm px-md py-sm text-left text-label-md text-on-surface hover:bg-surface-container-low"
                >
                  <FileSpreadsheet className="h-4 w-4 text-primary" strokeWidth={2} />
                  Unduh sebagai Excel
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Filter Tanggal */}
      <div className="flex flex-wrap items-center gap-sm rounded-lg border border-outline-variant bg-surface-container-lowest p-md">
        <div className="flex items-center gap-sm">
          <Calendar className="h-4 w-4 text-on-surface-variant" strokeWidth={2} />
          <label className="text-label-sm text-on-surface-variant">Dari:</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              setPage(1);
            }}
            className="rounded-lg border border-outline bg-surface-container-lowest px-md py-sm text-body-md text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <div className="flex items-center gap-sm">
          <label className="text-label-sm text-on-surface-variant">Sampai:</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => {
              setEndDate(e.target.value);
              setPage(1);
            }}
            className="rounded-lg border border-outline bg-surface-container-lowest px-md py-sm text-body-md text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <button
          type="button"
          onClick={() => {
            const today = new Date().toISOString().split("T")[0];
            setStartDate(today);
            setEndDate(today);
            setPage(1);
          }}
          className="rounded-lg bg-primary/10 px-md py-sm text-label-md text-primary hover:bg-primary hover:text-on-primary transition-all"
        >
          Hari Ini
        </button>
        <div className="ml-auto flex items-center gap-2 text-label-sm text-on-surface-variant">
          <span className="relative flex h-2 w-2">
            <span className={`absolute inline-flex h-full w-full rounded-full ${isPolling ? "bg-secondary animate-ping" : "bg-surface-container-high"}`} />
            <span className={`relative inline-flex h-2 w-2 rounded-full ${isPolling ? "bg-secondary" : "bg-surface-container-high"}`} />
          </span>
          {isPolling ? "Live" : "Paused"}
        </div>
      </div>

      {/* Kartu ringkasan */}
      {stats && !isLoading ? (
        <div className="grid grid-cols-1 gap-md sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
          <div className="rounded-lg border border-outline-variant bg-surface-container-lowest p-lg hover:shadow-md transition-shadow">
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-on-primary">
              <UserCheck className="h-[18px] w-[18px]" strokeWidth={2} />
            </span>
            <p className="mt-md text-label-sm uppercase tracking-wide text-on-surface-variant">
              Total Pedagang
            </p>
            <p className="text-headline-md text-on-surface">{stats.totalTerdaftar}</p>
          </div>

          <div className="rounded-lg border border-outline-variant bg-surface-container-lowest p-lg hover:shadow-md transition-shadow">
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-secondary-container text-on-secondary-container">
              <UserCheck className="h-[18px] w-[18px]" strokeWidth={2} />
            </span>
            <p className="mt-md text-label-sm uppercase tracking-wide text-on-surface-variant">
              Check-in
            </p>
            <p className="text-headline-md text-on-surface">{stats.totalCheckin}</p>
            <p className="text-label-sm text-on-surface-variant">
              {stats.persenHadir}% hadir
            </p>
          </div>

          <div className="rounded-lg border border-outline-variant bg-surface-container-lowest p-lg hover:shadow-md transition-shadow">
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary-container/20 text-primary">
              <LogOut className="h-[18px] w-[18px]" strokeWidth={2} />
            </span>
            <p className="mt-md text-label-sm uppercase tracking-wide text-on-surface-variant">
              Check-out
            </p>
            <p className="text-headline-md text-on-surface">
              {stats.totalCheckout}
              <span className="text-body-md text-on-surface-variant"> / {stats.totalCheckin}</span>
            </p>
            <div className="mt-sm h-1.5 w-full overflow-hidden rounded-full bg-surface-container-high">
              <div
                className="h-full rounded-full bg-secondary transition-all duration-500"
                style={{ width: `${stats.totalCheckin > 0 ? (stats.totalCheckout / stats.totalCheckin) * 100 : 0}%` }}
              />
            </div>
          </div>

          <div className="rounded-lg border border-outline-variant bg-surface-container-lowest p-lg hover:shadow-md transition-shadow">
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-tertiary-container/25 text-tertiary">
              <Store className="h-[18px] w-[18px]" strokeWidth={2} />
            </span>
            <p className="mt-md text-label-sm uppercase tracking-wide text-on-surface-variant">
              Lapak Terisi
            </p>
            <p className="text-headline-md text-on-surface">{lapakTerisi}</p>
            <p className="text-label-sm text-on-surface-variant">
              dari {data.length} pedagang check-in
            </p>
          </div>

          <div className="rounded-lg border border-outline-variant bg-surface-container-lowest p-lg hover:shadow-md transition-shadow">
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-secondary-container/20 text-secondary">
              <DollarSign className="h-[18px] w-[18px]" strokeWidth={2} />
            </span>
            <p className="mt-md text-label-sm uppercase tracking-wide text-on-surface-variant">
              Rata-rata Omset
            </p>
            <p className="text-headline-md text-on-surface">
              Rp {(stats.rataOmset / 1000).toFixed(0)}K
            </p>
            <p className="text-label-sm text-on-surface-variant">
              Dari {stats.totalCheckout} pedagang
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-md sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="rounded-lg border border-outline-variant bg-surface-container-lowest p-lg animate-pulse">
              <div className="h-9 w-9 rounded-md bg-surface-container-high" />
              <div className="mt-md h-3 w-24 rounded bg-surface-container-high" />
              <div className="mt-1 h-8 w-16 rounded bg-surface-container-high" />
            </div>
          ))}
        </div>
      )}

      {/* Search */}
      <form onSubmit={handleSearch} className="flex flex-col gap-sm rounded-lg border border-outline-variant bg-surface-container-lowest p-sm sm:flex-row sm:items-center">
        <div className="flex flex-1 items-center gap-sm rounded-md bg-surface-container-low px-md py-sm">
          <Search className="h-4 w-4 text-on-surface-variant" strokeWidth={2} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari Nama Usaha atau Pemilik..."
            className="w-full bg-transparent text-body-md text-on-surface placeholder:text-on-surface-variant focus:outline-none"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm("")}
              className="text-on-surface-variant hover:text-on-surface"
            >
              ✕
            </button>
          )}
        </div>
        <button
          type="submit"
          className="rounded-lg bg-primary px-md py-sm text-label-md text-on-primary hover:bg-primary-container transition-all"
        >
          Cari
        </button>
      </form>

      {/* Tabel */}
      <div className="overflow-hidden rounded-lg border border-outline-variant bg-surface-container-lowest">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-outline-variant bg-surface-container-low text-label-sm text-on-surface-variant">
                <th className="px-lg py-sm font-medium">Waktu In</th>
                <th className="px-lg py-sm font-medium">ID</th>
                <th className="px-lg py-sm font-medium">Profil Usaha</th>
                <th className="px-lg py-sm font-medium">Kategori</th>
                <th className="px-lg py-sm font-medium">Lokasi Lapak</th>
                <th className="px-lg py-sm font-medium">Status</th>
                <th className="px-lg py-sm font-medium">Waktu Out</th>
                <th className="px-lg py-sm font-medium text-right">Omset</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-lg py-xl text-center">
                    <div className="flex flex-col items-center gap-xs">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" strokeWidth={2} />
                      <p className="text-body-md text-on-surface-variant">Memuat data...</p>
                    </div>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={8} className="px-lg py-xl text-center">
                    <div className="flex flex-col items-center gap-xs">
                      <XCircle className="h-8 w-8 text-error" strokeWidth={2} />
                      <p className="text-body-md text-on-surface-variant">{error}</p>
                      <button
                        type="button"
                        onClick={() => fetchData(true)}
                        className="text-primary hover:underline"
                      >
                        Coba lagi
                      </button>
                    </div>
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-lg py-xl text-center">
                    <div className="flex flex-col items-center gap-xs">
                      <Search className="h-8 w-8 text-on-surface-variant/40" strokeWidth={1.5} />
                      <p className="text-body-md text-on-surface-variant">Tidak ada data</p>
                      <p className="text-label-sm text-on-surface-variant/60">
                        {lastUpdated
                          ? `Data terakhir diperbarui pukul ${lastUpdated.toLocaleTimeString("id-ID")}.`
                          : "Belum ada kehadiran pada periode yang dipilih"}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                data.map((k) => {
                  const kategori = KATEGORI_STYLE[k.kategori?.toLowerCase() || ""] || {
                    label: k.kategori || "-",
                    bg: "bg-surface-container-high",
                    text: "text-on-surface-variant",
                  };
                  const status = STATUS_STYLE[k.status] || STATUS_STYLE["belum-hadir"];
                  const StatusIcon = status.icon;
                  return (
                    <tr
                      key={k.id}
                      onClick={() => setSelectedKehadiranId(k.id)}
                      title="Klik untuk melihat detail pedagang"
                      className={`cursor-pointer border-b border-outline-variant last:border-0 hover:bg-surface-container-low/50 transition-colors ${
                        k.status === "check-out" ? "bg-primary-container/5" : ""
                      }`}
                    >
                      <td className="px-lg py-md text-body-md text-on-surface font-semibold">{k.waktuCheckin}</td>
                      <td className="px-lg py-md text-body-md text-on-surface-variant">{k.id.slice(0, 8)}</td>
                      <td className="px-lg py-md">
                        <div className="flex items-center gap-sm">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-fixed text-label-sm font-semibold text-on-primary-fixed">
                            {k.inisial || "??"}
                          </span>
                          <div>
                            <p className="text-label-md font-semibold text-on-surface">{k.namaUsaha}</p>
                            <p className="text-label-sm text-on-surface-variant">{k.pemilik}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-lg py-md">
                        <span className={`inline-flex rounded-full px-sm py-1 text-label-sm ${kategori.bg} ${kategori.text}`}>
                          {kategori.label}
                        </span>
                      </td>
                      <td className="px-lg py-md text-body-md text-on-surface-variant">
                        {k.lokasiLapak || "-"}
                      </td>
                      <td className="px-lg py-md">
                        <span className={`inline-flex items-center gap-xs rounded-full px-sm py-1 text-label-sm ${status.bg} ${status.text}`}>
                          <StatusIcon className="h-3 w-3" strokeWidth={2.5} />
                          {status.label}
                        </span>
                      </td>
                      <td className="px-lg py-md text-body-md text-on-surface-variant">
                        {k.waktuCheckout || "-"}
                      </td>
                      <td className="px-lg py-md text-right">
                        {k.omset ? (
                          <span className="font-semibold text-primary">
                            Rp {k.omset.toLocaleString("id-ID")}
                          </span>
                        ) : (
                          <span className="text-on-surface-variant/60">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex flex-wrap items-center justify-between gap-sm border-t border-outline-variant px-lg py-sm">
          <p className="text-label-sm text-on-surface-variant">
            Menampilkan {data.length} dari {totalData} data
            {searchTerm && ` (hasil filter: "${searchTerm}")`}
          </p>
          <div className="flex items-center gap-xs">
            <button
              type="button"
              onClick={handlePrevPage}
              disabled={page <= 1 || isLoading}
              className="flex h-7 w-7 items-center justify-center rounded-md text-on-surface-variant hover:bg-surface-container-low transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-4 w-4" strokeWidth={2} />
            </button>
            <span className="text-label-sm text-on-surface-variant px-2">
              {page} / {totalPages || 1}
            </span>
            <button
              type="button"
              onClick={handleNextPage}
              disabled={page >= totalPages || isLoading}
              className="flex h-7 w-7 items-center justify-center rounded-md text-on-surface-variant hover:bg-surface-container-low transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="h-4 w-4" strokeWidth={2} />
            </button>
          </div>
        </div>
      </div>

      {selectedKehadiranId && (
        <DetailPedagangModal kehadiranId={selectedKehadiranId} onClose={() => setSelectedKehadiranId(null)} />
      )}
    </div>
  );
}

// ============================================================
// MODAL DETAIL PEDAGANG
// ============================================================

const JENIS_DAGANGAN_LABEL: Record<string, string> = {
  makanan_minuman: "Makanan & Minuman",
  bukan_makanan_minuman: "Bukan Makanan & Minuman",
};

const JENIS_LAPAK_LABEL: Record<string, string> = {
  rombong: "Rombong",
  meja: "Meja",
};

function formatTanggalIndo(value: string) {
  if (!value) return "-";
  const d = new Date(`${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

function DetailPedagangModal({ kehadiranId, onClose }: { kehadiranId: string; onClose: () => void }) {
  const [detail, setDetail] = useState<DetailKehadiran | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    apiFetch<DetailKehadiran>(`/api/petugas/laporan/${kehadiranId}`)
      .then((res) => {
        if (!cancelled) setDetail(res);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Gagal memuat detail pedagang");
      });
    return () => {
      cancelled = true;
    };
  }, [kehadiranId]);

  // Tutup modal dengan tombol Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const lokasiUtama = detail
    ? detail.lokasi.namaJalan
      ? `${detail.lokasi.namaJalan}${detail.lokasi.nomorLapak ? ` - Lapak No. ${detail.lokasi.nomorLapak}` : ""}`
      : detail.lokasi.lokasiLapak || "-"
    : "-";

  const status = detail ? STATUS_STYLE[detail.kehadiran.status] || STATUS_STYLE["belum-hadir"] : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-lg bg-surface-container-lowest shadow-lg"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-md border-b border-outline-variant px-lg py-md">
          <div>
            <h3 className="text-headline-md text-on-surface">{detail?.usaha.namaUsaha || "Detail Pedagang"}</h3>
            {detail && (
              <p className="mt-xs text-label-md text-on-surface-variant">
                {detail.pribadi.namaLengkap} &middot;{" "}
                {detail.pribadi.statusPedagang === "baru" ? "Pedagang Baru" : "Pedagang Lama"}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-on-surface-variant hover:bg-surface-container-low"
            aria-label="Tutup"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Isi */}
        <div className="overflow-y-auto px-lg py-md">
          {error ? (
            <div className="rounded-lg bg-error-container/60 px-md py-sm text-label-md text-on-error-container">{error}</div>
          ) : !detail ? (
            <div className="flex items-center justify-center gap-sm py-xl text-on-surface-variant">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-body-md">Memuat detail pedagang...</span>
            </div>
          ) : (
            <div className="flex flex-col gap-md">
              <DetailSection icon={ClipboardList} title="Kehadiran">
                <DetailRow label="Tanggal" value={formatTanggalIndo(detail.kehadiran.tanggal)} />
                <DetailRow label="Sesi" value={detail.kehadiran.namaSesi} />
                <DetailRow
                  label="Status"
                  value={
                    status && (
                      <span className={`inline-flex items-center gap-xs rounded-full px-sm py-1 text-label-sm ${status.bg} ${status.text}`}>
                        {status.label}
                      </span>
                    )
                  }
                />
                <DetailRow label="Check-in" value={detail.kehadiran.waktuCheckin} />
                <DetailRow label="Check-out" value={detail.kehadiran.waktuCheckout} />
                <DetailRow
                  label="Omset"
                  value={detail.kehadiran.omset ? `Rp ${detail.kehadiran.omset.toLocaleString("id-ID")}` : null}
                />
                <DetailRow label="Dicatat oleh" value={detail.kehadiran.dicatatOleh} />
              </DetailSection>

              <DetailSection icon={MapPin} title="Lokasi Lapak">
                <DetailRow label="Lokasi" value={lokasiUtama} />
                <DetailRow label="Kecamatan" value={detail.lokasi.kecamatan} />
              </DetailSection>

              <DetailSection icon={Store} title="Usaha">
                <DetailRow label="Nama usaha" value={detail.usaha.namaUsaha} />
                <DetailRow
                  label="Jenis dagangan"
                  value={JENIS_DAGANGAN_LABEL[detail.usaha.jenisDagangan] || detail.usaha.jenisDagangan}
                />
                <DetailRow label="Jenis lapak" value={JENIS_LAPAK_LABEL[detail.usaha.jenisLapak] || detail.usaha.jenisLapak} />
              </DetailSection>

              <DetailSection icon={User} title="Data Pribadi">
                <DetailRow label="Nama lengkap" value={detail.pribadi.namaLengkap} />
                <DetailRow label="NIK" value={detail.pribadi.nik} mono />
                <DetailRow label="Email" value={detail.pribadi.email} />
                <DetailRow label="Tanggal lahir" value={formatTanggalIndo(detail.pribadi.tanggalLahir)} />
              </DetailSection>

              <p className="text-label-sm text-on-surface-variant/70">
                NIK dan email disensor untuk menjaga privasi pedagang.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DetailSection({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof MapPin;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-outline-variant">
      <div className="flex items-center gap-sm border-b border-outline-variant bg-surface-container-low px-md py-sm">
        <Icon className="h-4 w-4 text-primary" strokeWidth={2.2} />
        <h4 className="text-label-md font-semibold text-on-surface">{title}</h4>
      </div>
      <dl className="divide-y divide-outline-variant">{children}</dl>
    </section>
  );
}

function DetailRow({ label, value, mono = false }: { label: string; value: React.ReactNode; mono?: boolean }) {
  const kosong = value === null || value === undefined || value === "" || value === "-";
  return (
    <div className="grid grid-cols-[140px_1fr] gap-md px-md py-sm">
      <dt className="text-label-sm text-on-surface-variant">{label}</dt>
      <dd className={`text-body-md text-on-surface ${mono ? "font-mono tracking-wide" : ""}`}>
        {kosong ? <span className="text-on-surface-variant/60">-</span> : value}
      </dd>
    </div>
  );
}

// ============================================================
// EXPORT EXCEL (dengan format rapi)
// ============================================================

const KATEGORI_EXPORT_LABEL: Record<string, string> = {
  makanan_minuman: "Makanan & Minuman",
  bukan_makanan_minuman: "Bukan Makanan & Minuman",
};

function labelKategori(kategori?: string) {
  if (!kategori) return "-";
  return (
    KATEGORI_EXPORT_LABEL[kategori] ||
    KATEGORI_STYLE[kategori.toLowerCase()]?.label ||
    kategori
  );
}

type BarisExport = {
  "Check-in": string;
  Usaha: string;
  Pemilik: string;
  Kategori: string;
  Lokasi: string;
  Status: string;
  "Check-out": string;
  Omset: number;
};

function buatExcelLaporan(rows: BarisExport[], ringkasan: LaporanResponse, periode: string, namaFile: string) {
  const BIRU = "1E3A8A";
  const garis = { style: "thin", color: { rgb: "CBD5E1" } };
  const border = { top: garis, bottom: garis, left: garis, right: garis };
  const FORMAT_RP = '"Rp "#,##0';

  const header = ["No", "Check-in", "Check-out", "Nama Usaha", "Pemilik", "Kategori", "Lokasi", "Status", "Omset"];
  const kolomTerakhir = header.length - 1;

  const dicetak = new Date().toLocaleString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  // ---- susun isi sheet baris per baris ----
  const aoa: (string | number)[][] = [
    ["LAPORAN KEHADIRAN PEDAGANG CFD"],
    [`Periode: ${periode}`],
    [`Dicetak: ${dicetak}`],
    [],
    ["Ringkasan"],
    // label di kolom A (digabung A-C), nilai di kolom D
    ["Pedagang check-in", "", "", ringkasan.totalCheckin],
    ["Pedagang check-out", "", "", ringkasan.totalCheckout],
    ["Total omset", "", "", ringkasan.totalOmset],
    ["Rata-rata omset", "", "", ringkasan.rataOmset],
    [],
    header,
  ];
  const barisHeader = aoa.length - 1; // index 0-based baris header tabel

  rows.forEach((r, i) => {
    aoa.push([i + 1, r["Check-in"], r["Check-out"], r.Usaha, r.Pemilik, r.Kategori, r.Lokasi, r.Status, r.Omset]);
  });
  const barisTotal = aoa.length;
  aoa.push(["", "", "", "", "", "", "", "TOTAL OMSET", rows.reduce((sum, r) => sum + (r.Omset || 0), 0)]);

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const alamat = (r: number, c: number) => XLSX.utils.encode_cell({ r, c });
  const beriGaya = (r: number, c: number, gaya: Record<string, unknown>) => {
    const ref = alamat(r, c);
    if (!ws[ref]) ws[ref] = { t: "s", v: "" };
    ws[ref].s = { ...(ws[ref].s || {}), ...gaya };
  };

  // ---- judul & info ----
  beriGaya(0, 0, { font: { bold: true, sz: 16, color: { rgb: BIRU } } });
  beriGaya(1, 0, { font: { sz: 11, color: { rgb: "475569" } } });
  beriGaya(2, 0, { font: { sz: 10, italic: true, color: { rgb: "64748B" } } });

  // ---- ringkasan ----
  beriGaya(4, 0, { font: { bold: true, sz: 12, color: { rgb: BIRU } } });
  for (let r = 5; r <= 8; r++) {
    for (let c = 0; c <= 2; c++) {
      beriGaya(r, c, { font: { color: { rgb: "334155" } }, fill: { fgColor: { rgb: "F1F5F9" } }, border });
    }
    beriGaya(r, 3, {
      font: { bold: true },
      border,
      alignment: { horizontal: "right" },
      ...(r >= 7 ? { numFmt: FORMAT_RP } : {}),
    });
  }

  // ---- header tabel ----
  for (let c = 0; c <= kolomTerakhir; c++) {
    beriGaya(barisHeader, c, {
      font: { bold: true, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: BIRU } },
      alignment: { horizontal: "center", vertical: "center" },
      border,
    });
  }

  // ---- isi tabel (baris selang-seling + warna status) ----
  rows.forEach((row, i) => {
    const r = barisHeader + 1 + i;
    const zebra = i % 2 === 1 ? { fill: { fgColor: { rgb: "F8FAFC" } } } : {};
    for (let c = 0; c <= kolomTerakhir; c++) {
      beriGaya(r, c, { border, alignment: { vertical: "center" }, ...zebra });
    }
    // No, jam check-in & check-out rata tengah
    [0, 1, 2].forEach((c) => beriGaya(r, c, { alignment: { horizontal: "center" } }));
    // Status berwarna
    const selesai = row.Status.toLowerCase().includes("out");
    beriGaya(r, 7, {
      alignment: { horizontal: "center" },
      font: { bold: true, color: { rgb: selesai ? "047857" : "B45309" } },
    });
    // Omset format rupiah
    beriGaya(r, 8, { numFmt: FORMAT_RP, alignment: { horizontal: "right" } });
  });

  // ---- baris total ----
  for (let c = 0; c <= kolomTerakhir; c++) {
    beriGaya(barisTotal, c, { fill: { fgColor: { rgb: "E0E7FF" } }, border, font: { bold: true } });
  }
  beriGaya(barisTotal, 7, { alignment: { horizontal: "right" } });
  beriGaya(barisTotal, 8, { numFmt: FORMAT_RP, alignment: { horizontal: "right" } });

  // ---- lebar kolom, gabung sel judul, filter ----
  ws["!cols"] = [
    { wch: 5 },  // No
    { wch: 10 }, // Check-in
    { wch: 10 }, // Check-out
    { wch: 28 }, // Nama Usaha
    { wch: 26 }, // Pemilik
    { wch: 24 }, // Kategori
    { wch: 30 }, // Lokasi
    { wch: 14 }, // Status
    { wch: 16 }, // Omset
  ];
  ws["!rows"] = [{ hpt: 24 }];
  ws["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: kolomTerakhir } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: kolomTerakhir } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: kolomTerakhir } },
    ...[5, 6, 7, 8].map((r) => ({ s: { r, c: 0 }, e: { r, c: 2 } })),
  ];
  ws["!autofilter"] = {
    ref: XLSX.utils.encode_range({ s: { r: barisHeader, c: 0 }, e: { r: barisTotal - 1, c: kolomTerakhir } }),
  };

  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, ws, "Laporan Kehadiran");
  XLSX.writeFile(book, namaFile);
}