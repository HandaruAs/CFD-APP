"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  Check,
  ChevronDown,
  Eye,
  EyeOff,
  HelpCircle,
  IdCard,
  Loader2,
  MessageCircle,
  Pencil,
  RefreshCw,
  ShoppingCart,
  Store,
  Table2,
  type LucideIcon,
} from "lucide-react";

// ============================================================
// Profil pedagang (versi sederhana).
// Satu kolom: kartu nama, kartu biodata, lalu "Butuh bantuan?".
// Pedagang bisa ubah biodata sendiri (kecuali NIK & email).
//
// Endpoint:
//   GET /api/me                  nama & email akun
//   GET /api/pedagang/pengajuan  data usaha & data diri
//   PUT /api/pedagang/profil     simpan biodata (JSON)   <- baru
// ============================================================

const API = process.env.NEXT_PUBLIC_API_URL ?? "";

// Isi dengan nomor WhatsApp pengelola CFD (format internasional tanpa "+",
// contoh "6281234567890") supaya muncul tombol "Kirim pesan ke petugas".
// Selama masih kosong, tombolnya tidak ditampilkan.
const NOMOR_WA_PETUGAS = "";

type Profil = {
  id: string;
  nik: string;
  nama_lengkap: string | null;
  tanggal_lahir: string | null;
  nama_usaha: string;
  jenis_dagangan: string;
  jenis_lapak: string | null;
  alamat: string | null;
};

type Data = { nama: string; email: string; profil: Profil | null };

type FormProfil = {
  nama_lengkap: string;
  tanggal_lahir: string;
  alamat: string;
  nama_usaha: string;
  jenis_dagangan: string;
  jenis_lapak: string;
};

async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem("cfd_token");
  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const res = await fetch(`${API}${path}`, { ...init, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error || `status ${res.status}`);
  return data as T;
}

const DAGANGAN = [
  { value: "makanan_minuman", label: "Makanan & Minuman" },
  { value: "bukan_makanan_minuman", label: "Bukan Makanan & Minuman" },
];
const LAPAK: { value: string; label: string; ikon: LucideIcon }[] = [
  { value: "meja", label: "Meja", ikon: Table2 },
  { value: "rombong", label: "Rombong", ikon: ShoppingCart },
];

const labelDagangan = (v: string | null) => DAGANGAN.find((d) => d.value === v)?.label ?? v ?? "";
const labelLapak = (v: string | null) => LAPAK.find((l) => l.value === v)?.label ?? v ?? "";

function formatTanggal(value: string | null | undefined) {
  if (!value) return "";
  const d = new Date(`${value.slice(0, 10)}T00:00:00`);
  return Number.isNaN(d.getTime())
    ? value
    : d.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}
// yyyy-mm-dd hari ini (waktu lokal), untuk batas input tanggal lahir
const hariIni = () => new Date().toLocaleDateString("en-CA");

function sensorNik(nik: string) {
  return nik.length <= 8 ? nik : `${nik.slice(0, 4)}${"•".repeat(nik.length - 8)}${nik.slice(-4)}`;
}
function inisial(nama: string) {
  const b = nama.trim().split(/\s+/).filter(Boolean);
  return b.length ? (b[0][0] + (b.length > 1 ? b[b.length - 1][0] : "")).toUpperCase() : "?";
}
// ============================================================
// PAGE
// ============================================================

