"use client";

import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  ShieldAlert,
  Users,
  ClipboardCheck,
  Store,
  ArrowUpRight,
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
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-500">
              <LayoutDashboard className="h-5 w-5" strokeWidth={2} />
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
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">
          Selamat Datang, Superadmin
        </h2>
        <p className="mt-1 max-w-2xl text-sm text-slate-500">
          {message || "Here's what's happening with CFD Hub today."}
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          icon={<Users className="h-4 w-4" />}
          label="Total Pedagang"
          value={stats?.totalPedagang?.toLocaleString("id-ID")}
          footer={
            stats?.totalPedagangDelta ? (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
                <ArrowUpRight className="h-3.5 w-3.5" />
                {stats.totalPedagangDelta}
              </span>
            ) : undefined
          }
        />
        <StatCard
          icon={<ClipboardCheck className="h-4 w-4" />}
          label="Verifikasi Pending"
          value={stats?.verifikasiPending?.toString()}
          footer={
            stats?.verifikasiPending ? (
              <span className="text-xs font-medium text-amber-600">
                Action Required
              </span>
            ) : undefined
          }
          highlight={!!stats?.verifikasiPending}
        />
        <StatCard
          icon={<Store className="h-4 w-4" />}
          label="Lapak Terisi"
          value={
            stats?.lapakTerisiPercent !== undefined
              ? `${stats.lapakTerisiPercent}%`
              : undefined
          }
          footer={
            stats?.lapakTerisiDetail ? (
              <span className="text-xs text-slate-500">
                {stats.lapakTerisiDetail}
              </span>
            ) : undefined
          }
        />
      </div>

      {/* Main content: Recent Verification Requests */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-900">
            Recent Verification Requests
          </h3>
          <button
            type="button"
            className="inline-flex items-center gap-0.5 text-sm font-medium hover:underline"
            style={{ color: BRAND }}
          >
            View All
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 overflow-x-auto">
          {requests && requests.length > 0 ? (
            <table className="w-full min-w-[480px] border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="py-2 pr-4 text-xs font-medium uppercase tracking-wide text-slate-500">
                    Trader Name
                  </th>
                  <th className="py-2 pr-4 text-xs font-medium uppercase tracking-wide text-slate-500">
                    Stall Type
                  </th>
                  <th className="py-2 pr-4 text-xs font-medium uppercase tracking-wide text-slate-500">
                    Status
                  </th>
                  <th className="py-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody>
                {requests.map((req, i) => (
                  <tr
                    key={`${req.name}-${i}`}
                    className="border-b border-slate-100 last:border-0"
                  >
                    <td className="py-3 pr-4 text-sm font-medium text-slate-800">
                      {req.name}
                    </td>
                    <td className="py-3 pr-4 text-sm text-slate-500">
                      {req.stallType}
                    </td>
                    <td className="py-3 pr-4">
                      <StatusBadge status={req.status} />
                    </td>
                    <td className="py-3 text-sm text-slate-400">{req.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <EmptyState text="Belum ada pengajuan verifikasi." />
          )}
        </div>
      </section>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  footer,
  highlight = false,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string;
  footer?: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <div
      className={
        "rounded-xl border bg-white p-5 shadow-sm " +
        (highlight ? "border-slate-200 border-l-4 border-l-amber-400" : "border-slate-200")
      }
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-500">{label}</span>
        <span className="text-slate-400">{icon}</span>
      </div>
      <p className="mt-2 text-2xl font-bold text-slate-900">{value ?? "—"}</p>
      {footer && <div className="mt-1.5">{footer}</div>}
    </div>
  );
}

function StatusBadge({ status }: { status: VerificationStatus }) {
  const styles: Record<VerificationStatus, string> = {
    Pending: "bg-amber-50 text-amber-700",
    Approved: "bg-emerald-50 text-emerald-700",
    Rejected: "bg-rose-50 text-rose-700",
  };

  return (
    <span
      className={
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium " +
        styles[status]
      }
    >
      {status}
    </span>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex items-center justify-center rounded-lg border border-dashed border-slate-200 py-8 text-sm text-slate-400">
      {text}
    </div>
  );
}