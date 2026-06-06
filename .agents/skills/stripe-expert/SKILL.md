---
name: stripe-expert
description: Regras de negócio e boas práticas para gerenciamento de recursos via Stripe MCP.
---

# 1. Mapeamento de Recursos MCP & Boas Práticas

## Customers (Clientes)
- **ID Local:** Nunca salve cartões de crédito localmente. Use apenas o `cus_...`.
- **Metadata:** Sempre vincule o ID do usuário do seu banco de dados no campo `metadata.userId`.
- **Idioma:** Sempre configure `preferred_locales: ['pt-BR']` para e-mails nativos do Stripe.

## Products & Prices (Catálogo)
- **Moeda:** Padrão obrigatório `brl`. Valores sempre em centavos (Ex: R$ 49,90 = `4990`).
- **Nomenclatura:** Padrão `Nome do Produto - Plano` (Ex: "SaaS Premium - Mensal").
- **IDs no .env:** Após criar um preço/produto via MCP, insira-o imediatamente no `.env` local (`STRIPE_PREMIUM_PRICE_ID=price_...`).
- **Arquivamento:** Nunca delete produtos em produção. Use `active: false`.

## Subscriptions (Assinaturas)
- **Ciclo:** Padrão `interval: month`. Para planos anuais, confirme antes.
- **SCA/3DS:** Garanta que a criação da assinatura trate o status `incomplete` (requer autenticação do cliente).
- **Prorata:** Em upgrades/downgrades, defina explicitamente o comportamento de `proration_behavior`.

## Webhooks & Eventos
- **Segurança:** O código de validação deve usar obrigatoriamente `stripe.webhooks.constructEvent` com o `endpointSecret`.
- **Idempotência:** Trate o `event.id` para evitar processar o mesmo webhook duas vezes.
- **Respostas:** Retorne `res.send({received: true})` (HTTP 200) imediatamente antes de processar lógicas pesadas.

# 2. Regras de Eficiência e Economia de Tokens (Anti-Waste)

- **Sem Código Dummy:** Não gere exemplos teóricos de código se puder executar a ação diretamente via MCP.
- **Apenas IDs:** Ao criar ou atualizar recursos pelo MCP, responda apenas com o ID gerado, o link do dashboard e o impacto no arquivo `.env`. Suprima textos explicativos longos.
- **Payload Mínimo:** Ao invocar ferramentas de escrita do MCP, envie apenas os parâmetros obrigatórios e os metadados estipulados acima.
- **Confirmação Produtiva:** Operações de escrita em ambiente `live` exigem um prompt de confirmação de 1 linha antes da execução. Em `test`, proceda direto.

# 3. Fluxo de Trabalho Obrigatório
1. **Leitura:** Verifique o `.env` ou os arquivos de rota atuais do projeto.
2. **Execução MCP:** Chame a ferramenta do Stripe MCP correspondente.
3. **Persistência:** Atualize as variáveis de ambiente locais com os novos IDs.
4. **Resumo:** Retorne um sumário ultra-compacto da operação.
