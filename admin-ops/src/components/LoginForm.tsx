"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { useOpsAuth } from "@/context/OpsAuthContext";
import { formatOpsAuthError } from "@/lib/opsAuthErrors";
import { OPS_BRAND } from "@/lib/opsNav";
import { OpsButton, OpsError, OpsInput } from "@/components/ui";

const loginSchema = z.object({
  email: z.string().email("E-mail inválido"),
  password: z.string().min(1, "Senha obrigatória"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export function LoginForm() {
  const { login } = useOpsAuth();
  const router = useRouter();
  const [formError, setFormError] = useState<{
    title: string;
    details?: string;
  } | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      setFormError(null);
      await login(data.email, data.password);
      router.replace("/");
    } catch (err) {
      const view = formatOpsAuthError(err);
      setFormError(view);
      toast.error(view.title);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <p className="text-sm font-semibold tracking-wide text-primary">
          {OPS_BRAND}
        </p>
        <h1 className="mt-4 text-2xl font-semibold text-primary">
          Entrar no Admin OPS
        </h1>
        <p className="mt-2 text-sm text-muted">
          Acesso exclusivo para operadores da plataforma. Este não é o Painel da
          Igreja.
        </p>
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="mt-6 flex flex-col gap-4 rounded-lg border border-gray-200 bg-white p-6"
          noValidate
        >
          {formError ? (
            <OpsError title={formError.title} details={formError.details} />
          ) : null}

          <OpsInput
            label="E-mail"
            type="email"
            autoComplete="username"
            placeholder="operador@flockapp.com.br"
            disabled={isSubmitting}
            error={errors.email?.message}
            {...register("email")}
          />

          <OpsInput
            label="Senha"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            disabled={isSubmitting}
            error={errors.password?.message}
            {...register("password")}
          />

          <OpsButton type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Entrando…" : "Entrar"}
          </OpsButton>
        </form>
      </div>
    </div>
  );
}