export default function ProfilPage() {
  const [data, setData] = useState<Data | null>(null);
  const [gagal, setGagal] = useState(false);
  const [modeUbah, setModeUbah] = useState(false);
  const [notif, setNotif] = useState<string | null>(null);

  const muat = useCallback(async () => {
    setGagal(false);
    const [me, profil] = await Promise.allSettled([
      api<{ user: { name: string; email: string } }>("/api/me"),
      api<Profil & { has_pengajuan: boolean }>("/api/pedagang/pengajuan"),
    ]);
    if (me.status === "rejected" && profil.status === "rejected") {
      setGagal(true);
      return;
    }
    setData({
      nama: me.status === "fulfilled" ? me.value.user?.name ?? "" : "",
      email: me.status === "fulfilled" ? me.value.user?.email ?? "" : "",
      profil: profil.status === "fulfilled" && profil.value.has_pengajuan ? profil.value : null,
    });
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    muat();
  }, [muat]);

  useEffect(() => {
    if (!notif) return;
    const t = setTimeout(() => setNotif(null), 3000);
    return () => clearTimeout(t);
  }, [notif]);

  if (gagal) {
    return (
      <Pesan ikon={AlertCircle} judul="Profil tidak bisa dimuat" isi="Periksa koneksi internet kamu, lalu coba lagi.">
        <button type="button" onClick={muat} className="pt-btn pt-btn-primary">
          <RefreshCw className="h-4 w-4" />
          Coba lagi
        </button>
      </Pesan>
    );
  }
  if (!data) return <Kerangka />;
  if (!data.profil) {
    return (
      <Pesan ikon={Store} judul="Data usaha belum diisi" isi="Isi data usaha kamu dulu supaya bisa klaim lapak dan berjualan di CFD.">
        <Link href="/pedagang/pendaftaran" className="pt-btn pt-btn-primary">
          <IdCard className="h-4 w-4" />
          Isi data usaha
        </Link>
      </Pesan>
    );
  }

  const profil = data.profil;
  const perbaruiProfil = (ubah: Partial<Profil>) =>
    setData((d) => (d && d.profil ? { ...d, profil: { ...d.profil, ...ubah } } : d));

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-lg pb-xl">
      <KartuNama profil={profil} namaAkun={data.nama} />

      {modeUbah ? (
        <FormBiodata
          profil={profil}
          namaAkun={data.nama}
          onBatal={() => setModeUbah(false)}
          onTersimpan={(ubah) => {
            perbaruiProfil(ubah);
            setModeUbah(false);
            setNotif("Biodata tersimpan");
          }}
        />
      ) : (
        <LihatBiodata profil={profil} namaAkun={data.nama} email={data.email} onUbah={() => setModeUbah(true)} />
      )}

      <Bantuan profil={profil} namaAkun={data.nama} />

      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-lg z-50 flex justify-center px-md">
        {notif && (
          <p className="inline-flex items-center gap-sm rounded-full bg-inverse-surface px-lg py-sm text-body-md text-inverse-on-surface shadow-lg">
            <Check className="h-4 w-4" strokeWidth={3} />
            {notif}
          </p>
        )}
      </div>
    </div>
  );
}

// ============================================================
// KARTU NAMA
// ============================================================

function KartuNama({ profil, namaAkun }: { profil: Profil; namaAkun: string }) {
  const nama = profil.nama_lengkap || namaAkun;
  return (
    <section className="flex flex-col items-center gap-md rounded-2xl border border-outline-variant bg-surface-container-lowest p-lg text-center sm:flex-row sm:text-left">
      <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-primary font-display text-headline-md font-bold text-on-primary">
        {inisial(nama)}
      </span>
      <div className="min-w-0">
        <h1 className="font-display text-headline-md font-bold text-on-surface">{nama}</h1>
        <p className="mt-xs inline-flex items-center gap-xs text-body-lg text-on-surface-variant">
          <Store className="h-4 w-4 shrink-0" />
          {profil.nama_usaha}
        </p>
      </div>
    </section>
  );
}

// ============================================================
// LIHAT BIODATA
// ============================================================

