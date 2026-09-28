// app/admin/laporan-admin/page.tsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Download,
  Loader2,
  MapPin,
  RefreshCw,
  Search,
  ShieldCheck,
  Store,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";

// ============================================================
// Laporan superadmin: semua data role pedagang & petugas (superadmin
// sendiri tidak ikut). Sumber data: GET /api/admin/laporan
// ============================================================

// ===== TYPES (sama dengan modules/admin/laporan/entity) =====
type RingkasanAkun = { total: number; aktif: number; nonaktif: number; daftarPeriode: number };
type Laporan = {
  periode: { mulai: string; selesai: string };
  ringkasan: {
    pedagang: RingkasanAkun & { baru: number; lama: number; belumIsi: number };
    petugas: RingkasanAkun & { online: number };
    kehadiran: {
      total: number;
      checkout: number;
      belumCheckout: number;
      pedagangUnik: number;
      jumlahSesi: number;
      totalOmset: number;
      rataOmset: number;
      omsetTertinggi: number;
    };
    klaim: { total: number; aktif: number; batal: number; tanpaCheckin: number };
  };
  pedagang: PedagangRow[];
  petugas: PetugasRow[];
  kehadiran: KehadiranRow[];
  kehadiranTerpotong: boolean;
};
type PedagangRow = {
  userId: string;
  namaUsaha: string;
  pemilik: string;
  email: string;
  phone: string;
  kategori: string;
  jenisLapak: string;
  statusAkun: string;
  jenis: "baru" | "lama" | "belum_isi";
  terdaftar: string;
  jumlahKlaim: number;
  jumlahHadir: number;
  jumlahCheckout: number;
  totalOmset: number;
  terakhirHadir: string;
};
type PetugasRow = {
  userId: string;
  nama: string;
  email: string;
  phone: string;
  statusAkun: string;
  online: boolean;
  terdaftar: string;
  jumlahScan: number;
  pedagangUnik: number;
  jumlahSesi: number;
  scanTerakhir: string;
};
type KehadiranRow = {
  id: string;
  tanggal: string;
  namaUsaha: string;
  pemilik: string;
  kategori: string;
  namaJalan: string;
  nomorLapak: string;
  checkIn: string;
  checkOut: string;
  omset: number | null;
  dicatatOleh: string;
};
type Tab = "pedagang" | "petugas" | "kehadiran";

// ===== API =====
async function apiFetch<T>(path: string): Promise<T> {
  const token = localStorage.getItem("cfd_token");
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? ""}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error || `status ${res.status}`);
  return data as T;
}

