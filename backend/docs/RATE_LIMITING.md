# Rate Limiting - Configurações de Segurança

## Visão Geral

O sistema implementa rate limiting em múltiplas camadas para proteger contra ataques de força bruta, DDoS e uso excessivo da API.

## Configurações Implementadas

### 1. Rate Limiting Geral
- **Limite**: 1000 requisições por IP em 15 minutos
- **Aplicação**: Todas as rotas da API
- **Propósito**: Proteção contra DDoS e uso excessivo
- **Arquivo**: `src/app.ts`

### 2. Rate Limiting de Autenticação
- **Limite**: 10 tentativas de login por IP em 15 minutos
- **Aplicação**: Rota `/api/auth/login`
- **Propósito**: Proteção contra ataques de força bruta
- **Características**: 
  - Não conta requisições bem-sucedidas (`skipSuccessfulRequests: true`)
  - Reset automático após login bem-sucedido

### 3. Rate Limiting de Registro
- **Limite**: 3 tentativas de registro por IP em 1 hora
- **Aplicação**: Rota `/api/auth/register`
- **Propósito**: Prevenir spam de registros
- **Características**: 
  - Janela de tempo maior (1 hora)
  - Limite muito restritivo

### 4. Rate Limiting de Recuperação de Senha
- **Limite**: 5 tentativas de recuperação por IP em 1 hora
- **Aplicação**: Rotas `/api/password/forgot` e `/api/password/reset`
- **Propósito**: Prevenir spam de emails de recuperação
- **Características**: 
  - Janela de tempo maior (1 hora)
  - Limite moderado

### 5. Rate Limiting de Alteração de Senha
- **Limite**: 5 tentativas de alteração por IP em 15 minutos
- **Aplicação**: Rota `/api/password/change`
- **Propósito**: Proteção contra ataques de força bruta
- **Características**: 
  - Aplicado apenas para usuários autenticados
  - Limite moderado

## Headers de Resposta

O sistema inclui headers padrão para informar sobre o rate limiting:

- `X-RateLimit-Limit`: Limite máximo de requisições
- `X-RateLimit-Remaining`: Requisições restantes
- `X-RateLimit-Reset`: Timestamp de reset do limite

## Mensagens de Erro

Todas as mensagens de rate limiting seguem o padrão:

```json
{
  "error": "Descrição do erro",
  "details": "Instruções para o usuário"
}
```

## Monitoramento

### Logs de Rate Limiting
- Todas as tentativas que excedem o limite são logadas
- Inclui IP, rota, timestamp e limite excedido

### Métricas Recomendadas
- Número de IPs bloqueados por hora
- Rotas mais atacadas
- Padrões de tentativas suspeitas

## Configuração por Ambiente

### Desenvolvimento
- Limites mais permissivos para facilitar testes
- Logs detalhados habilitados

### Produção
- Limites restritivos ativados
- Logs de segurança habilitados
- Monitoramento ativo

## Ajustes Futuros

### Rate Limiting por Usuário
- Implementar limite por usuário autenticado
- Usar Redis para armazenar contadores
- Diferentes limites para diferentes tipos de usuário

### Rate Limiting Dinâmico
- Ajustar limites baseado no comportamento
- Detectar padrões suspeitos automaticamente
- Bloqueio temporário de IPs maliciosos

### Whitelist de IPs
- Permitir IPs confiáveis (ex: escritório)
- Bypass de rate limiting para IPs específicos
- Configuração via variáveis de ambiente

## Exemplos de Uso

### Testando Rate Limiting
```bash
# Testar limite de login
for i in {1..15}; do
  curl -X POST http://localhost:4000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"wrongpassword"}'
done
```

### Verificando Headers
```bash
curl -I http://localhost:4000/api/auth/login
# Retorna headers X-RateLimit-*
```

## Troubleshooting

### Problemas Comuns

1. **Limite muito restritivo para testes**
   - Ajustar limites no ambiente de desenvolvimento
   - Usar IPs diferentes para testes

2. **Usuários legítimos bloqueados**
   - Verificar se não há proxy/VPN compartilhado
   - Considerar whitelist de IPs confiáveis

3. **Rate limiting não funcionando**
   - Verificar se o middleware está aplicado corretamente
   - Confirmar que não há bypass acidental

### Logs de Debug
```bash
# Habilitar logs detalhados
DEBUG=express-rate-limit npm run dev
```

## Segurança

### Considerações Importantes
- Rate limiting é uma camada de proteção, não a única
- Combinar com outras medidas de segurança
- Monitorar tentativas de bypass

### Bypass de Rate Limiting
- Rate limiting é baseado em IP
- Usuários podem usar VPNs para contornar
- Implementar rate limiting por usuário para casos críticos

## Referências

- [Express Rate Limit Documentation](https://github.com/nfriedly/express-rate-limit)
- [OWASP Rate Limiting Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Rate_Limiting_Cheat_Sheet.html)
- [NIST Guidelines on Rate Limiting](https://csrc.nist.gov/publications/detail/sp/800-63b/final)
