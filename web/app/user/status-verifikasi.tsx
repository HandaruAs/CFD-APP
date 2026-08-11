import Link from "next/link";
import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  CircleDot,
  FilePenLine,
  Info,
  Lock,
  MessageCircleQuestion,
  ShieldCheck,
  XCircle,
} from "lucide-react";

type Status = "approved" | "pending" | "rejected";

const HISTORY = [
  { label: "Ditolak", time: "Hari ini, 14:30 WIB", status: "rejected" as Status },
  {
    label: "Dalam Proses Verifikasi",
    time: "Kemarin, 09:15 WIB",
    status: "pending" as Status,
  },
  { label: "Dokumen Dikirim", time: "Kemarin, 09:10 WIB", status: "pending" as Status },
];

const HISTORY_DOT: Record<Status, string> = {
  approved: "bg-secondary",
  pending: "bg-outline",
  rejected: "bg-error",
};

const HISTORY_TEXT: Record<Status, string> = {
  approved: "text-secondary",
  pending: "text-on-surface-variant",
  rejected: "text-error",
};

export default async function StatusVerifikasiPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const raw = Array.isArray(params.status) ? params.status[0] : params.status;
  const status: Status =
    raw === "rejected" ? "rejected" : raw === "pending" ? "pending" : "approved";

  return (
    <div className="flex flex-col gap-lg">
      {status === "approved" && <ApprovedCard />}
      {status === "pending" && <PendingCard />}
      {status === "rejected" && <RejectedCard />}

      {/* Demo switcher — hanya untuk kebutuhan preview tampilan */}
      <div className="mt-md flex items-center gap-sm rounded-md border border-dashed border-outline-variant px-md py-sm text-label-sm font-normal tracking-normal text-on-surface-variant">
        Pratinjau status:
        <StatusLink status="approved" active={status === "approved"} />
        <StatusLink status="pending" active={status === "pending"} />
        <StatusLink status="rejected" active={status === "rejected"} />
      </div>
    </div>
  );
}

function StatusLink({ status, active }: { status: Status; active: boolean }) {
  const labels: Record<Status, string> = {
    approved: "Diterima",
    pending: "Menunggu",
    rejected: "Ditolak",
  };
  return (
    <Link
      href={`/user/status-verifikasi?status=${status}`}
      className={`rounded-full px-sm py-1 transition-colors ${
        active
          ? "bg-primary text-on-primary"
          : "border border-outline-variant hover:bg-surface-container-low"
      }`}
    >
      {labels[status]}
    </Link>
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

function RejectedCard() {
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

      <section className="grid grid-cols-1 gap-lg rounded-lg border-l-4 border-l-error bg-surface-container-lowest p-lg lg:grid-cols-[1fr_320px]">
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
              Dokumen Izin Usaha tidak terbaca atau tidak valid. Resolusi
              gambar terlalu rendah dan nomor seri tidak dapat diverifikasi
              oleh sistem.
            </p>
          </div>

          <div className="flex flex-wrap gap-sm">
            <button
              type="button"
              className="flex items-center gap-xs rounded-md bg-primary px-md py-sm text-label-md text-on-primary transition-colors hover:bg-primary-container"
            >
              <FilePenLine className="h-4 w-4" strokeWidth={2} />
              Perbaiki Data
            </button>
            <button
              type="button"
              className="flex items-center gap-xs rounded-md border border-outline-variant px-md py-sm text-label-md text-primary transition-colors hover:bg-surface-container-low"
            >
              <MessageCircleQuestion className="h-4 w-4" strokeWidth={2} />
              Hubungi Bantuan
            </button>
          </div>
        </div>

        <div className="rounded-md bg-surface-container-low p-md">
          <p className="mb-md text-label-sm text-on-surface-variant">
            HISTORI STATUS
          </p>
          <ol className="flex flex-col gap-md border-l-2 border-outline-variant pl-md">
            {HISTORY.map((h) => (
              <li key={h.label} className="relative">
                <span
                  className={`absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full ${HISTORY_DOT[h.status]}`}
                />
                <p className={`text-label-md font-semibold ${HISTORY_TEXT[h.status]}`}>
                  {h.label}
                </p>
                <p className="text-label-sm font-normal tracking-normal text-on-surface-variant">
                  {h.time}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-lg sm:grid-cols-2">
        <DocumentPreview title="KTP Pedagang" valid />
        <DocumentPreview title="Izin Usaha (NIB)" valid={false} />
      </div>
    </>
  );
}

function DocumentPreview({ title, valid }: { title: string; valid: boolean }) {
  return (
    <div className="overflow-hidden rounded-lg border border-outline-variant bg-surface-container-lowest">
      <div className="flex items-center justify-between p-md">
        <p className="text-label-md text-on-surface">{title}</p>
        <span
          className={`inline-flex items-center gap-xs rounded-full px-sm py-1 text-label-sm ${
            valid
              ? "bg-secondary-container/40 text-on-secondary-container"
              : "bg-error-container/60 text-on-error-container"
          }`}
        >
          <CircleDot className="h-3 w-3" strokeWidth={3} />
          {valid ? "Valid" : "Invalid"}
        </span>
      </div>
      <div className="flex h-40 items-center justify-center bg-surface-container-low text-on-surface-variant">
        <span className="text-label-sm font-normal tracking-normal">
          Pratinjau dokumen
        </span>
      </div>
    </div>
  );
}
