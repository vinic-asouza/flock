import { AuthGate } from "@/components/AuthGate";
import { OpsShell } from "@/components/OpsShell";

export default function ConsoleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGate requireAuth>
      <OpsShell>{children}</OpsShell>
    </AuthGate>
  );
}
