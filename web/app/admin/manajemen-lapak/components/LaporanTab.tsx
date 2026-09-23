"use client";

import { useEffect, useState } from "react";
import { Loader2, ClipboardList, UserCheck, LogOut, Wallet, TrendingUp } from "lucide-react";
import type { KehadiranItem, LaporanResponse, StatsResponse } from "../types";
import { getLaporan, getLaporanStats } from "../api";

const LIMIT = 20;

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

function formatRupiah(n: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n || 0);
}

const STATUS_LABEL: Record<KehadiranItem["status"], string> = {
  "check-in": "Check-in",
  "check-out": "Check-out",
  "belum-hadir": "Belum Hadir",
};

const STATUS_PILL: Record<KehadiranItem["status"], string> = {
  "check-in": "pt-pill-warning",
  "check-out": "pt-pill-success",
  "belum-hadir": "pt-pill-danger",
};

export default function LaporanTab() {
  const [startDate, setStartDate] = useState(todayStr());
  const [endDate, setEndDate] = useState(todayStr());
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const [data, setData] = useState<KehadiranItem[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [laporan, statsRes] = await Promise.all([
        getLaporan({ startDate, endDate, search, page, limit: LIMIT }),
        getLaporanStats({ startDate, endDate }),
      ]);
      setData(laporan.data ?? []);
      setTotal(laporan.total ?? 0);
      setStats(statsRes);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat data laporan.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate, search, page]);

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  }

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  return (
    <div>
      <form onSubmit={handleSearchSubmit} className="mb-lg flex flex-wrap items-end gap-md">
        <div>
          <label className="pt-field-label mb-1 block">Dari Tanggal</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => {
              setPage(1);
              setStartDate(e.target.value);
            }}
            className="pt-input"
          />
        </div>
        <div>
          <label className="pt-field-label mb-1 block">Sampai Tanggal</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => {
              setPage(1);
              setEndDate(e.target.value);
            }}
            className="pt-input"
          />
        </div>
        <div className="flex-1 min-w-[180px]">
          <label className="pt-field-label mb-1 block">Cari</label>
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Nama usaha / pemilik..."
            className="pt-input"
          />
        </div>
        <button type="submit" className="pt-btn pt-btn-primary">
          Terapkan
        </button>
      </form>

      {error && (
        <div className="mb-lg rounded-xl bg-error-container/60 px-md py-sm text-body-sm text-on-error-container">
          {error}
        </div>
      )}

      {loading ? (
        <div className="pt-loading">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="text-body-sm">Memuat data laporan...</span>
        </div>
      ) : (
        <>
          {stats && (
            <div className="mb-lg grid grid-cols-2 gap-md sm:grid-cols-4">
              <StatCard icon={UserCheck} label="Check-in" value={String(stats.totalCheckin)} />
              <StatCard icon={LogOut} label="Check-out" value={String(stats.totalCheckout)} />
              <StatCard icon={Wallet} label="Total Omset" value={formatRupiah(stats.totalOmset)} small />
              <StatCard icon={TrendingUp} label="% Hadir" value={`${stats.persenHadir?.toFixed(0) ?? 0}%`} />
            </div>
          )}

          {data.length === 0 ? (
            <div className="pt-empty">
              <div className="pt-empty-icon">
                <ClipboardList className="h-6 w-6" />
              </div>
              <p className="text-body-sm text-on-surface-variant">Belum ada data untuk rentang tanggal ini.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-outline-variant">
              <table className="min-w-full divide-y divide-outline-variant text-body-sm">
                <thead className="bg-surface-container-low">
                  <tr>
                    <Th>Pedagang</Th>
                    <Th>Lokasi</Th>
                    <Th>Check-in</Th>
                    <Th>Check-out</Th>
                    <Th>Omset</Th>
                    <Th>Status</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/60 bg-surface-container-lowest">
                  {data.map((k) => (
                    <tr key={k.id} className="hover:bg-surface-container-low">
                      <td className="px-md py-sm">
                        <span className="font-medium text-on-surface">{k.namaUsaha}</span>
                        <div className="text-label-sm text-on-surface-variant">{k.pemilik}</div>
                      </td>
                      <td className="px-md py-sm text-on-surface-variant">{k.lokasiLapak || "-"}</td>
                      <td className="px-md py-sm text-on-surface-variant">{k.waktuCheckin}</td>
                      <td className="px-md py-sm text-on-surface-variant">{k.waktuCheckout ?? "-"}</td>
                      <td className="px-md py-sm text-on-surface-variant">{k.omset != null ? formatRupiah(k.omset) : "-"}</td>
                      <td className="px-md py-sm">
                        <span className={`pt-pill ${STATUS_PILL[k.status]}`}>
                          <span className="pt-pill-dot" />
                          {STATUS_LABEL[k.status]}
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
        </>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, small }: { icon: typeof UserCheck; label: string; value: string; small?: boolean }) {
  return (
    <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-md">
      <div className="flex items-center gap-xs text-label-sm text-on-surface-variant">
        <Icon className="h-4 w-4" strokeWidth={2} />
        {label}
      </div>
      <p className={`mt-xs font-semibold text-on-surface ${small ? "text-title-md" : "text-title-lg"}`}>{value}</p>
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
