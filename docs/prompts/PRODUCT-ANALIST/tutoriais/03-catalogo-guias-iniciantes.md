# Catálogo de Guias para Iniciantes — Módulo 13

> **Tipo:** Roteiro de conteúdo (copy pronta para MDX)  
> **Data:** Junho 2026  
> **Convenções:** Rótulos entre `"aspas"` = texto exato da UI; *(Editor)* = papel mínimo

---

## Índice por módulo

| Módulo | Qtd | Slugs |
|--------|-----|-------|
| Trilha Primeiros Passos | 6 | `pp-*` |
| Relatórios | 3 | `relatorios-*` |
| Membros | 6 | `membros-*` |
| Integração | 4 | `integracao-*` |
| Congregações | 3 | `congregacoes-*` |
| Grupos | 3 | `grupos-*` |
| Calendário | 3 | `calendario-*` |
| **Total** | **28** | |

---

## Trilha — Primeiros Passos

Ordem recomendada para novos usuários. Exibir como banner sequencial no hub.

---

### `pp-01-conhecer-painel`

| Campo | Valor |
|-------|-------|
| **Título** | Conhecer o Painel de Relatórios |
| **Módulo** | Relatórios |
| **Permissão** | Reader |
| **Tempo** | ~2 min |
| **Ir para** | `/` |
| **Tags** | início, dashboard, analytics |

**Passos:**

1. Clique em **Painel** na barra lateral (primeiro item).
2. Aguarde o carregamento dos gráficos e cards de resumo.
3. Use o seletor no topo para alternar entre **Todas**, **Sede** ou uma **Congregação** específica.
4. Role a página para ver demografia, estrutura da igreja, grupos e mapa geográfico.
5. Para atualizar os dados, clique no botão de **atualizar** (ícone de refresh).

**Detalhes (opcional):**

- Os relatórios usam os membros **ativos** cadastrados no sistema.
- Se a igreja ainda não tem membros, os gráficos aparecerão vazios — isso é normal no início.
- Para exportar um PDF do painel, use o botão **Exportar PDF** (disponível quando há dados).

**Guias relacionados:** `relatorios-filtrar`, `membros-cadastrar`

---

### `pp-02-primeira-congregacao`

| Campo | Valor |
|-------|-------|
| **Título** | Cadastrar sua primeira congregação |
| **Módulo** | Congregações |
| **Permissão** | Editor |
| **Tempo** | ~3 min |
| **Ir para** | `/congregations` |
| **Tags** | início, estrutura, congregação |

**Passos:**

1. Clique em **Congregações** na barra lateral.
2. Clique em **Adicionar congregação**.
3. Preencha o **nome** da congregação (obrigatório).
4. Informe endereço, cidade e estado — a busca de cidade usa a base do IBGE.
5. (Opcional) Selecione um **líder** entre os membros já cadastrados.
6. Clique em **Salvar**.

**Detalhes:**

- A **Sede** é a congregação principal da igreja e já existe por padrão — você cadastra **filiais** ou pontos adicionais.
- Congregações aparecem depois nos formulários de membros, grupos e calendário.
- Se você ainda não tem membros, o campo líder ficará vazio — pode editar depois.

**Guias relacionados:** `congregacoes-editar`, `membros-cadastrar`

---

### `pp-03-primeiro-membro`

| Campo | Valor |
|-------|-------|
| **Título** | Cadastrar seu primeiro membro |
| **Módulo** | Membros |
| **Permissão** | Editor |
| **Tempo** | ~3 min |
| **Ir para** | `/members` |
| **Tags** | início, cadastro, membro |

**Passos:**

1. Clique em **Membros** na barra lateral.
2. Clique em **Adicionar membro**.
3. Preencha pelo menos o **nome completo** e os campos marcados como obrigatórios (*).
4. Selecione a **congregação** à qual o membro pertence.
5. Revise contatos (telefone, e-mail) se disponíveis.
6. Clique em **Salvar**.

**Detalhes:**

- Campos de endereço podem ser preenchidos automaticamente ao digitar o **CEP**.
- O plano da igreja define um **limite de membros** — o contador aparece no topo do app.
- Membros **inativos** continuam no sistema mas não entram nos relatórios padrão.

**Guias relacionados:** `membros-filtrar`, `membros-editar`

---

### `pp-04-primeiro-integrante`

| Campo | Valor |
|-------|-------|
| **Título** | Registrar um visitante na Integração |
| **Módulo** | Integração |
| **Permissão** | Editor |
| **Tempo** | ~3 min |
| **Ir para** | `/integration` |
| **Tags** | início, visitante, integração |

