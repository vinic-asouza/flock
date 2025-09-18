# Changelog

## [Unreleased] - 2024-01-XX

### Added
- **Filtros Avançados na API de Membros**: Implementação completa de filtros avançados para busca e relatórios
  - **Filtros por Campos Específicos**: gênero, estado civil, nacionalidade, ocupação, cidade, estado
  - **Filtros por Datas**: data de nascimento, batismo e admissão (períodos)
  - **Filtros por Faixa Etária**: cálculo automático de idade a partir da data de nascimento
  - **Ordenação Dinâmica**: por qualquer campo com ordem ascendente/descendente
  - **Busca Expandida**: agora inclui WhatsApp, cônjuge e documento
  - **Validações Robustas**: datas, faixa etária e parâmetros de entrada

- **Endpoint de Relatórios**: Novo endpoint `/api/members/reports` para análise estatística
  - **Estatísticas Gerais**: total, ativos, inativos, percentuais
  - **Demografia**: distribuição por gênero, estado civil, faixa etária, cidade, estado
  - **Estrutura da Igreja**: distribuição por cargos e congregações
  - **Análise Temporal**: batismos e admissões por ano e mês
  - **Dados de Membros**: listas de membros por ano e mês para visualização detalhada
  - **Top Ocupações**: ranking das 10 ocupações mais comuns
  - **Métricas Recentes**: membros e batismos dos últimos 30 dias

- **Paginação na API de Membros**: Implementada paginação completa com filtros avançados
  - Parâmetros de query: `page`, `limit`, `search`, `active`, `role_id`, `congregation_id`
  - Busca por nome, email ou telefone
  - Filtros por status ativo/inativo
  - Filtros por cargo e congregação
  - Informações de paginação na resposta (total, páginas, navegação)
  - Validações de parâmetros (página > 0, limite entre 1-100)
  - Performance otimizada com count eficiente do Supabase

### Changed
- **Estrutura de resposta da API de membros**: Agora retorna objeto com `data`, `pagination`, `filters` e `sorting`
- **Compatibilidade mantida**: Dados dos membros continuam no mesmo formato
- **Busca expandida**: Agora inclui WhatsApp, cônjuge e documento na busca geral

### Documentation
- Criada documentação completa da paginação e filtros avançados em `docs/pagination.md`
- Exemplos de uso e estrutura de resposta para todos os filtros
- Arquivo de exemplos de teste em `tests/pagination-examples.json`
- Arquivo de exemplos de filtros avançados em `tests/advanced-filters-examples.json`
- Documentação completa do endpoint de relatórios

### Technical Details
- Uso do parâmetro `count: 'exact'` do Supabase para contagem eficiente
- Implementação de filtros dinâmicos com query builder
- Busca case-insensitive com `ilike` no Supabase
- Cálculo de idade em memória para filtros de faixa etária
- Ordenação dinâmica por qualquer campo
- Validação de datas com formato YYYY-MM-DD
- Análise estatística completa para relatórios
- Tratamento de erros e validações robustas 