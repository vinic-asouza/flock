"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { useOpsAuth } from "@/context/OpsAuthContext";
import { formatOpsAuthError } from "@/lib/opsAuthErrors";

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
    <div className="mx-auto flex max-w-md flex-col gap-6 px-6 py-16">
      <div>
        <h1 className="text-2xl font-semibold text-primary">Entrar</h1>
        <p className="mt-2 text-sm text-muted">
          Acesso exclusivo para operadores da plataforma. Este não é o Painel da
          Igreja.
        </p>
      </div>
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col gap-4 rounded-lg border border-gray-200 bg-white p-6"
        noValidate
      >
        {formError ? (
          <div
            className="rounded-md border border-red-200 bg-red-50 p-3"
            role="alert"
          >
            <p className="text-sm font-medium text-red-700">{formError.title}</p>
            {formError.details ? (
              <p className="mt-1 text-sm text-red-600">{formError.details}</p>
            ) : null}
          </div>
        ) : null}

        <label className="flex flex-col gap-1 text-sm font-medium text-primary">
          E-mail
          <input
            type="email"
            autoComplete="username"
            placeholder="operador@flockapp.com.br"
            disabled={isSubmitting}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-50"
            {...register("email")}
          />
          {errors.email?.message ? (
            <span className="font-normal text-red-600">{errors.email.message}</span>
          ) : null}
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium text-primary">
          Senha
          <input
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            disabled={isSubmitting}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-50"
            {...register("password")}
          />
          {errors.password?.message ? (
            <span className="font-normal text-red-600">
              {errors.password.message}
            </span>
          ) : null}
        </label>

        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {isSubmitting ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </div>
  );
}
