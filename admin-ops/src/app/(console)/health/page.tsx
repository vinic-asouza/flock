import type { Metadata } from "next";
import { HealthView } from "@/components/HealthView";

export const metadata: Metadata = {
  title: "Saúde",
};

export default function HealthPage() {
  return <HealthView />;
}
