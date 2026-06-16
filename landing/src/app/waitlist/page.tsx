import { Header } from "@/components/Header";
import { WaitlistForm } from "@/components/WaitlistForm";
import { Footer } from "@/components/Footer";

export const metadata = {
  title: "Fale Conosco - Flock",
  description: "Solicite contato com a equipe Flock. O sistema já está disponível para cadastro e assinatura.",
};

type WaitlistPageProps = {
  searchParams: Promise<{ plan?: string }>;
};

export default async function WaitlistPage({ searchParams }: WaitlistPageProps) {
  const { plan } = await searchParams;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 flex items-center justify-center py-12 px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-primary mb-2">
              Fale Conosco
            </h1>
            <p className="text-muted">
              O Flock já está disponível. Envie sua solicitação e nossa equipe entrará em contato.
            </p>
          </div>
          <WaitlistForm initialPlan={plan} />
        </div>
      </main>
      <Footer />
    </div>
  );
}
