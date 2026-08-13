"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  CalendarX2,
  Hourglass,
  IdCard,
  Calendar,
  Navigation,
  Zap,
  Droplets,
  Trash2,
  Download,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

// Leaflet manggil `window` di dalamnya -- kalau di-import biasa, Next.js
// bakal coba render dia di server (SSR) dan langsung error karena
// `window` gak ada di server. dynamic(..., { ssr: false }) maksa
// komponen ini CUMA dirender di browser.
const LokasiMap = dynamic(
  () => import("@/components/lokasi-map").then((mod) => mod.LokasiMap),
  {
    ssr: false,
    loading: () => (
      <div className="h-full w-full animate-pulse bg-surface-container-high" />
    ),
  }
);

type Me = {
  name: string;
  role: string;
  pedagang_stage?: "unverified" | "verified";
};

// TODO: ganti dengan data asli dari endpoint jadwal/penempatan backend
// begitu sudah tersedia -- ini masih data contoh biar tampilannya bisa
// dites duluan dari sisi frontend.
const JADWAL_AKTIF = {
  tanggal: "Minggu, 12 Nov 2023",
  jamMulai: "05:30",
  jamSelesai: "11:00",
  kavling: "Kavling Z2-118",
  zona: "Zona B - Kuliner",
  lat: -7.2653,
  lng: 112.7413,
  qrValue: "CFD-CHECKIN:kavling-z2-118",
};

const PANDUAN = [
  {
    title: "Waktu Kedatangan",
    desc: "04:30 - 05:30 WIB (kendaraan bongkar muat setelah pukul 05:45 tidak diizinkan masuk).",
  },
  {
    title: "Area Serah Terima",
    desc: "Gunakan Gate Timur untuk drop-off barang. Maksimal 15 menit.",
  },
  {
    title: "Penataan Stand",
    desc: "Stand harus selesai ditata sebelum pukul 06:00.",
  },
];

export default function JadwalLokasiPage() {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("cfd_token");
    if (!token) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoading(false);
      return;
    }
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then(setMe)
      .catch(() => setMe(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex h-full min-h-[70vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary-container border-t-primary" />
      </div>
    );
  }

  if (me?.pedagang_stage !== "verified") {
    return <BelumTersedia />;
  }

  return <JadwalAktif />;
}

function BelumTersedia() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center text-center">
      <div className="relative mb-lg">
        <span className="flex h-28 w-28 items-center justify-center rounded-xl bg-surface-container-high text-on-surface-variant">
          <CalendarX2 className="h-11 w-11" strokeWidth={1.75} />
        </span>
        <span className="absolute -bottom-2 -right-2 flex h-9 w-9 items-center justify-center rounded-md bg-surface-container-lowest text-tertiary shadow-sm">
          <Hourglass className="h-[18px] w-[18px]" strokeWidth={2} />
        </span>
      </div>

      <h2 className="mb-sm text-headline-lg text-on-surface">
        Jadwal Belum Tersedia
      </h2>
      <p className="mb-lg max-w-md text-body-lg text-on-surface-variant">
        Selesaikan pendaftaran dan tunggu verifikasi akun Anda disetujui
        untuk dapat melihat lokasi dan jadwal berjualan Anda di CFD.
      </p>

      <Link
        href="/pedagang/status-verifikasi"
        className="flex items-center gap-sm rounded-md bg-primary px-lg py-sm text-label-md text-on-primary transition-colors hover:bg-primary-container"
      >
        <IdCard className="h-[18px] w-[18px]" strokeWidth={2} />
        Cek Status Verifikasi
      </Link>
    </div>
  );
}

