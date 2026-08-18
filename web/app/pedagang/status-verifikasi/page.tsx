"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Info,
  Lock,
  MessageCircleQuestion,
  ShieldCheck,
  FilePenLine,
  XCircle,
  ClipboardList,
} from "lucide-react";

type Status = "approved" | "pending" | "rejected";

type Pengajuan = {
  has_pengajuan: boolean;
  id?: string;
  nik?: string;
  nama_usaha?: string;
  jenis_dagangan?: string;
  alamat?: string;
  status?: Status;
  catatan?: string | null;
};

export default function StatusVerifikasiPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<Pengajuan | null>(null);

  useEffect(() => {
    async function load() {
      const token = localStorage.getItem("cfd_token");
      if (!token) {
        setError("Sesi login tidak ditemukan, silakan login ulang.");
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/pedagang/pengajuan`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const json = await res.json();

        if (!res.ok) {
          setError(json.error || "Gagal mengambil status pengajuan.");
          return;
        }
        setData(json);
      } catch {
        setError("Tidak bisa terhubung ke server. Coba lagi nanti.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="w-full py-md text-center text-body-md text-on-surface-variant">
        Memuat status pengajuan...
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto w-full max-w-2xl rounded-lg border border-error/30 bg-error-container/20 p-md text-center text-body-md text-error">
        {error}
      </div>
    );
  }

  if (!data?.has_pengajuan) {
    return <NotRegisteredCard />;
  }

  const status = data.status ?? "pending";

  return (
    // --- PERBAIKAN: flex-1 justify-center items-center ---
    <div className="flex w-full flex-1 flex-col justify-center items-center py-lg">
      <div className="mx-auto w-full max-w-3xl flex flex-col gap-md">
        {status === "approved" && <ApprovedCard />}
        {status === "pending" && <PendingCard />}
        {status === "rejected" && (
          <RejectedCard catatan={data.catatan ?? "Tidak ada catatan dari petugas."} />
        )}
      </div>
    </div>
  );
}

function NotRegisteredCard() {
  return (
    <section className="mx-auto w-full max-w-[36rem] py-md text-center">
      <ClipboardList
        className="mx-auto mb-md h-10 w-10 text-primary"
        strokeWidth={1.75}
      />

      <h2 className="mb-sm text-headline-md text-on-surface">
        Anda Belum Terdaftar
      </h2>

      <p className="mb-lg text-body-lg text-on-surface-variant">
        Daftarkan usaha Anda untuk mendapatkan slot berjualan di acara Car
        Free Day. Pengajuan akan ditinjau oleh tim petugas dan Anda bisa
        memantau statusnya langsung dari halaman ini.
      </p>

      <Link
        href="/pedagang/pendaftaran"
        className="inline-flex items-center gap-xs rounded-md bg-primary px-lg py-sm text-label-lg text-on-primary transition-colors hover:bg-primary-container"
      >
        Ajukan Sekarang
        <ArrowRight className="h-4 w-4" strokeWidth={2} />
      </Link>
    </section>
  );
}

function PendingCard() {
  return (
    <section className="mx-auto w-full max-w-[36rem] py-md text-center">
      <CalendarClock
        className="mx-auto mb-md h-10 w-10 text-tertiary"
        strokeWidth={1.75}
      />

      <span className="mb-sm inline-block text-label-md uppercase tracking-wide text-tertiary">
        Dalam Proses Verifikasi
      </span>

      <h2 className="mb-sm text-headline-md text-on-surface">
        Dokumen Sedang Ditinjau
      </h2>

      <p className="mb-lg text-body-lg text-on-surface-variant">
        Tim petugas CFD sedang memeriksa data dan dokumen usaha Anda. Proses
        ini biasanya memakan waktu 1–3 hari kerja dan Anda akan
        menerima notifikasi begitu statusnya diperbarui.
      </p>
    </section>
  );
}

function ApprovedCard() {
  return (
    <section className="mx-auto w-full max-w-[36rem] py-md text-center">
      <CheckCircle2
        className="mx-auto mb-md h-10 w-10 text-secondary"
        strokeWidth={1.75}
      />

      <span className="mb-sm inline-block text-label-md uppercase tracking-wide text-secondary">
        Terverifikasi
      </span>

      <h2 className="mb-sm text-headline-md text-on-surface">Selamat!</h2>

      <p className="mb-lg text-body-lg text-on-surface-variant">
        Akun usaha Anda telah berhasil disetujui. Anda sekarang resmi menjadi
        bagian dari jaringan mitra pedagang kami dan dapat melihat jadwal
        serta lokasi berjualan yang telah dialokasikan.
      </p>

      <Link
        href="/jadwal-lokasi"
        className="inline-flex items-center gap-xs rounded-md bg-primary px-lg py-sm text-label-lg text-on-primary transition-colors hover:bg-primary-container"
      >
        Lihat Jadwal &amp; Lokasi
        <ArrowRight className="h-4 w-4" strokeWidth={2} />
      </Link>

      <div className="mt-xl flex items-center justify-center gap-lg text-label-md text-on-surface-variant">
        <span className="flex items-center gap-xs">
          <ShieldCheck className="h-4 w-4" strokeWidth={2} />
          Data Tervalidasi
        </span>
        <span className="flex items-center gap-xs">
          <Lock className="h-4 w-4" strokeWidth={2} />
          Aman &amp; Terenkripsi
        </span>
      </div>
    </section>
  );
}

function RejectedCard({ catatan }: { catatan: string }) {
  return (
    <>
      <div className="w-full">
        <h2 className="text-headline-lg text-on-surface">
          Status Verifikasi
        </h2>
        <p className="mt-xs max-w-2xl text-body-md text-on-surface-variant">
          Informasi status terkini dari pendaftaran CFD Pedagang Anda. Mohon
          tinjau catatan verifikator jika terdapat kendala.
        </p>
      </div>

      <section className="grid w-full grid-cols-1 gap-lg rounded-lg border-l-4 border-l-error bg-surface-container-lowest p-lg">
        <div>
          <span className="mb-md inline-flex items-center gap-xs rounded-full bg-error-container px-md py-1 text-label-md text-on-error-container">
            <XCircle className="h-4 w-4" strokeWidth={2.5} />
            Pendaftaran Ditolak
          </span>

          <h3 className="mb-sm text-title-lg text-on-surface">
            Alasan Penolakan:
          </h3>
          <div className="mb-lg flex items-start gap-sm rounded-md bg-surface-container-low p-md">
            <Info className="h-5 w-5 shrink-0 text-primary" strokeWidth={2} />
            <p className="text-body-md text-on-surface-variant">
              {catatan}
            </p>
          </div>

          <div className="flex flex-wrap gap-sm">
            <Link
              href="/pedagang/pendaftaran"
              className="flex items-center gap-xs rounded-md bg-primary px-md py-sm text-label-md text-on-primary transition-colors hover:bg-primary-container"
            >
              <FilePenLine className="h-4 w-4" strokeWidth={2} />
              Perbaiki Data
            </Link>
            <button
              type="button"
              className="flex items-center gap-xs rounded-md border border-outline-variant px-md py-sm text-label-md text-primary transition-colors hover:bg-surface-container-low"
            >
              <MessageCircleQuestion className="h-4 w-4" strokeWidth={2} />
              Hubungi Bantuan
            </button>
          </div>
        </div>
      </section>
    </>
  );
}