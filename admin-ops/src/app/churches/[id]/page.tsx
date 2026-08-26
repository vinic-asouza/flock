import type { Metadata } from "next";
import { AuthGate } from "@/components/AuthGate";
import { ChurchDetailView } from "@/components/ChurchDetailView";

export const metadata: Metadata = {
  title: "Ficha da Igreja",
};

export default function ChurchDetailPage() {
  return (
    <AuthGate requireAuth>
      <ChurchDetailView />
    </AuthGate>
  );
}
