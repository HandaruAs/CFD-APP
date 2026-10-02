"use client";

// Sesi Terjadwal -- sesi yang belum selesai (draft, terjadwal, berlangsung).
// Status diambil dari backend (scheduler tiap menit), jadi sesi otomatis
// pindah dari terjadwal -> berlangsung -> Riwayat Sesi sesuai jamnya.
// Aksi per sesi: lihat titik lokasi, tambah titik (acak lagi), ubah kuota,
// peserta, dan hapus/batalkan. Kuota diatur PER SESI (total & jatah pedagang
// lama); setiap titik punya kapasitas tempat. Sesi yang keliru cukup dihapus lalu dibuat ulang;
// kalau sudah ada pedagang yang ikut, sesi dibatalkan (bukan dihapus).

import { useState } from "react";
import {
  Ban,
  CalendarDays,
  CalendarPlus,
  ChevronDown,
  ChevronUp,
  Loader2,
  MapPin,
  Pencil,
  Plus,
  Send,
  Trash2,
  Users,
} from "lucide-react";
import { useConfirmDialog } from "../../manajemen-lapak/components/confirm-dialog";
import UbahKuotaModal from "./UbahKuotaModal";
import {
  apiEvent,
  jamTampil,
  sedangBerlangsung,
  tanggalPanjang,
  tanggalRingkas,
  todayISO,
  waktuTampil,
  type SesiDetail,
  type SesiEvent,
} from "./sesi-utils";

interface Props {
  /** Sesi yang belum selesai, sudah diurutkan dari yang paling dekat. */
  sesiList: SesiEvent[];
  loading: boolean;
  error: string | null;
  onTambah: () => void;
  onTambahTitik: (s: SesiEvent) => void;
  onPeserta: (s: SesiEvent) => void;
  /** Muat ulang daftar setelah ada perubahan; `pesan` untuk notifikasi. */
  onBerubah: (pesan: string) => Promise<void> | void;
}

const PENDAFTARAN_LABEL = {
  belum_dibuka: "Pendaftaran belum dibuka",
  dibuka: "Pendaftaran dibuka",
  ditutup: "Pendaftaran ditutup",
} as const;

