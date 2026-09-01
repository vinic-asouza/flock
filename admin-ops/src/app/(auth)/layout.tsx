import { AuthGate } from "@/components/AuthGate";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthGate requireAuth={false}>{children}</AuthGate>;
}
