// app/admin/manajemen-lapak/page.tsx
"use client";

import { useEffect, useState } from "react";
import { CalendarDays, Store, ClipboardList } from "lucide-react";
import type { KecamatanLengkapData } from "./types";
import { getWilayah } from "./api";
import EventTab from "./components/EventTab";
import RuasKuotaTab from "./components/RuasKuotaTab";
import LaporanTab from "./components/LaporanTab";

// Tab "Pedagang" sudah dipindah ke Manajemen User > Pedagang.
const TABS = [
  { key: "event", label: "Event", icon: CalendarDays },
  { key: "ruas-kuota", label: "Ruas & Kuota", icon: Store },
  { key: "laporan", label: "Laporan", icon: ClipboardList },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default function ManajemenLapakPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("event");

  const [wilayah, setWilayah] = useState<KecamatanLengkapData[]>([]);
  const [wilayahLoading, setWilayahLoading] = useState(true);
  const [wilayahError, setWilayahError] = useState<string | null>(null);

  async function loadWilayah() {
    setWilayahLoading(true);
    setWilayahError(null);
    try {
      const res = await getWilayah();
      setWilayah(res.data ?? []);
    } catch (err) {
      setWilayahError(err instanceof Error ? err.message : "Gagal memuat data wilayah.");
    } finally {
      setWilayahLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadWilayah();
  }, []);

  return (
    <div className="flex flex-col gap-lg pb-xl">
      <div>
        <h2 className="text-headline-lg text-on-surface">Manajemen Lapak</h2>
        <p className="mt-xs max-w-2xl text-body-md text-on-surface-variant">
          Kelola event CFD serta ruas &amp; kuota per jalan dalam satu halaman. Event yang diaktifkan di sini
          otomatis muncul di Jam Operasional.
        </p>
      </div>

      <div className="flex flex-wrap gap-xs rounded-xl border border-outline-variant bg-surface-container-lowest p-1">
        {TABS.map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setActiveTab(t.key)}
              className={`flex items-center gap-xs rounded-lg px-md py-sm text-label-md transition-all ${
                isActive ? "bg-primary text-on-primary shadow-sm" : "text-on-surface-variant hover:bg-surface-container-high"
              }`}
            >
              <Icon className="h-4 w-4" strokeWidth={2} />
              {t.label}
            </button>
          );
        })}
      </div>

      <div className="pt-card">
        {activeTab === "event" && <EventTab wilayah={wilayah} />}
        {activeTab === "ruas-kuota" && (
          <RuasKuotaTab wilayah={wilayah} loading={wilayahLoading} error={wilayahError} onRefresh={loadWilayah} />
        )}
        {activeTab === "laporan" && <LaporanTab />}
      </div>
    </div>
  );
}