export default function DaftarSesi({ sesiList, loading, error, onTambah, onTambahTitik, onPeserta, onBerubah }: Props) {
  const confirm = useConfirmDialog();
  const hariIni = todayISO();
  const [terbuka, setTerbuka] = useState<Record<string, boolean>>({});
  const [detail, setDetail] = useState<Record<string, SesiDetail | "memuat" | "gagal">>({});
  const [ubahKuota, setUbahKuota] = useState<SesiEvent | null>(null);

  async function toggleTitik(s: SesiEvent) {
    const buka = !terbuka[s.id];
    setTerbuka((t) => ({ ...t, [s.id]: buka }));
    if (!buka) return;
    setDetail((d) => ({ ...d, [s.id]: "memuat" }));
    try {
      const res = await apiEvent<{ data: SesiDetail }>(`/api/admin/events/${s.id}`);
      setDetail((d) => ({ ...d, [s.id]: res.data }));
    } catch {
      setDetail((d) => ({ ...d, [s.id]: "gagal" }));
    }
  }

  function hapus(s: SesiEvent) {
    const terisi = s.terisiLama + s.terisiBaru;
    if (terisi > 0) {
      confirm({
        title: `Batalkan sesi "${s.nama}"?`,
        description: "Sesi yang sudah ada pedagangnya tidak bisa dihapus, jadi sesi ini dibatalkan.",
        details: [`${terisi} pedagang yang sudah terdaftar ikut dibatalkan`, "Tindakan ini tidak bisa diurungkan"],
        variant: "danger",
        confirmLabel: "Batalkan Sesi",
        confirmingLabel: "Membatalkan...",
        onConfirm: async () => {
          await apiEvent(`/api/admin/events/${s.id}/status`, { method: "PATCH", body: JSON.stringify({ aksi: "batalkan" }) });
          await onBerubah(`✅ Sesi "${s.nama}" dibatalkan`);
        },
      });
      return;
    }
    confirm({
      title: `Hapus sesi "${s.nama}"?`,
      description: "Tindakan ini tidak bisa dibatalkan.",
      details: [`${s.jumlahTitik} titik lokasi ikut dihapus`],
      variant: "danger",
      confirmLabel: "Hapus Sesi",
      confirmingLabel: "Menghapus...",
      onConfirm: async () => {
        await apiEvent(`/api/admin/events/${s.id}`, { method: "DELETE" });
        await onBerubah(`✅ Sesi "${s.nama}" dihapus`);
      },
    });
  }

  function terbitkan(s: SesiEvent) {
    confirm({
      title: `Terbitkan sesi "${s.nama}"?`,
      description: "Sesi akan terlihat oleh pedagang dan pendaftaran mengikuti jadwalnya.",
      variant: "info",
      confirmLabel: "Terbitkan",
      confirmingLabel: "Menerbitkan...",
      onConfirm: async () => {
        await apiEvent(`/api/admin/events/${s.id}/status`, { method: "PATCH", body: JSON.stringify({ aksi: "terbitkan" }) });
        await onBerubah(`✅ Sesi "${s.nama}" diterbitkan`);
      },
    });
  }

  return (
    <div className="pt-card">
      <div className="mb-md">
        <h3 className="pt-section-title">Sesi Terjadwal</h3>
        <p className="pt-section-desc">
          Sesi yang sudah dibuat dan belum selesai. Sesi mulai dan selesai otomatis sesuai jamnya.
        </p>
      </div>

      {error && (
        <div role="alert" className="mb-md rounded-xl bg-error-container/60 px-md py-sm text-body-sm text-on-error-container">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex flex-col gap-sm" aria-busy="true">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-surface-container-high" />
          ))}
        </div>
      ) : sesiList.length === 0 ? (
        <div className="pt-empty rounded-xl border border-dashed border-outline-variant">
          <div className="pt-empty-icon">
            <CalendarDays className="h-6 w-6" />
          </div>
          <p className="text-body-md font-semibold text-on-surface">Belum ada sesi terjadwal</p>
          <p className="text-body-sm text-on-surface-variant">Tambah sesi, pilih cakupannya, lalu acak lokasinya.</p>
          <button type="button" onClick={onTambah} className="pt-btn pt-btn-secondary mt-sm">
            <CalendarPlus className="h-4 w-4" />
            Tambah Sesi
          </button>
        </div>
      ) : (
        <ul className="flex flex-col gap-sm">
          {sesiList.map((s) => {
            const tgl = s.tanggal.slice(0, 10);
            const t = tanggalRingkas(tgl);
            const berlangsung = sedangBerlangsung(s);
            const bisaAtur = s.status === "draft" || s.status === "terjadwal";
            const terisi = s.terisiLama + s.terisiBaru;
            const d = detail[s.id];
            return (
              <li
                key={s.id}
                className={`rounded-xl border ${
                  berlangsung ? "border-primary/40 bg-primary/5" : "border-outline-variant bg-surface-container-lowest"
                }`}
              >
                <div className="flex flex-wrap items-center gap-md p-md">
                  {/* Kalender kecil -- memudahkan memindai banyak sesi sekaligus */}
                  <div
                    aria-hidden="true"
                    className={`flex w-14 shrink-0 flex-col items-center rounded-lg py-xs leading-tight ${
                      berlangsung ? "bg-primary text-on-primary" : "bg-surface-container-high text-on-surface"
                    }`}
                  >
                    <span className="text-label-sm capitalize opacity-90">{t.hari}</span>
                    <span className="text-title-lg font-semibold tabular-nums">{t.tgl}</span>
                    <span className="text-label-sm opacity-90">{t.bulan}</span>
                  </div>

                  <div className="min-w-0 flex-1 basis-48">
                    <div className="flex flex-wrap items-center gap-xs">
                      <p className="text-body-lg font-semibold text-on-surface">{s.nama}</p>
                      {berlangsung ? (
                        <span className="pt-pill pt-pill-success py-0.5">
                          <span className="pt-pill-dot is-pulse" />
                          {s.status === "diperpanjang" ? "Diperpanjang" : "Berlangsung"}
                        </span>
                      ) : s.status === "draft" ? (
                        <span className="pt-pill pt-pill-warning py-0.5">Draft · belum terlihat pedagang</span>
                      ) : (
                        <>
                          {tgl === hariIni && <span className="pt-pill pt-pill-neutral py-0.5">Hari ini</span>}
                          <span
                            className={`pt-pill py-0.5 ${s.statusPendaftaran === "dibuka" ? "pt-pill-success" : "pt-pill-neutral"}`}
                          >
                            {PENDAFTARAN_LABEL[s.statusPendaftaran]}
                          </span>
                        </>
                      )}
                    </div>
                    <p className="text-body-sm text-on-surface-variant">
                      <span className="sr-only">{tanggalPanjang(tgl)}, </span>
                      {jamTampil(s.jamMulai)} – {jamTampil(s.jamSelesai)} WIB
                    </p>
                    <p className="text-label-sm text-on-surface-variant">
                      {terisi}/{s.kuotaTotal} pedagang (lama {s.terisiLama}/{s.kuotaLama}, baru {s.terisiBaru}/{s.kuotaBaru}) ·{" "}
                      {s.jumlahTitik} titik, {s.kapasitasTitik} tempat
                    </p>
                    {bisaAtur && s.kuotaTotal > s.kapasitasTitik && (
                      <p className="text-label-sm font-medium text-error">
                        Tempat di titik lokasi ({s.kapasitasTitik}) kurang dari kuota sesi ({s.kuotaTotal}). Tambah titik atau
                        turunkan kuota.
                      </p>
                    )}
                    {s.status === "terjadwal" && (s.pendaftaranBukaAt || s.pendaftaranTutupAt || s.lepasKuotaAt) && (
                      <p className="text-label-sm text-on-surface-variant">
                        {s.pendaftaranBukaAt && `Buka ${waktuTampil(s.pendaftaranBukaAt)}`}
                        {s.pendaftaranTutupAt && ` · Tutup ${waktuTampil(s.pendaftaranTutupAt)}`}
                        {s.lepasKuotaAt &&
                          ` · Kuota lama ${s.kuotaLamaDilepas ? "sudah dilepas" : `dilepas ${waktuTampil(s.lepasKuotaAt)}`}`}
                      </p>
                    )}
                  </div>

                  <div className="flex shrink-0 flex-wrap items-center gap-xs">
                    {s.status === "draft" && s.jumlahTitik > 0 && s.kuotaTotal <= s.kapasitasTitik && (
                      <button type="button" onClick={() => terbitkan(s)} className="pt-btn pt-btn-primary">
                        <Send className="h-4 w-4" />
                        Terbitkan
                      </button>
                    )}
                    {bisaAtur && (
                      <button
                        type="button"
                        onClick={() => onTambahTitik(s)}
                        className="pt-btn pt-btn-ghost"
                        title="Acak titik lokasi tambahan"
                      >
                        <Plus className="h-4 w-4" />
                        Titik
                      </button>
                    )}
                    {bisaAtur && (
                      <button
                        type="button"
                        onClick={() => setUbahKuota(s)}
                        className="pt-btn pt-btn-ghost"
                        title="Ubah kuota sesi"
                      >
                        <Pencil className="h-4 w-4" />
                        Kuota
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onPeserta(s)}
                      className="pt-btn pt-btn-ghost"
                      title="Pedagang yang ikut sesi ini"
                    >
                      <Users className="h-4 w-4" />
                      {terisi}
                    </button>
                    {bisaAtur && (
                      <button
                        type="button"
                        onClick={() => hapus(s)}
                        title={terisi > 0 ? "Batalkan sesi" : "Hapus sesi"}
                        aria-label={`${terisi > 0 ? "Batalkan" : "Hapus"} sesi ${s.nama}`}
                        className="pt-btn pt-btn-ghost-danger pt-btn-icon"
                      >
                        {terisi > 0 ? <Ban className="h-5 w-5" /> : <Trash2 className="h-5 w-5" />}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => toggleTitik(s)}
                      aria-expanded={!!terbuka[s.id]}
                      aria-label="Lihat titik lokasi"
                      className="pt-btn pt-btn-ghost pt-btn-icon"
                    >
                      {terbuka[s.id] ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                {terbuka[s.id] && (
                  <div className="border-t border-outline-variant px-md py-sm">
                    {d === "memuat" || !d ? (
                      <div className="flex justify-center py-sm">
                        <Loader2 className="h-5 w-5 animate-spin text-on-surface-variant" />
                      </div>
                    ) : d === "gagal" ? (
                      <p className="py-sm text-body-sm text-error">Gagal memuat titik lokasi.</p>
                    ) : d.lapak.length === 0 ? (
                      <p className="py-sm text-body-sm text-on-surface-variant">Belum ada titik lokasi.</p>
                    ) : (
                      <ul className="divide-y divide-outline-variant/50">
                        {d.lapak.map((l) => (
                          <li key={l.id} className="flex items-center justify-between gap-sm py-1.5">
                            <span className="flex min-w-0 items-center gap-xs text-body-sm text-on-surface">
                              <MapPin className="h-3.5 w-3.5 shrink-0 text-on-surface-variant" />
                              {l.namaJalan} · {l.namaRuas}
                              {l.namaKecamatan && <span className="text-on-surface-variant">(Kec. {l.namaKecamatan})</span>}
                            </span>
                            <span className="shrink-0 text-label-sm tabular-nums text-on-surface-variant">
                              {l.terisi}/{l.kapasitas} terisi
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {ubahKuota && (
        <UbahKuotaModal
          sesi={ubahKuota}
          onClose={() => setUbahKuota(null)}
          onSaved={async (pesan) => {
            setUbahKuota(null);
            await onBerubah(pesan);
          }}
        />
      )}
    </div>
  );
}