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
      <div className="flex justify-center py-3xl text-body-md text-on-surface-variant">
        Memuat status pengajuan...
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-2xl rounded-lg border border-error/30 bg-error-container/20 p-lg text-center text-body-md text-error">
        {error}
      </div>
    );
  }

  if (!data?.has_pengajuan) {
    return (
      <div className="mx-auto max-w-2xl rounded-lg border border-outline-variant bg-surface-container-lowest p-3xl text-center">
        <p className="mb-md text-body-lg text-on-surface-variant">
          Kamu belum mengajukan pendaftaran usaha.
        </p>
        <Link
          href="/pedagang/pendaftaran"
          className="inline-flex items-center gap-xs rounded-md bg-primary px-md py-sm text-label-md text-on-primary hover:bg-primary-container"
        >
          Ajukan Sekarang
          <ArrowRight className="h-4 w-4" strokeWidth={2} />
        </Link>
      </div>
    );
  }

  const status = data.status ?? "pending";

  return (
    <div className="flex flex-col gap-lg">
      {status === "approved" && <ApprovedCard />}
      {status === "pending" && <PendingCard />}
      {status === "rejected" && (
        <RejectedCard catatan={data.catatan ?? "Tidak ada catatan dari petugas."} />
      )}
    </div>
  );
}

function ApprovedCard() {
  return (
    <>
      <section
        className="mx-auto w-full max-w-2xl rounded-lg p-3xl text-center"
        style={{
          backgroundImage:
            "linear-gradient(135deg, var(--color-secondary-container) 0%, var(--color-surface-container-low) 100%)",
        }}
      >
        <span className="mx-auto mb-lg flex h-20 w-20 items-center justify-center rounded-lg bg-secondary text-on-secondary shadow-sm">
          <CheckCircle2 className="h-9 w-9" strokeWidth={2} />
        </span>

        <span className="mb-md inline-block rounded-full bg-secondary-container px-md py-1 text-label-sm text-on-secondary-container">
          STATUS: TERVERIFIKASI
        </span>

        <h2 className="mb-sm text-headline-lg text-on-surface">Selamat!</h2>
        <p className="mx-auto mb-lg max-w-md text-body-lg text-on-surface-variant">
          Akun usaha Anda telah berhasil disetujui. Anda sekarang resmi
          menjadi bagian dari jaringan mitra pedagang kami.
        </p>

        <div className="rounded-lg bg-surface-container-lowest p-lg text-left">
          <div className="flex items-start gap-md">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-surface-container-low text-primary">
              <CalendarClock className="h-5 w-5" strokeWidth={2} />
            </span>
            <div className="flex-1">
              <h3 className="text-title-lg text-on-surface">
                Langkah Selanjutnya
              </h3>
              <p className="mt-xs text-body-md text-on-surface-variant">
                Anda sekarang dapat melihat jadwal dan lokasi berjualan yang
                telah dialokasikan untuk usaha Anda.
              </p>
              <Link
                href="/jadwal-lokasi"
                className="mt-md inline-flex items-center gap-xs rounded-md bg-primary px-md py-sm text-label-md text-on-primary transition-colors hover:bg-primary-container"
              >
                Lihat Jadwal &amp; Lokasi
                <ArrowRight className="h-4 w-4" strokeWidth={2} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <div className="flex items-center justify-center gap-lg text-label-md text-on-surface-variant">
        <span className="flex items-center gap-xs">
          <ShieldCheck className="h-4 w-4" strokeWidth={2} />
          Data Tervalidasi
        </span>
        <span className="flex items-center gap-xs">
          <Lock className="h-4 w-4" strokeWidth={2} />
          Aman &amp; Terenkripsi
        </span>
      </div>
    </>
  );
}

function PendingCard() {
  return (
    <section className="mx-auto w-full max-w-2xl rounded-lg border border-outline-variant bg-surface-container-lowest p-3xl text-center">
      <span className="mx-auto mb-lg flex h-20 w-20 items-center justify-center rounded-lg bg-tertiary-fixed text-on-tertiary-fixed-variant">
        <CalendarClock className="h-9 w-9" strokeWidth={2} />
      </span>

      <span className="mb-md inline-block rounded-full bg-tertiary-container/15 px-md py-1 text-label-sm text-on-tertiary-container">
        STATUS: DALAM PROSES VERIFIKASI
      </span>

      <h2 className="mb-sm text-headline-lg text-on-surface">
        Dokumen Sedang Ditinjau
      </h2>
      <p className="mx-auto mb-lg max-w-md text-body-lg text-on-surface-variant">
        Tim petugas CFD sedang memeriksa data dan dokumen usaha Anda. Proses
        ini biasanya memakan waktu 1&ndash;3 hari kerja.
      </p>

      <div className="flex items-center justify-center gap-sm rounded-md bg-surface-container-low p-md text-left">
        <Info className="h-5 w-5 shrink-0 text-primary" strokeWidth={2} />
        <p className="text-body-md text-on-surface-variant">
          Anda akan menerima notifikasi begitu status verifikasi diperbarui.
        </p>
      </div>
    </section>
  );
}

function RejectedCard({ catatan }: { catatan: string }) {
  return (
    <>
      <div>
        <h2 className="text-headline-lg text-on-surface">
          Status Verifikasi
        </h2>
        <p className="mt-xs max-w-2xl text-body-md text-on-surface-variant">
          Informasi status terkini dari pendaftaran CFD Pedagang Anda. Mohon
          tinjau catatan verifikator jika terdapat kendala.
        </p>
      </div>

      <section className="grid grid-cols-1 gap-lg rounded-lg border-l-4 border-l-error bg-surface-container-lowest p-lg">
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
            <p className="text-body-md text-on-surface-variant">{catatan}</p>
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