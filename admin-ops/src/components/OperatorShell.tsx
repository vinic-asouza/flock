"use client";

import { useOpsAuth } from "@/context/OpsAuthContext";

export function OperatorShell() {
  const { user } = useOpsAuth();

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6 px-6 py-16">
      <div>
        <h1 className="text-2xl font-semibold text-primary">Admin OPS</h1>
        <p className="mt-2 text-sm text-muted">
          Estrutura inicial — o console operacional vem nas próximas entregas.
        </p>
      </div>
      <p className="text-sm leading-6 text-foreground">
        Sessão de operador ativa
        {user?.email ? (
          <>
            {" "}
            para <span className="font-medium">{user.email}</span>
          </>
        ) : null}
        . Este app não é o Painel da Igreja e ainda não inclui overview, lista
        de Igrejas nem waitlist.
      </p>
    </div>
  );
}
