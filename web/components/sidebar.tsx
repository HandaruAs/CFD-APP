"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { LogOut, Store } from "lucide-react";
import { getMyMenus, resolveMenuIcon, type MenuNode } from "@/lib/menu";

function MenuLink({ item, pathname }: { item: MenuNode; pathname: string }) {
  // resolveMenuIcon cuma MEMILIH salah satu component dari ICON_MAP yang
  // sudah ada (bukan membuat component baru), jadi ini false positive dari
  // aturan react-hooks/static-components -- aman untuk di-disable di sini.
  // eslint-disable-next-line react-hooks/static-components
  const Icon = resolveMenuIcon(item.icon);
  const isActive =
    !!item.route &&
    (pathname === item.route || pathname.startsWith(`${item.route}/`));

  return (
    <li>
      {item.route ? (
        <Link
          href={item.route}
          className={`flex items-center gap-sm rounded-md px-md py-sm text-label-md transition-colors ${
            isActive
              ? "bg-primary text-on-primary"
              : "text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface"
          }`}
        >
          <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
          {item.name}
        </Link>
      ) : (
        // Menu tanpa route sendiri (cuma jadi grup buat submenu)
        <span className="flex items-center gap-sm px-md py-sm text-label-md text-on-surface-variant">
          <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
          {item.name}
        </span>
      )}

      {item.children.length > 0 && (
        <ul className="ml-lg mt-xs flex flex-col gap-xs border-l border-outline-variant pl-sm">
          {item.children.map((child) => (
            <MenuLink key={child.id} item={child} pathname={pathname} />
          ))}
        </ul>
      )}
    </li>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [menus, setMenus] = useState<MenuNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getMyMenus()
      .then(setMenus)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  function handleLogout() {
    localStorage.removeItem("cfd_token");
    document.cookie = "cfd_token=; path=/; max-age=0";
    router.push("/login");
  }

  return (
    <aside className="hidden lg:flex lg:w-[250px] shrink-0 flex-col border-r border-outline-variant bg-surface-container-lowest">
      <div className="flex items-center gap-sm px-lg py-lg">
        <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-on-primary">
          <Store className="h-5 w-5" strokeWidth={2.25} />
        </span>
        <span className="text-title-lg text-primary">CFD Kita</span>
      </div>

      <nav className="flex-1 px-sm py-sm">
        {loading && (
          <p className="px-md py-sm text-label-sm text-on-surface-variant">
            Memuat menu...
          </p>
        )}
        {error && (
          <p className="px-md py-sm text-label-sm text-error">{error}</p>
        )}
        {!loading && !error && (
          <ul className="flex flex-col gap-xs">
            {menus.map((item) => (
              <MenuLink key={item.id} item={item} pathname={pathname} />
            ))}
          </ul>
        )}
      </nav>

      <div className="border-t border-outline-variant px-lg py-md">
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-sm rounded-md px-1 py-xs text-label-md text-error transition-colors hover:bg-error-container"
        >
          <LogOut className="h-[18px] w-[18px]" strokeWidth={2} />
          Keluar
        </button>
      </div>
    </aside>
  );
}
