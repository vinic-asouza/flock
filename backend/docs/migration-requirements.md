# Requisitos de Migração de Membros

## Tratamento de Relacionamentos

### Congregações (congregation_id)

**Comportamento:**
- No frontend, durante o upload do CSV, deve haver uma opção para selecionar uma congregação específica
- Se nenhuma congregação for selecionada, usar "Sede" (que significa `congregation_id = null`)
- A congregação selecionada será aplicada a **TODOS** os membros importados do CSV
- Não será necessário mapear congregações por linha no CSV

**Implementação:**
- Campo de seleção no frontend: dropdown com lista de congregações + opção "Sede"
- Valor enviado no request: `congregation_id` (UUID ou null para "Sede")
- Backend aplica esse valor a todos os membros importados

### Cargos (role_id)

**Comportamento:**
- Durante a importação, `role_id` deve sempre ser `null`
- O usuário deve definir os cargos manualmente após a importação
- Não será necessário mapear cargos no CSV

**Implementação:**
- Backend sempre define `role_id = null` para todos os membros importados
- Não processar coluna de cargo no CSV (se existir, ignorar)

## Notas

- Essas regras simplificam o processo de importação
- Congregação é aplicada em massa para facilitar organização inicial
- Cargos são definidos manualmente para garantir precisão e controle

