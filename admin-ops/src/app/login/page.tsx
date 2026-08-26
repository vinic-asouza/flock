import type { Metadata } from "next";
import { AuthGate } from "@/components/AuthGate";
import { LoginForm } from "@/components/LoginForm";

export const metadata: Metadata = {
  title: "Login",
};

export default function LoginPage() {
  return (
    <AuthGate requireAuth={false}>
      <LoginForm />
    </AuthGate>
  );
}