**Passos:**

1. Clique em **Integração** na barra lateral.
2. Clique em **Adicionar integrante**.
3. Preencha nome, data de nascimento e contatos básicos.
4. Indique a **congregação esperada** e, se souber, o **mentor**.
5. Clique em **Salvar**.

**Detalhes:**

- **Integração** é o funil **antes** da membresia formal — use para visitantes e candidatos.
- Quando a pessoa estiver pronta, converta em membro pelo guia `integracao-converter`.
- Integrantes **não contam** no limite de membros do plano até serem convertidos.

**Guias relacionados:** `integracao-converter`, `integracao-filtrar`

---

### `pp-05-primeiro-grupo`

| Campo | Valor |
|-------|-------|
| **Título** | Criar seu primeiro grupo |
| **Módulo** | Grupos |
| **Permissão** | Editor |
| **Tempo** | ~3 min |
| **Ir para** | `/groups` |
| **Tags** | início, ministério, célula, grupo |

**Passos:**

1. Clique em **Grupos** na barra lateral.
2. Clique em **Adicionar grupo** (ou botão equivalente com ícone +).
3. Informe o **nome** e escolha o **tipo** (ministério, célula, departamento, etc.).
4. (Opcional) Associe uma **congregação** e um **responsável** (membro).
5. Clique em **Salvar**.
6. Abra o grupo e adicione **membros** à composição.

**Detalhes:**

- O responsável deve ser um membro já cadastrado.
- Grupos inativos permanecem no histórico mas não aparecem em filtros padrão.
- Grupos alimentam relatórios e filtros do calendário.

**Guias relacionados:** `grupos-membros`, `grupos-filtrar`

---

### `pp-06-primeiro-evento`

| Campo | Valor |
|-------|-------|
| **Título** | Adicionar um evento no Calendário |
| **Módulo** | Calendário |
| **Permissão** | Editor |
| **Tempo** | ~3 min |
| **Ir para** | `/calendar` |
| **Tags** | início, evento, agenda |

**Passos:**

1. Clique em **Calendário** na barra lateral.
2. Clique em **Novo evento** ou clique em um dia vazio no calendário mensal.
3. Preencha **título**, **tipo**, **data** e, se aplicável, **horário**.
4. (Opcional) Associe **congregação**, **grupo** ou **responsável**.
5. Clique em **Salvar**.

**Detalhes:**

- Use a aba **Lista** para ver todos os eventos do ano.
- Eventos recorrentes podem ser configurados no formulário — edite com cuidado pois alterações podem afetar a série.
- O contador de **aniversariantes** do mês aparece no topo do calendário.

**Guias relacionados:** `calendario-filtrar`, `calendario-aniversariantes`

---

## Relatórios / Analytics

---

### `relatorios-filtrar`

| Campo | Valor |
|-------|-------|
| **Título** | Filtrar relatórios por congregação |
| **Permissão** | Reader |
| **Ir para** | `/` |

**Passos:**

1. Acesse **Painel**.
2. No seletor de visualização, escolha **Todas**, **Sede** ou **Congregação**.
3. Se escolher Congregação, selecione qual filial na lista.
4. Os gráficos e cards atualizam automaticamente.

**Detalhes:** Exportação PDF respeita o filtro ativo.

---

### `relatorios-exportar`

| Campo | Valor |
|-------|-------|
| **Título** | Exportar relatório em PDF |
| **Permissão** | Reader |
| **Ir para** | `/` |

**Passos:**

1. Acesse **Painel** e aplique o filtro desejado.
2. Clique em **Exportar PDF**.
3. Aguarde o download do arquivo no navegador.

**Detalhes:** Se nenhuma congregação estiver selecionada no modo "Congregação", a exportação fica bloqueada.

---

### `relatorios-interpretar`

| Campo | Valor |
|-------|-------|
| **Título** | Entender os gráficos do Painel |
| **Permissão** | Reader |
| **Ir para** | `/` |

**Passos:**

1. **Cards de resumo** — totais rápidos (membros, batizados, etc.).
2. **Demografia** — distribuição por gênero, faixa etária e estado civil.
3. **Estrutura** — membros por congregação.
4. **Grupos** — participação em ministérios/células.
5. **Timeline** — evolução de admissões e batismos ao longo do tempo.
6. **Geografia** — mapa por cidade/bairro.
7. **Ocupações** — tabela de profissões declaradas.

**Detalhes:** Dados refletem membros ativos no escopo do filtro selecionado.

---

## Membros

---

### `membros-cadastrar`

