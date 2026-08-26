import { Suspense } from "react";
import type { Metadata } from "next";
import { AuthGate } from "@/components/AuthGate";
import { ChurchDetailView } from "@/components/ChurchDetailView";
import { LoadingState } from "@/components/ConsoleState";

export const metadata: Metadata = {
  title: "Ficha da Igreja",
};

export default function ChurchDetailPage() {
  return (
    <AuthGate requireAuth>
      <Suspense
        fallback={
          <div className="mx-auto max-w-6xl px-6 py-8">
            <LoadingState label="Carregando ficha…" />
          </div>
        }
      >
        <ChurchDetailView />
      </Suspense>
    </AuthGate>
  );
}
