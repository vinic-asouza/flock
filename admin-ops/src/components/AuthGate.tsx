"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useOpsAuth } from "@/context/OpsAuthContext";

function LoadingScreen({ label }: { label: string }) {
  return (
    <div className="flex min-h-[50vh] items-center justify-center px-6">
      <p className="text-sm text-muted" role="status">
        {label}
      </p>
    </div>
  );
}

export function AuthGate({
  requireAuth,
  children,
}: {
  requireAuth: boolean;
  children: React.ReactNode;
}) {
  const { user, isLoading } = useOpsAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) {
      return;
    }
    if (requireAuth && !user) {
      router.replace("/login");
    }
    if (!requireAuth && user) {
      router.replace("/");
    }
  }, [isLoading, user, requireAuth, router]);

  if (isLoading) {
    return <LoadingScreen label="Verificando sessão…" />;
  }

  if (requireAuth && !user) {
    return <LoadingScreen label="Redirecionando para o login…" />;
  }

  if (!requireAuth && user) {
    return <LoadingScreen label="Redirecionando…" />;
  }

  return <>{children}</>;
}
