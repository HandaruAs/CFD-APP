"use client";

import { Users, Store, ShieldCheck, Ban } from "lucide-react";
import { UserManagementTable, type StatCard } from "@/components/user-management-table";

const statCards: StatCard[] = [
  {
    label: "Total Pedagang",
    value: null,
    icon: Users,
    iconBg: "bg-blue-50",
    iconColor: "text-blue-700",
    sublabel: "",
  },
  {
    label: "Pedagang Aktif",
    value: null,
    icon: Store,
    iconBg: "bg-emerald-50",
    iconColor: "text-emerald-600",
    sublabel: "Total Terverifikasi",
  },
  {
    label: "Menunggu Verifikasi",
    value: null,
    icon: ShieldCheck,
    iconBg: "bg-amber-50",
    iconColor: "text-amber-600",
    sublabel: "",
  },
  {
    label: "Ditangguhkan",
    value: null,
    icon: Ban,
    iconBg: "bg-white",
    iconColor: "text-red-600",
    sublabel: "⚠ Membutuhkan Tinjauan",
    danger: true,
  },
];

export default function ManajemenUserPedagangPage() {
  return (
    <UserManagementTable
      title="Manajemen User Pedagang"
      subtitle="Kelola akun, status verifikasi, dan status aktif pedagang pada sistem CFD Hub."
      addButtonLabel="Tambah Pedagang"
      searchPlaceholder="Cari nama, email, atau kontak pedagang..."
      statCards={statCards}
      apiEndpoint="/api/admin/users/pedagang"
    />
  );
}