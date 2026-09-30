"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

// ===== TIME STEPPER (ganti input jam bawaan browser) =====
// Jam & menit bisa diubah lewat tombol panah, ATAU diklik lalu diketik
// langsung angkanya (lebih cepat dari klik panah berkali-kali). Detik
// sengaja tidak ada -- sesi CFD cukup presisi sampai menit. Tetap tidak
// memakai <input type="time"> bawaan browser karena tampilannya tidak
// konsisten dengan desain halaman.
export default function TimeStepper({
  value,
  onChange,
  disabled = false,
}: {
  value: string; // format "HH:MM" (detik, kalau ada, diabaikan)
  onChange: (next: string) => void;
  disabled?: boolean;
}) {
  const [hh, mm] = value.split(":").map((n) => parseInt(n, 10) || 0);
  const [editingUnit, setEditingUnit] = useState<"hh" | "mm" | null>(null);
  const [draft, setDraft] = useState("");

  const build = (h: number, m: number) =>
    `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;

  const setHour = (next: number) => {
    const wrapped = ((next % 24) + 24) % 24;
    onChange(build(wrapped, mm));
  };
  // Menit melompat per 5 dan selalu "snap" ke kelipatan 5 terdekat di
  // arah yang ditekan -- jadi dari angka aneh manapun (mis. 08 atau 59)
  // satu klik langsung ke angka bulat (10 atau 00), bukan geser 1-1.
  // Kalau butuh angka persis, tinggal klik lalu ketik.
  const setMinute = (direction: 1 | -1) => {
    const next = direction === 1 ? Math.ceil((mm + 1) / 5) * 5 : Math.floor((mm - 1) / 5) * 5;
    const wrapped = ((next % 60) + 60) % 60;
    onChange(build(hh, wrapped));
  };

  const startEdit = (unit: "hh" | "mm", current: number) => {
    if (disabled) return;
    setEditingUnit(unit);
    setDraft(String(current).padStart(2, "0"));
  };
  const commitEdit = (unit: "hh" | "mm") => {
    const parsed = parseInt(draft, 10);
    if (!isNaN(parsed)) {
      const max = unit === "hh" ? 23 : 59;
      const clamped = Math.min(Math.max(parsed, 0), max);
      if (unit === "hh") onChange(build(clamped, mm));
      else onChange(build(hh, clamped));
    }
    setEditingUnit(null);
  };

  const renderUnit = (
    unit: "hh" | "mm",
    val: number,
    onUp: () => void,
    onDown: () => void,
    label: string,
  ) => (
    <div className="flex flex-col items-center">
      <button type="button" onClick={onUp} disabled={disabled} aria-label={`Tambah ${label}`} className="pt-time-btn">
        <ChevronUp className="h-4 w-4" strokeWidth={2.5} />
      </button>
      {editingUnit === unit ? (
        <input
          autoFocus
          inputMode="numeric"
          value={draft}
          disabled={disabled}
          onFocus={(e) => e.currentTarget.select()}
          onChange={(e) => setDraft(e.target.value.replace(/\D/g, "").slice(0, 2))}
          onBlur={() => commitEdit(unit)}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitEdit(unit);
            if (e.key === "Escape") setEditingUnit(null);
          }}
          className="pt-time-input"
        />
      ) : (
        <button
          type="button"
          disabled={disabled}
          onClick={() => startEdit(unit, val)}
          aria-label={`Ketik ${label} langsung`}
          className="pt-time-value pt-time-value-editable"
        >
          {String(val).padStart(2, "0")}
        </button>
      )}
      <button type="button" onClick={onDown} disabled={disabled} aria-label={`Kurangi ${label}`} className="pt-time-btn">
        <ChevronDown className="h-4 w-4" strokeWidth={2.5} />
      </button>
    </div>
  );

  return (
    <div className="inline-flex items-center gap-sm">
      {renderUnit("hh", hh, () => setHour(hh + 1), () => setHour(hh - 1), "jam")}
      <span className="text-title-lg font-semibold text-on-surface">:</span>
      {renderUnit("mm", mm, () => setMinute(1), () => setMinute(-1), "menit")}
    </div>
  );
}

