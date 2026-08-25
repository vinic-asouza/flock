import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Login",
};

export default function LoginPage() {
  return (
    <div className="mx-auto flex max-w-md flex-col gap-6 px-6 py-16">
      <div>
        <h1 className="text-2xl font-semibold text-primary">Entrar</h1>
        <p className="mt-2 text-sm text-muted">
          Autenticação de operador ainda não está ligada. Esta tela só confirma
          que o app sobe no monorepo.
        </p>
      </div>
      <form className="flex flex-col gap-4 rounded-lg border border-gray-200 bg-white p-6">
        <label className="flex flex-col gap-1 text-sm font-medium text-primary">
          E-mail
          <input
            type="email"
            disabled
            placeholder="operador@flockapp.com.br"
            className="rounded-md border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-50"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-primary">
          Senha
          <input
            type="password"
            disabled
            placeholder="••••••••"
            className="rounded-md border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-50"
          />
        </label>
        <button
          type="button"
          disabled
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white opacity-50"
        >
          Entrar (em breve)
        </button>
      </form>
      <Link href="/" className="text-sm text-primary underline">
        Voltar
      </Link>
    </div>
  );
}
