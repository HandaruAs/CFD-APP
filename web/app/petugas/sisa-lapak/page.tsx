// app/petugas/sisa-lapak/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { MapPin, Store, PackageCheck, PackageX, Loader2, Plus, Pencil, Trash2, X } from "lucide-react";

// ========== TYPES ==========
type JalanData = {
  id: string;
  kode_jalan: string;
  nama: string;
  kuota: number;
  terisi: number;
};

type KecamatanData = {
  kecamatan: string;
  jalan: JalanData[];
};

// ========== API HELPER ==========
function apiUrl(path: string) {
  const base = process.env.NEXT_PUBLIC_API_URL;
  if (!base) throw new Error("NEXT_PUBLIC_API_URL belum diset!");
  return `${base}${path}`;
}

async function apiFetch(path: string, options: RequestInit = {}) {
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
  return data;
}

function levelSisa(sisa: number, kuota: number) {
  const rasio = kuota > 0 ? sisa / kuota : 0;
  if (rasio <= 0) return { label: "Penuh", bg: "bg-error-container/60", text: "text-on-error-container", bar: "bg-error" };
  if (rasio <= 0.2) return { label: "Hampir Penuh", bg: "bg-tertiary-container/25", text: "text-on-tertiary-container", bar: "bg-tertiary" };
  return { label: "Tersedia", bg: "bg-secondary-container/40", text: "text-on-secondary-container", bar: "bg-secondary" };
}

