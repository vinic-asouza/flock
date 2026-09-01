import { Suspense } from "react";
import type { Metadata } from "next";
import { ChurchesListView } from "@/components/ChurchesListView";
import { OpsPage, OpsTableSkeleton } from "@/components/ui";

export const metadata: Metadata = {
  title: "Igrejas",
};

export default function ChurchesPage() {
  return (
    <Suspense
      fallback={
        <OpsPage>
          <OpsTableSkeleton />
        </OpsPage>
      }
    >
      <ChurchesListView />
    </Suspense>
  );
}
