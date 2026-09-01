import { Suspense } from "react";
import type { Metadata } from "next";
import { WaitlistListView } from "@/components/WaitlistListView";
import { OpsCardListSkeleton, OpsPage } from "@/components/ui";

export const metadata: Metadata = {
  title: "Lista de espera",
};

export default function WaitlistPage() {
  return (
    <Suspense
      fallback={
        <OpsPage>
          <OpsCardListSkeleton />
        </OpsPage>
      }
    >
      <WaitlistListView />
    </Suspense>
  );
}
