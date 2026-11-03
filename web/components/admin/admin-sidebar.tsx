"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, LogOut, X } from "lucide-react";
import { resolveMenuIcon, type MenuNode } from "@/lib/menu";
import { flattenRoutes, getAutoOpenIds, getBestMatchRoute } from "@/components/sidebar";
import { INFO_PERAN, useAdminNav } from "./admin-nav";

// Sidebar superadmin & petugas: panel terang dengan aksen biru dan kuning
// matahari. Tata letaknya sama dengan sidebar lama (logo, daftar menu dari
// backend, tombol keluar); bedanya ada indikator aktif yang meluncur, dan versi laci (drawer) untuk layar kecil.
export function AdminSidebar() {
  const { navOpen, setNavOpen } = useAdminNav();

  return (
    <>
      {/* Desktop */}
      <aside className="adm-side sticky top-0 hidden h-screen w-[288px] shrink-0 lg:flex">
        <IsiSidebar />
      </aside>

      {/* Mobile: laci dari kiri */}
      <AnimatePresence>
        {navOpen && (
          <>
            <motion.div
              key="scrim"
              className="fixed inset-0 z-[60] bg-[rgb(11_28_48/0.35)] backdrop-blur-[2px] lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setNavOpen(false)}
            />
            <motion.aside
              key="drawer"
              className="adm-side fixed inset-y-0 left-0 z-[61] flex w-[300px] max-w-[86vw] lg:hidden"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 380, damping: 38 }}
              role="dialog"
              aria-modal="true"
              aria-label="Menu navigasi"
            >
              <IsiSidebar onClose={() => setNavOpen(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

function IsiSidebar({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();
  const { peran, menus, loading, error, logout } = useAdminNav();
  const Peran = INFO_PERAN[peran];
  const [manual, setManual] = useState<Map<string, boolean>>(new Map());

  const autoOpen = useMemo(() => getAutoOpenIds(menus, pathname), [menus, pathname]);
  const best = useMemo(() => getBestMatchRoute(flattenRoutes(menus), pathname), [menus, pathname]);
  const isOpen = (id: string) => (manual.has(id) ? manual.get(id)! : autoOpen.has(id));
  const toggle = (id: string) => setManual((m) => new Map(m).set(id, !isOpen(id)));

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden">
      {/* Ornamen latar: kisi halus + cahaya biru & kuning */}
      <div aria-hidden="true" className="adm-side-grid pointer-events-none absolute inset-0" />
      <div aria-hidden="true" className="pointer-events-none absolute -top-24 -right-20 h-64 w-64 rounded-full bg-[#2f6fed]/15 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-28 -left-16 h-56 w-56 rounded-full bg-[#fdba3d]/20 blur-3xl" />

      {/* Logo */}
      <div className="relative flex items-center gap-3 px-5 pt-6 pb-5">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white shadow-[0_8px_24px_-10px_rgb(47_111_237/0.6)] ring-1 ring-outline-variant">
          <Image src="/images/logo-cfd.png" alt="Logo E-Event Surabaya" width={40} height={40} className="h-9 w-9 object-contain" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="adm-display truncate text-[19px] leading-tight font-semibold text-on-surface">E-Event Surabaya</p>
          <span className="mt-1 inline-flex items-center gap-1 rounded-md bg-[#fdba3d] px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-[#2a1700] uppercase">
            <Peran.ikon className="h-3 w-3" strokeWidth={2.5} />
            {Peran.label}
          </span>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup menu"
            className="grid h-10 w-10 place-items-center rounded-xl text-on-surface-variant transition hover:bg-surface-container-high hover:text-on-surface"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Menu */}
      <nav className="adm-scroll relative mt-1 flex-1 overflow-y-auto px-3 pb-4" aria-label="Menu utama">
        <p className="mb-2 px-3 text-[10.5px] font-semibold tracking-[0.18em] text-on-surface-variant/70 uppercase">Menu utama</p>

        {loading && (
          <div className="flex flex-col gap-2 px-1">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="h-12 animate-pulse rounded-xl bg-surface-container-high" />
            ))}
          </div>
        )}
        {error && (
          <div className="mx-1 rounded-xl border border-error-container bg-error-container/40 px-3 py-2.5 text-[13px] text-on-error-container">{error}</div>
        )}
        {!loading && !error && (
          <ul className="flex flex-col gap-1">
            {menus.map((m, i) => (
              <motion.li
                key={m.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.03 * i, duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              >
                <ItemMenu item={m} best={best} isOpen={isOpen} toggle={toggle} />
              </motion.li>
            ))}
          </ul>
        )}
      </nav>

      {/* Keluar */}
      <div className="relative border-t border-outline-variant p-3">
        <button
          type="button"
          onClick={logout}
          className="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-medium text-on-surface-variant transition hover:bg-error-container/50 hover:text-on-error-container"
        >
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-surface-container-high transition group-hover:bg-error-container">
            <LogOut className="h-[18px] w-[18px]" />
          </span>
          Keluar
        </button>
      </div>
    </div>
  );
}

function ItemMenu({
  item,
  best,
  isOpen,
  toggle,
  anak = false,
}: {
  item: MenuNode;
  best: string | null;
  isOpen: (id: string) => boolean;
  toggle: (id: string) => void;
  anak?: boolean;
}) {
  const Icon = resolveMenuIcon(item.icon);
  const punyaAnak = item.children.length > 0;
  const aktif = !!item.route && item.route === best;
  const terbuka = isOpen(item.id);

  const kelas = `group relative flex w-full items-center gap-3 rounded-xl px-3 ${anak ? "py-2" : "py-2.5"} text-left transition-colors ${
    aktif ? "text-primary" : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
  }`;

  const isi = (
    <>
      {aktif && (
        <motion.span
          layoutId="adm-menu-aktif"
          className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary-fixed to-primary-fixed/30 shadow-[inset_0_0_0_1px_rgb(0_40_142/0.08)]"
          transition={{ type: "spring", stiffness: 380, damping: 32 }}
        >
          <span className="absolute inset-y-2 -left-3 w-1 rounded-r-full bg-[#fdba3d] shadow-[0_0_12px_#fdba3d]" />
        </motion.span>
      )}
      {!anak ? (
        <span
          className={`relative grid h-9 w-9 shrink-0 place-items-center rounded-lg transition-colors ${
            aktif ? "bg-primary text-on-primary shadow-[0_6px_14px_-6px_rgb(0_40_142/0.7)]" : "bg-surface-container group-hover:bg-surface-container-highest"
          }`}
        >
          {/* eslint-disable-next-line react-hooks/static-components */}
          <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
        </span>
      ) : (
        <span className={`relative h-1.5 w-1.5 shrink-0 rounded-full ${aktif ? "bg-[#fdba3d]" : "bg-outline-variant"}`} />
      )}
      <span className={`relative flex-1 text-[14px] leading-snug break-words ${aktif ? "font-semibold" : "font-medium"}`}>
        {item.name}
      </span>
      {punyaAnak && (
        <ChevronDown className={`relative h-4 w-4 shrink-0 text-on-surface-variant transition-transform ${terbuka ? "rotate-180" : ""}`} />
      )}
    </>
  );

  return (
    <>
      {item.route && !punyaAnak ? (
        <Link href={item.route} className={kelas} aria-current={aktif ? "page" : undefined}>
          {isi}
        </Link>
      ) : (
        <button type="button" onClick={() => toggle(item.id)} className={kelas} aria-expanded={terbuka}>
          {isi}
        </button>
      )}
      <AnimatePresence initial={false}>
        {punyaAnak && terbuka && (
          <motion.ul
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeInOut" }}
            className="ml-[30px] flex flex-col gap-0.5 overflow-hidden border-l border-outline-variant py-1 pl-3"
          >
            {item.children.map((c) => (
              <li key={c.id}>
                <ItemMenu item={c} best={best} isOpen={isOpen} toggle={toggle} anak />
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </>
  );
}
