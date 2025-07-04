# 🏛️ **Issue: Implementar Filtro "Sede" para Membros sem Congregação**

## 🎯 **Objetivo**
Implementar funcionalidade no backend para filtrar membros que não possuem congregação vinculada (membros da sede principal da igreja).

## 🔍 **Contexto Atual**

### **Estrutura de Dados**
```typescript
interface Member {
  // ...
  congregation_id?: string;     // ID da congregação (foreign key) - OPCIONAL
  congregation?: Congregation | null; // Dados da congregação ou null
  // ...
}
```

### **Problema Identificado**
- Membros sem congregação têm `congregation_id: null` e `congregation: null`
- API não possui parâmetro para filtrar valores nulos
- Tentativas com `congregation_id=null`, `congregation_id=""`, `congregation_id="null"` não funcionam
- Frontend precisa da opção "Sede" para filtrar membros sem congregação

## 💡 **Solução: Parâmetro Especial `no_congregation`**

### **Especificação Técnica**

#### **Endpoint Afetado**
```
GET /api/members
```

#### **Novo Parâmetro de Query**
| Parâmetro | Tipo | Descrição | Exemplo |
|-----------|------|-----------|---------|
| `no_congregation` | boolean | Filtra membros sem congregação | `no_congregation=true` |

#### **Comportamento Esperado**

**Cenário 1: Filtro Básico**
```typescript
// Requisição
GET /api/members?no_congregation=true&page=1&limit=10

// Resposta esperada
{
  "data": [
    {
      "id": "c45ff8b3-ab5b-4bc4-b3a0-23bfdb91e234",
      "name": "Alice Cavalcanti Silva",
      "congregation_id": null,
      "congregation": null,
      // ... outros campos
    }
  ],
  "pagination": { /* ... */ },
  "filters": {
    "no_congregation": true,
    // ... outros filtros
  }
}
```

**Cenário 2: Combinação com Outros Filtros**
```typescript
// Requisição
GET /api/members?no_congregation=true&active=true&gender=Masculino&page=1&limit=10

// Resposta: Membros sem congregação + ativos + masculinos
```

### **Implementação SQL**

#### **Opção 1: Parâmetro `no_congregation`**
```sql
SELECT * FROM members 
WHERE church_id = $1 
  AND ($2::boolean IS NULL OR 
       ($2 = true AND congregation_id IS NULL) OR 
       ($2 = false AND congregation_id IS NOT NULL))
  AND active = $3
ORDER BY name
LIMIT $4 OFFSET $5;
```

#### **Opção 2: Condição Simples**
```sql
SELECT * FROM members 
WHERE church_id = $1 
  AND (congregation_id IS NULL OR congregation_id = $2)
  AND active = $3
ORDER BY name
LIMIT $4 OFFSET $5;
```

### **Validações Necessárias**

1. **Compatibilidade**: Não deve quebrar filtros existentes
2. **Exclusividade**: `no_congregation=true` deve ignorar `congregation_id` se ambos estiverem presentes
3. **Paginação**: Deve funcionar corretamente com paginação
4. **Performance**: Deve ser otimizado com índices adequados

### **Índice Recomendado**
```sql
CREATE INDEX idx_members_congregation_id ON members(congregation_id) WHERE congregation_id IS NULL;
```

## 🧪 **Casos de Teste**

### **Teste 1: Filtro Básico**
```bash
curl "http://localhost:4000/api/members?no_congregation=true&page=1&limit=5"
```
**Esperado**: Retorna apenas membros com `congregation_id: null`

### **Teste 2: Combinação com Outros Filtros**
```bash
curl "http://localhost:4000/api/members?no_congregation=true&active=true&gender=Masculino&page=1&limit=10"
```
**Esperado**: Membros sem congregação + ativos + masculinos

### **Teste 3: Paginação**
```bash
curl "http://localhost:4000/api/members?no_congregation=true&page=2&limit=5"
```
**Esperado**: Segunda página de membros sem congregação

### **Teste 4: Contagem Total**
```bash
curl "http://localhost:4000/api/members?no_congregation=true&page=1&limit=1"
```
**Esperado**: `pagination.total` deve refletir total de membros sem congregação

### **Teste 5: Compatibilidade**
```bash
curl "http://localhost:4000/api/members?congregation_id=123&no_congregation=true&page=1&limit=10"
```
**Esperado**: `no_congregation=true` deve ter prioridade, ignorando `congregation_id`

## 📊 **Impacto**

### **Frontend**
- ✅ Fácil implementação
- ✅ Compatível com filtros existentes
- ✅ Melhora UX para igrejas com múltiplas congregações

### **Backend**
- ✅ Baixo impacto (apenas adicionar condição WHERE)
- ✅ Mantém compatibilidade com API existente
- ✅ Performance otimizada com índices

### **Banco de Dados**
- ✅ Índice recomendado para otimizar consultas
- ✅ Não afeta estrutura existente

## 🚀 **Implementação no Frontend (Após Backend)**

### **Adicionar Opção "Sede"**
```typescript
// Em MemberFiltersBar.tsx
<select value={filters.congregationId} onChange={e => onChange({ congregationId: e.target.value })}>
  <option value="">Todas as congregações</option>
  <option value="sede">Sede</option> {/* Adicionar de volta */}
  {congregations.map(cong => (
    <option key={cong.id} value={cong.id}>{cong.name}</option>
  ))}
</select>
```

### **Atualizar Lógica de Filtros**
```typescript
// Em MemberList.tsx - filtersToApiParams
if (filters.congregationId && filters.congregationId.trim()) {
  if (filters.congregationId === 'sede') {
    params.no_congregation = true; // Novo parâmetro
  } else {
    params.congregation_id = filters.congregationId.trim();
  }
}
```

### **Atualizar API Service**
```typescript
// Em api.ts - listMembers
async listMembers(params: {
  // ... outros parâmetros
  no_congregation?: boolean; // Adicionar novo parâmetro
}) {
  // ... lógica existente
  if (params.no_congregation) queryParams.append('no_congregation', 'true');
  // ... resto da implementação
}
```

## 📋 **Checklist de Implementação**

### **Backend**
- [ ] Adicionar parâmetro `no_congregation` na validação
- [ ] Implementar lógica SQL para filtrar `congregation_id IS NULL`
- [ ] Adicionar índice para otimização
- [ ] Implementar testes unitários
- [ ] Testar compatibilidade com filtros existentes
- [ ] Documentar novo parâmetro

### **Frontend (Após Backend)**
- [ ] Adicionar opção "Sede" no select de congregações
- [ ] Implementar lógica para `no_congregation=true`
- [ ] Atualizar interface da API
- [ ] Testar funcionalidade
- [ ] Remover código temporário

## 🎯 **Prioridade**
**Média** - Funcionalidade importante para UX, mas não crítica para funcionamento básico

## 📝 **Notas**
- Implementação deve manter compatibilidade com API existente
- Considerar performance para igrejas com muitos membros
- Documentar mudança na documentação da API
