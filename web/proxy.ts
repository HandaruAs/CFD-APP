import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Daftar path yang WAJIB login. Nambah halaman baru yang perlu proteksi?
// Tambahin juga ke matcher di bawah -- kalau kelupaan, halamannya bakal
// kebuka bebas tanpa proteksi (sama kayak kejadian kemarin).
export function proxy(request: NextRequest) {
  const token = request.cookies.get("cfd_token")?.value;

  if (!token) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/pendaftaran/:path*",
    "/profil-usaha/:path*",
    "/status-verifikasi/:path*",
    "/jadwal-lokasi/:path*",
    "/petugas/:path*",
    "/admin/:path*",
  ],
};