import {
  CalendarCheck,
  Download,
  Eye,
  FileBadge2,
  FileText,
  HelpCircle,
  IdCard,
  MapPin,
} from "lucide-react";
import { AttendanceChart } from "@/components/attendance-chart";

const DOCUMENTS = [
  {
    name: "KTP Pedagang Utama",
    type: "PDF",
    size: "1.2 MB",
    date: "Diunggah 12 Mar 2023",
    icon: IdCard,
    action: "download" as const,
  },
  {
    name: "Surat Izin Tempat Usaha (SITU)",
    type: "PDF",
    size: "3.4 MB",
    date: "Diunggah 14 Mar 2023",
    icon: FileText,
    action: "download" as const,
  },
  {
    name: "Sertifikat Halal",
    type: "JPG",
    size: "2.1 MB",
    date: "Diunggah 20 Nov 2023",
    icon: FileBadge2,
    action: "view" as const,
    verified: true,
  },
];

export default function ProfilUsahaPage() {
  return (
    <div className="flex flex-col gap-lg">
      {/* Header + attendance */}
      <div className="grid grid-cols-1 gap-lg xl:grid-cols-[1fr_360px]">
        <section className="overflow-hidden rounded-lg border border-outline-variant bg-surface-container-lowest">
          <div
            className="relative flex h-[220px] flex-col justify-end bg-primary-container bg-cover bg-center p-lg"
            style={{
              backgroundImage:
                "linear-gradient(180deg, rgba(11,28,48,0.05) 0%, rgba(11,28,48,0.8) 100%)",
            }}
          >
            <div className="absolute right-lg top-lg flex gap-sm">
              <span className="rounded-full bg-secondary-container px-sm py-1 text-label-sm text-on-secondary-container">
                TERVERIFIKASI
              </span>
              <span className="rounded-full bg-tertiary-fixed px-sm py-1 text-label-sm text-on-tertiary-fixed-variant">
                AKTIF
              </span>
            </div>
            <h2 className="text-headline-md text-white">Kedai Kopi Senja</h2>
            <p className="mt-xs flex items-center gap-xs text-body-md text-white/85">
              <MapPin className="h-4 w-4" strokeWidth={2} />
              Kavling Z2-118
            </p>
          </div>

          <div className="grid grid-cols-1 divide-y divide-outline-variant sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            <div className="p-lg">
              <p className="text-label-sm text-on-surface-variant">
                ZONA AREA
              </p>
              <p className="mt-xs text-title-lg text-on-surface">
                Zona B Tengah
              </p>
            </div>
            <div className="p-lg">
              <p className="text-label-sm text-on-surface-variant">
                KATEGORI USAHA
              </p>
              <p className="mt-xs text-title-lg text-on-surface">
                Minuman &amp; Kopi
              </p>
            </div>
            <div className="p-lg">
              <p className="text-label-sm text-on-surface-variant">
                MULAI BERGABUNG
              </p>
              <p className="mt-xs text-title-lg text-on-surface">
                12 Mar 2023
              </p>
            </div>
          </div>
        </section>

        <div className="flex flex-col gap-lg">
          <section className="rounded-lg bg-primary p-lg text-on-primary">
            <div className="mb-md flex items-center justify-between">
              <h3 className="text-title-lg">Tingkat Kehadiran</h3>
              <CalendarCheck className="h-5 w-5" strokeWidth={2} />
            </div>
            <p className="text-display-lg leading-none">
              100<span className="text-title-lg align-top">%</span>
            </p>
            <p className="mt-sm text-body-md text-primary-fixed">
              Sempurna. Anda selalu hadir di area pada jadwal yang ditentukan
              bulan ini.
            </p>
            <div className="mt-lg h-1.5 w-full overflow-hidden rounded-full bg-white/20">
              <div className="h-full w-full rounded-full bg-secondary-fixed" />
            </div>
          </section>

          <section className="flex-1 rounded-lg border border-outline-variant bg-surface-container-lowest p-lg">
            <div className="mb-sm flex items-center gap-sm">
              <span className="flex h-9 w-9 items-center justify-center rounded-md bg-surface-container-low text-primary">
                <HelpCircle className="h-[18px] w-[18px]" strokeWidth={2} />
              </span>
              <h3 className="text-title-lg text-on-surface">
                Butuh Bantuan?
              </h3>
            </div>
            <p className="mb-md text-body-md text-on-surface-variant">
              Hubungi pengelola area.
            </p>
            <button
              type="button"
              className="w-full rounded-md border border-outline-variant py-sm text-label-md text-primary transition-colors hover:bg-surface-container-low"
            >
              Kirim Pesan
            </button>
          </section>
        </div>
      </div>

      {/* Attendance history + documents */}
      <div className="grid grid-cols-1 gap-lg xl:grid-cols-[1fr_1fr]">
        <section className="rounded-lg border border-outline-variant bg-surface-container-lowest p-lg">
          <h3 className="mb-lg text-title-lg text-on-surface">
            Riwayat Kehadiran (6 Bulan)
          </h3>
          <AttendanceChart />
        </section>

        <section className="rounded-lg border border-outline-variant bg-surface-container-lowest p-lg">
          <h3 className="mb-lg text-title-lg text-on-surface">
            Dokumen Izin Usaha
          </h3>
          <ul className="flex flex-col gap-sm">
            {DOCUMENTS.map((doc) => {
              const Icon = doc.icon;
              return (
                <li
                  key={doc.name}
                  className="flex items-center gap-sm rounded-md border border-outline-variant p-sm"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-surface-container-low text-primary">
                    <Icon className="h-5 w-5" strokeWidth={2} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-label-md text-on-surface">
                      {doc.name}
                      {doc.verified && (
                        <span className="ml-xs inline-block align-middle text-secondary">
                          ✓
                        </span>
                      )}
                    </p>
                    <p className="text-label-sm font-normal tracking-normal text-on-surface-variant">
                      {doc.type} · {doc.size} · {doc.date}
                    </p>
                  </div>
                  <button
                    type="button"
                    aria-label={
                      doc.action === "download" ? "Unduh dokumen" : "Lihat dokumen"
                    }
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-primary"
                  >
                    {doc.action === "download" ? (
                      <Download className="h-[18px] w-[18px]" strokeWidth={2} />
                    ) : (
                      <Eye className="h-[18px] w-[18px]" strokeWidth={2} />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </div>
  );
}