// ===== FORMAT =====
const rupiah = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);
const angka = (n: number) => n.toLocaleString("id-ID");
const persen = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : 0);
const iso = (d: Date) => d.toLocaleDateString("en-CA"); // yyyy-mm-dd lokal
function tanggal(v: string) {
  if (!v) return "–";
  const d = new Date(`${v.slice(0, 10)}T00:00:00`);
  return Number.isNaN(d.getTime()) ? v : d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

const LABEL_KATEGORI: Record<string, string> = {
  makanan_minuman: "Makanan & Minuman",
  bukan_makanan_minuman: "Bukan Makanan & Minuman",
};
const LABEL_LAPAK: Record<string, string> = { meja: "Meja", rombong: "Rombong" };
const LABEL_JENIS: Record<PedagangRow["jenis"], string> = {
  baru: "Pedagang baru",
  lama: "Pedagang lama",
  belum_isi: "Belum isi data",
};
const LABEL_STATUS_AKUN: Record<string, { label: string; kelas: string }> = {
  active: { label: "Aktif", kelas: "pt-pill-success" },
  suspended: { label: "Ditangguhkan", kelas: "pt-pill-warning" },
  banned: { label: "Diblokir", kelas: "pt-pill-danger" },
};

// ===== PERIODE =====
type Preset = "hari-ini" | "7" | "30" | "bulan-ini" | "custom";
function rentangPreset(p: Exclude<Preset, "custom">): { mulai: string; selesai: string } {
  const sekarang = new Date();
  const selesai = iso(sekarang);
  if (p === "hari-ini") return { mulai: selesai, selesai };
  if (p === "bulan-ini") return { mulai: iso(new Date(sekarang.getFullYear(), sekarang.getMonth(), 1)), selesai };
  const d = new Date();
  d.setDate(d.getDate() - (Number(p) - 1));
  return { mulai: iso(d), selesai };
}
const LABEL_PRESET: Record<Exclude<Preset, "custom">, string> = {
  "hari-ini": "Hari ini",
  "7": "7 hari",
  "30": "30 hari",
  "bulan-ini": "Bulan ini",
};

// ===== PDF =====
// Satu file PDF berisi semua data periode ini (ringkasan + pedagang +
// petugas + kehadiran), tidak terpengaruh pencarian/tab yang sedang dibuka.
// jspdf dimuat saat tombol ditekan saja supaya halaman tetap ringan.
type RGB = [number, number, number];
const PDF_WARNA = {
  primer: [0, 40, 142] as RGB,
  primerMuda: [221, 225, 255] as RGB,
  latarKartu: [243, 246, 255] as RGB,
  zebra: [248, 250, 255] as RGB,
  garis: [218, 224, 238] as RGB,
  teks: [11, 28, 48] as RGB,
  teksPudar: [90, 96, 110] as RGB,
  hijau: [0, 108, 73] as RGB,
  kuning: [150, 90, 0] as RGB,
  merah: [186, 26, 26] as RGB,
};
const teksPdf = (v: string) => v.replace(/\u00a0/g, " ").replace(/[–—]/g, "-");

async function unduhPdf(data: Laporan) {
  const [{ jsPDF }, { autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const W = PDF_WARNA;
  const lebar = doc.internal.pageSize.getWidth();
  const tinggi = doc.internal.pageSize.getHeight();
  const kiri = 14;
  const isi = lebar - kiri * 2;
  const r = data.ringkasan;
  const rp = (n: number) => teksPdf(rupiah(n));
  const periode = teksPdf(`${tanggal(data.periode.mulai)} - ${tanggal(data.periode.selesai)}`);
  const dibuat = teksPdf(new Date().toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" }));
  const akhirTabel = () => (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 0;

  const warnaTeks = (c: RGB) => doc.setTextColor(c[0], c[1], c[2]);
  const warnaIsi = (c: RGB) => doc.setFillColor(c[0], c[1], c[2]);
  const huruf = (ukuran: number, tebal = false) => {
    doc.setFont("helvetica", tebal ? "bold" : "normal");
    doc.setFontSize(ukuran);
  };

  // ---------- Kop halaman pertama ----------
  warnaIsi(W.primer);
  doc.rect(0, 0, lebar, 28, "F");
  warnaTeks([255, 255, 255]);
  huruf(17, true);
  doc.text("Laporan E-Event CFD Surabaya", kiri, 13);
  huruf(9);
  doc.text("Rekap akun dan aktivitas pedagang serta petugas", kiri, 20);
  huruf(9, true);
  doc.text(`Periode ${periode}`, lebar - kiri, 13, { align: "right" });
  huruf(8);
  doc.text(`Dibuat ${dibuat} WIB`, lebar - kiri, 20, { align: "right" });

  // ---------- Kartu ringkasan ----------
  const kartu: { judul: string; utama: string; baris: string[]; aksen: RGB }[] = [
    {
      judul: "Pedagang",
      utama: angka(r.pedagang.total),
      baris: [
        `${angka(r.pedagang.aktif)} aktif, ${angka(r.pedagang.daftarPeriode)} baru daftar`,
        `Baru ${angka(r.pedagang.baru)} | Lama ${angka(r.pedagang.lama)}`,
        `Belum isi data ${angka(r.pedagang.belumIsi)}`,
      ],
      aksen: W.primer,
    },
    {
      judul: "Petugas",
      utama: angka(r.petugas.total),
      baris: [`${angka(r.petugas.aktif)} aktif`, `${angka(r.petugas.nonaktif)} nonaktif`, `${angka(r.petugas.daftarPeriode)} baru daftar`],
      aksen: W.primer,
    },
    {
      judul: "Kehadiran",
      utama: angka(r.kehadiran.total),
      baris: [
        `${angka(r.kehadiran.pedagangUnik)} pedagang berbeda`,
        `${angka(r.kehadiran.jumlahSesi)} hari CFD`,
        `Check-out ${persen(r.kehadiran.checkout, r.kehadiran.total)}% (${angka(r.kehadiran.belumCheckout)} belum)`,
      ],
      aksen: W.hijau,
    },
    {
      judul: "Total omset",
      utama: rp(r.kehadiran.totalOmset),
      baris: [`Rata-rata ${rp(r.kehadiran.rataOmset)}`, `Tertinggi ${rp(r.kehadiran.omsetTertinggi)}`],
      aksen: W.hijau,
    },
    {
      judul: "Klaim lapak",
      utama: angka(r.klaim.total),
      baris: [
        `${angka(r.klaim.aktif)} aktif, ${angka(r.klaim.batal)} dibatalkan`,
        `${angka(r.klaim.tanpaCheckin)} tidak hadir`,
        `${persen(r.klaim.total - r.klaim.tanpaCheckin, r.klaim.total)}% diikuti check-in`,
      ],
      aksen: W.kuning,
    },
  ];
  const celah = 4;
  const lebarKartu = (isi - celah * (kartu.length - 1)) / kartu.length;
  const yKartu = 36;
  const tinggiKartu = 33;
  kartu.forEach((k, i) => {
    const x = kiri + i * (lebarKartu + celah);
    warnaIsi(W.latarKartu);
    doc.roundedRect(x, yKartu, lebarKartu, tinggiKartu, 2, 2, "F");
    warnaIsi(k.aksen);
    doc.rect(x, yKartu + 3, 1.2, tinggiKartu - 6, "F");
    warnaTeks(W.teksPudar);
    huruf(8);
    doc.text(k.judul, x + 5, yKartu + 7);
    warnaTeks(W.teks);
    huruf(k.utama.length > 12 ? 12 : 15, true);
    doc.text(k.utama, x + 5, yKartu + 15);
    warnaTeks(W.teksPudar);
    huruf(7.5);
    k.baris.forEach((b, j) => doc.text(teksPdf(b), x + 5, yKartu + 21 + j * 3.8));
  });

  // ---------- Bagian tabel ----------
  const gaya = {
    theme: "plain" as const,
    margin: { left: kiri, right: kiri, top: 20, bottom: 16 },
    styles: {
      font: "helvetica",
      fontSize: 7.5,
      textColor: W.teks,
      cellPadding: { top: 1.8, bottom: 1.8, left: 2, right: 2 },
      lineColor: W.garis,
      lineWidth: { bottom: 0.2 },
      valign: "middle" as const,
    },
    headStyles: { fillColor: W.primer, textColor: 255, fontStyle: "bold" as const, fontSize: 7.5, lineWidth: 0, cellPadding: { top: 2.6, bottom: 2.6, left: 2, right: 2 } },
    footStyles: { fillColor: W.primerMuda, textColor: W.teks, fontStyle: "bold" as const, lineWidth: 0 },
    alternateRowStyles: { fillColor: W.zebra },
    showHead: "everyPage" as const,
    rowPageBreak: "avoid" as const,
  };

  let y = yKartu + tinggiKartu + 10;
  const judulBagian = (judul: string, jumlah: number, keterangan: string) => {
    // Pindah halaman kalau judul + beberapa baris pertama tidak muat
    if (y + 28 > tinggi - 16) {
      doc.addPage();
      y = 22;
    }
    warnaIsi(W.primer);
    doc.rect(kiri, y - 4.2, 1.2, 5.2, "F");
    warnaTeks(W.teks);
    huruf(12, true);
    doc.text(judul, kiri + 4, y);
    const lebarJudul = doc.getTextWidth(judul);
    warnaTeks(W.teksPudar);
    huruf(9);
    doc.text(`${angka(jumlah)} data`, kiri + 4 + lebarJudul + 3, y);
    huruf(8);
    doc.text(teksPdf(keterangan), kiri + 4, y + 4.5);
    y += 8;
  };
  const kosong = (teks: string) => {
    warnaTeks(W.teksPudar);
    huruf(9);
    doc.text(teks, kiri + 4, y + 4);
    y += 14;
  };
  // Warnai teks status tanpa mengubah isi sel
  const warnaStatus = (teks: string): RGB | null => {
    if (teks === "Aktif") return W.hijau;
    if (teks === "Ditangguhkan" || teks.startsWith("Belum")) return W.kuning;
    if (teks === "Diblokir") return W.merah;
    return null;
  };
  type SelHook = { section: string; cell: { raw: unknown; styles: { textColor: unknown; fontStyle: unknown } } };
  const pewarna = (kolomStatus: number[]) => (d: SelHook & { column: { index: number } }) => {
    // Judul & baris total ikut rata kanan/tengah seperti isi kolomnya
    if (d.section === "head" || d.section === "foot") {
      const rata = (d as unknown as { table: { styles: { columnStyles: Record<number, { halign?: string }> } } }).table.styles
        .columnStyles[d.column.index]?.halign;
      if (rata) (d.cell.styles as { halign?: unknown }).halign = rata;
      return;
    }
    if (d.section !== "body" || !kolomStatus.includes(d.column.index)) return;
    const c = warnaStatus(String(d.cell.raw ?? ""));
    if (c) {
      d.cell.styles.textColor = c;
      d.cell.styles.fontStyle = "bold";
    }
  };

  // 1. Pedagang
  judulBagian("Pedagang", data.pedagang.length, "Semua akun pedagang beserta aktivitasnya di periode ini, diurutkan dari omset terbesar.");
  if (data.pedagang.length === 0) {
    kosong("Belum ada akun pedagang.");
  } else {
    const tot = data.pedagang.reduce(
      (a, p) => ({ klaim: a.klaim + p.jumlahKlaim, hadir: a.hadir + p.jumlahHadir, co: a.co + p.jumlahCheckout, omset: a.omset + p.totalOmset }),
      { klaim: 0, hadir: 0, co: 0, omset: 0 }
    );
    autoTable(doc, {
      ...gaya,
      startY: y,
      head: [["#", "Nama usaha", "Pemilik", "Kontak", "Kategori", "Lapak", "Jenis", "Akun", "Klaim", "Hadir", "Check-out", "Total omset", "Terakhir hadir"]],
      body: data.pedagang.map((p, i) => [
        String(i + 1),
        p.namaUsaha || "Belum isi data usaha",
        p.pemilik,
        `${p.email}\n${p.phone || "-"}`,
        LABEL_KATEGORI[p.kategori] ?? (p.kategori || "-"),
        LABEL_LAPAK[p.jenisLapak] ?? (p.jenisLapak || "-"),
        ({ baru: "Baru", lama: "Lama", belum_isi: "Belum isi" } as const)[p.jenis],
        LABEL_STATUS_AKUN[p.statusAkun]?.label ?? p.statusAkun,
        angka(p.jumlahKlaim),
        angka(p.jumlahHadir),
        angka(p.jumlahCheckout),
        p.totalOmset ? rp(p.totalOmset) : "-",
        p.terakhirHadir ? teksPdf(tanggal(p.terakhirHadir)) : "-",
      ]),
      foot: [["", "Total", "", "", "", "", "", "", angka(tot.klaim), angka(tot.hadir), angka(tot.co), rp(tot.omset), ""]],
      showFoot: "lastPage",
      columnStyles: {
        0: { cellWidth: 8, halign: "center", textColor: W.teksPudar },
        1: { cellWidth: 32, fontStyle: "bold" },
        2: { cellWidth: 26 },
        3: { cellWidth: 36, textColor: W.teksPudar },
        4: { cellWidth: 24 },
        5: { cellWidth: 17 },
        6: { cellWidth: 16 },
        7: { cellWidth: 24 },
        8: { cellWidth: 12, halign: "right" },
        9: { cellWidth: 12, halign: "right" },
        10: { cellWidth: 18, halign: "right" },
        11: { cellWidth: 24, halign: "right", fontStyle: "bold" },
        12: { halign: "right" },
      },
      didParseCell: (d) => {
        pewarna([7])(d as never);
      },
    });
    y = akhirTabel() + 12;
  }

  // 2. Petugas
  judulBagian("Petugas", data.petugas.length, "Jumlah scan QR per petugas. Pedagang berbeda = pedagang yang pernah di-scan; hari bertugas = hari CFD dengan minimal satu scan.");
  if (data.petugas.length === 0) {
    kosong("Belum ada akun petugas.");
  } else {
    autoTable(doc, {
      ...gaya,
      startY: y,
      head: [["#", "Nama", "Email", "Telepon", "Akun", "Terdaftar", "Jumlah scan", "Pedagang berbeda", "Hari bertugas", "Scan terakhir"]],
      body: data.petugas.map((p, i) => [
        String(i + 1),
        p.nama,
        p.email,
        p.phone || "-",
        LABEL_STATUS_AKUN[p.statusAkun]?.label ?? p.statusAkun,
        teksPdf(tanggal(p.terdaftar)),
        angka(p.jumlahScan),
        angka(p.pedagangUnik),
        angka(p.jumlahSesi),
        p.scanTerakhir ? teksPdf(`${tanggal(p.scanTerakhir)}, ${p.scanTerakhir.slice(11)} WIB`) : "Belum pernah scan",
      ]),
      columnStyles: {
        0: { cellWidth: 8, halign: "center", textColor: W.teksPudar },
        1: { cellWidth: 40, fontStyle: "bold" },
        2: { cellWidth: 48, textColor: W.teksPudar },
        3: { cellWidth: 28 },
        4: { cellWidth: 20 },
        5: { cellWidth: 24 },
        6: { cellWidth: 20, halign: "right", fontStyle: "bold" },
        7: { cellWidth: 24, halign: "right" },
        8: { cellWidth: 20, halign: "right" },
      },
      didParseCell: (d) => {
        pewarna([4, 9])(d as never);
      },
    });
    y = akhirTabel() + 12;
  }

  // 3. Kehadiran
  judulBagian(
    "Kehadiran",
    data.kehadiran.length,
    data.kehadiranTerpotong
      ? `Menampilkan ${angka(data.kehadiran.length)} kehadiran terbaru. Persempit periode untuk data lengkap.`
      : "Setiap check-in pedagang di periode ini, terbaru di atas."
  );
  if (data.kehadiran.length === 0) {
    kosong("Belum ada kehadiran di periode ini.");
  } else {
    const totalOmset = data.kehadiran.reduce((a, k) => a + (k.omset ?? 0), 0);
    autoTable(doc, {
      ...gaya,
      startY: y,
      head: [["#", "Tanggal", "Nama usaha", "Pemilik", "Kategori", "Lokasi lapak", "Check-in", "Check-out", "Omset", "Dicatat oleh"]],
      body: data.kehadiran.map((k, i) => [
        String(i + 1),
        teksPdf(tanggal(k.tanggal)),
        k.namaUsaha,
        k.pemilik,
        LABEL_KATEGORI[k.kategori] ?? k.kategori,
        k.namaJalan ? `${k.namaJalan}\n${k.nomorLapak}` : "Belum klaim lapak",
        k.checkIn,
        k.checkOut || "Belum check-out",
        k.omset != null ? rp(k.omset) : "-",
        k.dicatatOleh || "-",
      ]),
      foot: [["", "Total", "", "", "", "", "", "", rp(totalOmset), ""]],
      showFoot: "lastPage",
      columnStyles: {
        0: { cellWidth: 8, halign: "center", textColor: W.teksPudar },
        1: { cellWidth: 22 },
        2: { cellWidth: 36, fontStyle: "bold" },
        3: { cellWidth: 30 },
        4: { cellWidth: 30 },
        5: { cellWidth: 40 },
        6: { cellWidth: 16, halign: "center" },
        7: { cellWidth: 27, halign: "center" },
        8: { cellWidth: 24, halign: "right", fontStyle: "bold" },
      },
      didParseCell: (d) => {
        pewarna([5, 7])(d as never);
      },
    });
  }

  // ---------- Kop kecil (halaman 2 dst) & kaki halaman ----------
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    if (i > 1) {
      warnaTeks(W.primer);
      huruf(9, true);
      doc.text("Laporan E-Event CFD Surabaya", kiri, 11);
      warnaTeks(W.teksPudar);
      huruf(8);
      doc.text(`Periode ${periode}`, lebar - kiri, 11, { align: "right" });
      doc.setDrawColor(W.garis[0], W.garis[1], W.garis[2]);
      doc.setLineWidth(0.3);
      doc.line(kiri, 13.5, lebar - kiri, 13.5);
    }
    doc.setDrawColor(W.garis[0], W.garis[1], W.garis[2]);
    doc.setLineWidth(0.3);
    doc.line(kiri, tinggi - 11, lebar - kiri, tinggi - 11);
    warnaTeks(W.teksPudar);
    huruf(7.5);
    doc.text("E-Event CFD Surabaya", kiri, tinggi - 6.5);
    doc.text(`Halaman ${i} dari ${total}`, lebar - kiri, tinggi - 6.5, { align: "right" });
  }

  doc.save(`laporan-cfd_${data.periode.mulai}_${data.periode.selesai}.pdf`);
}

const PER_HALAMAN = 25;

// ============================================================
// PAGE
// ============================================================

export default function LaporanAdminPage() {
  // Tanggal sengaja TIDAK dihitung saat render pertama: halaman ini juga
  // di-render di server (SSR), dan jam/zona waktu server bisa beda dengan
  // browser -> hydration mismatch. Tanggal diisi setelah halaman terpasang.
  const [preset, setPreset] = useState<Preset>("30");
  const [mulai, setMulai] = useState("");
  const [selesai, setSelesai] = useState("");
  const [hariIni, setHariIni] = useState<string | undefined>(undefined);
  const [data, setData] = useState<Laporan | null>(null);
  const [memuat, setMemuat] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("pedagang");
  const [cari, setCari] = useState("");
  const [halaman, setHalaman] = useState(1);
  const [membuatPdf, setMembuatPdf] = useState(false);

  const muat = useCallback(async (m: string, s: string) => {
    setMemuat(true);
    setError(null);
    try {
      const res = await apiFetch<Laporan>(`/api/admin/laporan?startDate=${m}&endDate=${s}`);
      setData(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Laporan gagal dimuat.");
    } finally {
      setMemuat(false);
    }
  }, []);

  useEffect(() => {
    const awal = rentangPreset("30");
    /* eslint-disable react-hooks/set-state-in-effect */
    setMulai(awal.mulai);
    setSelesai(awal.selesai);
    setHariIni(iso(new Date()));
    /* eslint-enable react-hooks/set-state-in-effect */
    muat(awal.mulai, awal.selesai);
  }, [muat]);

  function pilihPreset(p: Exclude<Preset, "custom">) {
    const r = rentangPreset(p);
    setPreset(p);
    setMulai(r.mulai);
    setSelesai(r.selesai);
    setHalaman(1);
    muat(r.mulai, r.selesai);
  }

  function terapkanCustom() {
    if (!mulai || !selesai) return;
    if (mulai > selesai) {
      setError("Tanggal mulai tidak boleh setelah tanggal selesai.");
      return;
    }
    setPreset("custom");
    setHalaman(1);
    muat(mulai, selesai);
  }

  // ---------- filter & halaman per tab ----------
  const q = cari.trim().toLowerCase();
  const barisPedagang = useMemo(
    () =>
      (data?.pedagang ?? []).filter(
        (p) => !q || [p.namaUsaha, p.pemilik, p.email, p.phone].some((v) => v.toLowerCase().includes(q))
      ),
    [data, q]
  );
  const barisPetugas = useMemo(
    () => (data?.petugas ?? []).filter((p) => !q || [p.nama, p.email, p.phone].some((v) => v.toLowerCase().includes(q))),
    [data, q]
  );
  const barisKehadiran = useMemo(
    () =>
      (data?.kehadiran ?? []).filter(
        (k) => !q || [k.namaUsaha, k.pemilik, k.namaJalan, k.nomorLapak, k.dicatatOleh].some((v) => v.toLowerCase().includes(q))
      ),
    [data, q]
  );
  const jumlahBaris = tab === "pedagang" ? barisPedagang.length : tab === "petugas" ? barisPetugas.length : barisKehadiran.length;
  const totalHalaman = Math.max(1, Math.ceil(jumlahBaris / PER_HALAMAN));
  const hal = Math.min(halaman, totalHalaman);
  const potong = <T,>(arr: T[]) => arr.slice((hal - 1) * PER_HALAMAN, hal * PER_HALAMAN);

  async function eksporPdf() {
    if (!data) return;
    setMembuatPdf(true);
    try {
      await unduhPdf(data);
    } catch (e) {
      setError(e instanceof Error ? `PDF gagal dibuat: ${e.message}` : "PDF gagal dibuat.");
    } finally {
      setMembuatPdf(false);
    }
  }

  const r = data?.ringkasan;

  return (
    <div className="flex flex-col gap-lg pb-xl">
      {/* ===== HEADER & PERIODE ===== */}
      <div className="flex flex-col gap-md">
        <div>
          <h2 className="text-headline-lg text-on-surface">Laporan</h2>
          <p className="mt-xs text-body-md text-on-surface-variant">
            Rekap akun dan aktivitas pedagang serta petugas.
            {data && (
              <>
                {" "}Periode <span className="font-medium text-on-surface">{tanggal(data.periode.mulai)}</span> –{" "}
                <span className="font-medium text-on-surface">{tanggal(data.periode.selesai)}</span>.
              </>
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-sm rounded-2xl border border-outline-variant bg-surface-container-lowest p-md">
          <div role="group" aria-label="Pilih periode" className="inline-flex flex-wrap rounded-xl bg-surface-container-low p-1">
            {(Object.keys(LABEL_PRESET) as Exclude<Preset, "custom">[]).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => pilihPreset(p)}
                aria-pressed={preset === p}
                className={`min-h-10 rounded-lg px-md text-label-md transition-colors ${
                  preset === p ? "bg-surface-container-lowest text-on-surface shadow-sm" : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                {LABEL_PRESET[p]}
              </button>
            ))}
          </div>
          <label className="flex flex-col gap-1">
            <span className="text-label-sm text-on-surface-variant">Dari</span>
            <input type="date" value={mulai} max={selesai || undefined} onChange={(e) => setMulai(e.target.value)} className="pt-input !py-2" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-label-sm text-on-surface-variant">Sampai</span>
            <input type="date" value={selesai} min={mulai || undefined} max={hariIni} onChange={(e) => setSelesai(e.target.value)} className="pt-input !py-2" />
          </label>
          <button type="button" onClick={terapkanCustom} disabled={memuat || !mulai || !selesai} className="pt-btn pt-btn-primary">
            {memuat ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Terapkan
          </button>
          <button
            type="button"
            onClick={eksporPdf}
            disabled={!data || memuat || membuatPdf}
            className="pt-btn pt-btn-secondary sm:ml-auto"
            title="Satu file PDF berisi ringkasan, pedagang, petugas, dan kehadiran"
          >
            {membuatPdf ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            {membuatPdf ? "Membuat PDF..." : "Unduh PDF"}
          </button>
        </div>
      </div>

      {error && (
        <div role="alert" className="flex items-start gap-sm rounded-xl bg-error-container/60 p-md text-body-sm text-on-error-container">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* ===== RINGKASAN ===== */}
      {memuat && !data ? (
        <div className="grid grid-cols-1 gap-md sm:grid-cols-2 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-[168px] animate-pulse rounded-2xl bg-surface-container-high" />
          ))}
        </div>
      ) : r ? (
        <div className={`grid grid-cols-1 gap-md sm:grid-cols-2 xl:grid-cols-5 ${memuat ? "opacity-60" : ""}`}>
          <KartuRingkas
            ikon={Store}
            judul="Pedagang"
            utama={angka(r.pedagang.total)}
            sub={`${angka(r.pedagang.aktif)} aktif · ${angka(r.pedagang.daftarPeriode)} daftar di periode ini`}
            rincian={[
              ["Baru", r.pedagang.baru],
              ["Lama", r.pedagang.lama],
              ["Belum isi data", r.pedagang.belumIsi],
            ]}
          />
          <KartuRingkas
            ikon={ShieldCheck}
            judul="Petugas"
            utama={angka(r.petugas.total)}
            sub={`${angka(r.petugas.aktif)} aktif · ${angka(r.petugas.online)} sedang online`}
            rincian={[
              ["Nonaktif", r.petugas.nonaktif],
              ["Daftar di periode", r.petugas.daftarPeriode],
            ]}
          />
          <KartuRingkas
            ikon={Users}
            judul="Kehadiran"
            utama={angka(r.kehadiran.total)}
            sub={`${angka(r.kehadiran.pedagangUnik)} pedagang berbeda · ${angka(r.kehadiran.jumlahSesi)} hari CFD`}
            rincian={[
              [`Check-out (${persen(r.kehadiran.checkout, r.kehadiran.total)}%)`, r.kehadiran.checkout],
              ["Belum check-out", r.kehadiran.belumCheckout],
            ]}
          />
          <KartuRingkas
            ikon={Wallet}
            judul="Omset"
            utama={rupiah(r.kehadiran.totalOmset)}
            sub="total dari pedagang yang check-out"
            rincian={[
              ["Rata-rata", rupiah(r.kehadiran.rataOmset)],
              ["Tertinggi", rupiah(r.kehadiran.omsetTertinggi)],
            ]}
          />
          <KartuRingkas
            ikon={MapPin}
            judul="Klaim lapak"
            utama={angka(r.klaim.total)}
            sub={`${persen(r.klaim.total - r.klaim.tanpaCheckin, r.klaim.total)}% diikuti check-in`}
            rincian={[
              ["Aktif", r.klaim.aktif],
              ["Dibatalkan", r.klaim.batal],
              ["Tidak hadir", r.klaim.tanpaCheckin],
            ]}
          />
        </div>
      ) : null}

      {/* ===== TAB DATA ===== */}
      {data && (
        <section className="pt-card !p-0 overflow-hidden sm:!p-0">
          <div className="flex flex-wrap items-center gap-sm border-b border-outline-variant p-md sm:px-lg">
            <div role="tablist" aria-label="Jenis data" className="inline-flex flex-wrap rounded-xl bg-surface-container-low p-1">
              {(
                [
                  ["pedagang", "Pedagang", data.pedagang.length],
                  ["petugas", "Petugas", data.petugas.length],
                  ["kehadiran", "Kehadiran", data.kehadiran.length],
                ] as [Tab, string, number][]
              ).map(([t, label, n]) => (
                <button
                  key={t}
                  type="button"
                  role="tab"
                  aria-selected={tab === t}
                  onClick={() => {
                    setTab(t);
                    setHalaman(1);
                  }}
                  className={`min-h-10 rounded-lg px-md text-label-md transition-colors ${
                    tab === t ? "bg-surface-container-lowest text-on-surface shadow-sm" : "text-on-surface-variant hover:text-on-surface"
                  }`}
                >
                  {label} <span className="tabular-nums text-on-surface-variant">{angka(n)}</span>
                </button>
              ))}
            </div>
            <label className="relative ml-auto min-w-[220px] flex-1 sm:max-w-xs">
              <span className="sr-only">Cari</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant" />
              <input
                value={cari}
                onChange={(e) => {
                  setCari(e.target.value);
                  setHalaman(1);
                }}
                placeholder={tab === "petugas" ? "Cari nama atau email" : "Cari nama usaha, pemilik, lokasi"}
                className="pt-input !py-2 pl-9"
              />
            </label>
          </div>

          {tab === "kehadiran" && data.kehadiranTerpotong && (
            <p className="bg-tertiary-fixed/40 px-lg py-sm text-body-sm text-on-tertiary-fixed">
              Menampilkan {angka(data.kehadiran.length)} kehadiran terbaru. Persempit periode untuk melihat semuanya.
            </p>
          )}

          <div className="overflow-x-auto">
            {jumlahBaris === 0 ? (
              <div className="flex flex-col items-center gap-sm px-lg py-xl text-center text-on-surface-variant">
                <ClipboardList className="h-8 w-8" strokeWidth={1.5} />
                <p className="text-body-md">{q ? "Tidak ada data yang cocok dengan pencarian." : "Belum ada data di periode ini."}</p>
              </div>
            ) : tab === "pedagang" ? (
              <TabelPedagang baris={potong(barisPedagang)} />
            ) : tab === "petugas" ? (
              <TabelPetugas baris={potong(barisPetugas)} />
            ) : (
              <TabelKehadiran baris={potong(barisKehadiran)} />
            )}
          </div>

          {jumlahBaris > PER_HALAMAN && (
            <div className="flex flex-wrap items-center justify-between gap-sm border-t border-outline-variant px-lg py-sm text-body-sm text-on-surface-variant">
              <span>
                {angka((hal - 1) * PER_HALAMAN + 1)}–{angka(Math.min(hal * PER_HALAMAN, jumlahBaris))} dari {angka(jumlahBaris)}
              </span>
              <div className="flex items-center gap-xs">
                <button
                  type="button"
                  onClick={() => setHalaman(hal - 1)}
                  disabled={hal <= 1}
                  aria-label="Halaman sebelumnya"
                  className="pt-btn pt-btn-ghost pt-btn-icon"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="tabular-nums">
                  {hal} / {totalHalaman}
                </span>
                <button
                  type="button"
                  onClick={() => setHalaman(hal + 1)}
                  disabled={hal >= totalHalaman}
                  aria-label="Halaman berikutnya"
                  className="pt-btn pt-btn-ghost pt-btn-icon"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

// ============================================================
// KOMPONEN
// ============================================================

function KartuRingkas({
  ikon: Ikon,
  judul,
  utama,
  sub,
  rincian,
}: {
  ikon: LucideIcon;
  judul: string;
  utama: string;
  sub: string;
  rincian: [string, number | string][];
}) {
  return (
    <section className="flex flex-col rounded-2xl border border-outline-variant bg-surface-container-lowest p-lg">
      <div className="flex items-center gap-sm text-on-surface-variant">
        <Ikon className="h-4 w-4" />
        <h3 className="text-label-md">{judul}</h3>
      </div>
      <p className="mt-sm break-words text-headline-md font-semibold tabular-nums text-on-surface">{utama}</p>
      <p className="mt-0.5 text-label-sm text-on-surface-variant">{sub}</p>
      <dl className="mt-md flex flex-col gap-1 border-t border-outline-variant pt-sm">
        {rincian.map(([label, nilai]) => (
          <div key={label} className="flex items-center justify-between gap-sm text-body-sm">
            <dt className="text-on-surface-variant">{label}</dt>
            <dd className="font-medium tabular-nums text-on-surface">{typeof nilai === "number" ? angka(nilai) : nilai}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function PillAkun({ status }: { status: string }) {
  const s = LABEL_STATUS_AKUN[status] ?? { label: status, kelas: "pt-pill-neutral" };
  return (
    <span className={`pt-pill ${s.kelas}`}>
      <span className="pt-pill-dot" aria-hidden="true" />
      {s.label}
    </span>
  );
}

const TH = "px-md py-sm font-medium whitespace-nowrap";
const TD = "px-md py-sm align-top";

function TabelPedagang({ baris }: { baris: PedagangRow[] }) {
  return (
    <table className="w-full min-w-[980px] text-left">
      <thead className="bg-surface-container-low text-label-md text-on-surface-variant">
        <tr>
          <th className={`${TH} pl-lg`}>Pedagang</th>
          <th className={TH}>Kontak</th>
          <th className={TH}>Usaha</th>
          <th className={TH}>Akun</th>
          <th className={`${TH} text-right`}>Klaim</th>
          <th className={`${TH} text-right`}>Hadir</th>
          <th className={`${TH} text-right`}>Check-out</th>
          <th className={`${TH} text-right`}>Total omset</th>
          <th className={`${TH} pr-lg`}>Terakhir hadir</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-outline-variant text-body-sm">
        {baris.map((p) => (
          <tr key={p.userId} className="hover:bg-surface-container-low/60">
            <td className={`${TD} pl-lg`}>
              <p className="text-body-md font-medium text-on-surface">{p.namaUsaha || <span className="text-on-surface-variant">Belum isi data usaha</span>}</p>
              <p className="text-on-surface-variant">{p.pemilik}</p>
            </td>
            <td className={TD}>
              <p className="text-on-surface">{p.email}</p>
              <p className="text-on-surface-variant">{p.phone || "–"}</p>
            </td>
            <td className={TD}>
              <p className="text-on-surface">{LABEL_KATEGORI[p.kategori] ?? (p.kategori || "–")}</p>
              <p className="text-on-surface-variant">
                {LABEL_LAPAK[p.jenisLapak] ?? (p.jenisLapak || "–")} · {LABEL_JENIS[p.jenis]}
              </p>
            </td>
            <td className={TD}>
              <PillAkun status={p.statusAkun} />
              <p className="mt-1 text-label-sm text-on-surface-variant">sejak {tanggal(p.terdaftar)}</p>
            </td>
            <td className={`${TD} text-right tabular-nums`}>{angka(p.jumlahKlaim)}</td>
            <td className={`${TD} text-right tabular-nums`}>{angka(p.jumlahHadir)}</td>
            <td className={`${TD} text-right tabular-nums`}>
              {angka(p.jumlahCheckout)}
              {p.jumlahHadir > p.jumlahCheckout && (
                <p className="text-label-sm text-on-tertiary-container">{p.jumlahHadir - p.jumlahCheckout} belum</p>
              )}
            </td>
            <td className={`${TD} text-right font-medium tabular-nums text-on-surface`}>{p.totalOmset ? rupiah(p.totalOmset) : "–"}</td>
            <td className={`${TD} pr-lg text-on-surface-variant`}>{tanggal(p.terakhirHadir)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function TabelPetugas({ baris }: { baris: PetugasRow[] }) {
  return (
    <table className="w-full min-w-[820px] text-left">
      <thead className="bg-surface-container-low text-label-md text-on-surface-variant">
        <tr>
          <th className={`${TH} pl-lg`}>Petugas</th>
          <th className={TH}>Kontak</th>
          <th className={TH}>Akun</th>
          <th className={`${TH} text-right`}>Jumlah scan</th>
          <th className={`${TH} text-right`} title="Jumlah pedagang berbeda yang pernah di-scan petugas ini">Pedagang berbeda</th>
          <th className={`${TH} text-right`} title="Jumlah hari CFD di mana petugas ini melakukan scan">Hari bertugas</th>
          <th className={`${TH} pr-lg`}>Scan terakhir</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-outline-variant text-body-sm">
        {baris.map((p) => (
          <tr key={p.userId} className="hover:bg-surface-container-low/60">
            <td className={`${TD} pl-lg`}>
              <p className="flex items-center gap-xs text-body-md font-medium text-on-surface">
                <span
                  className={`h-2 w-2 rounded-full ${p.online ? "bg-secondary" : "bg-outline-variant"}`}
                  aria-label={p.online ? "Online" : "Offline"}
                  title={p.online ? "Online" : "Offline"}
                />
                {p.nama}
              </p>
              <p className="text-on-surface-variant">{p.online ? "Sedang online" : "Offline"}</p>
            </td>
            <td className={TD}>
              <p className="text-on-surface">{p.email}</p>
              <p className="text-on-surface-variant">{p.phone || "–"}</p>
            </td>
            <td className={TD}>
              <PillAkun status={p.statusAkun} />
              <p className="mt-1 text-label-sm text-on-surface-variant">sejak {tanggal(p.terdaftar)}</p>
            </td>
            <td className={`${TD} text-right font-medium tabular-nums text-on-surface`}>{angka(p.jumlahScan)}</td>
            <td className={`${TD} text-right tabular-nums`}>{angka(p.pedagangUnik)}</td>
            <td className={`${TD} text-right tabular-nums`}>{angka(p.jumlahSesi)}</td>
            <td className={`${TD} pr-lg text-on-surface-variant`}>
              {p.scanTerakhir ? `${tanggal(p.scanTerakhir)}, ${p.scanTerakhir.slice(11)} WIB` : "Belum pernah scan"}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function TabelKehadiran({ baris }: { baris: KehadiranRow[] }) {
  return (
    <table className="w-full min-w-[900px] text-left">
      <thead className="bg-surface-container-low text-label-md text-on-surface-variant">
        <tr>
          <th className={`${TH} pl-lg`}>Tanggal</th>
          <th className={TH}>Pedagang</th>
          <th className={TH}>Lokasi lapak</th>
          <th className={TH}>Check-in</th>
          <th className={TH}>Check-out</th>
          <th className={`${TH} text-right`}>Omset</th>
          <th className={`${TH} pr-lg`}>Dicatat oleh</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-outline-variant text-body-sm">
        {baris.map((k) => (
          <tr key={k.id} className="hover:bg-surface-container-low/60">
            <td className={`${TD} pl-lg whitespace-nowrap text-on-surface`}>{tanggal(k.tanggal)}</td>
            <td className={TD}>
              <p className="text-body-md font-medium text-on-surface">{k.namaUsaha}</p>
              <p className="text-on-surface-variant">
                {k.pemilik} · {LABEL_KATEGORI[k.kategori] ?? k.kategori}
              </p>
            </td>
            <td className={TD}>
              {k.namaJalan ? (
                <>
                  <p className="text-on-surface">{k.namaJalan}</p>
                  <p className="text-on-surface-variant">{k.nomorLapak}</p>
                </>
              ) : (
                <span className="text-on-surface-variant">Tanpa klaim lapak</span>
              )}
            </td>
            <td className={`${TD} tabular-nums`}>{k.checkIn}</td>
            <td className={`${TD} tabular-nums`}>
              {k.checkOut || <span className="text-on-tertiary-container">Belum check-out</span>}
            </td>
            <td className={`${TD} text-right font-medium tabular-nums text-on-surface`}>{k.omset != null ? rupiah(k.omset) : "–"}</td>
            <td className={`${TD} pr-lg text-on-surface-variant`}>{k.dicatatOleh || "–"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}