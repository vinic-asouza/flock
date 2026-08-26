import { Suspense } from "react";
import type { Metadata } from "next";
import { AuthGate } from "@/components/AuthGate";
import { ChurchesListView } from "@/components/ChurchesListView";
import { LoadingState } from "@/components/ConsoleState";

export const metadata: Metadata = {
  title: "Igrejas",
};

export default function ChurchesPage() {
  return (
    <AuthGate requireAuth>
      <Suspense
        fallback={
          <div className="mx-auto max-w-6xl px-6 py-8">
            <LoadingState label="Carregando Igrejas…" />
          </div>
        }
      >
        <ChurchesListView />
      </Suspense>
    </AuthGate>
  );
}
