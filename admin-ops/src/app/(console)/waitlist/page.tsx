import { Suspense } from "react";
import type { Metadata } from "next";
import { WaitlistListView } from "@/components/WaitlistListView";
import { OpsPage, OpsTableSkeleton } from "@/components/ui";

export const metadata: Metadata = {
  title: "Lista de espera",
};

export default function WaitlistPage() {
  return (
    <Suspense
      fallback={
        <OpsPage>
          <OpsTableSkeleton />
        </OpsPage>
      }
    >
      <WaitlistListView />
    </Suspense>
  );
}