function LihatBiodata({
  profil,
  namaAkun,
  email,
  onUbah,
}: {
  profil: Profil;
  namaAkun: string;
  email: string;
  onUbah: () => void;
}) {
  const [tampilNik, setTampilNik] = useState(false);

  return (
    <section className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-lg">
      <div className="mb-md flex flex-wrap items-center justify-between gap-md">
        <h2 className="text-title-lg text-on-surface">Biodata</h2>
        <button type="button" onClick={onUbah} className="pt-btn pt-btn-primary min-h-[44px]">
          <Pencil className="h-4 w-4" />
          Ubah biodata
        </button>
      </div>

      <SubJudul>Data diri</SubJudul>
      <dl className="mb-lg flex flex-col divide-y divide-outline-variant">
        <Baris label="Nama lengkap" nilai={profil.nama_lengkap || namaAkun} />
        <Baris
          label="NIK"
          nilai={
            <span className="inline-flex items-center gap-sm">
              <span className="tabular-nums tracking-wide">{tampilNik ? profil.nik : sensorNik(profil.nik)}</span>
              <button
                type="button"
                onClick={() => setTampilNik((v) => !v)}
                aria-label={tampilNik ? "Sembunyikan NIK" : "Tampilkan NIK"}
                className="flex h-9 w-9 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface"
              >
                {tampilNik ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </span>
          }
        />
        <Baris label="Email" nilai={email} />
        <Baris label="Tanggal lahir" nilai={formatTanggal(profil.tanggal_lahir)} />
        <Baris label="Alamat" nilai={profil.alamat ?? ""} />
      </dl>

      <SubJudul>Data usaha</SubJudul>
      <dl className="flex flex-col divide-y divide-outline-variant">
        <Baris label="Nama usaha" nilai={profil.nama_usaha} />
        <Baris label="Kategori" nilai={labelDagangan(profil.jenis_dagangan)} />
        <Baris label="Jenis lapak" nilai={labelLapak(profil.jenis_lapak)} />
      </dl>
    </section>
  );
}

function SubJudul({ children }: { children: React.ReactNode }) {
  return <h3 className="mb-xs text-label-lg font-semibold text-primary">{children}</h3>;
}

function Baris({ label, nilai }: { label: string; nilai: React.ReactNode }) {
  const kosong = nilai === "" || nilai === null || nilai === undefined;
  return (
    <div className="grid grid-cols-1 gap-1 py-sm sm:grid-cols-[150px_1fr] sm:gap-md">
      <dt className="text-body-sm text-on-surface-variant">{label}</dt>
      <dd className="break-words text-body-lg text-on-surface">
        {kosong ? <span className="text-on-surface-variant/60">Belum diisi</span> : nilai}
      </dd>
    </div>
  );
}

// ============================================================
// FORM UBAH BIODATA
// ============================================================

function FormBiodata({
  profil,
  namaAkun,
  onBatal,
  onTersimpan,
}: {
  profil: Profil;
  namaAkun: string;
  onBatal: () => void;
  onTersimpan: (ubah: Partial<Profil>) => void;
}) {
  const [form, setForm] = useState<FormProfil>({
    nama_lengkap: profil.nama_lengkap ?? namaAkun,
    tanggal_lahir: profil.tanggal_lahir?.slice(0, 10) ?? "",
    alamat: profil.alamat ?? "",
    nama_usaha: profil.nama_usaha,
    jenis_dagangan: profil.jenis_dagangan,
    jenis_lapak: profil.jenis_lapak ?? "",
  });
  const [salah, setSalah] = useState<Partial<Record<keyof FormProfil, string>>>({});
  const [menyimpan, setMenyimpan] = useState(false);
  const [errorSimpan, setErrorSimpan] = useState<string | null>(null);

  const ubah = (k: keyof FormProfil, v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    setSalah((s) => ({ ...s, [k]: undefined }));
  };

  function cek() {
    const s: Partial<Record<keyof FormProfil, string>> = {};
    if (!form.nama_lengkap.trim()) s.nama_lengkap = "Nama lengkap wajib diisi.";
    if (!form.nama_usaha.trim()) s.nama_usaha = "Nama usaha wajib diisi.";
    if (form.tanggal_lahir && (form.tanggal_lahir > hariIni() || form.tanggal_lahir < "1900-01-01"))
      s.tanggal_lahir = "Tanggal lahir tidak valid. Periksa lagi tahunnya.";
    setSalah(s);
    return Object.keys(s).length === 0;
  }

  async function simpan(e: React.FormEvent) {
    e.preventDefault();
    setErrorSimpan(null);
    if (!cek()) return;
    setMenyimpan(true);
    const isi = {
      nama_lengkap: form.nama_lengkap.trim(),
      tanggal_lahir: form.tanggal_lahir || null,
      alamat: form.alamat.trim() || null,
      nama_usaha: form.nama_usaha.trim(),
      jenis_dagangan: form.jenis_dagangan,
      jenis_lapak: form.jenis_lapak || null,
    };
    try {
      await api("/api/pedagang/profil", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isi),
      });
      onTersimpan(isi);
    } catch (err) {
      setErrorSimpan(err instanceof Error ? err.message : "Biodata gagal disimpan. Coba lagi.");
    } finally {
      setMenyimpan(false);
    }
  }

  return (
    <form onSubmit={simpan} noValidate className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-lg">
      <h2 className="text-title-lg text-on-surface">Ubah biodata</h2>
      <p className="mb-lg mt-xs text-body-sm text-on-surface-variant">
        NIK dan email tidak bisa diubah di sini. Kalau salah, hubungi petugas CFD.
      </p>

      <SubJudul>Data diri</SubJudul>
      <div className="mb-lg flex flex-col gap-md">
        <Isian label="Nama lengkap" error={salah.nama_lengkap}>
          {(id) => (
            <input id={id} value={form.nama_lengkap} onChange={(e) => ubah("nama_lengkap", e.target.value)} autoComplete="name" className={kelasInput(salah.nama_lengkap)} />
          )}
        </Isian>
        <Isian label="Tanggal lahir" error={salah.tanggal_lahir}>
          {(id) => (
            <input id={id} type="date" max={hariIni()} value={form.tanggal_lahir} onChange={(e) => ubah("tanggal_lahir", e.target.value)} className={kelasInput(salah.tanggal_lahir)} />
          )}
        </Isian>
        <Isian label="Alamat">
          {(id) => (
            <textarea id={id} rows={3} value={form.alamat} onChange={(e) => ubah("alamat", e.target.value)} autoComplete="street-address" placeholder="Contoh: Jl. Darmo No. 12, Wonokromo" className={`${kelasInput()} py-sm`} />
          )}
        </Isian>
      </div>

      <SubJudul>Data usaha</SubJudul>
      <div className="flex flex-col gap-md">
        <Isian label="Nama usaha" error={salah.nama_usaha}>
          {(id) => (
            <input id={id} value={form.nama_usaha} onChange={(e) => ubah("nama_usaha", e.target.value)} className={kelasInput(salah.nama_usaha)} />
          )}
        </Isian>
        <Pilihan
          label="Kategori"
          opsi={DAGANGAN}
          nilai={form.jenis_dagangan}
          onPilih={(v) => ubah("jenis_dagangan", v)}
        />
        <Pilihan label="Jenis lapak" opsi={LAPAK} nilai={form.jenis_lapak} onPilih={(v) => ubah("jenis_lapak", v)} />
      </div>

      {errorSimpan && (
        <p role="alert" className="mt-lg flex items-start gap-sm rounded-xl bg-error-container px-md py-sm text-body-md text-on-error-container">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {errorSimpan}
        </p>
      )}

      <div className="mt-lg flex flex-col-reverse gap-sm sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onBatal}
          disabled={menyimpan}
          className="flex min-h-[48px] items-center justify-center rounded-xl border border-outline-variant px-lg text-label-lg font-semibold text-on-surface transition-colors hover:bg-surface-container-low disabled:opacity-60"
        >
          Batal
        </button>
        <button type="submit" disabled={menyimpan} className="pt-btn pt-btn-primary min-h-[48px] justify-center px-lg">
          {menyimpan ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          {menyimpan ? "Menyimpan..." : "Simpan biodata"}
        </button>
      </div>
    </form>
  );
}

