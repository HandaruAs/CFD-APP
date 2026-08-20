"use client";

import { useState } from "react";
import { Loader2, X } from "lucide-react";
import { ICON_MAP } from "@/lib/menu";

export type RoleOption = { id: string; name: string; slug: string };

export type MenuFormValues = {
  name: string;
  slug: string;
  icon: string;
  route: string;
  parent_id: string;
  sort_order: number;
  role_slugs: string[];
};

export const EMPTY_MENU_FORM: MenuFormValues = {
  name: "",
  slug: "",
  icon: "",
  route: "",
  parent_id: "",
  sort_order: 0,
  role_slugs: [],
};

const inputClass =
  "w-full rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15";

const ICON_OPTIONS = Object.keys(ICON_MAP);

export function MenuFormModal({
  mode,
  initialValues,
  roles,
  parentOptions,
  saving,
  error,
  onSubmit,
  onClose,
}: {
  mode: "create" | "edit";
  // null cuma valid buat mode "create" -- di mode "edit" ini WAJIB diisi.
  initialValues: MenuFormValues | null;
  roles: RoleOption[];
  // Daftar menu yang boleh dipilih jadi parent -- di halaman pemanggil,
  // menu yang lagi diedit sendiri sudah dikeluarkan dari list ini (biar
  // gak bisa jadi parent dari dirinya sendiri).
  parentOptions: { id: string; name: string }[];
  saving: boolean;
  error: string;
  onSubmit: (values: MenuFormValues) => void;
  onClose: () => void;
}) {
  // Gak pakai useEffect buat sync ulang initialValues -- parent yang
  // tanggung jawab remount komponen ini (lewat `key`) tiap kali target
  // edit ganti / modal dibuka ulang, jadi useState awal ini udah cukup.
  const [values, setValues] = useState<MenuFormValues>(
    initialValues ?? EMPTY_MENU_FORM
  );

  function update<K extends keyof MenuFormValues>(
    key: K,
    value: MenuFormValues[K]
  ) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function toggleRole(slug: string) {
    setValues((prev) => ({
      ...prev,
      role_slugs: prev.role_slugs.includes(slug)
        ? prev.role_slugs.filter((s) => s !== slug)
        : [...prev.role_slugs, slug],
    }));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm">
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900">
            {mode === "create" ? "Tambah Menu" : "Edit Menu"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit(values);
          }}
          className="space-y-4"
        >
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-600">
              {error}
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Nama Menu <span className="text-red-500">*</span>
            </label>
            <input
              required
              value={values.name}
              onChange={(e) => update("name", e.target.value)}
              className={inputClass}
              placeholder="Jam Operasional"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Slug <span className="text-red-500">*</span>
            </label>
            <input
              required
              value={values.slug}
              onChange={(e) => update("slug", e.target.value)}
              className={inputClass}
              placeholder="petugas-jam-operasional"
            />
            <p className="mt-1 text-xs text-slate-400">
              Wajib unik, buat identifikasi internal -- bukan yang ditampilkan ke user.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Icon
              </label>
              <select
                value={values.icon}
                onChange={(e) => update("icon", e.target.value)}
                className={inputClass}
              >
                <option value="">— Default —</option>
                {ICON_OPTIONS.map((key) => (
                  <option key={key} value={key}>
                    {key}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Urutan
              </label>
              <input
                type="number"
                value={values.sort_order}
                onChange={(e) => update("sort_order", Number(e.target.value))}
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Route
            </label>
            <input
              value={values.route}
              onChange={(e) => update("route", e.target.value)}
              className={inputClass}
              placeholder="/petugas/jam-operasional"
            />
            <p className="mt-1 text-xs text-slate-400">
              Kosongkan kalau menu ini cuma label pengelompok (punya submenu, gak punya halaman sendiri).
            </p>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Submenu dari
            </label>
            <select
              value={values.parent_id}
              onChange={(e) => update("parent_id", e.target.value)}
              className={inputClass}
            >
              <option value="">— Tidak ada (menu utama) —</option>
              {parentOptions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Tampilkan untuk role <span className="text-red-500">*</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {roles.map((role) => {
                const checked = values.role_slugs.includes(role.slug);
                return (
                  <button
                    key={role.id}
                    type="button"
                    onClick={() => toggleRole(role.slug)}
                    className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition ${
                      checked
                        ? "border-blue-700 bg-blue-700 text-white"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {role.name}
                  </button>
                );
              })}
            </div>
            {values.role_slugs.length === 0 && (
              <p className="mt-1.5 text-xs text-amber-600">
                Pilih minimal 1 role.
              </p>
            )}
          </div>

          <div className="mt-2 flex justify-end gap-3 border-t border-slate-100 pt-6">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 px-6 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving || values.role_slugs.length === 0}
              className="flex items-center gap-2 rounded-lg bg-blue-700 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {mode === "create" ? "Simpan Menu" : "Update Menu"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}