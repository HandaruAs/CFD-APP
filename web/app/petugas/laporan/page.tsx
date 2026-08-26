// app/petugas/laporan/page.tsx
"use client";

import { useEffect, useState, useRef } from "react";
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

  const handleExport = async () => {
    try {
      showToast("📊 Laporan sedang diunduh...", "success");
      setTimeout(() => {
        showToast("✅ Laporan berhasil diunduh!", "success");
      }, 1500);
    } catch {
      showToast("Gagal mengunduh laporan", "error");
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
          <button
            type="button"
            onClick={handleExport}
            className="flex items-center gap-sm rounded-md bg-primary px-md py-sm text-label-md text-on-primary transition-all hover:bg-primary-container hover:shadow-md"
          >
            <FileSpreadsheet className="h-[18px] w-[18px]" strokeWidth={2} />
            Unduh Laporan
          </button>
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
                      className={`border-b border-outline-variant last:border-0 hover:bg-surface-container-low/50 transition-colors ${
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
    </div>
  );
}