function JadwalAktif() {
  return (
    <div className="flex flex-col gap-lg">
      <span className="inline-flex w-fit items-center gap-xs rounded-full bg-secondary-container px-sm py-1 text-label-sm text-on-secondary-container">
        Status Pendaftaran Diterima
      </span>

      <div>
        <h2 className="text-headline-lg text-on-surface">
          Jadwal &amp; Penempatan Anda
        </h2>
        <p className="mt-xs max-w-2xl text-body-md text-on-surface-variant">
          Selamat, aplikasi Anda untuk berdagang pada Car Free Day minggu ini
          telah disetujui. Berikut adalah lokasi dan jadwal operasional yang
          telah ditugaskan untuk Anda.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-lg xl:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-lg">
          <section className="flex items-center gap-md rounded-lg border border-outline-variant bg-surface-container-lowest p-lg">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary-fixed text-on-primary-fixed">
              <Calendar className="h-6 w-6" strokeWidth={2} />
            </span>
            <div>
              <p className="text-label-sm uppercase tracking-wide text-on-surface-variant">
                Jadwal Aktif
              </p>
              <p className="text-title-lg text-on-surface">
                {JADWAL_AKTIF.tanggal}
              </p>
              <p className="text-label-md text-on-surface-variant">
                {JADWAL_AKTIF.jamMulai} - {JADWAL_AKTIF.jamSelesai} WIB
              </p>
            </div>
          </section>

          <section className="overflow-hidden rounded-lg border border-outline-variant bg-surface-container-lowest">
            <div className="flex items-center justify-between p-lg pb-md">
              <div>
                <p className="text-label-sm uppercase tracking-wide text-on-surface-variant">
                  Detail Lokasi
                </p>
                <p className="text-title-lg text-on-surface">
                  {JADWAL_AKTIF.kavling}
                </p>
                <p className="text-label-md text-on-surface-variant">
                  {JADWAL_AKTIF.zona}
                </p>
              </div>
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${JADWAL_AKTIF.lat},${JADWAL_AKTIF.lng}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-xs text-label-md text-primary hover:underline"
              >
                <Navigation className="h-4 w-4" strokeWidth={2} />
                Petunjuk Arah
              </a>
            </div>

            <div className="h-[260px] w-full">
              <LokasiMap
                lat={JADWAL_AKTIF.lat}
                lng={JADWAL_AKTIF.lng}
                label={JADWAL_AKTIF.kavling}
              />
            </div>

            <div className="grid grid-cols-3 divide-x divide-outline-variant border-t border-outline-variant">
              <FasilitasItem icon={Zap} label="Listrik" value="Tersedia" />
              <FasilitasItem icon={Droplets} label="Sumber Air" value="Radius 50m" />
              <FasilitasItem icon={Trash2} label="Tempat Sampah" value="Radius 20m" />
            </div>
          </section>
        </div>

        <div className="flex flex-col gap-lg">
          <section className="rounded-lg bg-primary p-lg text-center text-on-primary">
            <p className="mb-md text-title-lg">Check-In Operasional</p>
            <div className="mx-auto flex w-fit flex-col items-center gap-sm rounded-lg bg-surface-container-lowest p-md">
              <QRCodeSVG value={JADWAL_AKTIF.qrValue} size={160} />
            </div>
            <p className="mt-md text-label-sm text-primary-fixed">
              Tunjukkan QR Code ini kepada petugas jaga saat tiba untuk
              konfirmasi kehadiran.
            </p>
            <button
              type="button"
              className="mt-md flex w-full items-center justify-center gap-sm rounded-md bg-surface-container-lowest px-lg py-sm text-label-md text-primary transition-colors hover:bg-surface-container-low"
            >
              <Download className="h-[18px] w-[18px]" strokeWidth={2} />
              Unduh QR Code
            </button>
          </section>

          <section className="rounded-lg border border-outline-variant bg-surface-container-lowest p-lg">
            <h3 className="mb-md text-title-lg text-on-surface">
              Panduan Loading
            </h3>
            <ol className="flex flex-col gap-md">
              {PANDUAN.map((item, i) => (
                <li key={item.title} className="flex gap-sm">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-container text-label-sm text-on-primary-container">
                    {i + 1}
                  </span>
                  <div>
                    <p className="text-label-md font-semibold text-on-surface">
                      {item.title}
                    </p>
                    <p className="text-label-sm font-normal tracking-normal text-on-surface-variant">
                      {item.desc}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </div>
    </div>
  );
}

function FasilitasItem({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Zap;
  label: string;
  value: string;
}) {
  return (
    <div className="p-md text-center">
      <Icon className="mx-auto h-4 w-4 text-on-surface-variant" strokeWidth={2} />
      <p className="mt-xs text-label-sm text-on-surface-variant">{label}</p>
      <p className="text-label-sm font-semibold text-on-surface">{value}</p>
    </div>
  );
}