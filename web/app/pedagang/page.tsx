// app/pedagang/page.tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

// Halaman /pedagang cuma "pintu masuk": langsung mengarahkan pedagang ke
// halaman yang sesuai.
//   - belum login / token kedaluwarsa -> /auth/login
//   - sudah isi data usaha ("verified") -> /pedagang/profil
//   - belum isi data usaha              -> /pedagang/pendaftaran
//
// Dulu pedagang yang sudah punya pengajuan diarahkan ke
// /pedagang/status-verifikasi (halamannya sudah dihapus bersama tahap
// verifikasi) dan yang belum login ke /login (seharusnya /auth/login),
// jadi dua-duanya berakhir di 404. pedagang_stage juga dibaca dari objek
// luar respons /api/me, padahal ada di dalam "user".
export default function PedagangDashboardPage() {
  const router = useRouter();

  useEffect(() => {
    async function arahkan() {
      const token = localStorage.getItem("cfd_token");
      if (!token) {
        router.replace("/auth/login");
        return;
      }

      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.status === 401 || res.status === 403) {
          localStorage.removeItem("cfd_token");
          localStorage.removeItem("cfd_user");
          document.cookie = "cfd_token=; path=/; max-age=0";
          router.replace("/auth/login");
          return;
        }

        const data = await res.json().catch(() => ({}));
        const stage = data?.user?.pedagang_stage;
        router.replace(stage === "verified" ? "/pedagang/profil" : "/pedagang/pendaftaran");
      } catch {
        // Server gak bisa dihubungi -- arahkan ke halaman pendaftaran;
        // halaman itu sendiri akan mengecek data usahanya lagi.
        router.replace("/pedagang/pendaftaran");
      }
    }

    arahkan();
  }, [router]);

  // Selama proses mengarahkan, cukup tampilkan loading.
  return (
    <div className="flex h-screen items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}