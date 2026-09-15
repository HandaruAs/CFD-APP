import { redirect } from "next/navigation";

// Halaman pendaftaran udah digabung ke /pedagang/nomer-stand (satu
// form: data usaha + pilih lokasi, sekali submit). Route ini dibiarkan
// hidup cuma buat redirect, biar link/bookmark lama gak mati.
export default function PendaftaranPedagangPage() {
  redirect("/pedagang/nomer-stand");
}