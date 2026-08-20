"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import {
  MapPin,
  Store,
  User,
  Pencil,
  UtensilsCrossed,
  Truck,
} from "lucide-react";

// Pastikan project sudah meng-import Bootstrap CSS,
// misalnya di app/layout.tsx:
//
// import "bootstrap/dist/css/bootstrap.min.css";

// Helper: ambil value dari query string, kalau kosong tampilkan "-"
// (tidak ada data dummy/hardcode)
const getParam = (
  params: URLSearchParams,
  key: string,
  fallback = "-"
) => params.get(key) || fallback;

function SuccessContent() {
  const router = useRouter();
  const params = useSearchParams();

  const zona = getParam(params, "zona");
  const alamat = getParam(params, "alamat");
  const nomorStand = getParam(params, "nomorStand");
  const qrUrl = params.get("qrUrl") || "";
  const nik = getParam(params, "nik");
  const namaLengkap = getParam(params, "namaLengkap");
  const tanggalLahir = getParam(params, "tanggalLahir");
  const namaUsaha = getParam(params, "namaUsaha");
  const kategori = getParam(params, "kategori");
  const jenisLapak = getParam(params, "jenisLapak");

  return (
    <>
      <style jsx global>{`
        body {
          font-family: "Inter", sans-serif;
          background-color: #f8f9ff;
          color: #0b1c30;
        }
        .sidebar {
          background-color: #ffffff;
          border-right: 1px solid #c4c5d5;
        }
        .nav-link {
          color: #444653;
          border-radius: 50rem;
          padding: 0.75rem 1rem;
          margin-bottom: 0.5rem;
          display: flex;
          align-items: center;
          gap: 1rem;
          font-weight: 500;
          font-size: 14px;
        }
        .nav-link:hover {
          background-color: #e5eeff;
          color: #0b1c30;
        }
        .nav-link.active {
          background-color: #1e40af;
          color: #ffffff;
        }
        .nav-link.active:hover {
          background-color: #1e40af;
          color: #ffffff;
        }
        .brand-text {
          color: #0b1c30;
          font-weight: 600;
          font-size: 20px;
        }
        .card-primary {
          background-color: #00288e;
          color: #ffffff;
          border-radius: 0.75rem;
          border: none;
          overflow: hidden;
          position: relative;
        }
        .stand-box {
          background-color: #ffffff;
          color: #0b1c30;
          border-radius: 0.5rem;
          padding: 1.5rem;
          min-width: 200px;
          display: flex;
          align-items: center;
          gap: 1.5rem;
        }
        .stand-number {
          font-size: 48px;
          font-weight: 700;
          line-height: 1.2;
          letter-spacing: -0.02em;
        }
        .card-custom {
          background-color: #f8f9ff;
          border: 1px solid #c4c5d5;
          border-radius: 0.75rem;
          box-shadow: 0 0.125rem 0.25rem rgba(0, 0, 0, 0.075);
        }
        .card-header-custom {
          background-color: #ffffff;
          border-bottom: 1px solid #c4c5d5;
          padding: 0.75rem 1rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .btn-custom-outline {
          color: #00288e;
          font-weight: 500;
          border-radius: 50rem;
          display: flex;
          align-items: center;
          gap: 0.25rem;
          padding: 0.25rem 0.75rem;
          transition: background-color 0.2s;
          background: transparent;
          border: none;
        }
        .btn-custom-outline:hover {
          background-color: #e5eeff;
        }
        .btn-return {
          background-color: #dce9ff;
          color: #00288e;
          font-weight: 500;
          border-radius: 50rem;
          padding: 0.75rem 1rem;
          border: none;
          width: 100%;
          transition: background-color 0.2s;
          box-shadow: 0 0.125rem 0.25rem rgba(0, 0, 0, 0.075);
        }
        .btn-return:hover {
          background-color: #d3e4fe;
        }
        .qr-box {
          background-color: #ffffff;
          padding: 0.5rem;
          border-radius: 0.5rem;
          border: 1px solid #c4c5d5;
          display: inline-block;
          box-shadow: 0 0.125rem 0.25rem rgba(0, 0, 0, 0.075);
        }
        .label-sm {
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          opacity: 0.9;
          margin-bottom: 0.25rem;
        }
      `}</style>

      <div className="antialiased min-vh-100 d-flex flex-column">
        {/* Main Container */}
        <main className="flex-grow-1 overflow-auto">
          <div
            className="container-fluid py-4 px-3 px-md-4 mx-auto"
            style={{ maxWidth: "900px" }}
          >
            {/* Success Header */}
            <header className="text-center pt-5 pb-4 px-3">
              <h1
                className="fw-bold mb-2"
                style={{ fontSize: "24px", color: "#0b1c30" }}
              >
                Pendaftaran Selesai
              </h1>
              <p
                className="mx-auto"
                style={{ color: "#444653", fontSize: "16px", maxWidth: "400px" }}
              >
                Lapak Anda telah berhasil dialokasikan. Harap simpan informasi
                pendaftaran ini.
              </p>
            </header>

            {/* Top Section: Location Card */}
            <section className="mb-4">
              <div className="card card-primary shadow-sm p-4">
                <div
                  className="position-absolute top-0 end-0 translate-middle-y rounded-circle"
                  style={{
                    width: "200px",
                    height: "200px",
                    filter: "blur(40px)",
                    backgroundColor: "#dde1ff",
                    opacity: 0.25,
                  }}
                ></div>
                <div className="position-relative z-1">
                  <h2 className="h5 fw-bold mb-3 opacity-75 text-white">
                    Alokasi Lapak
                  </h2>
                  <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-4">
                    <div className="d-flex align-items-start gap-2">
                      <MapPin
                        className="mt-1"
                        size={18}
                        style={{ color: "#b8c4ff" }}
                      />
                      <div>
                        <p className="label-sm" style={{ color: "#b8c4ff" }}>
                          Zona Area
                        </p>
                        <p className="fw-bold mb-1" style={{ fontSize: "24px" }}>
                          {zona}
                        </p>
                        <p
                          className="mb-0"
                          style={{ color: "#dde1ff", fontSize: "16px" }}
                        >
                          {alamat}
                        </p>
                      </div>
                    </div>
                    <div className="stand-box shadow-sm">
                      <div>
                        <p className="label-sm text-muted">Nomor Stand</p>
                        <p className="stand-number text-dark mb-0">
                          {nomorStand}
                        </p>
                      </div>
                      <Store
                        size={32}
                        className="text-muted opacity-50"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Vertical Stacking: Kode Akses -> Data Pedagang -> Data Usaha */}
            <div className="d-flex flex-column gap-4 mb-4">
              {/* QR Code */}
              <section>
                <div className="card card-custom h-100">
                  <div className="card-body d-flex flex-column align-items-center justify-content-center text-center p-4">
                    <p
                      className="fw-medium mb-3"
                      style={{ color: "#0b1c30", fontSize: "14px" }}
                    >
                      Kode Akses Digital
                    </p>
                    <div className="qr-box mb-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={
                          qrUrl ||
                          "https://api.qrserver.com/v1/create-qr-code/?size=192x192&data=CFD-MERCHANT"
                        }
                        alt="Kode QR pedagang"
                        className="img-fluid rounded"
                        style={{
                          width: "192px",
                          height: "192px",
                          objectFit: "cover",
                        }}
                      />
                    </div>
                    <p
                      className="mb-0 mx-auto"
                      style={{
                        color: "#444653",
                        fontSize: "16px",
                        maxWidth: "300px",
                      }}
                    >
                      Tunjukkan QR Code ini kepada petugas lapangan untuk
                      verifikasi.
                    </p>
                  </div>
                </div>
              </section>

              {/* Data Pedagang */}
              <section>
                <div className="card card-custom overflow-hidden">
                  <div className="card-header-custom">
                    <h3
                      className="h6 fw-bold mb-0 d-flex align-items-center gap-2"
                      style={{ color: "#0b1c30" }}
                    >
                      <User size={16} style={{ color: "#757684" }} />
                      Data Pedagang
                    </h3>
                    <button type="button" className="btn-custom-outline">
                      <Pencil size={14} />
                      Edit
                    </button>
                  </div>
                  <div className="card-body p-3">
                    <div className="row g-3">
                      <div className="col-12">
                        <p
                          className="label-sm mb-1"
                          style={{
                            color: "#444653",
                            textTransform: "none",
                            letterSpacing: "normal",
                          }}
                        >
                          NIK
                        </p>
                        <p
                          className="mb-0"
                          style={{ color: "#0b1c30", fontSize: "16px" }}
                        >
                          {nik}
                        </p>
                      </div>
                      <div className="col-12">
                        <p
                          className="label-sm mb-1"
                          style={{
                            color: "#444653",
                            textTransform: "none",
                            letterSpacing: "normal",
                          }}
                        >
                          Nama Lengkap
                        </p>
                        <p
                          className="mb-0"
                          style={{ color: "#0b1c30", fontSize: "16px" }}
                        >
                          {namaLengkap}
                        </p>
                      </div>
                      <div className="col-12">
                        <p
                          className="label-sm mb-1"
                          style={{
                            color: "#444653",
                            textTransform: "none",
                            letterSpacing: "normal",
                          }}
                        >
                          Tanggal Lahir
                        </p>
                        <p
                          className="mb-0"
                          style={{ color: "#0b1c30", fontSize: "16px" }}
                        >
                          {tanggalLahir}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Data Usaha */}
              <section>
                <div className="card card-custom overflow-hidden">
                  <div className="card-header-custom border-bottom-0 pb-0 pt-3">
                    <h3
                      className="h6 fw-bold mb-0 d-flex align-items-center gap-2"
                      style={{ color: "#0b1c30" }}
                    >
                      <Store size={16} style={{ color: "#757684" }} />
                      Data Usaha
                    </h3>
                  </div>
                  <div className="card-body p-3 pt-2">
                    <div className="row g-3">
                      <div className="col-12">
                        <p
                          className="label-sm mb-1"
                          style={{
                            color: "#444653",
                            textTransform: "none",
                            letterSpacing: "normal",
                          }}
                        >
                          Nama Usaha
                        </p>
                        <p
                          className="mb-0"
                          style={{ color: "#0b1c30", fontSize: "16px" }}
                        >
                          {namaUsaha}
                        </p>
                      </div>
                      <div className="col-12 d-flex justify-content-between align-items-center">
                        <div>
                          <p
                            className="label-sm mb-1"
                            style={{
                              color: "#444653",
                              textTransform: "none",
                              letterSpacing: "normal",
                            }}
                          >
                            Kategori
                          </p>
                          <p
                            className="mb-0"
                            style={{ color: "#0b1c30", fontSize: "16px" }}
                          >
                            {kategori}
                          </p>
                        </div>
                        <UtensilsCrossed size={16} style={{ color: "#4edea3" }} />
                      </div>
                      <div className="col-12 d-flex justify-content-between align-items-center">
                        <div>
                          <p
                            className="label-sm mb-1"
                            style={{
                              color: "#444653",
                              textTransform: "none",
                              letterSpacing: "normal",
                            }}
                          >
                            Jenis Lapak
                          </p>
                          <p
                            className="mb-0"
                            style={{ color: "#0b1c30", fontSize: "16px" }}
                          >
                            {jenisLapak}
                          </p>
                        </div>
                        <Truck size={16} style={{ color: "#757684" }} />
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            </div>

            {/* Bottom Section */}
            <div className="pb-5">
              <button
                type="button"
                className="btn-return"
                onClick={() => router.push("/")}
              >
                Kembali ke Beranda
              </button>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}

export default function DetailPendaftaranPage() {
  return (
    <Suspense fallback={null}>
      <SuccessContent />
    </Suspense>
  );
}