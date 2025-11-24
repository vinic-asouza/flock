import { Header } from "@/components/Header";
import { WaitlistForm } from "@/components/WaitlistForm";
import { Footer } from "@/components/Footer";

export const metadata = {
  title: "Lista de Espera - Flock",
  description: "Cadastre-se na lista de espera e seja notificado quando o Flock estiver disponível para sua igreja.",
};

export default function WaitlistPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 flex items-center justify-center py-12 px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-primary mb-2">
              Junte-se à Lista de Espera
            </h1>
            <p className="text-muted">
              Seja notificado quando o Flock estiver disponível para sua igreja
            </p>
          </div>
          <WaitlistForm />
        </div>
      </main>
      <Footer />
    </div>
  );
}

