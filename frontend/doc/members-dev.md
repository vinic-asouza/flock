Fase 1: Estrutura e Layout Base
[ ] Criar estrutura de pastas para o módulo de membros (/features/members ou /app/(dashboard)/members)
[ ] Implementar layout base das páginas (listagem, formulário, detalhes)
[ ] Garantir responsividade e consistência visual com o restante do sistema
[ ] Criar componentes reutilizáveis: filtros, tabela/lista, chips de filtro, paginação, modal de confirmação

Fase 2: Listagem de Membros
[ ] Implementar chamada à API /members com paginação, busca e filtros básicos
[ ] Exibir membros em lista com informações principais (nome, idade, status, cargo, congregação, contato)
[ ] Implementar filtros rápidos (status, função, congregação)
[ ] Implementar busca por nome, email ou telefone
[ ] Implementar ordenação (nome, idade, data de batismo, data de cadastro)
[ ] Implementar paginação
[ ] Exibir chips de filtros ativos e botão para limpar filtros

Fase 3: Filtros Avançados
[ ] Implementar modal ou área expandida para filtros avançados (estado civil, nacionalidade, faixa etária, datas, cidade, estado)
[ ] Sincronizar filtros avançados com a query da API
[ ] Garantir UX fluida (ex: loading, feedback de filtros aplicados)

Fase 4: CRUD de Membros
[ ] Implementar formulário de criação de membro (com validação, máscaras e UX amigável)
[ ] Implementar formulário de edição (pré-preenchido, com validação)
[ ] Implementar visualização detalhada do membro
[ ] Implementar exclusão com modal de confirmação
[ ] Garantir atualização automática da lista após operações

Fase 5: Integrações e Otimizações
[ ] Integrar seleção dinâmica de cargos e congregações (autocomplete ou select)
[ ] Implementar feedback visual para loading, sucesso e erro
[ ] Garantir tratamento de erros robusto (exibir mensagens amigáveis)
[ ] Implementar debounce na busca e filtros para evitar requisições excessivas
[ ] Garantir acessibilidade e navegação por teclado

Fase 6: Refino e Relatórios
[ ] Implementar exportação de dados (CSV, PDF, etc) se necessário
[ ] Integrar relatórios estatísticos (dashboard de membros)
[ ] Testes de usabilidade e performance
[ ] Refino visual e responsividade