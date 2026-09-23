"use client";

import { useEffect, useMemo, useState } from "react";
import { X, CheckSquare, Square } from "lucide-react";
import type { CreateEventRequest, KecamatanLengkapData } from "../types";
import { createEvent } from "../api";

interface Props {
  wilayah: KecamatanLengkapData[];
  onClose: () => void;
  onSaved: () => void;
}

interface JalanPilihan {
  jalanId: string;
  namaJalan: string;
  kecamatan: string;
  kapasitas: number;
  dipilih: boolean;
  kuota: string;
}

function toRFC3339(dateStr: string, timeStr: string): string {
  if (!dateStr) return "";
  return new Date(`${dateStr}T${timeStr || "00:00"}:00`).toISOString();
}

export default function TambahEventModal({ wilayah, onClose, onSaved }: Props) {
  const [namaEvent, setNamaEvent] = useState("");
  const [tanggal, setTanggal] = useState("");
  const [jamMulai, setJamMulai] = useState("06:00");
  const [jamSelesai, setJamSelesai] = useState("09:00");
  const [pendaftaranMulaiTgl, setPendaftaranMulaiTgl] = useState("");
  const [pendaftaranSelesaiTgl, setPendaftaranSelesaiTgl] = useState("");
  const [kuotaTotal, setKuotaTotal] = useState("");
  const [keterangan, setKeterangan] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const daftarJalan: JalanPilihan[] = useMemo(() => {
    const list: JalanPilihan[] = [];
    for (const kec of wilayah) {
      for (const j of kec.jalan) {
        list.push({
          jalanId: j.id,
          namaJalan: j.namaJalan,
          kecamatan: kec.kecamatan,
          kapasitas: j.kapasitas,
          dipilih: false,
          kuota: "",
        });
      }
    }
    return list;
  }, [wilayah]);

  const [pilihanJalan, setPilihanJalan] = useState<JalanPilihan[]>(daftarJalan);

  // BUGFIX: pilihanJalan sebelumnya cuma di-init sekali dari daftarJalan saat
  // mount. Kalau wilayah masih loading pas modal ini dibuka, daftarJalan yang
  // datang belakangan gak pernah kepakai -- checklist jalan kelihatan kosong
  // terus walau datanya udah sampai. Sinkronkan ulang tiap daftarJalan berubah,
  // tapi tetap pertahankan pilihan/kuota yang udah diisi user.
  useEffect(() => {
    setPilihanJalan((prev) => {
      const prevById = new Map(prev.map((p) => [p.jalanId, p]));
      return daftarJalan.map((j) => {
        const existing = prevById.get(j.jalanId);
        return existing ? { ...j, dipilih: existing.dipilih, kuota: existing.kuota } : j;
      });
    });
  }, [daftarJalan]);

  // Grup per kecamatan -- dipakai buat render + tombol "pilih semua di kecamatan ini".
  const grupPerKecamatan = useMemo(() => {
    const map = new Map<string, JalanPilihan[]>();
    for (const p of pilihanJalan) {
      if (!map.has(p.kecamatan)) map.set(p.kecamatan, []);
      map.get(p.kecamatan)!.push(p);
    }
    return Array.from(map.entries());
  }, [pilihanJalan]);

  function toggleJalan(jalanId: string) {
    setPilihanJalan((prev) =>
      prev.map((p) =>
        p.jalanId === jalanId
          ? { ...p, dipilih: !p.dipilih, kuota: !p.dipilih && !p.kuota ? String(p.kapasitas) : p.kuota }
          : p
      )
    );
  }

  function setKuotaJalan(jalanId: string, kuota: string) {
    setPilihanJalan((prev) => prev.map((p) => (p.jalanId === jalanId ? { ...p, kuota } : p)));
  }

  // "Pilih Semua Jalan" -- buat event yang cakupannya se-Surabaya. Kuota
  // yang masih kosong otomatis diisi dari kapasitas jalan itu, biar gak
  // perlu isi manual satu-satu; yang udah keisi manual gak ketimpa.
  const semuaTerpilih = pilihanJalan.length > 0 && pilihanJalan.every((p) => p.dipilih);
  function toggleSemuaJalan() {
    const targetDipilih = !semuaTerpilih;
    setPilihanJalan((prev) =>
      prev.map((p) => ({
        ...p,
        dipilih: targetDipilih,
        kuota: targetDipilih && !p.kuota ? String(p.kapasitas) : p.kuota,
      }))
    );
  }

  // "Pilih semua di kecamatan ini" -- centang/hapus centang sekaligus
  // buat semua jalan di 1 kecamatan; jalan individual tetap bisa
  // di-uncheck lagi belakangan.
  function toggleSemuaDiKecamatan(kecamatan: string) {
    const jalanDiKec = pilihanJalan.filter((p) => p.kecamatan === kecamatan);
    const semuaDiKecTerpilih = jalanDiKec.length > 0 && jalanDiKec.every((p) => p.dipilih);
    const targetDipilih = !semuaDiKecTerpilih;
    setPilihanJalan((prev) =>
      prev.map((p) =>
        p.kecamatan === kecamatan
          ? { ...p, dipilih: targetDipilih, kuota: targetDipilih && !p.kuota ? String(p.kapasitas) : p.kuota }
          : p
      )
    );
  }

  const totalKuotaJalanDipilih = pilihanJalan
    .filter((p) => p.dipilih)
    .reduce((sum, p) => sum + (parseInt(p.kuota, 10) || 0), 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const jalanTerpilih = pilihanJalan.filter((p) => p.dipilih);
    if (jalanTerpilih.length === 0) {
      setError("Pilih minimal 1 ruas jalan untuk event ini.");
      return;
    }
    if (jalanTerpilih.some((p) => !p.kuota || parseInt(p.kuota, 10) <= 0)) {
      setError("Isi kuota untuk setiap jalan yang dipilih.");
      return;
    }
    const jalanLebihDariKapasitas = jalanTerpilih.find((p) => parseInt(p.kuota, 10) > p.kapasitas);
    if (jalanLebihDariKapasitas) {
      setError(
        `Kuota "${jalanLebihDariKapasitas.namaJalan}" (${jalanLebihDariKapasitas.kuota}) melebihi kapasitas jalan ini (${jalanLebihDariKapasitas.kapasitas}).`
      );
      return;
    }
    const kuotaTotalNum = parseInt(kuotaTotal, 10) || 0;
    if (totalKuotaJalanDipilih > kuotaTotalNum) {
      setError("Total kuota jalan yang dipilih tidak boleh melebihi kuota total event.");
      return;
    }

    const payload: CreateEventRequest = {
      namaEvent,
      tanggal,
      jamMulai,
      jamSelesai,
      pendaftaranMulai: toRFC3339(pendaftaranMulaiTgl, "00:00"),
      pendaftaranSelesai: toRFC3339(pendaftaranSelesaiTgl, "23:59"),
      kuotaTotal: kuotaTotalNum,
      keterangan,
      jalan: jalanTerpilih.map((p) => ({ jalanId: p.jalanId, kuota: parseInt(p.kuota, 10) })),
    };

    setSubmitting(true);
    try {
      await createEvent(payload);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan event.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="pt-modal-overlay">
      {/* max-w-2xl (utility layer) menang atas max-w-[30rem] bawaan pt-modal-box,
          karena utilities selalu di-override setelah components di cascade layer Tailwind v4 */}
      <div className="pt-modal-box max-w-2xl">
        <div className="flex items-center justify-between border-b border-outline-variant px-lg py-md">
          <h2 className="text-title-lg text-on-surface">Tambah Event</h2>
          <button type="button" onClick={onClose} className="pt-modal-close" aria-label="Tutup">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-lg overflow-y-auto px-lg py-lg">
          {error && (
            <div className="rounded-xl bg-error-container/60 px-md py-sm text-body-sm text-on-error-container">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 gap-md sm:grid-cols-2">
            <Field label="Nama Event" required>
              <input
                required
                value={namaEvent}
                onChange={(e) => setNamaEvent(e.target.value)}
                placeholder="CFD Jl. Raya Darmo"
                className="pt-input"
              />
            </Field>
            <Field label="Tanggal Event" required>
              <input required type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} className="pt-input" />
            </Field>
            <Field label="Jam Mulai" required>
              <input required type="time" value={jamMulai} onChange={(e) => setJamMulai(e.target.value)} className="pt-input" />
            </Field>
            <Field label="Jam Selesai" required>
              <input required type="time" value={jamSelesai} onChange={(e) => setJamSelesai(e.target.value)} className="pt-input" />
            </Field>
            <Field label="Pendaftaran Mulai" required>
              <input
                required
                type="date"
                value={pendaftaranMulaiTgl}
                onChange={(e) => setPendaftaranMulaiTgl(e.target.value)}
                className="pt-input"
              />
            </Field>
            <Field label="Pendaftaran Selesai" required>
              <input
                required
                type="date"
                value={pendaftaranSelesaiTgl}
                onChange={(e) => setPendaftaranSelesaiTgl(e.target.value)}
                className="pt-input"
              />
            </Field>
            <Field label="Kuota Total" required>
              <input
                required
                type="number"
                min={1}
                value={kuotaTotal}
                onChange={(e) => setKuotaTotal(e.target.value)}
                className="pt-input"
              />
            </Field>
          </div>

          <Field label="Keterangan">
            <textarea
              value={keterangan}
              onChange={(e) => setKeterangan(e.target.value)}
              rows={2}
              className="pt-input resize-none"
            />
          </Field>

          <div>
            <div className="mb-sm flex flex-wrap items-center justify-between gap-sm">
              <span className="pt-field-label">
                Ruas Jalan yang Diikutkan <span className="text-error">*</span>
              </span>
              <div className="flex items-center gap-md">
                <span className="text-label-sm text-on-surface-variant">
                  Total kuota dipilih: {totalKuotaJalanDipilih}
                  {kuotaTotal ? ` / ${kuotaTotal}` : ""}
                </span>
                <button
                  type="button"
                  onClick={toggleSemuaJalan}
                  className="flex items-center gap-xs text-label-sm font-medium text-primary hover:underline"
                >
                  {semuaTerpilih ? <CheckSquare className="h-3.5 w-3.5" /> : <Square className="h-3.5 w-3.5" />}
                  {semuaTerpilih ? "Batalkan Semua" : "Pilih Semua Jalan (se-Surabaya)"}
                </button>
              </div>
            </div>

            <div className="max-h-64 space-y-md overflow-y-auto rounded-xl border border-outline-variant p-md">
              {grupPerKecamatan.length === 0 && (
                <p className="text-body-sm text-on-surface-variant">Belum ada data jalan.</p>
              )}
              {grupPerKecamatan.map(([kecamatan, jalanList]) => {
                const semuaDiKecTerpilih = jalanList.every((p) => p.dipilih);
                return (
                  <div key={kecamatan}>
                    <button
                      type="button"
                      onClick={() => toggleSemuaDiKecamatan(kecamatan)}
                      className="mb-xs flex items-center gap-xs text-label-sm font-semibold text-on-surface-variant hover:text-primary"
                    >
                      {semuaDiKecTerpilih ? (
                        <CheckSquare className="h-3.5 w-3.5" />
                      ) : (
                        <Square className="h-3.5 w-3.5" />
                      )}
                      {kecamatan}
                    </button>
                    <div className="space-y-xs pl-lg">
                      {jalanList.map((p) => {
                        const kuotaNum = parseInt(p.kuota, 10) || 0;
                        const melebihi = p.dipilih && kuotaNum > p.kapasitas;
                        return (
                          <div key={p.jalanId} className="flex items-center gap-sm">
                            <input
                              type="checkbox"
                              checked={p.dipilih}
                              onChange={() => toggleJalan(p.jalanId)}
                              className="h-4 w-4 rounded border-outline-variant text-primary focus:ring-primary/30"
                            />
                            <span className="flex-1 text-body-sm text-on-surface">
                              {p.namaJalan}
                              <span className="text-label-sm text-on-surface-variant"> (maks {p.kapasitas})</span>
                            </span>
                            <input
                              type="number"
                              min={1}
                              max={p.kapasitas}
                              disabled={!p.dipilih}
                              value={p.kuota}
                              onChange={(e) => setKuotaJalan(p.jalanId, e.target.value)}
                              placeholder="Kuota"
                              className={`pt-input w-24 py-1.5 disabled:opacity-40 ${
                                melebihi ? "border-error text-error" : ""
                              }`}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end gap-sm border-t border-outline-variant pt-lg">
            <button type="button" onClick={onClose} className="pt-btn pt-btn-ghost">
              Batal
            </button>
            <button type="submit" disabled={submitting} className="pt-btn pt-btn-primary">
              {submitting ? "Menyimpan..." : "Simpan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="pt-field-label mb-1 block">
        {label} {required && <span className="text-error">*</span>}
      </label>
      {children}
    </div>
  );
}