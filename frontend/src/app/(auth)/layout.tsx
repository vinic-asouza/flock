import { AuthGuard } from '@/components/AuthGuard';
import { Users, BarChart3, Shield } from 'lucide-react';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <div className="h-screen bg-gray-50">
        <div className="flex h-screen">
          {/* Sidebar com informações da aplicação */}
          <div className="hidden lg:flex lg:w-1/2 bg-primary p-8 text-white">
            <div className="flex flex-col justify-center max-w-md mx-auto">
              <div className="mb-8">
                <h1 className="text-4xl font-bold mb-2">Flock</h1>
                <p className="text-white/80 text-lg">
                  Sistema para Gerenciamento de Membresia para Instituições Religiosas
                </p>
              </div>
              
              <div className="space-y-6">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Gerenciamento Completo</h3>
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
                      Análises demográficas e estatísticas detalhadas
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
          
          {/* Área de formulário */}
          <div className="flex-1 flex justify-center p-8 overflow-y-auto">
            <div className="w-full max-w-md py-8 pb-16">
              {children}
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
} 