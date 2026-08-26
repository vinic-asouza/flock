import type { Metadata } from "next";
import { AuthGate } from "@/components/AuthGate";
import { HealthView } from "@/components/HealthView";

export const metadata: Metadata = {
  title: "Saúde",
};

export default function HealthPage() {
  return (
    <AuthGate requireAuth>
      <HealthView />
    </AuthGate>
  );
}
