import { AuthGate } from "@/components/AuthGate";
import { OperatorShell } from "@/components/OperatorShell";

export default function HomePage() {
  return (
    <AuthGate requireAuth>
      <OperatorShell />
    </AuthGate>
  );
}
