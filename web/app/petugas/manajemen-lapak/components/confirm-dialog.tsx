"use client";

// components/petugas/confirm-dialog.tsx
//
// Pengganti window.confirm() bawaan browser untuk semua halaman di
// app/petugas/**. Pakai token & class yang SUDAH ada di petugas.css
// (pt-modal-overlay, pt-modal-box, pt-btn, dst) -- tidak menambah
// warna/token baru sama sekali.
//
// Cara pakai (lihat contoh lengkap di bagian bawah chat):
//   const confirm = useConfirmDialog();
//   confirm({
//     title: `Hapus kecamatan "${nama}"?`,
//     details: ["3 jalan ikut terhapus", "12 ruas ikut terhapus"],
//     variant: "danger",
//     onConfirm: async () => { await deleteKecamatan(id); },
//   });
//
// Wajib dibungkus sekali di app/petugas/layout.tsx lewat
// <ConfirmDialogProvider>.

import { createContext, useCallback, useContext, useState } from "react";
import { AlertTriangle, AlertCircle, Info, Loader2, X } from "lucide-react";

type ConfirmVariant = "danger" | "warning" | "info";

interface ConfirmOptions {
  /** Judul singkat, sebutkan nama data yang kena aksi -- bukan judul generik. */
  title: string;
  /** Satu kalimat konteks tambahan, opsional. */
  description?: string;
  /** Daftar dampak konkret dari aksi ini, mis. ["3 jalan ikut terhapus"]. */
  details?: string[];
  variant?: ConfirmVariant;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Teks tombol saat proses berjalan, mis. "Menghapus...". */
  confirmingLabel?: string;
  /** Kalau diisi, tombol konfirmasi baru aktif setelah user mengetik teks ini persis -- buat aksi berisiko tinggi/cascade. */
  requireTypedConfirmation?: string;
  onConfirm: () => Promise<void> | void;
}

interface ConfirmState extends ConfirmOptions {
  open: boolean;
}

const EMPTY_STATE: ConfirmState = { open: false, title: "", onConfirm: () => {} };

const VARIANT_STYLE: Record<
  ConfirmVariant,
  { icon: typeof AlertTriangle; iconClass: string; confirmClass: string }
> = {
  danger: {
    icon: AlertTriangle,
    iconClass: "bg-error-container/60 text-on-error-container",
    confirmClass: "pt-btn-danger",
  },
  warning: {
    icon: AlertCircle,
    iconClass: "bg-tertiary-container/20 text-on-tertiary-container",
    confirmClass: "pt-btn-primary",
  },
  info: {
    icon: Info,
    iconClass: "bg-primary/10 text-primary",
    confirmClass: "pt-btn-primary",
  },
};

const ConfirmDialogContext = createContext<((options: ConfirmOptions) => void) | null>(null);

export function ConfirmDialogProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ConfirmState>(EMPTY_STATE);
  const [typedValue, setTypedValue] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const confirm = useCallback((options: ConfirmOptions) => {
    setState({ ...options, open: true });
    setTypedValue("");
    setError(null);
    setSubmitting(false);
  }, []);

  const close = useCallback(() => {
    if (submitting) return; // jangan bisa ditutup di tengah proses
    setState(EMPTY_STATE);
  }, [submitting]);

  const handleConfirm = useCallback(async () => {
    setSubmitting(true);
    setError(null);
    try {
      await state.onConfirm();
      setState(EMPTY_STATE);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan, coba lagi.");
      setSubmitting(false);
    }
  }, [state]);

  const variant = state.variant ?? "danger";
  const { icon: Icon, iconClass, confirmClass } = VARIANT_STYLE[variant];
  const typedOk = !state.requireTypedConfirmation || typedValue.trim() === state.requireTypedConfirmation;

  return (
    <ConfirmDialogContext.Provider value={confirm}>
      {children}
      {state.open && (
        <div className="pt-modal-overlay" onClick={close}>
            <div
              className="pt-modal-box"
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="pt-confirm-title"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                className="pt-modal-close"
                onClick={close}
                disabled={submitting}
                aria-label="Tutup"
              >
                <X className="h-5 w-5" strokeWidth={2} />
              </button>

              <div className="flex flex-col gap-md overflow-y-auto p-lg sm:p-xl">
                <div className="flex items-start gap-md">
                  <span className={`pt-section-icon shrink-0 ${iconClass}`}>
                    <Icon className="h-5 w-5" strokeWidth={2} />
                  </span>
                  <div className="flex flex-col gap-xs">
                    <h2 id="pt-confirm-title" className="pt-section-title">
                      {state.title}
                    </h2>
                    {state.description && <p className="pt-section-desc">{state.description}</p>}
                  </div>
                </div>

                {state.details && state.details.length > 0 && (
                  <ul className="flex flex-col gap-xs rounded-xl bg-surface-container-low p-md text-body-sm text-on-surface-variant">
                    {state.details.map((d, i) => (
                      <li key={i} className="flex items-start gap-xs">
                        <span className="pt-pill-dot mt-2 bg-on-surface-variant" />
                        <span>{d}</span>
                      </li>
                    ))}
                  </ul>
                )}

                {state.requireTypedConfirmation && (
                  <div className="flex flex-col gap-xs">
                    <label className="pt-field-label">
                      Ketik <strong className="text-on-surface">{state.requireTypedConfirmation}</strong> untuk
                      konfirmasi
                    </label>
                    <input
                      className="pt-input"
                      value={typedValue}
                      onChange={(e) => setTypedValue(e.target.value)}
                      disabled={submitting}
                      autoFocus
                    />
                  </div>
                )}

                {error && (
                  <div className="rounded-xl bg-error-container/60 px-md py-sm text-body-sm text-on-error-container">
                    {error}
                  </div>
                )}

                <div className="flex justify-end gap-sm">
                  <button type="button" className="pt-btn pt-btn-ghost" onClick={close} disabled={submitting}>
                    {state.cancelLabel ?? "Batal"}
                  </button>
                  <button
                    type="button"
                    className={`pt-btn ${confirmClass}`}
                    onClick={handleConfirm}
                    disabled={submitting || !typedOk}
                  >
                    {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                    {submitting ? state.confirmingLabel ?? "Memproses..." : state.confirmLabel ?? "Konfirmasi"}
                  </button>
                </div>
              </div>
            </div>
          </div>
      )}
    </ConfirmDialogContext.Provider>
  );
}

export function useConfirmDialog() {
  const ctx = useContext(ConfirmDialogContext);
  if (!ctx) {
    throw new Error("useConfirmDialog harus dipakai di dalam <ConfirmDialogProvider> (cek app/petugas/layout.tsx)");
  }
  return ctx;
}