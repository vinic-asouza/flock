"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Dialog, DialogPanel, DialogTitle } from "@headlessui/react";
import { LogOut, Menu } from "lucide-react";
import { useOpsAuth } from "@/context/OpsAuthContext";
import {
  OPS_BRAND,
  OPS_NAV_GROUPS,
  isOpsNavCurrent,
  type OpsNavItem,
} from "@/lib/opsNav";
import { OPS_NAV_ICONS } from "@/lib/opsNavIcons";
import { cn } from "@/lib/cn";
import { OpsButton } from "@/components/ui";

function NavLink({
  item,
  pathname,
  onNavigate,
}: {
  item: OpsNavItem;
  pathname: string;
  onNavigate?: () => void;
}) {
  const current = isOpsNavCurrent(pathname, item);
  const Icon = OPS_NAV_ICONS[item.icon];
  return (
    <Link
      href={item.href}
      aria-current={current ? "page" : undefined}
      onClick={onNavigate}
      className={cn(
        "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white",
        current
          ? "bg-white/15 text-white"
          : "text-white/80 hover:bg-white/10 hover:text-white"
      )}
    >
      <Icon className="h-4 w-4 shrink-0" aria-hidden />
      {item.label}
    </Link>
  );
}

function NavGroups({
  pathname,
  onNavigate,
}: {
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <nav aria-label="Console" className="flex flex-col gap-6">
      {OPS_NAV_GROUPS.map((group) => (
        <div key={group.id}>
          <p className="px-3 text-[11px] font-semibold uppercase tracking-wide text-white/50">
            {group.label}
          </p>
          <div className="mt-2 flex flex-col gap-0.5">
            {group.items.map((item) => (
              <NavLink
                key={item.href}
                item={item}
                pathname={pathname}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}

function SidebarChrome({
  pathname,
  onNavigate,
}: {
  pathname: string;
  onNavigate?: () => void;
}) {
  const { user, logout } = useOpsAuth();
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await logout();
      router.replace("/login");
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="px-4 py-5">
        <p className="text-sm font-semibold tracking-wide text-white">
          {OPS_BRAND}
        </p>
      </div>
      <div className="flex-1 overflow-y-auto px-2 pb-4">
        <NavGroups pathname={pathname} onNavigate={onNavigate} />
      </div>
      {user ? (
        <div className="border-t border-white/10 px-3 py-4">
          <p className="truncate px-1 text-xs text-white/80" title={user.email}>
            {user.email}
          </p>
          <OpsButton
            type="button"
            variant="ghost"
            onClick={() => void handleLogout()}
            disabled={isLoggingOut}
            className="mt-2 w-full text-white hover:bg-white/10 hover:text-white"
          >
            <LogOut className="h-4 w-4" aria-hidden />
            {isLoggingOut ? "Saindo…" : "Sair"}
          </OpsButton>
        </div>
      ) : null}
    </div>
  );
}

export function OpsShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-60 shrink-0 bg-primary text-white md:block">
        <div className="sticky top-0 h-screen">
          <SidebarChrome pathname={pathname} />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 bg-primary px-4 py-3 text-white md:hidden">
          <OpsButton
            type="button"
            variant="ghost"
            aria-label="Abrir menu"
            onClick={() => setMobileOpen(true)}
            className="min-h-11 px-3 text-white hover:bg-white/10 hover:text-white"
          >
            <Menu className="h-5 w-5" aria-hidden />
          </OpsButton>
          <p className="text-sm font-semibold">{OPS_BRAND}</p>
        </header>

        <Dialog
          open={mobileOpen}
          onClose={setMobileOpen}
          className="relative z-50 md:hidden"
        >
          <div className="fixed inset-0 bg-black/40" aria-hidden />
          <div className="fixed inset-0 flex">
            <DialogPanel className="h-full w-64 max-w-[80%] bg-primary text-white">
              <DialogTitle className="sr-only">Menu do console</DialogTitle>
              <SidebarChrome
                pathname={pathname}
                onNavigate={() => setMobileOpen(false)}
              />
            </DialogPanel>
          </div>
        </Dialog>

        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
