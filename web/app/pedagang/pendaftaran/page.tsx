"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";

// Pastikan sudah terpasang di project ini:
//   npm install bootstrap bootstrap-icons
// Lalu import CSS-nya sekali di app/layout.tsx (paling atas, sebelum globals.css):
//   import "bootstrap/dist/css/bootstrap.min.css";
//   import "bootstrap-icons/font/bootstrap-icons.css";

type StallType = "rombong" | "meja" | "";

export default function PendaftaranPedagangPage() {
  const router = useRouter();
  const [nik, setNik] = useState("");
  const [dob, setDob] = useState("");
  const [fullName, setFullName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [category, setCategory] = useState("");
  const [stallType, setStallType] = useState<StallType>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (nik.trim().length !== 16) {
      setError("NIK harus terdiri dari 16 digit.");
      return;
    }
    if (!dob || !fullName || !businessName || !category || !stallType) {
      setError("Mohon lengkapi semua data terlebih dahulu.");
      return;
    }

    setLoading(true);
    try {
      // TODO: sesuaikan endpoint dengan API pendaftaran pedagang yang sebenarnya
      const res = await fetch("/api/pedagang/daftar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nik,
          dob,
          fullName,
          businessName,
          category,
          stallType,
        }),
      });

      if (!res.ok) {
        throw new Error("Gagal menyimpan data. Silakan coba lagi.");
      }

      // Data alokasi lapak (zona, nomor stand, QR) idealnya dikembalikan oleh API.
      // Sesuaikan field di bawah ini dengan response API pendaftaran yang sebenarnya.
      const data = await res.json().catch(() => ({}));

      const categoryLabel =
        category === "makanan_minuman"
          ? "Makanan dan Minuman"
          : "Bukan Makanan dan Minuman";
      const stallLabel = stallType === "rombong" ? "Rombong" : "Meja";

      const query = new URLSearchParams({
        nik,
        namaLengkap: fullName,
        tanggalLahir: dob,
        namaUsaha: businessName,
        kategori: categoryLabel,
        jenisLapak: stallLabel,
        ...(data.zona ? { zona: data.zona } : {}),
        ...(data.alamat ? { alamat: data.alamat } : {}),
        ...(data.nomorStand ? { nomorStand: data.nomorStand } : {}),
        ...(data.qrUrl ? { qrUrl: data.qrUrl } : {}),
      });

      router.push(`/pedagang/pendaftaran/detail_pendaftaran?${query.toString()}`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Terjadi kesalahan. Silakan coba lagi."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main
      className="d-flex align-items-center justify-content-center min-vh-100 p-3"
      style={{
        background:
          "radial-gradient(circle at 15% 10%, #eef2ff 0%, #f5f6fa 45%, #f5f6fa 100%)",
      }}
    >
      <style jsx global>{`
        :root {
          --brand: #00288e;
          --brand-dark: #001a5e;
          --accent: #f0a83c;
        }
        .pedagang-card {
          max-width: 440px;
          width: 100%;
          border: none;
          border-radius: 18px;
          overflow: hidden;
          box-shadow: 0 10px 40px rgba(0, 40, 142, 0.14);
        }
        .pedagang-header {
          background: linear-gradient(135deg, var(--brand) 0%, var(--brand-dark) 100%);
        }
        .form-control:focus,
        .form-select:focus {
          border-color: var(--brand);
          box-shadow: 0 0 0 0.2rem rgba(0, 40, 142, 0.15);
        }
        .stall-option {
          border: 1.5px solid #e2e5f1;
          border-radius: 12px;
          padding: 0.65rem 0.5rem;
          text-align: center;
          cursor: pointer;
          transition: all 0.15s ease;
          background: #fff;
        }
        .stall-option:hover {
          border-color: #b9c2e8;
          background: #f8f9ff;
        }
        .stall-option.active {
          border-color: var(--brand);
          background: #eef2ff;
          box-shadow: 0 0 0 1px var(--brand);
        }
        .stall-option i {
          font-size: 1.15rem;
          color: var(--brand);
        }
        .btn-brand {
          background: var(--brand);
          border-color: var(--brand);
          color: #fff;
          font-weight: 600;
          letter-spacing: 0.2px;
        }
        .btn-brand:hover,
        .btn-brand:focus {
          background: var(--brand-dark);
          border-color: var(--brand-dark);
          color: #fff;
        }
        .btn-brand:disabled {
          background: var(--brand);
          opacity: 0.6;
        }
        .form-label-sm {
          font-size: 0.72rem;
          font-weight: 600;
          color: #5b5d6b;
          text-transform: uppercase;
          letter-spacing: 0.4px;
        }
      `}</style>

      <div className="card pedagang-card">
        {/* Header */}
        <div className="pedagang-header px-4 py-3">
          <h2 className="h6 mb-0 text-white fw-semibold">
            Pendaftaran Pedagang Baru
          </h2>
          <p className="mb-0 small" style={{ color: "#c3cdf5", fontSize: "0.75rem" }}>
            Lengkapi data untuk mendaftar sebagai pedagang di CFD
          </p>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4">
          {/* NIK */}
          <div className="mb-3">
            <label htmlFor="nik" className="form-label-sm mb-1 d-block">
              NIK (Nomor Induk Kependudukan)
            </label>
            <div className="input-group">
              <span className="input-group-text bg-white text-muted">
                <i className="bi bi-person-vcard" />
              </span>
              <input
                id="nik"
                name="nik"
                type="text"
                inputMode="numeric"
                maxLength={16}
                placeholder="16 digit NIK"
                value={nik}
                onChange={(e) => setNik(e.target.value.replace(/\D/g, ""))}
                className="form-control"
              />
            </div>
          </div>

          {/* Tanggal Lahir */}
          <div className="mb-3">
            <label htmlFor="dob" className="form-label-sm mb-1 d-block">
              Tanggal Lahir
            </label>
            <input
              id="dob"
              name="dob"
              type="date"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              className="form-control"
            />
          </div>

          {/* Nama Lengkap */}
          <div className="mb-3">
            <label htmlFor="fullName" className="form-label-sm mb-1 d-block">
              Nama Lengkap
            </label>
            <input
              id="fullName"
              name="fullName"
              type="text"
              placeholder="Sesuai KTP"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="form-control"
            />
          </div>

          {/* Nama Usaha */}
          <div className="mb-3">
            <label htmlFor="businessName" className="form-label-sm mb-1 d-block">
              Nama Usaha
            </label>
            <div className="input-group">
              <span className="input-group-text bg-white text-muted">
                <i className="bi bi-tag" />
              </span>
              <input
                id="businessName"
                name="businessName"
                type="text"
                placeholder="Contoh: Kedai Kopi Senja"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="form-control"
              />
            </div>
          </div>

          {/* Kategori Dagangan */}
          <div className="mb-3">
            <label htmlFor="category" className="form-label-sm mb-1 d-block">
              Kategori Dagangan
            </label>
            <select
              id="category"
              name="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="form-select"
            >
              <option value="" disabled>
                Pilih Kategori
              </option>
              <option value="makanan_minuman">Makanan dan Minuman</option>
              <option value="bukan_makanan_minuman">
                Bukan Makanan dan Minuman
              </option>
            </select>
          </div>

          {/* Pilihan Lapak */}
          <div className="mb-3">
            <label className="form-label-sm mb-1 d-block">Pilihan Lapak</label>
            <div className="row g-2">
              <div className="col-6">
                <div
                  className={`stall-option ${stallType === "rombong" ? "active" : ""}`}
                  onClick={() => setStallType("rombong")}
                  role="button"
                >
                  <i className="bi bi-cart3 d-block mb-1" />
                  <span className="small fw-medium text-dark">Rombong</span>
                </div>
              </div>
              <div className="col-6">
                <div
                  className={`stall-option ${stallType === "meja" ? "active" : ""}`}
                  onClick={() => setStallType("meja")}
                  role="button"
                >
                  <i className="bi bi-table d-block mb-1" />
                  <span className="small fw-medium text-dark">Meja</span>
                </div>
              </div>
            </div>
          </div>

          {error && (
            <div className="alert alert-danger py-2 px-3 small mb-3" role="alert">
              <i className="bi bi-exclamation-triangle-fill me-1" />
              {error}
            </div>
          )}

          {/* Form Actions */}
          <div className="d-flex gap-2 pt-3 border-top mt-3">
            <button type="button" className="btn btn-outline-secondary flex-fill">
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn btn-brand flex-fill d-flex align-items-center justify-content-center gap-2"
            >
              {loading && <span className="spinner-border spinner-border-sm" />}
              {loading ? "Menyimpan..." : "Simpan"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}