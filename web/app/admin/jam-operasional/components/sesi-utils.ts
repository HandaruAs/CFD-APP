// Helper tanggal/jam bersama untuk komponen sesi di Jam Operasional.
// Semua tanggal dihitung di zona waktu browser (WIB untuk petugas), sama
// seperti CURRENT_DATE yang dipakai backend untuk "sesi hari ini".

/** Tanggal hari ini (lokal) dalam format YYYY-MM-DD. */
export function todayISO(): string {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

/** "06:00:05" / "06:00" -> "06.00" */
export function jamTampil(jam: string | null | undefined): string {
  return (jam ?? "").slice(0, 5).replace(":", ".");
}

/** Ubah "YYYY-MM-DD" jadi Date lokal jam 00:00 (bukan UTC). */
export function tanggalLokal(iso: string): Date {
  return new Date(`${iso.slice(0, 10)}T00:00:00`);
}

/** "2026-10-04" -> "Minggu, 4 Oktober 2026" */
export function tanggalPanjang(iso: string): string {
  const d = tanggalLokal(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

/** Potongan tanggal untuk "kalender kecil" di daftar sesi. */
export function tanggalRingkas(iso: string) {
  const d = tanggalLokal(iso);
  if (Number.isNaN(d.getTime())) return { hari: "", tgl: "", bulan: "" };
  return {
    hari: d.toLocaleDateString("id-ID", { weekday: "short" }),
    tgl: String(d.getDate()),
    bulan: d.toLocaleDateString("id-ID", { month: "short", year: "2-digit" }),
  };
}

// ============================================================
// Status sesi -- dihitung murni dari tanggal + jam yang diisi di Tambah
// Sesi (tidak ada lagi tombol aktif/nonaktif, ubah jam, atau akhiri lebih
// awal). Sesi otomatis "berlangsung" begitu jam mulainya tiba dan pindah
// ke Riwayat Sesi begitu jam selesainya lewat.
// ============================================================

export type StatusSesi = "akan-datang" | "berlangsung" | "selesai";

interface SesiWaktu {
  tanggal: string;
  jamMulai: string;
  jamSelesai: string;
}

/** Gabungkan "YYYY-MM-DD" + "HH:MM[:SS]" jadi Date lokal. */
function waktuLokal(tanggal: string, jam: string): Date {
  return new Date(`${tanggal.slice(0, 10)}T${(jam || "00:00").slice(0, 5)}:00`);
}

export function mulaiSesi(s: SesiWaktu): Date {
  return waktuLokal(s.tanggal, s.jamMulai);
}

export function statusSesi(s: SesiWaktu, now: Date = new Date()): StatusSesi {
  const tanggal = s.tanggal?.slice(0, 10) ?? "";
  // Baris lama tanpa jam: cukup dibandingkan per tanggal.
  if (!s.jamMulai || !s.jamSelesai) return tanggal < todayISO() ? "selesai" : "akan-datang";
  const mulai = waktuLokal(tanggal, s.jamMulai);
  const selesai = waktuLokal(tanggal, s.jamSelesai);
  if (now >= selesai) return "selesai";
  if (now >= mulai) return "berlangsung";
  return "akan-datang";
}
