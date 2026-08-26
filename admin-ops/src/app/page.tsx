import { AuthGate } from "@/components/AuthGate";
import { OverviewView } from "@/components/OverviewView";

export default function HomePage() {
  return (
    <AuthGate requireAuth>
      <OverviewView />
    </AuthGate>
  );
}
