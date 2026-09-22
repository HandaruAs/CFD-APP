"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, Loader2, MapPin, AlertTriangle, X, Settings2 } from "lucide-react";
import type { JalanLengkapData, KecamatanLengkapData, RuasData } from "../types";
import { deleteRuas, deleteKecamatan, deleteJalanBaru } from "../api";
import RuasFormModal from "./RuasFormModal";
import TambahKecamatanModal from "./TambahKecamatanModal";
import TambahJalanModal from "./TambahJalanModal";
import EditJalanModal from "./EditJalanModal";
import AssignKuotaEventModal from "./AssignKuotaEventModal";

interface PendingDelete {
  title: string;
  description?: string;
  details?: string[];
  confirmLabel: string;
  onConfirm: () => Promise<void>;
}

interface Props {
  wilayah: KecamatanLengkapData[];
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
}

export default function RuasKuotaTab({ wilayah, loading, error, onRefresh }: Props) {
  const [selectedKecamatan, setSelectedKecamatan] = useState<string | null>(null);
  const [selectedJalanId, setSelectedJalanId] = useState<string | null>(null);
  const [selectedRuasId, setSelectedRuasId] = useState<string | null>(null);

  const [showTambahKecamatan, setShowTambahKecamatan] = useState(false);
  const [showTambahJalan, setShowTambahJalan] = useState(false);
  const [editJalan, setEditJalan] = useState<JalanLengkapData | null>(null);
  const [ruasModalState, setRuasModalState] = useState<{ ruas: RuasData | null } | null>(null);
  const [assignKuotaJalan, setAssignKuotaJalan] = useState<JalanLengkapData | null>(null);
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);

  function closeDialog() {
    if (submitting) return; // jangan bisa ditutup di tengah proses hapus
    setPendingDelete(null);
    setDialogError(null);
  }

  async function handleConfirmDelete() {
    if (!pendingDelete) return;
    setSubmitting(true);
    setDialogError(null);
    try {
      await pendingDelete.onConfirm();
      setPendingDelete(null);
    } catch (err) {
      setDialogError(err instanceof Error ? err.message : "Terjadi kesalahan, coba lagi.");
    } finally {
      setSubmitting(false);
    }
  }

  const kecamatanTerpilih = wilayah.find((k) => k.kecamatan === selectedKecamatan) ?? null;
  const jalanList: JalanLengkapData[] = kecamatanTerpilih?.jalan ?? [];
  const jalanTerpilih = jalanList.find((j) => j.id === selectedJalanId) ?? null;
  const ruasList: RuasData[] = jalanTerpilih?.ruas ?? [];
  const ruasTerpilih = ruasList.find((r) => r.id === selectedRuasId) ?? null;

  function pilihKecamatan(kec: string) {
    setSelectedKecamatan(kec);
    setSelectedJalanId(null);
    setSelectedRuasId(null);
  }
  function pilihJalan(jalanId: string) {
    setSelectedJalanId(jalanId);
    setSelectedRuasId(null);
  }

  function handleDeleteRuas(ruas: RuasData) {
    setPendingDelete({
      title: `Hapus ruas "${ruas.namaRuas}"?`,
      description: jalanTerpilih ? `Bagian dari jalan ${jalanTerpilih.namaJalan}.` : undefined,
      details: [`Nomor lapak ${ruas.nomorMulai}–${ruas.nomorSelesai} (${ruas.kuota} lapak) ikut hilang`],
      confirmLabel: "Hapus Ruas",
      onConfirm: async () => {
        await deleteRuas(ruas.id);
        if (selectedRuasId === ruas.id) setSelectedRuasId(null);
        onRefresh();
      },
    });
  }

  function handleDeleteKecamatan(kec: KecamatanLengkapData) {
    const totalJalan = (kec.jalan ?? []).length;
    const totalRuas = (kec.jalan ?? []).reduce((sum, j) => sum + j.ruas.length, 0);
    setPendingDelete({
      title: `Hapus kecamatan "${kec.kecamatan}"?`,
      description: "Tindakan ini tidak bisa dibatalkan.",
      details: [
        `${totalJalan} jalan ikut terhapus`,
        `${totalRuas} ruas ikut terhapus`,
      ],
      confirmLabel: "Hapus Kecamatan",
      onConfirm: async () => {
        await deleteKecamatan(kec.kecamatanId as string);
        if (selectedKecamatan === kec.kecamatan) {
          setSelectedKecamatan(null);
          setSelectedJalanId(null);
          setSelectedRuasId(null);
        }
        onRefresh();
      },
    });
  }

  function handleDeleteJalan(jalan: JalanLengkapData) {
    setPendingDelete({
      title: `Hapus jalan "${jalan.namaJalan}"?`,
      description: "Tindakan ini tidak bisa dibatalkan.",
      details: [
        `${jalan.ruas.length} ruas ikut terhapus`,
        jalan.terisi > 0 ? `${jalan.terisi} lapak di jalan ini sedang terisi` : undefined,
      ].filter(Boolean) as string[],
      confirmLabel: "Hapus Jalan",
      onConfirm: async () => {
        await deleteJalanBaru(jalan.id);
        if (selectedJalanId === jalan.id) {
          setSelectedJalanId(null);
          setSelectedRuasId(null);
        }
        onRefresh();
      },
    });
  }

  if (loading) {
    return (
      <div className="pt-loading">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="text-body-sm">Memuat data wilayah...</span>
      </div>
    );
  }
  if (error) {
    return (
      <div className="rounded-xl bg-error-container/60 px-md py-sm text-body-sm text-on-error-container">{error}</div>
    );
  }

  return (
    <div className="space-y-lg">
      <p className="text-body-sm text-on-surface-variant">
        4 tabel ini saling terhubung -- klik satu baris buat nge-filter tabel di sebelah/bawahnya: Kecamatan → Jalan →
        Ruas → Sisa Lapak.
      </p>

      <div className="grid grid-cols-1 gap-lg lg:grid-cols-2">
        {/* TABEL 1: KECAMATAN */}
        <Panel
          title="1. Kecamatan"
          onTambah={() => setShowTambahKecamatan(true)}
          tambahLabel="Tambah Kecamatan"
        >
          <SimpleTable
            headers={["Kecamatan", "Jumlah Jalan"]}
            rows={wilayah
              .filter((k) => k.kecamatanId) // sembunyikan grup "Tanpa Kecamatan" (jalan yatim, gak ada di jalan_instansi)
              .map((k) => ({
                key: k.kecamatan,
                selected: k.kecamatan === selectedKecamatan,
                onClick: () => pilihKecamatan(k.kecamatan),
                cells: [k.kecamatan, String((k.jalan ?? []).length)],
                actions: (
                  <button
                    onClick={() => handleDeleteKecamatan(k)}
                    title="Hapus kecamatan"
                    className="pt-btn pt-btn-ghost-danger min-h-0 px-sm py-1 text-label-sm"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                ),
              }))}
            empty="Belum ada kecamatan."
          />
        </Panel>

        {/* TABEL 2: JALAN */}
        <Panel
          title="2. Jalan"
          subtitle={kecamatanTerpilih ? kecamatanTerpilih.kecamatan : "Pilih kecamatan dulu"}
          onTambah={() => setShowTambahJalan(true)}
          tambahLabel="Tambah Jalan"
        >
          {!kecamatanTerpilih ? (
            <EmptyHint icon={MapPin} text="Klik salah satu kecamatan di tabel 1." />
          ) : (
            <SimpleTable
              headers={["Jalan", "Kapasitas", "Kuota Event"]}
              rows={jalanList.map((j) => ({
                key: j.id,
                selected: j.id === selectedJalanId,
                onClick: () => pilihJalan(j.id),
                cells: [`${j.namaJalan} (${j.kodeJalan})`, String(j.kapasitas), `${j.terisi}/${j.kuotaEvent}`],
                actions: (
                  <>
                    <button
                      onClick={() => setEditJalan(j)}
                      title="Edit kode/nama/kapasitas jalan"
                      className="pt-btn pt-btn-ghost min-h-0 px-sm py-1 text-label-sm"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => setAssignKuotaJalan(j)}
                      title="Atur kuota ke event aktif"
                      className="pt-btn pt-btn-ghost min-h-0 px-sm py-1 text-label-sm"
                    >
                      <Settings2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteJalan(j)}
                      title="Hapus jalan"
                      className="pt-btn pt-btn-ghost-danger min-h-0 px-sm py-1 text-label-sm"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </>
                ),
              }))}
              empty="Belum ada jalan di kecamatan ini."
            />
          )}
        </Panel>

        {/* TABEL 3: RUAS */}
        <Panel
          title="3. Ruas Jalan"
          subtitle={jalanTerpilih ? jalanTerpilih.namaJalan : "Pilih jalan dulu"}
          onTambah={jalanTerpilih ? () => setRuasModalState({ ruas: null }) : undefined}
          tambahLabel="Tambah Ruas"
        >
          {!jalanTerpilih ? (
            <EmptyHint icon={MapPin} text="Klik salah satu jalan di tabel 2." />
          ) : (
            <div className="overflow-x-auto rounded-xl border border-outline-variant">
              <table className="min-w-full divide-y divide-outline-variant text-body-sm">
                <thead className="bg-surface-container-low">
                  <tr>
                    <Th>Urutan</Th>
                    <Th>Ruas</Th>
                    <Th>Kuota</Th>
                    <Th>Status</Th>
                    <Th className="text-right">Aksi</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/60 bg-surface-container-lowest">
                  {ruasList.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-md py-lg text-center text-on-surface-variant">
                        Belum ada ruas.
                      </td>
                    </tr>
                  )}
                  {ruasList.map((r) => (
                    <tr
                      key={r.id}
                      onClick={() => setSelectedRuasId(r.id)}
                      className={`cursor-pointer hover:bg-surface-container-low ${
                        r.id === selectedRuasId ? "bg-primary/10" : ""
                      }`}
                    >
                      <td className="px-md py-sm text-on-surface-variant">{r.urutan}</td>
                      <td className="px-md py-sm text-on-surface">{r.namaRuas}</td>
                      <td className="px-md py-sm text-on-surface-variant">{r.kuota}</td>
                      <td className="px-md py-sm">
                        <div className="flex flex-wrap items-center gap-xs">
                          <span className="pt-pill pt-pill-success" title="Pedagang lama (data lama, diklaimkan petugas)">
                            <span className="pt-pill-dot" />
                            {r.terisiLama} Lama
                          </span>
                          <span className="pt-pill pt-pill-neutral" title="Pedagang baru (klaim sendiri lewat war token)">
                            <span className="pt-pill-dot" />
                            {r.terisiBaru} Baru
                          </span>
                        </div>
                      </td>
                      <td className="px-md py-sm text-right" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setRuasModalState({ ruas: r })}
                          className="pt-btn pt-btn-ghost min-h-0 px-sm py-1 text-label-sm"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteRuas(r)}
                          className="pt-btn pt-btn-ghost-danger min-h-0 px-sm py-1 text-label-sm"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        {/* TABEL 4: SISA LAPAK */}
        <Panel title="4. Sisa Lapak" subtitle={ruasTerpilih ? ruasTerpilih.namaRuas : jalanTerpilih ? jalanTerpilih.namaJalan : "Pilih ruas atau jalan"}>
          {!jalanTerpilih ? (
            <EmptyHint icon={MapPin} text="Klik salah satu jalan (atau ruas) buat lihat sisa lapaknya." />
          ) : ruasTerpilih ? (
            <SimpleTable
              headers={["Ruas", "Nomor", "Kuota Ruas", "Status"]}
              rows={[
                {
                  key: ruasTerpilih.id,
                  cells: [
                    ruasTerpilih.namaRuas,
                    `${ruasTerpilih.nomorMulai}–${ruasTerpilih.nomorSelesai}`,
                    String(ruasTerpilih.kuota),
                    `${ruasTerpilih.terisiLama} Lama · ${ruasTerpilih.terisiBaru} Baru`,
                  ],
                },
              ]}
              empty=""
            />
          ) : (
            <SimpleTable
              headers={["Jalan", "Kuota Event", "Terisi", "Sisa"]}
              rows={[
                {
                  key: jalanTerpilih.id,
                  cells: [
                    jalanTerpilih.namaJalan,
                    String(jalanTerpilih.kuotaEvent),
                    String(jalanTerpilih.terisi),
                    String(Math.max(0, jalanTerpilih.kuotaEvent - jalanTerpilih.terisi)),
                  ],
                },
              ]}
              empty=""
            />
          )}
        </Panel>
      </div>

      {showTambahKecamatan && (
        <TambahKecamatanModal
          onClose={() => setShowTambahKecamatan(false)}
          onSaved={() => {
            setShowTambahKecamatan(false);
            onRefresh();
          }}
        />
      )}

      {showTambahJalan && (
        <TambahJalanModal
          wilayah={wilayah}
          initialKecamatanId={kecamatanTerpilih?.kecamatanId ?? null}
          onClose={() => setShowTambahJalan(false)}
          onSaved={() => {
            setShowTambahJalan(false);
            onRefresh();
          }}
        />
      )}

      {editJalan && (
        <EditJalanModal
          jalan={editJalan}
          onClose={() => setEditJalan(null)}
          onSaved={() => {
            setEditJalan(null);
            onRefresh();
          }}
        />
      )}

      {ruasModalState && jalanTerpilih && (
        <RuasFormModal
          wilayah={wilayah}
          ruas={ruasModalState.ruas}
          initialJalanId={jalanTerpilih.id}
          initialNamaJalan={jalanTerpilih.namaJalan}
          lockJalan
          onClose={() => setRuasModalState(null)}
          onSaved={() => {
            setRuasModalState(null);
            onRefresh();
          }}
        />
      )}

      {assignKuotaJalan && (
        <AssignKuotaEventModal
          jalan={assignKuotaJalan}
          onClose={() => setAssignKuotaJalan(null)}
          onSaved={() => {
            setAssignKuotaJalan(null);
            onRefresh();
          }}
        />
      )}

      {pendingDelete && (
        <div className="pt-modal-overlay" onClick={closeDialog}>
          <div
            className="pt-modal-box"
            role="alertdialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="pt-modal-close"
              onClick={closeDialog}
              disabled={submitting}
              aria-label="Tutup"
            >
              <X className="h-5 w-5" strokeWidth={2} />
            </button>

            <div className="flex flex-col gap-md overflow-y-auto p-lg sm:p-xl">
              <div className="flex items-start gap-md">
                <span className="pt-section-icon shrink-0 bg-error-container/60 text-on-error-container">
                  <AlertTriangle className="h-5 w-5" strokeWidth={2} />
                </span>
                <div className="flex flex-col gap-xs">
                  <h2 className="pt-section-title">{pendingDelete.title}</h2>
                  {pendingDelete.description && (
                    <p className="pt-section-desc">{pendingDelete.description}</p>
                  )}
                </div>
              </div>

              {pendingDelete.details && pendingDelete.details.length > 0 && (
                <ul className="flex flex-col gap-xs rounded-xl bg-surface-container-low p-md text-body-sm text-on-surface-variant">
                  {pendingDelete.details.map((d, i) => (
                    <li key={i} className="flex items-start gap-xs">
                      <span className="pt-pill-dot mt-2 bg-on-surface-variant" />
                      <span>{d}</span>
                    </li>
                  ))}
                </ul>
              )}

              {dialogError && (
                <div className="rounded-xl bg-error-container/60 px-md py-sm text-body-sm text-on-error-container">
                  {dialogError}
                </div>
              )}

              <div className="flex justify-end gap-sm">
                <button type="button" className="pt-btn pt-btn-ghost" onClick={closeDialog} disabled={submitting}>
                  Batal
                </button>
                <button
                  type="button"
                  className="pt-btn pt-btn-danger"
                  onClick={handleConfirmDelete}
                  disabled={submitting}
                >
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  {submitting ? "Menghapus..." : pendingDelete.confirmLabel}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// Komponen kecil pembantu
// ============================================================

function Panel({
  title,
  subtitle,
  onTambah,
  tambahLabel,
  tambahDisabledHint,
  children,
}: {
  title: string;
  subtitle?: string;
  onTambah?: () => void;
  tambahLabel?: string;
  tambahDisabledHint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-md">
      <div className="mb-sm flex items-center justify-between">
        <div>
          <h3 className="text-title-sm text-on-surface">{title}</h3>
          {subtitle && <p className="text-label-sm text-on-surface-variant">{subtitle}</p>}
        </div>
        {tambahLabel && (
          <button
            type="button"
            onClick={onTambah}
            disabled={!onTambah}
            title={tambahDisabledHint}
            className="pt-btn pt-btn-secondary min-h-0 px-sm py-1 text-label-sm"
          >
            <Plus className="h-3.5 w-3.5" />
            {tambahLabel}
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

function EmptyHint({ icon: Icon, text }: { icon: typeof MapPin; text: string }) {
  return (
    <div className="flex flex-col items-center gap-sm rounded-xl border border-dashed border-outline-variant py-xl text-center">
      <Icon className="h-6 w-6 text-on-surface-variant" />
      <p className="text-body-sm text-on-surface-variant">{text}</p>
    </div>
  );
}

function SimpleTable({
  headers,
  rows,
  empty,
}: {
  headers: string[];
  rows: { key: string; cells: React.ReactNode[]; selected?: boolean; onClick?: () => void; actions?: React.ReactNode }[];
  empty: string;
}) {
  const hasActions = rows.some((row) => row.actions);
  return (
    <div className="overflow-x-auto rounded-xl border border-outline-variant">
      <table className="min-w-full divide-y divide-outline-variant text-body-sm">
        <thead className="bg-surface-container-low">
          <tr>
            {headers.map((h) => (
              <Th key={h}>{h}</Th>
            ))}
            {hasActions && <Th className="text-right">Aksi</Th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-outline-variant/60 bg-surface-container-lowest">
          {rows.length === 0 && empty && (
            <tr>
              <td colSpan={headers.length + (hasActions ? 1 : 0)} className="px-md py-lg text-center text-on-surface-variant">
                {empty}
              </td>
            </tr>
          )}
          {rows.map((row) => (
            <tr
              key={row.key}
              onClick={row.onClick}
              className={`${row.onClick ? "cursor-pointer" : ""} hover:bg-surface-container-low ${
                row.selected ? "bg-primary/10" : ""
              }`}
            >
              {row.cells.map((c, i) => (
                <td key={i} className="px-md py-sm text-on-surface">
                  {c}
                </td>
              ))}
              {hasActions && (
                <td className="px-md py-sm text-right" onClick={(e) => e.stopPropagation()}>
                  {row.actions}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <th className={`px-md py-sm text-left text-label-sm uppercase tracking-wide text-on-surface-variant ${className}`}>
      {children}
    </th>
  );
}