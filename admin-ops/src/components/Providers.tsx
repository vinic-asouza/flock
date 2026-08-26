"use client";

import { OpsAuthProvider } from "@/context/OpsAuthContext";

export function Providers({ children }: { children: React.ReactNode }) {
  return <OpsAuthProvider>{children}</OpsAuthProvider>;
}
