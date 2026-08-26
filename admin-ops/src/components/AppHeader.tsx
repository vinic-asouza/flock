"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useOpsAuth } from "@/context/OpsAuthContext";

const NAV_ITEMS = [
  { href: "/", label: "Overview", match: "exact" as const },
  { href: "/churches", label: "Igrejas", match: "prefix" as const },
];

export function AppHeader() {
  const { user, isLoading, logout } = useOpsAuth();
  const router = useRouter();
  const pathname = usePathname();
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
    <header className="bg-primary text-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-4">
        <div className="flex min-w-0 flex-wrap items-center gap-6">
          <div>
            <p className="text-sm font-semibold tracking-wide">
              Flock · Admin OPS
            </p>
            <p className="text-xs text-white/70">Operação da plataforma</p>
          </div>
          {!isLoading && user ? (
            <nav aria-label="Console" className="flex items-center gap-1">
              {NAV_ITEMS.map((item) => {
                const isCurrent =
                  item.match === "exact"
                    ? pathname === item.href
                    : pathname === item.href ||
                      pathname.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={isCurrent ? "page" : undefined}
                    className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                      isCurrent
                        ? "bg-white/15 text-white"
                        : "text-white/80 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          ) : null}
        </div>
        {!isLoading && user ? (
          <div className="flex min-w-0 items-center gap-3">
            <p className="truncate text-xs text-white/90" title={user.email}>
              {user.email}
            </p>
            <button
              type="button"
              onClick={() => void handleLogout()}
              disabled={isLoggingOut}
              className="shrink-0 rounded-md border border-white/30 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/10 disabled:opacity-60"
            >
              {isLoggingOut ? "Saindo…" : "Sair"}
            </button>
          </div>
        ) : null}
      </div>
    </header>
  );
}
