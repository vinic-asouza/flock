import { useState, useEffect } from 'react';

interface Profession {
  id: string;
  name: string;
  category?: string;
}

export function useProfessions() {
  const [professions, setProfessions] = useState<Profession[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfessions = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Lista de profissões baseada na CBO (Classificação Brasileira de Ocupações)
        // Focada nas profissões mais comuns no Brasil
        const professionsList: Profession[] = [
          // Administração e Negócios
          { id: 'adm-001', name: 'Administrador', category: 'Administração' },
          { id: 'adm-002', name: 'Contador', category: 'Administração' },
          { id: 'adm-003', name: 'Assistente Administrativo', category: 'Administração' },
          { id: 'adm-004', name: 'Secretário(a)', category: 'Administração' },
          { id: 'adm-005', name: 'Gerente', category: 'Administração' },
          
          // Educação
          { id: 'edu-001', name: 'Professor(a)', category: 'Educação' },
          { id: 'edu-002', name: 'Pedagogo(a)', category: 'Educação' },
          { id: 'edu-003', name: 'Coordenador(a) Pedagógico(a)', category: 'Educação' },
          { id: 'edu-004', name: 'Diretor(a) de Escola', category: 'Educação' },
          
          // Saúde
          { id: 'saude-001', name: 'Médico(a)', category: 'Saúde' },
          { id: 'saude-002', name: 'Enfermeiro(a)', category: 'Saúde' },
          { id: 'saude-003', name: 'Técnico(a) em Enfermagem', category: 'Saúde' },
          { id: 'saude-004', name: 'Farmacêutico(a)', category: 'Saúde' },
          { id: 'saude-005', name: 'Dentista', category: 'Saúde' },
          { id: 'saude-006', name: 'Psicólogo(a)', category: 'Saúde' },
          { id: 'saude-007', name: 'Fisioterapeuta', category: 'Saúde' },
          
          // Engenharia e Tecnologia
          { id: 'eng-001', name: 'Engenheiro(a)', category: 'Engenharia' },
          { id: 'eng-002', name: 'Técnico(a) em Eletrônica', category: 'Engenharia' },
          { id: 'eng-003', name: 'Programador(a)', category: 'Tecnologia' },
          { id: 'eng-004', name: 'Analista de Sistemas', category: 'Tecnologia' },
          { id: 'eng-005', name: 'Designer', category: 'Tecnologia' },
          
          // Serviços
          { id: 'serv-001', name: 'Vendedor(a)', category: 'Vendas' },
          { id: 'serv-002', name: 'Atendente', category: 'Atendimento' },
          { id: 'serv-003', name: 'Recepcionista', category: 'Atendimento' },
          { id: 'serv-004', name: 'Segurança', category: 'Segurança' },
          { id: 'serv-005', name: 'Porteiro(a)', category: 'Segurança' },
          { id: 'serv-006', name: 'Zelador(a)', category: 'Manutenção' },
          { id: 'serv-007', name: 'Faxineiro(a)', category: 'Limpeza' },
          
          // Construção Civil
          { id: 'constr-001', name: 'Pedreiro(a)', category: 'Construção' },
          { id: 'constr-002', name: 'Pintor(a)', category: 'Construção' },
          { id: 'constr-003', name: 'Eletricista', category: 'Construção' },
          { id: 'constr-004', name: 'Encanador(a)', category: 'Construção' },
          { id: 'constr-005', name: 'Marceneiro(a)', category: 'Construção' },
          
          // Transporte
          { id: 'transp-001', name: 'Motorista', category: 'Transporte' },
          { id: 'transp-002', name: 'Taxista', category: 'Transporte' },
          { id: 'transp-003', name: 'Caminhoneiro(a)', category: 'Transporte' },
          { id: 'transp-004', name: 'Entregador(a)', category: 'Transporte' },
          
          // Alimentação
          { id: 'alim-001', name: 'Cozinheiro(a)', category: 'Alimentação' },
          { id: 'alim-002', name: 'Garçom/Garçonete', category: 'Alimentação' },
          { id: 'alim-003', name: 'Padeiro(a)', category: 'Alimentação' },
          { id: 'alim-004', name: 'Confeiteiro(a)', category: 'Alimentação' },
          
          // Beleza e Estética
          { id: 'beleza-001', name: 'Cabeleireiro(a)', category: 'Beleza' },
          { id: 'beleza-002', name: 'Manicure', category: 'Beleza' },
          { id: 'beleza-003', name: 'Esteticista', category: 'Beleza' },
          { id: 'beleza-004', name: 'Barbeiro(a)', category: 'Beleza' },
          
          // Agricultura
          { id: 'agro-001', name: 'Agricultor(a)', category: 'Agricultura' },
          { id: 'agro-002', name: 'Pecuarista', category: 'Agricultura' },
          { id: 'agro-003', name: 'Trabalhador(a) Rural', category: 'Agricultura' },
          
          // Comércio
          { id: 'comercio-001', name: 'Comerciante', category: 'Comércio' },
          { id: 'comercio-002', name: 'Caixa', category: 'Comércio' },
          { id: 'comercio-003', name: 'Estoquista', category: 'Comércio' },
          
          // Artes e Ofícios
          { id: 'artes-001', name: 'Artista', category: 'Artes' },
          { id: 'artes-002', name: 'Músico(a)', category: 'Artes' },
          { id: 'artes-003', name: 'Artesão(ã)', category: 'Artes' },
          
          // Outros
          { id: 'outros-001', name: 'Aposentado(a)', category: 'Outros' },
          { id: 'outros-002', name: 'Estudante', category: 'Outros' },
          { id: 'outros-003', name: 'Desempregado(a)', category: 'Outros' },
          { id: 'outros-004', name: 'Dona de Casa', category: 'Outros' },
          { id: 'outros-005', name: 'Pastor(a)', category: 'Religião' },
          { id: 'outros-006', name: 'Missionário(a)', category: 'Religião' },
          { id: 'outros-007', name: 'Evangelista', category: 'Religião' },
          { id: 'outros-008', name: 'Diácono(a)', category: 'Religião' },
          { id: 'outros-009', name: 'Presbítero(a)', category: 'Religião' },
          { id: 'outros-010', name: 'Obreiro(a)', category: 'Religião' },
        ];

        setProfessions(professionsList);
      } catch (err) {
        setError('Erro ao carregar lista de profissões');
        console.error('Erro ao carregar profissões:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfessions();
  }, []);

  // Função para buscar profissões por termo
  const searchProfessions = (term: string): Profession[] => {
    if (!term.trim()) return professions;
    
    const searchTerm = term.toLowerCase();
    return professions.filter(profession =>
      profession.name.toLowerCase().includes(searchTerm) ||
      (profession.category && profession.category.toLowerCase().includes(searchTerm))
    );
  };

  // Função para obter profissões por categoria
  const getProfessionsByCategory = (category: string): Profession[] => {
    return professions.filter(profession => profession.category === category);
  };

  // Função para obter todas as categorias
  const getCategories = (): string[] => {
    const categories = professions
      .map(p => p.category)
      .filter((category): category is string => Boolean(category));
    return Array.from(new Set(categories)).sort();
  };

  return {
    professions,
    loading,
    error,
    searchProfessions,
    getProfessionsByCategory,
    getCategories
  };
}
