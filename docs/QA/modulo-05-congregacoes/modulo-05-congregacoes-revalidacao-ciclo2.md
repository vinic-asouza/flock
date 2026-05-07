# QA — Segunda revalidação (Ciclo 2) — Módulo 05: Gestão de Congregações

> **Analista:** QA Sênior (IA)  
> **Data:** Maio 2026  
> **Base:** `modulo-05-congregacoes-revalidacao.md` + seção "Pós-revalidação — Correção de efeito colateral" do `modulo-05-congregacoes-dev-report.md`  
> **Método:** validação estática no código atualizado

---

## 1. Objetivo desta revalidação

Validar o fechamento do efeito colateral aberto na rodada anterior:

- **EC-01 — Edição bloqueada por falha de IBGE sem alteração de localização**

---

## 2. Verificação ponto a ponto (dev-report x código)

### EC-01 — Bloqueio por indisponibilidade de IBGE em edição sem mudança de UF/cidade
- **Status:** ✅ Resolvido
- **Arquivo validado:** `frontend/src/components/congregations/CongregationForm.tsx`

**Evidência de implementação:**

- O formulário agora lê `dirtyFields` do `react-hook-form`:
```tsx
formState: { errors, dirtyFields },
```

- A regra de bloqueio passou a ser condicional por contexto:
```tsx
const locationTouchedInEdit = mode === 'edit' && (Boolean(dirtyFields.state) || Boolean(dirtyFields.city));
const shouldBlockByLocation = mode === 'create' || locationTouchedInEdit;
const isSubmitBlocked = isLoading || (shouldBlockByLocation && (loadingStates || isStatesUnavailable || isCitiesUnavailable));
```

**Resultado funcional esperado e coerente com o ajuste:**
- `create`: mantém bloqueio por indisponibilidade de localização;
- `edit` sem alteração de `state/city`: permite salvar campos não relacionados (`leader`, `phone`, etc.);
- `edit` com alteração de `state/city`: mantém bloqueio até restabelecer consistência da localização.

---

## 3. Regressões / efeitos colaterais desta rodada

Não foram identificadas regressões críticas novas no escopo do EC-01.

### Observação de UX (baixa)

Mesmo quando o submit não está bloqueado no modo `edit` (sem alteração de localização), a mensagem:

- "Aguarde o carregamento das cidades ou resolva o erro de integração com o IBGE antes de enviar."

continua aparecendo quando `isCitiesUnavailable` é verdadeiro.  
Isso pode gerar ambiguidade, porque a UI informa bloqueio enquanto o botão pode estar habilitado.

**Sugestão opcional:** condicionar a mensagem ao mesmo critério de `shouldBlockByLocation`.

---

## 4. Avaliação de UX após correção

- O fluxo ficou mais resiliente em cenários reais de indisponibilidade parcial do IBGE.
- Usuário de edição não fica mais impedido de salvar ajustes simples por dependência externa não essencial.
- Regras de proteção para criação e alteração efetiva de localização foram preservadas.

---

## 5. Itens encerrados

- **EC-01** pode ser considerado encerrado.
- Módulo 05 permanece **aprovado**, agora sem ressalva funcional pendente no escopo da revalidação anterior.

---

## 6. Itens reabertos

Nenhum item reaberto.
