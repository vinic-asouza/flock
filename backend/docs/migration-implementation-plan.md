# Plano de Implementação - Migração de Membros via CSV

## Visão Geral

Implementação da funcionalidade de importação de membros via arquivo CSV, permitindo migração de dados de planilhas ou outros sistemas.

## Fases de Implementação

### FASE 1: Backend - Infraestrutura Base

#### 1.1 Instalar Dependências
- [ ] Instalar `multer` para upload de arquivos
- [ ] Instalar `csv-parse` para parsing de CSV
- [ ] Instalar `iconv-lite` para tratamento de encoding
- [ ] Instalar tipos: `@types/multer`, `@types/csv-parse`

**Comando:**
```bash
npm install multer csv-parse iconv-lite
npm install -D @types/multer @types/csv-parse
```

#### 1.2 Criar Utilitários de CSV
- [ ] Criar `src/utils/csvParser.ts`:
  - Função para detectar encoding do arquivo
  - Função para parsear CSV com diferentes delimitadores
  - Função para normalizar dados (datas, telefones, CEP)
  - Função para mapear colunas do CSV para campos do sistema

#### 1.3 Criar Serviço de Importação
- [ ] Criar `src/services/memberImportService.ts`:
  - Função para validar estrutura do CSV
  - Função para validar dados linha por linha
  - Função para processar importação em lotes
  - Função para detectar duplicatas
  - Função para aplicar congregação em massa

### FASE 2: Backend - Controller e Rotas

#### 2.1 Criar Controller de Importação
- [ ] Criar `src/controllers/memberImportController.ts`:
  - `validateImport` - Valida CSV e retorna preview
  - `importMembers` - Processa importação completa
  - Tratamento de erros detalhado
  - Log de auditoria

#### 2.2 Criar Middleware de Upload
- [ ] Criar `src/middlewares/upload.ts`:
  - Configurar multer para aceitar apenas CSV
  - Limite de tamanho (ex: 10MB)
  - Validação de tipo de arquivo

#### 2.3 Adicionar Rotas
- [ ] Adicionar rotas em `src/routes/members.ts`:
  - `POST /api/members/import/validate` - Validar CSV
  - `POST /api/members/import` - Executar importação

### FASE 3: Backend - Validação e Processamento

#### 3.1 Mapeamento de Colunas
- [ ] Criar mapeamento padrão de colunas comuns:
  - Nome: "nome", "name", "NOME"
  - Data nascimento: "data_nascimento", "birth", "nascimento"
  - Gênero: "genero", "gender", "sexo"
  - etc.

#### 3.2 Normalização de Dados
- [ ] Implementar normalização de datas (múltiplos formatos)
- [ ] Implementar normalização de telefones
- [ ] Implementar normalização de CEP
- [ ] Implementar normalização de gênero
- [ ] Implementar normalização de estado civil

#### 3.3 Validação de Dados
- [ ] Reutilizar `memberValidator` existente
- [ ] Validação linha por linha
- [ ] Coleta de erros por linha
- [ ] Geração de relatório de validação

#### 3.4 Processamento em Lotes
- [ ] Processar em batches de 100 registros
- [ ] Tratamento de duplicatas (por documento)
- [ ] Aplicar `congregation_id` a todos os membros
- [ ] Garantir `role_id = null` para todos

### FASE 4: Frontend - Interface de Upload

#### 4.1 Criar Componente de Upload
- [ ] Criar `frontend/src/components/members/MemberImportModal.tsx`:
  - Input de arquivo CSV
  - Seleção de congregação (dropdown)
  - Botão de upload
  - Feedback visual

#### 4.2 Criar Página/Modal de Importação
- [ ] Criar interface para:
  - Upload do arquivo
  - Seleção de congregação
  - Preview dos dados validados
  - Exibição de erros
  - Confirmação antes de importar

#### 4.3 Integração com API
- [ ] Criar hook `useMemberImport.ts`:
  - Função para validar CSV
  - Função para importar membros
  - Estados de loading/error/success
  - Feedback de progresso

