"use client";

import { useEffect, useState } from "react";
import {
  Settings2,
  Clock,
  ShieldAlert,
  ShieldCheck,
  MapPin,
  Download,
  Copy,
  RefreshCw,
} from "lucide-react";

type GeneralConfig = {
  appName: string;
  supportEmail: string;
  maintenanceMode: boolean;
};

type OperationalPeriod = {
  defaultStartTime: string;
  defaultEndTime: string;
  frequency: string;
  defaultRadiusKm: string;
};

type SecurityConfig = {
  lastBackupLabel: string | null;
  sessionTimeoutMinutes: string;
  minPasswordStrength: string;
  publicApiKey: string | null;
};

type SystemStatus = {
  uptimePercent: number | null;
  latencyMs: number | null;
  platformVersion: string | null;
};

type ActivityLog = {
  id: string;
  message: string;
  actor: string;
  timeAgo: string;
};

export default function PengaturanSistemPage() {
  const [general, setGeneral] = useState<GeneralConfig>({
    appName: "",
    supportEmail: "",
    maintenanceMode: false,
  });
  const [operational, setOperational] = useState<OperationalPeriod>({
    defaultStartTime: "",
    defaultEndTime: "",
    frequency: "",
    defaultRadiusKm: "",
  });
  const [security, setSecurity] = useState<SecurityConfig>({
    lastBackupLabel: null,
    sessionTimeoutMinutes: "",
    minPasswordStrength: "",
    publicApiKey: null,
  });
  const [status, setStatus] = useState<SystemStatus>({
    uptimePercent: null,
    latencyMs: null,
    platformVersion: null,
  });
  const [activities, setActivities] = useState<ActivityLog[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // TODO: ganti dengan endpoint API pengaturan sistem asli
    // async function fetchData() {
    //   const token = localStorage.getItem("cfd_token");
    //   const res = await fetch(
    //     `${process.env.NEXT_PUBLIC_API_URL}/api/admin/pengaturan-sistem`,
    //     { headers: { Authorization: `Bearer ${token}` } }
    //   );
    //   const data = await res.json();
    //   setGeneral(data.general);
    //   setOperational(data.operational);
    //   setSecurity(data.security);
    //   setStatus(data.status);
    //   setActivities(data.activities);
    //   setLoading(false);
    // }
    // fetchData();

    setLoading(false); // hapus baris ini setelah fetch asli dipasang
  }, []);

  const handleSave = async () => {
    setSaving(true);
    // TODO: panggil endpoint API buat simpan perubahan pengaturan
    // try {
    //   const token = localStorage.getItem("cfd_token");
    //   await fetch(
    //     `${process.env.NEXT_PUBLIC_API_URL}/api/admin/pengaturan-sistem`,
    //     {
    //       method: "PUT",
    //       headers: {
    //         "Content-Type": "application/json",
    //         Authorization: `Bearer ${token}`,
    //       },
    //       body: JSON.stringify({ general, operational, security }),
    //     }
    //   );
    // } finally {
    //   setSaving(false);
    // }
    setSaving(false);
  };

  const handleRegenerateApiKey = () => {
    // TODO: panggil endpoint API buat regenerate API key, lalu setSecurity
    // dengan publicApiKey yang baru dari response
  };

  const handleCopyApiKey = () => {
    if (!security.publicApiKey) return;
    navigator.clipboard.writeText(security.publicApiKey);
  };

  return (
    <div>
      {/* Heading */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-slate-900 tracking-tight">
          Pengaturan Sistem
        </h1>
        <p className="text-base text-slate-500 mt-2">
          Kelola konfigurasi global, periode operasional, dan parameter
          keamanan platform.
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Kolom kiri: form pengaturan */}
        <div className="lg:col-span-2 space-y-6">
          {/* Konfigurasi Umum */}
          <section className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <h2 className="flex items-center gap-2 text-xl font-bold text-slate-900 mb-5">
              <Settings2 className="w-5 h-5 text-blue-700" strokeWidth={2.2} />
              Konfigurasi Umum
            </h2>

            <div className="grid sm:grid-cols-2 gap-4 mb-5">
              <div>
                <label className="block text-sm font-bold text-slate-800 mb-1.5">
                  Nama Aplikasi
                </label>
                <input
                  type="text"
                  value={general.appName}
                  onChange={(e) =>
                    setGeneral((prev) => ({
                      ...prev,
                      appName: e.target.value,
                    }))
                  }
                  disabled={loading}
                  className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3.5 py-3 text-base font-medium text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 disabled:opacity-60"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-800 mb-1.5">
                  Email Kontak Bantuan
                </label>
                <input
                  type="email"
                  value={general.supportEmail}
                  onChange={(e) =>
                    setGeneral((prev) => ({
                      ...prev,
                      supportEmail: e.target.value,
                    }))
                  }
                  disabled={loading}
                  className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3.5 py-3 text-base font-medium text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 disabled:opacity-60"
                />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg bg-slate-50 border border-slate-200 px-4 py-3.5">
              <div>
                <p className="text-base font-bold text-slate-900">
                  Maintenance Mode
                </p>
                <p className="text-sm font-medium text-slate-600 mt-0.5">
                  Nonaktifkan akses publik sementara untuk pemeliharaan
                  sistem.
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  setGeneral((prev) => ({
                    ...prev,
                    maintenanceMode: !prev.maintenanceMode,
                  }))
                }
                aria-pressed={general.maintenanceMode}
                className={`w-12 h-6.5 rounded-full flex items-center px-0.5 transition shrink-0 ${
                  general.maintenanceMode
                    ? "bg-emerald-500 justify-end"
                    : "bg-slate-300 justify-start"
                }`}
              >
                <span className="w-5.5 h-5.5 rounded-full bg-white shadow" />
              </button>
            </div>
          </section>

          {/* Periode Operasional */}
          <section className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <h2 className="flex items-center gap-2 text-xl font-bold text-slate-900 mb-5">
              <Clock className="w-5 h-5 text-blue-700" strokeWidth={2.2} />
              Periode Operasional
            </h2>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-slate-800 mb-1.5">
                  Jam Mulai Default
                </label>
                <input
                  type="text"
                  value={operational.defaultStartTime}
                  onChange={(e) =>
                    setOperational((prev) => ({
                      ...prev,
                      defaultStartTime: e.target.value,
                    }))
                  }
                  disabled={loading}
                  placeholder="cth. 06:00 AM"
                  className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3.5 py-3 text-base font-medium text-slate-900 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 disabled:opacity-60"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-800 mb-1.5">
                  Jam Berakhir Default
                </label>
                <input
                  type="text"
                  value={operational.defaultEndTime}
                  onChange={(e) =>
                    setOperational((prev) => ({
                      ...prev,
                      defaultEndTime: e.target.value,
                    }))
                  }
                  disabled={loading}
                  placeholder="cth. 11:00 AM"
                  className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3.5 py-3 text-base font-medium text-slate-900 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 disabled:opacity-60"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-800 mb-1.5">
                  Frekuensi Pelaksanaan
                </label>
                <input
                  type="text"
                  value={operational.frequency}
                  onChange={(e) =>
                    setOperational((prev) => ({
                      ...prev,
                      frequency: e.target.value,
                    }))
                  }
                  disabled={loading}
                  placeholder="cth. Mingguan (Setiap Minggu)"
                  className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3.5 py-3 text-base font-medium text-slate-900 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 disabled:opacity-60"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-800 mb-1.5">
                  Batas Area Default (Radius Km)
                </label>
                <input
                  type="text"
                  value={operational.defaultRadiusKm}
                  onChange={(e) =>
                    setOperational((prev) => ({
                      ...prev,
                      defaultRadiusKm: e.target.value,
                    }))
                  }
                  disabled={loading}
                  placeholder="cth. 2.5"
                  className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3.5 py-3 text-base font-medium text-slate-900 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 disabled:opacity-60"
                />
              </div>
            </div>
          </section>

          {/* Manajemen Data & Keamanan */}
          <section className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <h2 className="flex items-center gap-2 text-xl font-bold text-slate-900 mb-5">
              <ShieldAlert className="w-5 h-5 text-blue-700" strokeWidth={2.2} />
              Manajemen Data &amp; Keamanan
            </h2>

            <div className="flex items-center justify-between flex-wrap gap-3 rounded-lg bg-slate-50 border border-slate-200 px-4 py-3.5 mb-5">
              <div>
                <p className="text-base font-bold text-slate-900">
                  Backup Database Sistem
                </p>
                <p className="text-sm font-medium text-slate-600 mt-0.5">
                  Terakhir backup: {security.lastBackupLabel ?? "-"}
                </p>
              </div>
              <button
                type="button"
                className="flex items-center gap-2 text-sm font-bold text-slate-700 border border-slate-300 bg-white rounded-lg px-4 py-2.5 hover:bg-slate-50"
              >
                <Download className="w-4 h-4" />
                Unduh Backup
              </button>
            </div>

            <div className="grid sm:grid-cols-2 gap-4 mb-5">
              <div>
                <label className="block text-sm font-bold text-slate-800 mb-1.5">
                  Batas Waktu Sesi (Menit)
                </label>
                <input
                  type="text"
                  value={security.sessionTimeoutMinutes}
                  onChange={(e) =>
                    setSecurity((prev) => ({
                      ...prev,
                      sessionTimeoutMinutes: e.target.value,
                    }))
                  }
                  disabled={loading}
                  placeholder="cth. 30"
                  className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3.5 py-3 text-base font-medium text-slate-900 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 disabled:opacity-60"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-800 mb-1.5">
                  Tingkat Kata Sandi Minimum
                </label>
                <input
                  type="text"
                  value={security.minPasswordStrength}
                  onChange={(e) =>
                    setSecurity((prev) => ({
                      ...prev,
                      minPasswordStrength: e.target.value,
                    }))
                  }
                  disabled={loading}
                  placeholder="cth. Kuat (Angka, Simbol, Kapital)"
                  className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3.5 py-3 text-base font-medium text-slate-900 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 disabled:opacity-60"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-800 mb-1.5">
                API Key Publik (Read-Only)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={security.publicApiKey ?? ""}
                  readOnly
                  placeholder="Belum ada API key"
                  className="flex-1 rounded-lg border border-slate-300 bg-slate-100 px-3.5 py-3 text-base text-slate-700 font-mono font-medium placeholder:text-slate-400 outline-none"
                />
                <button
                  type="button"
                  onClick={handleCopyApiKey}
                  disabled={!security.publicApiKey}
                  className="flex items-center justify-center w-11 h-11 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                  aria-label="Salin API key"
                >
                  <Copy className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleRegenerateApiKey}
                  className="flex items-center gap-2 text-sm font-bold text-slate-700 border border-slate-300 bg-white rounded-lg px-4 py-3 hover:bg-slate-50"
                >
                  <RefreshCw className="w-4 h-4" />
                  Regenerate
                </button>
              </div>
            </div>
          </section>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              className="text-sm font-bold text-slate-700 px-5 py-3 rounded-lg hover:bg-slate-100"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 text-sm font-bold text-white bg-blue-900 hover:bg-blue-950 rounded-lg px-5 py-3 shadow-sm transition disabled:opacity-60"
            >
              <ShieldCheck className="w-4 h-4" />
              {saving ? "Menyimpan..." : "Simpan Perubahan"}
            </button>
          </div>
        </div>

        {/* Kolom kanan: status & aktivitas */}
        <div className="space-y-6">
          {/* Status Sistem */}
          <div className="rounded-xl bg-blue-900 p-5 shadow-sm text-white">
            <div className="flex items-center gap-2.5 mb-4">
              <ShieldCheck className="w-5 h-5 text-emerald-300" strokeWidth={2.2} />
              <p className="text-base font-bold">Status Sistem Optimal</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-4xl font-bold">
                  {status.uptimePercent ?? "-"}
                  {status.uptimePercent !== null && "%"}
                </p>
                <p className="text-xs font-bold text-blue-100 tracking-wide mt-1">
                  UPTIME
                </p>
              </div>
              <div>
                <p className="text-4xl font-bold">
                  {status.latencyMs ?? "-"}
                  {status.latencyMs !== null && "ms"}
                </p>
                <p className="text-xs font-bold text-blue-100 tracking-wide mt-1">
                  LATENCY
                </p>
              </div>
            </div>
            <p className="text-sm font-medium text-blue-100 mt-4 pt-4 border-t border-white/10">
              Versi Platform {status.platformVersion ?? "-"}
            </p>
          </div>

          {/* Peta placeholder */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <MapPin className="w-4 h-4 text-slate-500" />
              <p className="text-base font-bold text-slate-800">
                Pusat Data Utama
              </p>
            </div>
            {/* TODO: pasang komponen peta asli (mis. Leaflet/Google Maps)
                di sini, ganti div placeholder ini */}
            <div className="w-full h-40 rounded-lg bg-slate-100 flex items-center justify-center text-sm font-medium text-slate-500">
              Peta belum terpasang
            </div>
          </div>

          {/* Aktivitas Terakhir */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-base font-bold text-slate-900 mb-4">
              Aktivitas Terakhir
            </p>
            {activities.length === 0 ? (
              <p className="text-sm font-medium text-slate-500">
                Belum ada aktivitas tercatat.
              </p>
            ) : (
              <ul className="space-y-4">
                {activities.map((activity) => (
                  <li key={activity.id} className="flex gap-3">
                    <span className="w-2 h-2 mt-1.5 rounded-full bg-blue-600 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-slate-800">
                        {activity.message}
                      </p>
                      <p className="text-sm font-medium text-slate-500 mt-0.5">
                        Oleh: {activity.actor} · {activity.timeAgo}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}