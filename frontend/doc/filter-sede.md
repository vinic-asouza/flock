# Filtro "Sede" - Membros sem Congregação

## Visão Geral

A funcionalidade de filtro "Sede" permite filtrar membros que não possuem congregação vinculada, ou seja, membros que pertencem diretamente à sede da igreja.

## Implementação

### Backend

#### Modificação no Controller
- **Arquivo**: `backend/src/controllers/memberController.ts`
- **Função**: `listMembers`
- **Mudança**: Adicionado suporte para o valor especial `"sede"` no parâmetro `congregation_id`

```typescript
if (congregation_id) {
  if (congregation_id === 'sede') {
    // Filtrar membros sem congregação (congregation_id IS NULL)
    query = query.is('congregation_id', null);
  } else {
    // Filtrar por congregação específica
    query = query.eq('congregation_id', congregation_id);
  }
}
```

#### Documentação da API
- **Arquivo**: `backend/docs/BACKEND_DOCUMENTATION.md`
- **Atualização**: Documentado o parâmetro `congregation_id` com suporte ao valor `"sede"`

### Frontend

#### Componente de Filtros
- **Arquivo**: `frontend/src/components/members/MemberFiltersBar.tsx`
- **Mudanças**:
  - Adicionada opção "Sede" no dropdown de congregação
  - Atualizado texto do botão para mostrar "Sede" quando selecionado

#### Chips de Filtros Ativos
- **Arquivo**: `frontend/src/components/members/ActiveFiltersChips.tsx`
- **Mudança**: Atualizada função `getFilterLabel` para tratar o valor especial `"sede"`

## Uso

### Via API
```http
GET /api/members?congregation_id=sede&page=1&limit=10
```

### Via Interface
1. Acesse a página de membros
2. No filtro "Congregação", selecione "Sede"
3. Os membros sem congregação serão exibidos

## Comportamento

- **Valor enviado**: `congregation_id=sede`
- **Query SQL**: `WHERE congregation_id IS NULL`
- **Resultado**: Membros que não possuem congregação vinculada

## Compatibilidade

- ✅ Compatível com outros filtros
- ✅ Funciona com paginação
- ✅ Funciona com ordenação
- ✅ Funciona com busca geral
- ✅ Funciona com filtros avançados

## Testes

### Cenários de Teste
1. **Filtro único**: Selecionar apenas "Sede"
2. **Filtro combinado**: "Sede" + "Ativo" + "Função específica"
3. **Busca + Filtro**: Buscar por nome + "Sede"
4. **Ordenação + Filtro**: Ordenar por idade + "Sede"

### Validação
- Verificar se apenas membros com `congregation_id = null` são retornados
- Verificar se a contagem total está correta
- Verificar se a paginação funciona corretamente 