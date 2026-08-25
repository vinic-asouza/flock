import Link from "next/link";

export default function HomePage() {
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6 px-6 py-16">
      <div>
        <h1 className="text-2xl font-semibold text-primary">Admin OPS</h1>
        <p className="mt-2 text-sm text-muted">
          Estrutura inicial — o console operacional vem nas próximas entregas.
        </p>
      </div>
      <p className="text-sm leading-6 text-foreground">
        Este app é o centro operacional interno do SaaS. Não substitui o Painel
        da Igreja. Login de operador, sessão e módulos (overview, Igrejas,
        waitlist, saúde) entram em Issues seguintes.
      </p>
      <Link
        href="/login"
        className="inline-flex w-fit rounded-md bg-primary px-4 py-2 text-sm font-medium text-white"
      >
        Ir para o login (placeholder)
      </Link>
    </div>
  );
}