| Campo | Valor |
|-------|-------|
| **Título** | Como cadastrar um membro |
| **Permissão** | Editor |
| **Ir para** | `/members` |

**Passos:** *(igual a `pp-03-primeiro-membro`)*

---

### `membros-editar`

| Campo | Valor |
|-------|-------|
| **Título** | Editar dados de um membro |
| **Permissão** | Editor |
| **Ir para** | `/members` |

**Passos:**

1. Em **Membros**, localize o membro (busca ou filtros).
2. Clique no membro para abrir a visualização.
3. Clique em **Editar**.
4. Altere os campos necessários.
5. Clique em **Salvar**.

---

### `membros-desativar`

| Campo | Valor |
|-------|-------|
| **Título** | Desativar ou reativar um membro |
| **Permissão** | Editor |
| **Ir para** | `/members` |

**Passos:**

1. Abra o membro na lista.
2. Escolha **Desativar** (ou **Reativar** se já inativo).
3. Confirme na janela de confirmação.

**Detalhes:** Desativar não exclui o registro — preserva histórico. Membros inativos saem dos relatórios padrão.

---

### `membros-filtrar`

| Campo | Valor |
|-------|-------|
| **Título** | Buscar e filtrar membros |
| **Permissão** | Reader |
| **Ir para** | `/members` |

**Passos:**

1. Use a **barra de busca** para nome ou termos gerais.
2. Aplique filtros rápidos: status (ativo/inativo), congregação, gênero.
3. Abra **Filtros avançados** para faixa etária, datas de batismo/admissão, cidade, etc.
4. Filtros ativos aparecem como **chips** — clique no X para remover.
5. Alterne entre visualização em **lista** ou **cards**.

---

### `membros-importar`

| Campo | Valor |
|-------|-------|
| **Título** | Importar membros via CSV |
| **Permissão** | Editor |
| **Ir para** | `/members` |

**Passos:**

1. Clique no botão de **importar** (ícone de upload).
2. Selecione um arquivo `.csv` (máx. 10 MB).
3. Aguarde a **validação** — corrija erros exibidos no preview.
4. Confirme a importação.
5. Verifique o resumo de registros importados.

**Detalhes:** Use o modelo de colunas esperado pelo sistema. Importação respeita limite do plano.

---

### `membros-exportar`

| Campo | Valor |
|-------|-------|
| **Título** | Exportar lista de membros |
| **Permissão** | Reader |
| **Ir para** | `/members` |

**Passos:**

1. Aplique filtros desejados (opcional).
2. Abra o menu/modal de **exportar**.
3. Escolha **PDF** ou **CSV**.
4. Confirme e faça download.

---

## Integração

---

### `integracao-cadastrar`

| Campo | Valor |
|-------|-------|
| **Título** | Cadastrar um integrante manualmente |
| **Permissão** | Editor |
| **Ir para** | `/integration` |

**Passos:** *(igual a `pp-04-primeiro-integrante`)*

---

### `integracao-converter`

| Campo | Valor |
|-------|-------|
| **Título** | Converter integrante em membro |
| **Permissão** | Editor |
| **Ir para** | `/integration` |

**Passos:**

1. Em **Integração**, abra o integrante desejado.
2. Clique em **Converter para membro**.
3. Revise/complemente os dados no formulário de membro.
4. Clique em **Salvar**.
5. O integrante passa ao status **integrado**; o membro aparece em **Membros**.

**Detalhes:** Verifique se há **vagas no plano** — a conversão consome uma vaga de membro.

---

### `integracao-filtrar`

| Campo | Valor |
|-------|-------|
| **Título** | Filtrar integrantes |
| **Permissão** | Reader |
| **Ir para** | `/integration` |

**Passos:**

1. Use a busca por nome.
2. Filtre por **status**, **congregação esperada** ou **mentor**.
3. Chips de filtros ativos permitem limpar rapidamente.

---

### `integracao-descartar`

| Campo | Valor |
|-------|-------|
| **Título** | Descartar um integrante |
| **Permissão** | Editor |
| **Ir para** | `/integration` |

**Passos:**

1. Abra o integrante.
2. Selecione **Descartar**.
3. Confirme a ação.

**Detalhes:** Use quando o candidato desistiu ou não prosseguirá — diferente de converter.

---

## Congregações

---

### `congregacoes-cadastrar`

| Campo | Valor |
|-------|-------|
| **Título** | Cadastrar uma congregação |
| **Permissão** | Editor |
| **Ir para** | `/congregations` |

**Passos:** *(igual a `pp-02-primeira-congregacao`)*

---

### `congregacoes-editar`

