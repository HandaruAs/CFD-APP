"use client";

import { useEffect, useState } from "react";
import { LayoutDashboard, ShieldAlert } from "lucide-react";

type FetchState = "loading" | "ok" | "forbidden" | "error";

// Placeholder dashboard buat role SUPERADMIN. Sudah nyambung ke
// GET /api/admin/dashboard (dilindungi AuthMiddleware + RoleMiddleware
// "superadmin" di backend) -- kontennya masih dummy, tinggal diganti
// begitu halaman manajemen user beneran mulai dikerjakan.
export default function AdminDashboardPage() {
  const [state, setState] = useState<FetchState>("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("cfd_token");

    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/dashboard`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (res.status === 401) {
          setState("error");
          setMessage("Sesi login tidak ditemukan, silakan login ulang.");
          return;
        }
        if (res.status === 403) {
          setState("forbidden");
          return;
        }
        if (!res.ok) {
          setState("error");
          setMessage(data.error || "Gagal memuat dashboard.");
          return;
        }
        setState("ok");
        setMessage(data.message || "");
      })
      .catch(() => {
        setState("error");
        setMessage("Tidak bisa terhubung ke server.");
      });
  }, []);

  if (state === "forbidden") {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-md rounded-lg border border-outline-variant bg-surface-container-lowest p-3xl text-center">
        <ShieldAlert className="h-10 w-10 text-error" strokeWidth={2} />
        <h2 className="text-title-lg text-on-surface">Akses Ditolak</h2>
        <p className="text-body-md text-on-surface-variant">
          Akun kamu tidak memiliki akses ke halaman Super Admin.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-lg">
      <div>
        <h2 className="text-headline-lg text-on-surface">Dashboard Super Admin</h2>
        <p className="mt-xs max-w-2xl text-body-md text-on-surface-variant">
          Ringkasan sistem dan manajemen pengguna.
        </p>
      </div>

      <section className="rounded-lg border border-outline-variant bg-surface-container-lowest p-xl">
        <div className="flex items-start gap-md">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-surface-container-low text-primary">
            <LayoutDashboard className="h-5 w-5" strokeWidth={2} />
          </span>
          <div>
            <h3 className="text-title-lg text-on-surface">
              Halaman ini masih placeholder
            </h3>
            <p className="mt-xs text-body-md text-on-surface-variant">
              {state === "loading"
                ? "Memuat..."
                : state === "error"
                  ? message
                  : message || "Berhasil terhubung ke backend sebagai superadmin."}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}