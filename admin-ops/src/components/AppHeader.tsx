"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useOpsAuth } from "@/context/OpsAuthContext";

export function AppHeader() {
  const { user, isLoading, logout } = useOpsAuth();
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
    <header className="bg-primary text-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-4">
        <div>
          <p className="text-sm font-semibold tracking-wide">Flock · Admin OPS</p>
          <p className="text-xs text-white/70">Operação da plataforma</p>
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
