"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useOpsAuth } from "@/context/OpsAuthContext";
import { OpsShellSkeleton } from "@/components/ui";

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
    return requireAuth ? (
      <OpsShellSkeleton />
    ) : (
      <p className="sr-only" role="status">
        Verificando sessão…
      </p>
    );
  }

  if (requireAuth && !user) {
    return <OpsShellSkeleton />;
  }

  if (!requireAuth && user) {
    return (
      <p className="sr-only" role="status">
        Redirecionando…
      </p>
    );
  }

  return <>{children}</>;
}
