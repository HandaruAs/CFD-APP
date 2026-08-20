"use client";

import { useEffect, useState } from "react";
import { LayoutGrid, Plus, Pencil, Trash2, Inbox, CornerDownRight } from "lucide-react";
import { resolveMenuIcon } from "@/lib/menu";
import { ConfirmDialog } from "@/components/confirm-dialog";
import {
  MenuFormModal,
  EMPTY_MENU_FORM,
  type MenuFormValues,
  type RoleOption,
} from "@/components/menu-form-modal";

type AdminMenuItem = {
  id: string;
  parent_id: string | null;
  name: string;
  slug: string;
  icon: string | null;
  route: string | null;
  sort_order: number;
  is_active: boolean;
  role_slugs: string[];
};

// Badge warna per role -- fallback slate kalau ada role baru yang belum
// kepetain di sini (jangan sampai muncul putih polos tanpa warna).
const ROLE_BADGE: Record<string, string> = {
  superadmin: "bg-purple-100 text-purple-700",
  petugas: "bg-blue-100 text-blue-700",
  pedagang: "bg-emerald-100 text-emerald-700",
};

function apiUrl(path: string) {
  return `${process.env.NEXT_PUBLIC_API_URL}${path}`;
}

function authHeaders(): HeadersInit {
  const token = localStorage.getItem("cfd_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// Susun list flat jadi urutan tampil: tiap root diikuti langsung oleh
// children-nya (diurutin sort_order), biar gampang di-render sebagai
// tabel dengan indent -- tanpa perlu komponen tree terpisah.
function buildDisplayOrder(items: AdminMenuItem[]): AdminMenuItem[] {
  const byParent = new Map<string | null, AdminMenuItem[]>();
  for (const item of items) {
    const key = item.parent_id;
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key)!.push(item);
  }
  for (const group of byParent.values()) {
    group.sort((a, b) => a.sort_order - b.sort_order);
  }

  const result: AdminMenuItem[] = [];
  function walk(parentId: string | null) {
    for (const item of byParent.get(parentId) ?? []) {
      result.push(item);
      walk(item.id);
    }
  }
  walk(null);
  return result;
}

export default function ManajemenMenuPage() {
  const [menus, setMenus] = useState<AdminMenuItem[]>([]);
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formValues, setFormValues] = useState<MenuFormValues | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const [deleteTarget, setDeleteTarget] = useState<AdminMenuItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  async function loadData() {
    setLoading(true);
    setLoadError("");
    try {
      const [menusRes, rolesRes] = await Promise.all([
        fetch(apiUrl("/api/admin/menus"), { headers: authHeaders() }),
        fetch(apiUrl("/api/admin/roles"), { headers: authHeaders() }),
      ]);

      if (!menusRes.ok) throw new Error("Gagal mengambil data menu.");
      if (!rolesRes.ok) throw new Error("Gagal mengambil data role.");

      const menusData: AdminMenuItem[] = await menusRes.json();
      const rolesData: RoleOption[] = await rolesRes.json();

      // Normalisasi parent_id: backend lama (atau JSON apa pun) bisa aja
      // ngirim field ini ke-omit sama sekali buat menu utama, bukan
      // dikirim sebagai `null` -- itu bikin item.parent_id jadi
      // `undefined`, beda key sama `null` yang dipakai buildDisplayOrder
      // & pengecekan isChild. Disamain ke `null` di sini biar konsisten.
      const normalizedMenus = (menusData ?? []).map((m) => ({
        ...m,
        parent_id: m.parent_id ?? null,
      }));

      setMenus(normalizedMenus);
      setRoles(rolesData ?? []);
    } catch (err) {
      setLoadError(
        err instanceof Error ? err.message : "Gagal memuat data menu."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // Fetch on mount -- setState di dalam loadData aman di sini, cuma
    // dianggap "in effect" karena loadData manggil setState duluan
    // sebelum await pertamanya.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
  }, []);

  function openCreate() {
    setModalMode("create");
    setEditingId(null);
    setFormValues(EMPTY_MENU_FORM);
    setFormError("");
    setModalOpen(true);
  }

  function openEdit(item: AdminMenuItem) {
    setModalMode("edit");
    setEditingId(item.id);
    setFormValues({
      name: item.name,
      slug: item.slug,
      icon: item.icon ?? "",
      route: item.route ?? "",
      parent_id: item.parent_id ?? "",
      sort_order: item.sort_order,
      role_slugs: item.role_slugs,
    });
    setFormError("");
    setModalOpen(true);
  }

  async function handleSubmit(values: MenuFormValues) {
    setSaving(true);
    setFormError("");

    const payload = {
      name: values.name,
      slug: values.slug,
      icon: values.icon || null,
      route: values.route || null,
      parent_id: values.parent_id || null,
      sort_order: values.sort_order,
      role_slugs: values.role_slugs,
    };

    try {
      const url =
        modalMode === "create"
          ? apiUrl("/api/admin/menus")
          : apiUrl(`/api/admin/menus/${editingId}`);
      const method = modalMode === "create" ? "POST" : "PUT";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(),
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Gagal menyimpan menu.");
      }

      setModalOpen(false);
      await loadData();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Gagal menyimpan menu.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError("");

    try {
      const res = await fetch(apiUrl(`/api/admin/menus/${deleteTarget.id}`), {
        method: "DELETE",
        headers: authHeaders(),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Gagal menghapus menu.");
      }

      setDeleteTarget(null);
      await loadData();
    } catch (err) {
      setDeleteError(
        err instanceof Error ? err.message : "Gagal menghapus menu."
      );
    } finally {
      setDeleting(false);
    }
  }

  const displayItems = buildDisplayOrder(menus);
  // Parent-picker: semua menu KECUALI yang lagi diedit sendiri (biar gak
  // bisa jadi parent dari dirinya sendiri -- backend juga jaga ini, tapi
  // dicegah dari sisi UI juga biar gak perlu bolak-balik lihat error).
  const parentOptions = menus
    .filter((m) => m.id !== editingId)
    .map((m) => ({ id: m.id, name: m.name }));

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-slate-900">
            Manajemen Menu
          </h1>
          <p className="mt-2 text-base text-slate-500">
            Atur menu navigasi yang tampil untuk tiap role -- perubahan langsung
            berlaku, tanpa perlu update aplikasi.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 rounded-lg bg-blue-900 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-950"
        >
          <Plus className="h-4 w-4" strokeWidth={2.2} />
          Tambah Menu
        </button>
      </div>

      {loadError && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {loadError}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/60 text-left">
              <th className="px-5 py-3.5 text-xs font-bold tracking-wide text-slate-500">
                MENU
              </th>
              <th className="px-5 py-3.5 text-xs font-bold tracking-wide text-slate-500">
                ROUTE
              </th>
              <th className="px-5 py-3.5 text-xs font-bold tracking-wide text-slate-500">
                ROLE
              </th>
              <th className="px-5 py-3.5 text-right text-xs font-bold tracking-wide text-slate-500">
                AKSI
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="px-5 py-12 text-center text-sm text-slate-400">
                  Memuat data...
                </td>
              </tr>
            ) : displayItems.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-5 py-16">
                  <div className="flex flex-col items-center gap-2 text-center">
                    <Inbox className="h-9 w-9 text-slate-300" strokeWidth={1.6} />
                    <p className="text-base font-semibold text-slate-600">
                      Belum ada menu
                    </p>
                    <p className="text-sm text-slate-400">
                      Klik &quot;Tambah Menu&quot; untuk mulai bikin menu pertama.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              displayItems.map((item) => {
                const Icon = resolveMenuIcon(item.icon);
                const isChild = item.parent_id !== null;
                return (
                  <tr
                    key={item.id}
                    className="border-b border-slate-100 transition last:border-0 hover:bg-slate-50/60"
                  >
                    <td className="px-5 py-4">
                      <div
                        className="flex items-center gap-2.5"
                        style={{ paddingLeft: isChild ? 24 : 0 }}
                      >
                        {isChild && (
                          <CornerDownRight className="h-4 w-4 shrink-0 text-slate-300" />
                        )}
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                          <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
                        </span>
                        <div>
                          <p className="font-semibold text-slate-900">{item.name}</p>
                          <p className="text-xs text-slate-400">{item.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 font-mono text-xs text-slate-500">
                      {item.route ?? "—"}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-1.5">
                        {item.role_slugs.length === 0 ? (
                          <span className="text-xs text-slate-400">
                            Belum ada role
                          </span>
                        ) : (
                          item.role_slugs.map((slug) => (
                            <span
                              key={slug}
                              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                ROLE_BADGE[slug] ?? "bg-slate-100 text-slate-600"
                              }`}
                            >
                              {slug}
                            </span>
                          ))
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEdit(item)}
                          className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-blue-700"
                          aria-label={`Edit ${item.name}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setDeleteError("");
                            setDeleteTarget(item);
                          }}
                          className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
                          aria-label={`Hapus ${item.name}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <MenuFormModal
          key={editingId ?? "create"}
          mode={modalMode}
          initialValues={formValues}
          roles={roles}
          parentOptions={parentOptions}
          saving={saving}
          error={formError}
          onSubmit={handleSubmit}
          onClose={() => setModalOpen(false)}
        />
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Hapus Menu"
        message={
          deleteError
            ? deleteError
            : `Yakin mau hapus menu "${deleteTarget?.name}"? Kalau menu ini masih punya submenu aktif, hapus submenu-nya dulu.`
        }
        isLoading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}