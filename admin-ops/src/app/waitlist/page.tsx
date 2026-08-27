import { Suspense } from "react";
import type { Metadata } from "next";
import { AuthGate } from "@/components/AuthGate";
import { WaitlistListView } from "@/components/WaitlistListView";
import { LoadingState } from "@/components/ConsoleState";

export const metadata: Metadata = {
  title: "Lista de espera",
};

export default function WaitlistPage() {
  return (
    <AuthGate requireAuth>
      <Suspense
        fallback={
          <div className="mx-auto max-w-6xl px-6 py-8">
            <LoadingState label="Carregando Lista de espera…" />
          </div>
        }
      >
        <WaitlistListView />
      </Suspense>
    </AuthGate>
  );
}
