"use client";

import { Users, Briefcase, Ban } from "lucide-react";
import { UserManagementTable, type StatCard } from "@/components/user-management-table";

const statCards: StatCard[] = [
  {
    label: "Total Petugas",
    value: null,
    icon: Users,
    iconBg: "bg-blue-50",
    iconColor: "text-blue-700",
    sublabel: "",
  },
  {
    label: "Petugas Aktif",
    value: null,
    icon: Briefcase,
    iconBg: "bg-amber-50",
    iconColor: "text-amber-600",
    sublabel: "Sedang Bertugas",
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

export default function ManajemenUserPetugasPage() {
  return (
    <UserManagementTable
      title="Manajemen User Petugas"
      subtitle="Kelola akun dan status aktif petugas CFD pada sistem CFD Hub."
      addButtonLabel="Tambah Petugas"
      searchPlaceholder="Cari nama, email, atau kontak petugas..."
      statCards={statCards}
      apiEndpoint="/api/admin/users/petugas"
    />
  );
}