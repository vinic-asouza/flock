import { AuthGuard } from '@/components/AuthGuard';
import { FlockLogo } from '@/components/ui/FlockLogo';
import { Users, BarChart3, Shield } from 'lucide-react';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <div className="min-h-dvh bg-gray-50 overflow-x-hidden">
        <div className="flex min-h-dvh">
          {/* Sidebar com informações da aplicação — desktop lg+ */}
          <div className="hidden lg:flex lg:w-1/2 bg-primary bg-gradient-to-r from-primary via-[#0d0a3a] to-primary p-8 text-white">
            <div className="flex flex-col justify-center max-w-md mx-auto">
              <div className="mb-8">
                <div className="flex items-center mb-2 gap-3">
                  <FlockLogo size={40} className="text-white" />
                  <h1 className="text-4xl font-bold">Flock</h1>
                </div>
                <p className="text-white/80 text-lg">
                  Sistema para Gerenciamento Eclesiástico
                </p>
              </div>

              <div className="space-y-6">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Gerenciamento de Membresia</h3>
                    <p className="text-white/80 text-sm">
                      Controle total sobre membros
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                    <BarChart3 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Relatórios Avançados</h3>
                    <p className="text-white/80 text-sm">
                      Análises e estatísticas detalhadas
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                    <Shield className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Segurança</h3>
                    <p className="text-white/80 text-sm">
                      Dados completamente isolados e seguros
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Área de formulário — scrollável (teclado / forms longos) */}
          <div className="flex-1 min-h-0 min-w-0 flex justify-center overflow-y-auto overflow-x-hidden px-4 sm:px-6 lg:px-8 pt-[calc(1.5rem+env(safe-area-inset-top))] pb-[calc(2rem+env(safe-area-inset-bottom))] sm:pt-[calc(2rem+env(safe-area-inset-top))] sm:pb-[calc(2rem+env(safe-area-inset-bottom))]">
            <div className="w-full max-w-md py-4 sm:py-8 pb-12 my-auto min-w-0">
              {children}
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
