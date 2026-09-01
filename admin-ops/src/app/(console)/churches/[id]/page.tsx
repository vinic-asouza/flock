import { Suspense } from "react";
import type { Metadata } from "next";
import { ChurchDetailView } from "@/components/ChurchDetailView";
import { OpsDetailSkeleton, OpsPage } from "@/components/ui";

export const metadata: Metadata = {
  title: "Ficha da Igreja",
};

export default function ChurchDetailPage() {
  return (
    <Suspense
      fallback={
        <OpsPage>
          <OpsDetailSkeleton />
        </OpsPage>
      }
    >
      <ChurchDetailView />
    </Suspense>
  );
}