### FASE 5: Frontend - Preview e Validação

#### 5.1 Preview de Dados
- [ ] Exibir tabela com preview dos dados
- [ ] Destacar linhas com erros
- [ ] Mostrar estatísticas (total, válidos, inválidos)

#### 5.2 Exibição de Erros
- [ ] Lista de erros por linha
- [ ] Mensagens claras de erro
- [ ] Sugestões de correção

#### 5.3 Confirmação de Importação
- [ ] Modal de confirmação
- [ ] Resumo do que será importado
- [ ] Opção de cancelar

### FASE 6: Frontend - Feedback e Resultados

#### 6.1 Feedback de Progresso
- [ ] Indicador de progresso durante importação
- [ ] Mensagens de status

#### 6.2 Relatório Final
- [ ] Exibir resultado da importação:
  - Total processado
  - Sucessos
  - Erros
  - Duplicatas ignoradas
- [ ] Opção de baixar relatório de erros

### FASE 7: Testes e Documentação

#### 7.1 Testes
- [ ] Testes unitários dos utilitários
- [ ] Testes de integração do endpoint
- [ ] Testes com diferentes formatos de CSV
- [ ] Testes de validação

#### 7.2 Documentação
- [ ] Documentar formato CSV esperado
- [ ] Criar template de CSV para download
- [ ] Documentar API endpoints
- [ ] Guia de uso para usuários

## Estrutura de Arquivos

```
backend/
├── src/
│   ├── controllers/
│   │   └── memberImportController.ts (NOVO)
│   ├── middlewares/
│   │   └── upload.ts (NOVO)
│   ├── services/
│   │   └── memberImportService.ts (NOVO)
│   ├── utils/
│   │   └── csvParser.ts (NOVO)
│   └── routes/
│       └── members.ts (MODIFICAR)

frontend/
├── src/
│   ├── components/
│   │   └── members/
│   │       └── MemberImportModal.tsx (NOVO)
│   ├── hooks/
│   │   └── useMemberImport.ts (NOVO)
│   └── app/
│       └── (dashboard)/
│           └── members/
│               └── import/
│                   └── page.tsx (NOVO)
```

## Ordem de Execução Recomendada

1. **FASE 1** - Infraestrutura base (backend)
2. **FASE 2** - Controller e rotas (backend)
3. **FASE 3** - Validação e processamento (backend)
4. **FASE 4** - Interface de upload (frontend)
5. **FASE 5** - Preview e validação (frontend)
6. **FASE 6** - Feedback e resultados (frontend)
7. **FASE 7** - Testes e documentação

## Detalhes Técnicos

### Endpoint de Validação
```
POST /api/members/import/validate
Content-Type: multipart/form-data

Body:
- file: arquivo CSV
- congregation_id: UUID ou null (opcional)

Response:
{
  "valid": boolean,
  "totalRows": number,
  "validRows": number,
  "invalidRows": number,
  "errors": Array<{row: number, errors: Array<{field: string, message: string}>}>,
  "preview": Array<Member>
}
```

### Endpoint de Importação
```
POST /api/members/import
Content-Type: multipart/form-data

Body:
- file: arquivo CSV
- congregation_id: UUID ou null

Response:
{
  "success": boolean,
  "totalRows": number,
  "importedRows": number,
  "errorRows": number,
  "skippedRows": number,
  "errors": Array<{row: number, errors: Array<string>}>,
  "skipped": Array<{row: number, reason: string}>
}
```

## Considerações Importantes

1. **Encoding**: Suportar UTF-8 e ISO-8859-1 (Latin-1)
2. **Delimitadores**: Detectar automaticamente (vírgula, ponto-e-vírgula, tab)
3. **Datas**: Aceitar múltiplos formatos (DD/MM/YYYY, YYYY-MM-DD, etc.)
4. **Performance**: Processar em lotes para arquivos grandes
5. **Segurança**: Validar tipo de arquivo, tamanho máximo
6. **Auditoria**: Registrar todas as importações no log de auditoria

