# 🧪 Guia de QA - Sistema de Autenticação

## 📋 Índice

1. [Checklist de Testes](#checklist-de-testes)
2. [Cenários de Teste](#cenários-de-teste)
3. [Testes de Segurança](#testes-de-segurança)
4. [Testes de Performance](#testes-de-performance)
5. [Testes de Usabilidade](#testes-de-usabilidade)
6. [Ferramentas de Teste](#ferramentas-de-teste)
7. [Relatórios de Bug](#relatórios-de-bug)

---

## ✅ Checklist de Testes

### 1. Testes Funcionais

#### Registro de Igreja
- [ ] **CNPJ válido** aceito
- [ ] **CNPJ inválido** rejeitado
- [ ] **CNPJ duplicado** rejeitado
- [ ] **Senha forte** aceita
- [ ] **Senha fraca** rejeitada
- [ ] **Email válido** aceito
- [ ] **Email inválido** rejeitado
- [ ] **Email duplicado** rejeitado
- [ ] **Telefone válido** aceito
- [ ] **Telefone inválido** rejeitado
- [ ] **Campos obrigatórios** validados
- [ ] **Redirecionamento** após registro

#### Login de Usuário
- [ ] **Credenciais válidas** aceitas
- [ ] **Credenciais inválidas** rejeitadas
- [ ] **Email inexistente** rejeitado
- [ ] **Senha incorreta** rejeitada
- [ ] **Redirecionamento** após login
- [ ] **Cookies** configurados corretamente
- [ ] **Sessão** criada com sucesso

#### Logout de Usuário
- [ ] **Logout** limpa sessão
- [ ] **Cookies** removidos
- [ ] **Token** adicionado à blacklist
- [ ] **Redirecionamento** para login
- [ ] **Estado local** limpo

#### Recuperação de Senha
- [ ] **Email válido** envia link
- [ ] **Email inválido** rejeitado
- [ ] **Token válido** permite reset
- [ ] **Token inválido** rejeitado
- [ ] **Token expirado** rejeitado
- [ ] **Nova senha** aceita
- [ ] **Senha antiga** invalida

### 2. Testes de Segurança

#### Rate Limiting
- [ ] **Login** limitado a 10 req/15min
- [ ] **Registro** limitado a 3 req/hora
- [ ] **Recuperação** limitada a 5 req/hora
- [ ] **Geral** limitado a 1000 req/15min
- [ ] **Mensagens** de erro apropriadas
- [ ] **Headers** de rate limit corretos

#### Cookies Seguros
- [ ] **httpOnly** configurado
- [ ] **SameSite** configurado
- [ ] **Secure** em produção
- [ ] **Path** configurado corretamente
- [ ] **Expiração** configurada
- [ ] **Domínio** configurado

#### Validação de Dados
- [ ] **XSS** prevenido
- [ ] **SQL Injection** prevenido
- [ ] **CSRF** prevenido
- [ ] **Sanitização** de entrada
- [ ] **Escape** de saída
- [ ] **Headers** de segurança

### 3. Testes de Interface

#### Responsividade
- [ ] **Mobile** (320px - 768px)
- [ ] **Tablet** (768px - 1024px)
- [ ] **Desktop** (1024px+)
- [ ] **Orientação** landscape/portrait
- [ ] **Zoom** 100% - 200%
- [ ] **Touch** targets adequados

#### Acessibilidade
- [ ] **Contraste** adequado
- [ ] **Navegação** por teclado
- [ ] **Screen readers** compatível
- [ ] **Alt text** em imagens
- [ ] **Labels** em formulários
- [ ] **Focus** visível

#### Usabilidade
- [ ] **Fluxo** intuitivo
- [ ] **Mensagens** claras
- [ ] **Loading** states
- [ ] **Error** handling
- [ ] **Success** feedback
- [ ] **Navigation** lógica

---

## 🎯 Cenários de Teste

### 1. Cenário: Registro Bem-Sucedido

```gherkin
Feature: Registro de Igreja
  Scenario: Registro com dados válidos
    Given que estou na página de registro
    When preencho todos os campos com dados válidos
    And clico em "Registrar"
    Then devo ser redirecionado para a página de login
    And devo ver a mensagem "Igreja registrada com sucesso"
    And os dados devem ser salvos no banco
    And um usuário deve ser criado no Supabase
```

**Dados de Teste:**
```json
{
  "email": "teste@igreja.com",
  "password": "MinhaSenh@123",
  "phone": "11999999999",
  "name": "Igreja Teste",
  "denomination": "Presbiteriana",
  "address": "Rua Teste, 123",
  "city": "São Paulo",
  "state": "SP",
  "cnpj": "11222333000181"
}
```

### 2. Cenário: Login Bem-Sucedido

```gherkin
Feature: Login de Usuário
  Scenario: Login com credenciais válidas
    Given que estou na página de login
    When preencho email e senha corretos
    And clico em "Entrar"
    Then devo ser redirecionado para o dashboard
    And devo ver os dados da minha igreja
    And os cookies de autenticação devem ser configurados
    And a sessão deve ser criada
```

### 3. Cenário: Rate Limiting

```gherkin
Feature: Rate Limiting
  Scenario: Excesso de tentativas de login
    Given que estou na página de login
    When tento fazer login 11 vezes em 15 minutos
    Then devo receber erro de rate limiting
    And devo ver a mensagem "Muitas tentativas de login"
    And devo aguardar 15 minutos para tentar novamente
```

### 4. Cenário: Logout Seguro

```gherkin
Feature: Logout Seguro
  Scenario: Logout com sessão ativa
    Given que estou logado no sistema
    When clico em "Sair"
    Then devo ser redirecionado para a página de login
    And os cookies devem ser removidos
    And o token deve ser adicionado à blacklist
    And não devo conseguir acessar rotas protegidas
```

---

## 🔒 Testes de Segurança

### 1. Testes de Automação

#### Script de Teste de Rate Limiting
```bash
#!/bin/bash
# Teste de rate limiting para login

echo "Testando rate limiting de login..."

for i in {1..12}; do
  echo "Tentativa $i:"
  curl -X POST http://localhost:4000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"wrongpassword"}' \
    -w "Status: %{http_code}\n" \
    -s -o /dev/null
  sleep 1
done
```

#### Script de Teste de Cookies
```bash
#!/bin/bash
# Teste de configuração de cookies

echo "Testando configuração de cookies..."

# Login para obter cookies
RESPONSE=$(curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"TestPass123"}' \
  -c cookies.txt \
  -s)

# Verificar cookies
echo "Cookies configurados:"
cat cookies.txt | grep -E "(httpOnly|secure|sameSite)"
```

### 2. Testes Manuais

#### Checklist de Segurança
- [ ] **Headers de segurança** presentes
- [ ] **CORS** configurado corretamente
- [ ] **HTTPS** obrigatório em produção
- [ ] **Cookies** não acessíveis via JavaScript
- [ ] **Tokens** não expostos no localStorage
- [ ] **Logs** não expõem informações sensíveis
- [ ] **Rate limiting** ativo e funcionando
- [ ] **Validação** de entrada robusta

#### Testes de Penetração Básicos
- [ ] **SQL Injection** em formulários
- [ ] **XSS** em campos de entrada
- [ ] **CSRF** em formulários
- [ ] **Brute Force** em login
- [ ] **Session Fixation** em cookies
- [ ] **Clickjacking** em iframes
- [ ] **Directory Traversal** em URLs
- [ ] **File Upload** malicioso

---

## ⚡ Testes de Performance

### 1. Testes de Carga

#### Script de Teste de Carga
```bash
#!/bin/bash
# Teste de carga com Apache Bench

echo "Testando performance de login..."

# Teste de 100 requisições com 10 concorrentes
ab -n 100 -c 10 -p login_data.json -T "application/json" \
  http://localhost:4000/api/auth/login

echo "Testando performance de registro..."

# Teste de 50 requisições com 5 concorrentes
ab -n 50 -c 5 -p register_data.json -T "application/json" \
  http://localhost:4000/api/auth/register
```

#### Dados de Teste
```json
// login_data.json
{
  "email": "test@example.com",
  "password": "TestPass123"
}

// register_data.json
{
  "email": "test@example.com",
  "password": "TestPass123",
  "phone": "11999999999",
  "name": "Igreja Teste",
  "denomination": "Presbiteriana",
  "address": "Rua Teste, 123",
  "city": "São Paulo",
  "state": "SP",
  "cnpj": "11222333000181"
}
```

### 2. Métricas de Performance

#### Tempo de Resposta
- **Login**: < 2 segundos
- **Registro**: < 3 segundos
- **Logout**: < 1 segundo
- **Verificação**: < 500ms

#### Throughput
- **Login**: > 100 req/min
- **Registro**: > 50 req/min
- **Geral**: > 1000 req/min

#### Recursos
- **CPU**: < 80% durante picos
- **Memória**: < 512MB por instância
- **Rede**: < 1MB por requisição
- **Disco**: < 100MB para logs

---

## 🎨 Testes de Usabilidade

### 1. Testes de Interface

#### Checklist de UI
- [ ] **Formulários** bem organizados
- [ ] **Labels** claros e descritivos
- [ ] **Placeholders** úteis
- [ ] **Mensagens** de erro claras
- [ ] **Loading** states visíveis
- [ ] **Success** feedback adequado
- [ ] **Navegação** intuitiva
- [ ] **Responsividade** em todos os dispositivos

#### Testes de Acessibilidade
- [ ] **Contraste** adequado (WCAG AA)
- [ ] **Navegação** por teclado
- [ ] **Screen readers** compatível
- [ ] **Alt text** em imagens
- [ ] **Labels** em formulários
- [ ] **Focus** visível
- [ ] **Zoom** até 200%
- [ ] **Cores** não são únicas informações

### 2. Testes de Fluxo

#### Fluxo de Registro
1. Acessar página de registro
2. Preencher formulário
3. Validar dados em tempo real
4. Submeter formulário
5. Verificar redirecionamento
6. Verificar dados salvos

#### Fluxo de Login
1. Acessar página de login
2. Inserir credenciais
3. Submeter formulário
4. Verificar redirecionamento
5. Verificar dados carregados
6. Verificar sessão ativa

#### Fluxo de Logout
1. Estar logado no sistema
2. Clicar em "Sair"
3. Verificar redirecionamento
4. Verificar cookies limpos
5. Verificar token na blacklist
6. Verificar acesso negado

---

## 🛠️ Ferramentas de Teste

### 1. Ferramentas de Automação

#### Jest (Unit Tests)
```javascript
// auth.test.js
describe('Authentication', () => {
  test('should validate CNPJ correctly', () => {
    expect(isValidCNPJ('11222333000181')).toBe(true);
    expect(isValidCNPJ('11111111111111')).toBe(false);
  });

  test('should validate password strength', () => {
    expect(validatePassword('MinhaSenh@123')).toBe(true);
    expect(validatePassword('123456')).toBe(false);
  });
});
```

#### Cypress (E2E Tests)
```javascript
// auth.cy.js
describe('Authentication Flow', () => {
  it('should register new church', () => {
    cy.visit('/register');
    cy.get('[data-cy=email]').type('test@igreja.com');
    cy.get('[data-cy=password]').type('MinhaSenh@123');
    cy.get('[data-cy=cnpj]').type('11222333000181');
    cy.get('[data-cy=submit]').click();
    cy.url().should('include', '/login');
  });
});
```

### 2. Ferramentas de Performance

#### Apache Bench
```bash
# Teste de carga
ab -n 1000 -c 10 http://localhost:4000/api/auth/login

# Teste de stress
ab -n 5000 -c 50 http://localhost:4000/api/auth/login
```

#### Artillery
```yaml
# artillery.yml
config:
  target: 'http://localhost:4000'
  phases:
    - duration: 60
      arrivalRate: 10
scenarios:
  - name: "Login Test"
    requests:
      - post:
          url: "/api/auth/login"
          json:
            email: "test@example.com"
            password: "TestPass123"
```

### 3. Ferramentas de Segurança

#### OWASP ZAP
```bash
# Scan de segurança
zap-baseline.py -t http://localhost:4000 -r report.html
```

#### Burp Suite
- Interceptar requisições
- Testar vulnerabilidades
- Analisar cookies
- Verificar headers

---

## 🐛 Relatórios de Bug

### 1. Template de Bug Report

```markdown
## Bug Report: [Título]

### Descrição
[Descrição clara do problema]

### Passos para Reproduzir
1. [Passo 1]
2. [Passo 2]
3. [Passo 3]

### Resultado Esperado
[O que deveria acontecer]

### Resultado Atual
[O que está acontecendo]

### Ambiente
- **OS**: [Windows/Mac/Linux]
- **Browser**: [Chrome/Firefox/Safari]
- **Versão**: [Versão específica]
- **Dispositivo**: [Desktop/Mobile/Tablet]

### Screenshots
[Imagens do problema]

### Logs
[Logs relevantes]

### Prioridade
- [ ] Crítica
- [ ] Alta
- [ ] Média
- [ ] Baixa

### Severidade
- [ ] Bloqueante
- [ ] Grave
- [ ] Moderada
- [ ] Baixa
```

### 2. Categorias de Bugs

#### Funcionais
- **Registro**: Problemas no fluxo de registro
- **Login**: Problemas no fluxo de login
- **Logout**: Problemas no fluxo de logout
- **Recuperação**: Problemas na recuperação de senha

#### Segurança
- **Rate Limiting**: Bypass de limitações
- **Cookies**: Configuração incorreta
- **Validação**: Bypass de validações
- **Headers**: Headers de segurança ausentes

#### Performance
- **Lentidão**: Tempo de resposta alto
- **Timeout**: Requisições expirando
- **Memory**: Vazamentos de memória
- **CPU**: Alto uso de CPU

#### Usabilidade
- **Interface**: Problemas de UI/UX
- **Responsividade**: Problemas em dispositivos
- **Acessibilidade**: Problemas de acessibilidade
- **Navegação**: Problemas de fluxo

---

## 📊 Métricas de QA

### 1. Métricas de Qualidade

#### Cobertura de Testes
- **Unit Tests**: > 80%
- **Integration Tests**: > 70%
- **E2E Tests**: > 60%
- **Security Tests**: > 90%

#### Bugs por Categoria
- **Funcionais**: < 5 por release
- **Segurança**: 0 críticos
- **Performance**: < 3 por release
- **Usabilidade**: < 10 por release

#### Tempo de Resolução
- **Críticos**: < 4 horas
- **Altos**: < 24 horas
- **Médios**: < 72 horas
- **Baixos**: < 1 semana

### 2. Relatórios de QA

#### Relatório Semanal
- Bugs encontrados
- Bugs resolvidos
- Testes executados
- Cobertura de testes
- Performance metrics

#### Relatório de Release
- Resumo de testes
- Bugs críticos
- Melhorias implementadas
- Recomendações futuras
- Métricas de qualidade

---

*Guia de QA atualizado em: $(date)*
*Versão: 1.0.0*
*Para QA Engineers e Testers*