function kelasInput(error?: string) {
  return `min-h-[48px] w-full rounded-xl border bg-surface-container-lowest px-md text-body-lg text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:ring-2 ${
    error ? "border-error focus:ring-error/25" : "border-outline-variant focus:border-primary focus:ring-primary/20"
  }`;
}

function Isian({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: (id: string) => React.ReactNode;
}) {
  const id = `isian-${label.toLowerCase().replace(/\s+/g, "-")}`;
  return (
    <div className="flex flex-col gap-xs">
      <label htmlFor={id} className="text-body-md font-medium text-on-surface">
        {label}
      </label>
      {children(id)}
      {error && <p className="text-body-sm text-error">{error}</p>}
    </div>
  );
}

// Dua pilihan besar (lebih gampang ditekan daripada dropdown)
function Pilihan({
  label,
  opsi,
  nilai,
  onPilih,
}: {
  label: string;
  opsi: { value: string; label: string; ikon?: LucideIcon }[];
  nilai: string;
  onPilih: (v: string) => void;
}) {
  return (
    <fieldset className="flex flex-col gap-xs">
      <legend className="mb-xs text-body-md font-medium text-on-surface">{label}</legend>
      <div className="grid grid-cols-1 gap-sm sm:grid-cols-2" role="radiogroup">
        {opsi.map((o) => {
          const dipilih = nilai === o.value;
          const Ikon = o.ikon;
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={dipilih}
              onClick={() => onPilih(o.value)}
              className={`flex min-h-[52px] items-center gap-sm rounded-xl border-2 px-md text-left text-body-lg transition-colors ${
                dipilih
                  ? "border-primary bg-primary-fixed text-on-primary-fixed"
                  : "border-outline-variant text-on-surface hover:bg-surface-container-low"
              }`}
            >
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                  dipilih ? "border-primary bg-primary text-on-primary" : "border-outline"
                }`}
              >
                {dipilih && <Check className="h-3 w-3" strokeWidth={4} />}
              </span>
              {Ikon && <Ikon className="h-5 w-5 shrink-0" />}
              {o.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

// ============================================================
// BUTUH BANTUAN?
// ============================================================

const BANTUAN = [
  {
    tanya: "Kenapa saya tidak bisa check-in?",
    jawab:
      "Biasanya karena omset CFD sebelumnya belum diisi. Buka menu Check in / Check Out, isi omset yang tertunda, lalu minta petugas scan QR lagi.",
  },
  {
    tanya: "Lapak belum tersedia saat saya klaim",
    jawab:
      "Petugas belum menyiapkan lokasi lapak untuk hari ini, atau semua lapak sudah terisi. Coba klaim lagi beberapa saat kemudian.",
  },
  {
    tanya: "Di mana QR check-in saya?",
    jawab: "QR ada di menu Check in / Check Out. Tunjukkan ke petugas saat kamu tiba di lapak.",
  },
  {
    tanya: "Data diri atau data usaha saya salah",
    jawab:
      "Tekan tombol \"Ubah biodata\" di atas untuk memperbaikinya sendiri. Khusus NIK dan email, hubungi petugas CFD.",
  },
];

function Bantuan({ profil, namaAkun }: { profil: Profil; namaAkun: string }) {
  const [terbuka, setTerbuka] = useState<number | null>(null);
  const pesanWa = encodeURIComponent(
    `Halo petugas CFD, saya ${profil.nama_lengkap || namaAkun} dari usaha "${profil.nama_usaha}". Saya butuh bantuan: `
  );

  return (
    <section className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-lg">
      <div className="mb-xs flex items-center gap-sm">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-fixed text-on-primary-fixed">
          <HelpCircle className="h-[18px] w-[18px]" />
        </span>
        <h2 className="text-title-lg text-on-surface">Butuh bantuan?</h2>
      </div>
      <p className="mb-md text-body-md text-on-surface-variant">
        Pilih pertanyaan di bawah. Kalau masalahnya belum selesai, laporkan ke petugas CFD.
      </p>

      <ul className="flex flex-col gap-xs">
        {BANTUAN.map((b, i) => {
          const buka = terbuka === i;
          return (
            <li key={b.tanya} className="overflow-hidden rounded-xl bg-surface-container-low">
              <button
                type="button"
                onClick={() => setTerbuka(buka ? null : i)}
                aria-expanded={buka}
                className="flex min-h-[48px] w-full items-center justify-between gap-sm px-md py-sm text-left text-body-lg text-on-surface"
              >
                {b.tanya}
                <ChevronDown className={`h-5 w-5 shrink-0 text-on-surface-variant transition-transform ${buka ? "rotate-180" : ""}`} />
              </button>
              {buka && <p className="px-md pb-md text-body-md text-on-surface-variant">{b.jawab}</p>}
            </li>
          );
        })}
      </ul>

      {NOMOR_WA_PETUGAS ? (
        <a
          href={`https://wa.me/${NOMOR_WA_PETUGAS}?text=${pesanWa}`}
          target="_blank"
          rel="noreferrer"
          className="mt-md flex min-h-[48px] w-full items-center justify-center gap-sm rounded-xl border border-outline-variant text-label-lg font-semibold text-primary transition-colors hover:bg-surface-container-low"
        >
          <MessageCircle className="h-4 w-4" />
          Kirim pesan ke petugas
        </a>
      ) : (
        <p className="mt-md rounded-xl bg-surface-container-low px-md py-sm text-body-md text-on-surface-variant">
          Masih bingung? Datangi pos petugas di lokasi CFD.
        </p>
      )}
    </section>
  );
}

// ============================================================
// LOADING & PESAN
// ============================================================

function Kerangka() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-lg" aria-busy="true">
      <div className="h-[130px] animate-pulse rounded-2xl bg-surface-container-high" />
      <div className="h-[420px] animate-pulse rounded-2xl bg-surface-container-high" />
      <div className="flex items-center justify-center gap-sm text-on-surface-variant">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-body-sm">Memuat profil...</span>
      </div>
    </div>
  );
}

function Pesan({ ikon: Ikon, judul, isi, children }: { ikon: LucideIcon; judul: string; isi: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-md rounded-2xl border border-outline-variant bg-surface-container-lowest p-xl text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-fixed text-on-primary-fixed">
        <Ikon className="h-7 w-7" />
      </span>
      <h2 className="text-headline-md text-on-surface">{judul}</h2>
      <p className="text-body-md text-on-surface-variant">{isi}</p>
      {children}
    </div>
  );
}