| Campo | Valor |
|-------|-------|
| **Título** | Editar ou excluir congregação |
| **Permissão** | Editor |
| **Ir para** | `/congregations` |

**Passos:**

1. Na lista, clique na congregação.
2. Para editar: **Editar** → altere campos → **Salvar**.
3. Para excluir: **Excluir** → confirme.

**Detalhes:** Exclusão pode ser bloqueada se houver membros vinculados — verifique mensagem do sistema.

---

### `congregacoes-exportar`

| Campo | Valor |
|-------|-------|
| **Título** | Exportar lista de congregações |
| **Permissão** | Reader |
| **Ir para** | `/congregations` |

**Passos:**

1. (Opcional) Use a busca para filtrar.
2. Clique em **Exportar PDF**.
3. Faça download do arquivo.

---

## Grupos

---

### `grupos-cadastrar`

| Campo | Valor |
|-------|-------|
| **Título** | Criar um grupo |
| **Permissão** | Editor |
| **Ir para** | `/groups` |

**Passos:** *(igual a `pp-05-primeiro-grupo`, passos 1–5)*

---

### `grupos-membros`

| Campo | Valor |
|-------|-------|
| **Título** | Adicionar membros a um grupo |
| **Permissão** | Editor |
| **Ir para** | `/groups` |

**Passos:**

1. Abra o grupo na lista.
2. Na seção de **membros**, adicione participantes.
3. Salve as alterações.

**Detalhes:** Apenas membros cadastrados podem compor grupos.

---

### `grupos-filtrar`

| Campo | Valor |
|-------|-------|
| **Título** | Filtrar grupos |
| **Permissão** | Reader |
| **Ir para** | `/groups` |

**Passos:**

1. Use busca por nome.
2. Filtre por **congregação**, **tipo** ou **status** (ativo/inativo).
3. A barra de resumo no topo mostra totais por tipo.

---

## Calendário

---

### `calendario-criar`

| Campo | Valor |
|-------|-------|
| **Título** | Criar um evento |
| **Permissão** | Editor |
| **Ir para** | `/calendar` |

**Passos:** *(igual a `pp-06-primeiro-evento`)*

---

### `calendario-filtrar`

| Campo | Valor |
|-------|-------|
| **Título** | Filtrar eventos no calendário |
| **Permissão** | Reader |
| **Ir para** | `/calendar` |

**Passos:**

1. Use os filtros horizontais: **tipo**, **congregação**, **grupo**, **período**.
2. Alterne entre visão **Calendário** (mês) e **Lista** (ano).
3. Navegue entre meses/anos pelas setas.

---

### `calendario-aniversariantes`

| Campo | Valor |
|-------|-------|
| **Título** | Ver aniversariantes do mês |
| **Permissão** | Reader |
| **Ir para** | `/calendar` |

**Passos:**

1. No **Calendário**, observe o indicador de aniversariantes.
2. Clique para abrir a lista completa do mês.
3. Use os contatos exibidos para parabenizar.

**Detalhes:** Aniversários vêm das datas de nascimento cadastradas em **Membros**.

---

## FAQ — Glossário rápido (v1.1)

Conteúdo para seção expandível no hub.

| Termo | Definição |
|-------|-----------|
| **Membro** | Pessoa com membresia formal na igreja; conta no limite do plano |
| **Integrante** | Visitante/candidato no funil de integração; ainda não é membro |
| **Sede** | Congregação principal; padrão quando nenhuma filial é escolhida |
| **Congregação** | Filial ou ponto organizacional da igreja |
| **Grupo** | Ministério, célula, departamento ou classe |
| **Reader** | Perfil somente leitura — visualiza, não edita |
| **Editor** | Perfil que pode cadastrar e editar registros |

---

## Registry TypeScript (referência para dev)

```typescript
export type TutorialRole = 'reader' | 'editor' | 'admin';

export type TutorialGuide = {
  slug: string;
  title: string;
  module: 'primeiros-passos' | 'relatorios' | 'membros' | 'integracao' | 'congregacoes' | 'grupos' | 'calendario';
  role: TutorialRole;
  route: string;
  estimatedMinutes: number;
  tags: string[];
  related: string[];
  trailOrder?: number; // 1-6 para trilha
};
```

Exemplo de entrada:

```typescript
{
  slug: 'membros-cadastrar',
  title: 'Como cadastrar um membro',
  module: 'membros',
  role: 'editor',
  route: '/members',
  estimatedMinutes: 3,
  tags: ['cadastro', 'membro'],
  related: ['membros-editar', 'membros-filtrar'],
}
```
