"use client";

import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  ShieldAlert,
  Users,
  ClipboardList,
  Store,
  TrendingUp,
  ChevronRight,
} from "lucide-react";

type FetchState = "loading" | "ok" | "forbidden" | "error";

type VerificationStatus = "Pending" | "Approved" | "Rejected";

type VerificationRequest = {
  name: string;
  stallType: string;
  status: VerificationStatus;
  date: string;
};

type DashboardStats = {
  totalPedagang?: number;
  totalPedagangDelta?: string;
  verifikasiPending?: number;
  lapakTerisiPercent?: number;
  lapakTerisiDetail?: string;
};

// Bentuk response yang diharapkan dari GET /api/admin/dashboard.
// Semua field opsional -- backend belum tentu ngirim semuanya sekarang,
// jadi UI di bawah didesain buat tetap rapi walau field-nya kosong/undefined.
type DashboardResponse = {
  message?: string;
  stats?: DashboardStats;
  recentVerifications?: VerificationRequest[];
};

const BRAND = "#1c3f7c";

// Dashboard buat role SUPERADMIN. Sudah nyambung ke GET /api/admin/dashboard
// (dilindungi AuthMiddleware + RoleMiddleware "superadmin" di backend).
// Belum ada dummy/hardcode data -- kalau backend belum ngirim field tertentu,
// bagian itu tampil kosong/netral, bukan angka karangan.
export default function AdminDashboardPage() {
  const [state, setState] = useState<FetchState>("loading");
  const [message, setMessage] = useState("");
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [requests, setRequests] = useState<VerificationRequest[] | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("cfd_token");

    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/dashboard`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(async (res) => {
        const data: DashboardResponse = await res.json().catch(() => ({}));
        if (res.status === 401) {
          setState("error");
          setMessage("Sesi login tidak ditemukan, silakan login ulang.");
          return;
        }
        if (res.status === 403) {
          setState("forbidden");
          return;
        }
        if (!res.ok) {
          setState("error");
          setMessage((data as { error?: string }).error || "Gagal memuat dashboard.");
          return;
        }
        setState("ok");
        setMessage(data.message || "");
        setStats(data.stats ?? null);
        setRequests(data.recentVerifications ?? null);
      })
      .catch(() => {
        setState("error");
        setMessage("Tidak bisa terhubung ke server.");
      });
  }, []);

  if (state === "forbidden") {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-3 rounded-xl border border-slate-200 bg-white p-10 text-center shadow-sm">
        <ShieldAlert className="h-10 w-10 text-rose-500" strokeWidth={2} />
        <h2 className="text-lg font-semibold text-slate-900">Akses Ditolak</h2>
        <p className="text-sm text-slate-500">
          Akun kamu tidak memiliki akses ke halaman Super Admin.
        </p>
      </div>
    );
  }

  if (state === "loading" || state === "error") {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Dashboard Super Admin</h2>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            Ringkasan sistem dan manajemen pengguna.
          </p>
        </div>

        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
              <LayoutDashboard
                className={"h-5 w-5 " + (state === "loading" ? "animate-pulse" : "")}
                strokeWidth={2}
              />
            </span>
            <div>
              <h3 className="text-base font-semibold text-slate-900">
                {state === "loading" ? "Memuat dashboard..." : "Gagal memuat dashboard"}
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                {state === "loading" ? "Mohon tunggu sebentar." : message}
              </p>
            </div>
          </div>
        </section>
      </div>
    );
  }

  // state === "ok"
  return (
    <div className="flex flex-col gap-8">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Selamat Datang, Superadmin</h1>
        <p className="mt-2 text-sm text-slate-500">
          {message || "Here's what's happening with CFD Hub today."}
        </p>
      </div>

      {/* Stats Overview Cards */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Total Pedagang */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
          <div className="mb-4 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total Pedagang
            </span>
            <div className="rounded-lg bg-blue-50 p-2 text-blue-700">
              <Users className="h-5 w-5" />
            </div>
          </div>
          <div className="text-2xl font-semibold text-slate-900">
            {stats?.totalPedagang?.toLocaleString("id-ID") ?? "—"}
          </div>
          {stats?.totalPedagangDelta && (
            <div className="mt-2 flex items-center text-emerald-600">
              <TrendingUp className="mr-1 h-4 w-4" />
              <span className="text-xs font-semibold">{stats.totalPedagangDelta}</span>
            </div>
          )}
        </div>

        {/* Verifikasi Pending */}
        <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-amber-50/60 p-6 shadow-sm transition-shadow hover:shadow-md">
          <div className="absolute right-0 top-0 h-full w-1.5 bg-amber-400" />
          <div className="mb-4 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Verifikasi Pending
            </span>
            <div className="rounded-lg bg-white p-2 text-amber-600">
              <ClipboardList className="h-5 w-5" />
            </div>
          </div>
          <div className="text-2xl font-semibold text-slate-900">
            {stats?.verifikasiPending ?? "—"}
          </div>
          {!!stats?.verifikasiPending && (
            <div className="mt-2 flex items-center text-amber-600">
              <span className="text-xs font-bold">Action Required</span>
            </div>
          )}
        </div>

        {/* Lapak Terisi */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
          <div className="mb-4 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Lapak Terisi
            </span>
            <div className="rounded-lg bg-blue-50 p-2 text-blue-700">
              <Store className="h-5 w-5" />
            </div>
          </div>
          <div className="text-2xl font-semibold text-slate-900">
            {stats?.lapakTerisiPercent !== undefined ? `${stats.lapakTerisiPercent}%` : "—"}
          </div>
          {stats?.lapakTerisiDetail && (
            <div className="mt-2 flex items-center text-slate-500">
              <span className="text-xs">{stats.lapakTerisiDetail}</span>
            </div>
          )}
        </div>
      </div>

      {/* Recent Verification Requests */}
      <div className="w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900">
            Recent Verification Requests
          </h2>
          <button
            type="button"
            className="inline-flex items-center gap-0.5 text-sm font-medium hover:underline"
            style={{ color: BRAND }}
          >
            View All
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="overflow-x-auto">
          {requests && requests.length > 0 ? (
            <table className="w-full min-w-[520px] border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-6 py-4 text-sm font-medium text-slate-500">
                    Trader Name
                  </th>
                  <th className="px-6 py-4 text-sm font-medium text-slate-500">
                    Stall Type
                  </th>
                  <th className="px-6 py-4 text-sm font-medium text-slate-500">Status</th>
                  <th className="px-6 py-4 text-sm font-medium text-slate-500">Date</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((req, i) => (
                  <tr
                    key={`${req.name}-${i}`}
                    className={
                      "border-b border-slate-200 transition-colors last:border-0 hover:bg-slate-50 " +
                      (i % 2 === 1 ? "bg-slate-50/50" : "")
                    }
                  >
                    <td className="px-6 py-4 text-sm text-slate-900">{req.name}</td>
                    <td className="px-6 py-4 text-sm text-slate-500">{req.stallType}</td>
                    <td className="px-6 py-4">
                      <StatusBadge status={req.status} />
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500">{req.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <EmptyState text="Belum ada pengajuan verifikasi." />
          )}
        </div>
      </div>
    </div>
  );
}

const STATUS_STYLES: Record<VerificationStatus, string> = {
  Pending: "bg-amber-100 text-amber-800",
  Approved: "bg-emerald-100 text-emerald-800",
  Rejected: "bg-rose-100 text-rose-800",
};

function StatusBadge({ status }: { status: VerificationStatus }) {
  return (
    <span
      className={
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold " +
        STATUS_STYLES[status]
      }
    >
      {status}
    </span>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex items-center justify-center py-10 text-sm text-slate-400">
      {text}
    </div>
  );
}