// ========== MODAL FORM (MENGIKUTI DESAIN ASLI) ==========
function ModalForm({
  open,
  onClose,
  onSubmit,
  title,
  initialData,
  instansiList,
  loading,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  title: string;
  initialData?: any;
  instansiList: { id: string; nama: string }[];
  loading: boolean;
}) {
  const [form, setForm] = useState({
    kode_jalan: "",
    nama_jalan: "",
    kapasitas: 0,
    instansi_id: "",
  });

  useEffect(() => {
    if (initialData) {
      setForm({
        kode_jalan: initialData.kode_jalan || "",
        nama_jalan: initialData.nama_jalan || "",
        kapasitas: initialData.kapasitas || 0,
        instansi_id: initialData.instansi_id || "",
      });
    } else {
      setForm({ kode_jalan: "", nama_jalan: "", kapasitas: 0, instansi_id: "" });
    }
  }, [initialData, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-on-surface/40 backdrop-blur-[2px] px-4">
      <div className="relative w-full max-w-md rounded-xl bg-surface-container-lowest p-lg shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 rounded-full p-1 text-on-surface-variant hover:bg-surface-container-high"
        >
          <X className="h-4 w-4" strokeWidth={2} />
        </button>
        <h3 className="text-title-lg text-on-surface">{title}</h3>
        <form onSubmit={(e) => { e.preventDefault(); onSubmit(form); }} className="mt-md space-y-4">
          <div>
            <label className="text-label-sm font-semibold text-on-surface">Kode Jalan</label>
            <input
              required
              value={form.kode_jalan}
              onChange={(e) => setForm({ ...form, kode_jalan: e.target.value })}
              className="h-11 w-full rounded-lg border border-outline bg-surface-container-lowest px-md text-body-md text-on-surface outline-none placeholder:text-on-surface-variant/70 focus:border-primary focus:ring-2 focus:ring-primary/20"
              placeholder="JLN-010"
            />
          </div>
          <div>
            <label className="text-label-sm font-semibold text-on-surface">Nama Jalan</label>
            <input
              required
              value={form.nama_jalan}
              onChange={(e) => setForm({ ...form, nama_jalan: e.target.value })}
              className="h-11 w-full rounded-lg border border-outline bg-surface-container-lowest px-md text-body-md text-on-surface outline-none placeholder:text-on-surface-variant/70 focus:border-primary focus:ring-2 focus:ring-primary/20"
              placeholder="Jalan Baru"
            />
          </div>
          <div>
            <label className="text-label-sm font-semibold text-on-surface">Kapasitas</label>
            <input
              required
              type="number"
              min="1"
              value={form.kapasitas}
              onChange={(e) => setForm({ ...form, kapasitas: parseInt(e.target.value) || 0 })}
              className="h-11 w-full rounded-lg border border-outline bg-surface-container-lowest px-md text-body-md text-on-surface outline-none placeholder:text-on-surface-variant/70 focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div>
            <label className="text-label-sm font-semibold text-on-surface">Kecamatan</label>
            <select
              required
              value={form.instansi_id}
              onChange={(e) => setForm({ ...form, instansi_id: e.target.value })}
              className="h-11 w-full rounded-lg border border-outline bg-surface-container-lowest px-md text-body-md text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            >
              <option value="">Pilih Kecamatan</option>
              {instansiList.map((i) => (
                <option key={i.id} value={i.id}>{i.nama}</option>
              ))}
            </select>
          </div>
          <div className="mt-lg flex justify-end gap-sm">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md px-lg py-sm text-label-md text-on-surface-variant hover:bg-surface-container-high"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-sm rounded-md bg-primary px-lg py-sm text-label-md text-on-primary transition-all hover:bg-primary-container hover:shadow-md disabled:opacity-60"
            >
              {loading ? "Menyimpan..." : "Simpan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ========== MAIN ==========
export default function SisaLapakPage() {
  const [data, setData] = useState<KecamatanData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeKecamatan, setActiveKecamatan] = useState<string | null>(null);

  // CRUD state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [instansiList, setInstansiList] = useState<{ id: string; nama: string }[]>([]);
  const [saving, setSaving] = useState(false);

  const loadSisaLapak = async () => {
    try {
      const res = (await apiFetch("/api/petugas/sisa-lapak")) as KecamatanData[];
      setData(Array.isArray(res) ? res : []);
      setLoadError(null);
      if (res && Array.isArray(res) && res.length > 0) {
        setActiveKecamatan(res[0].kecamatan);
      }
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "gagal memuat data sisa lapak");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchInstansi = async () => {
    try {
      const res = await apiFetch("/api/petugas/sisa-lapak/instansi");
      setInstansiList(Array.isArray(res) ? res : []);
    } catch {
      // abaikan
    }
  };

  useEffect(() => {
    loadSisaLapak();
    fetchInstansi();
  }, []);

  const handleCreate = async (form: any) => {
    setSaving(true);
    try {
      await apiFetch("/api/petugas/sisa-lapak", {
        method: "POST",
        body: JSON.stringify({
          kode_jalan: form.kode_jalan,
          nama_jalan: form.nama_jalan,
          kapasitas: form.kapasitas,
          instansi_id: form.instansi_id,
        }),
      });
      await loadSisaLapak();
      setModalOpen(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Gagal menambahkan");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (form: any) => {
    if (!editingItem) return;
    setSaving(true);
    try {
      await apiFetch(`/api/petugas/sisa-lapak/${editingItem.id}`, {
        method: "PUT",
        body: JSON.stringify({
          nama_jalan: form.nama_jalan,
          kapasitas: form.kapasitas,
        }),
      });
      await loadSisaLapak();
      setModalOpen(false);
      setEditingItem(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Gagal mengupdate");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, nama: string) => {
    if (!confirm(`Hapus jalan "${nama}"?`)) return;
    try {
      await apiFetch(`/api/petugas/sisa-lapak/${id}`, { method: "DELETE" });
      await loadSisaLapak();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Gagal menghapus");
    }
  };

  const totalRingkasan = useMemo(() => {
    let kuota = 0,
      terisi = 0;
    for (const k of data) {
      for (const j of k.jalan) {
        kuota += j.kuota || 0;
        terisi += j.terisi || 0;
      }
    }
    return { kuota, terisi, sisa: kuota - terisi };
  }, [data]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-on-surface-variant">
        <Loader2 className="h-6 w-6 animate-spin" strokeWidth={2} />
      </div>
    );
  }

  if (loadError || !data) {
    return (
      <div className="rounded-lg border border-error-container bg-error-container/20 p-lg text-on-error-container">
        Gagal memuat data sisa lapak: {loadError ?? "data tidak ditemukan"}
      </div>
    );
  }

  const dataAktif = data.find((k) => k.kecamatan === activeKecamatan) ?? data[0];

  return (
    <div className="flex flex-col gap-lg">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-headline-lg text-on-surface">Sisa Lapak</h2>
          <p className="mt-xs max-w-2xl text-body-md text-on-surface-variant">
            Lihat dan kelola kuota lapak per kecamatan & jalan CFD Surabaya.
          </p>
        </div>
        <button
          onClick={() => { setEditingItem(null); setModalOpen(true); }}
          className="flex items-center gap-sm rounded-md bg-primary px-lg py-sm text-label-md text-on-primary transition-all hover:bg-primary-container hover:shadow-md"
        >
          <Plus className="h-[18px] w-[18px]" strokeWidth={2} />
          Tambah Lapak
        </button>
      </div>

      {data.length === 0 ? (
        <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-lg text-center text-body-md text-on-surface-variant">
          Belum ada data kuota lapak yang diatur.
        </div>
      ) : (
        <>
          {/* Ringkasan total */}
          <div className="grid grid-cols-1 gap-md sm:grid-cols-3">
            <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-lg">
              <div className="flex items-center justify-between">
                <span className="text-label-sm text-on-surface-variant">Total Kuota Lapak</span>
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                  <Store className="h-4 w-4 text-primary" strokeWidth={2} />
                </span>
              </div>
              <p className="mt-xs text-title-lg font-semibold text-on-surface">{totalRingkasan.kuota}</p>
            </div>
            <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-lg">
              <div className="flex items-center justify-between">
                <span className="text-label-sm text-on-surface-variant">Sudah Terisi</span>
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary-container/30">
                  <PackageCheck className="h-4 w-4 text-secondary" strokeWidth={2} />
                </span>
              </div>
              <p className="mt-xs text-title-lg font-semibold text-on-surface">{totalRingkasan.terisi}</p>
            </div>
            <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-lg">
              <div className="flex items-center justify-between">
                <span className="text-label-sm text-on-surface-variant">Sisa Lapak</span>
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-tertiary-container/25">
                  <PackageX className="h-4 w-4 text-tertiary" strokeWidth={2} />
                </span>
              </div>
              <p className="mt-xs text-title-lg font-semibold text-on-surface">{totalRingkasan.sisa}</p>
            </div>
          </div>

          {/* Tab kecamatan */}
          <div className="flex flex-wrap gap-xs rounded-xl border border-outline-variant bg-surface-container-lowest p-1">
            {data.map((k) => (
              <button
                key={k.kecamatan}
                type="button"
                onClick={() => setActiveKecamatan(k.kecamatan)}
                className={`flex items-center gap-xs rounded-lg px-md py-sm text-label-md transition-all ${
                  activeKecamatan === k.kecamatan
                    ? "bg-primary text-on-primary shadow-sm"
                    : "text-on-surface-variant hover:bg-surface-container-high"
                }`}
              >
                <MapPin className="h-4 w-4" strokeWidth={2} />
                {k.kecamatan}
              </button>
            ))}
          </div>

          {/* Daftar jalan di kecamatan aktif */}
          <div className="grid grid-cols-1 gap-md sm:grid-cols-2">
            {dataAktif?.jalan.map((j) => {
              const sisa = j.kuota - j.terisi;
              const level = levelSisa(sisa, j.kuota);
              const persentase = j.kuota > 0 ? Math.min(100, Math.round((j.terisi / j.kuota) * 100)) : 0;

              return (
                <div
                  key={j.id}
                  className="rounded-xl border border-outline-variant bg-surface-container-lowest p-lg transition-shadow hover:shadow-md"
                >
                  <div className="flex flex-wrap items-center justify-between gap-sm">
                    <h3 className="text-title-md text-on-surface">{j.nama}</h3>
                    <div className="flex items-center gap-1">
                      <span className={`inline-flex items-center gap-xs rounded-full px-sm py-1 text-label-sm ${level.bg} ${level.text}`}>
                        {level.label}
                      </span>
                      <button
                        onClick={() => {
                          setEditingItem({
                            id: j.id,
                            kode_jalan: j.kode_jalan,
                            nama_jalan: j.nama,
                            kapasitas: j.kuota,
                            instansi_id: activeKecamatan,
                          });
                          setModalOpen(true);
                        }}
                        className="rounded p-1 text-on-surface-variant hover:bg-surface-container-high transition-colors"
                      >
                        <Pencil className="h-4 w-4" strokeWidth={2} />
                      </button>
                      <button
                        onClick={() => handleDelete(j.id, j.nama)}
                        className="rounded p-1 text-error hover:bg-error-container/20 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" strokeWidth={2} />
                      </button>
                    </div>
                  </div>

                  <div className="mt-md flex items-baseline gap-xs">
                    <span className="text-title-lg font-semibold text-on-surface">{sisa}</span>
                    <span className="text-label-sm text-on-surface-variant">sisa dari {j.kuota} lapak</span>
                  </div>

                  <div className="mt-sm h-2 w-full overflow-hidden rounded-full bg-surface-container-high">
                    <div className={`h-full rounded-full ${level.bar} transition-all duration-500`} style={{ width: `${persentase}%` }} />
                  </div>
                  <p className="mt-xs text-label-sm text-on-surface-variant">
                    {j.terisi} terisi &middot; {persentase}% dari kuota
                  </p>
                </div>
              );
            })}

            {dataAktif?.jalan.length === 0 && (
              <p className="col-span-full py-md text-center text-body-md text-on-surface-variant">
                Belum ada data jalan untuk kecamatan ini.
              </p>
            )}
          </div>
        </>
      )}

      {/* Modal Form */}
      <ModalForm
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditingItem(null); }}
        onSubmit={editingItem ? handleUpdate : handleCreate}
        title={editingItem ? "Edit Lapak" : "Tambah Lapak"}
        initialData={editingItem}
        instansiList={instansiList}
        loading={saving}
      />
    </div>
  );
}