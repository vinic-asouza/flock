# ✅ Checklist de Deploy

Use este checklist para garantir que tudo está pronto antes e depois do deploy.

## 📋 Pré-Deploy

### Configuração do Projeto

- [ ] **Variáveis de ambiente do backend configuradas**
  - [ ] `SUPABASE_URL` configurado
  - [ ] `SUPABASE_KEY` configurado
  - [ ] `SUPABASE_SERVICE_ROLE_KEY` configurado
  - [ ] `FRONTEND_URL` configurado (URL de produção)
  - [ ] `PORT` configurado (ou deixar padrão)
  - [ ] `NODE_ENV=production`

- [ ] **Variáveis de ambiente do frontend configuradas**
  - [ ] `NEXT_PUBLIC_API_URL` configurado (URL do backend em produção)
  - [ ] `NODE_ENV=production`

- [ ] **Build local testado**
  - [ ] Backend: `cd backend && npm run build` funciona
  - [ ] Frontend: `cd frontend && npm run build` funciona
  - [ ] Sem erros de compilação

- [ ] **Testes locais**
  - [ ] Aplicação roda localmente sem erros
  - [ ] Conexão com Supabase funciona
  - [ ] Autenticação funciona
  - [ ] Principais funcionalidades testadas

### Configuração do Supabase

- [ ] **URLs configuradas no Supabase**
  - [ ] Site URL configurado com URL do frontend
  - [ ] Redirect URLs incluem URL do frontend
  - [ ] URLs de callback configuradas

- [ ] **Permissões verificadas**
  - [ ] RLS (Row Level Security) configurado corretamente
  - [ ] Políticas de segurança revisadas

### Repositório Git

- [ ] **Código commitado**
  - [ ] Todas as mudanças commitadas
  - [ ] Código pushado para o repositório
  - [ ] Branch principal atualizada

- [ ] **Arquivos sensíveis protegidos**
  - [ ] `.env` e `.env.local` no `.gitignore`
  - [ ] Nenhuma credencial no código
  - [ ] Chaves não commitadas

### Docker (se usar)

- [ ] **Dockerfiles testados**
  - [ ] Build das imagens funciona
  - [ ] Containers iniciam corretamente
  - [ ] Aplicação funciona em Docker localmente

## 🚀 Durante o Deploy

### Plataforma de Deploy

- [ ] **Conta criada na plataforma**
  - [ ] Conta verificada
  - [ ] Método de pagamento configurado (se necessário)

- [ ] **Projeto/Serviços criados**
  - [ ] Serviço do backend criado
  - [ ] Serviço do frontend criado
  - [ ] Repositório conectado

- [ ] **Variáveis de ambiente configuradas**
  - [ ] Todas as variáveis do backend configuradas
  - [ ] Todas as variáveis do frontend configuradas
  - [ ] URLs de produção configuradas

- [ ] **Build configurado**
  - [ ] Root directory correto (backend/ ou frontend/)
  - [ ] Build command correto
  - [ ] Start command correto
  - [ ] Porta configurada

- [ ] **Deploy iniciado**
  - [ ] Build do backend iniciado
  - [ ] Build do frontend iniciado
  - [ ] Sem erros no build

## ✅ Pós-Deploy

### Verificação Inicial

- [ ] **URLs funcionando**
  - [ ] Backend acessível (ex: `https://seu-backend.railway.app/health`)
  - [ ] Frontend acessível (ex: `https://seu-frontend.railway.app`)
  - [ ] SSL/HTTPS funcionando

- [ ] **Conexão Backend-Frontend**
  - [ ] Frontend consegue se conectar ao backend
  - [ ] Sem erros de CORS
  - [ ] API respondendo corretamente

- [ ] **Conexão com Supabase**
  - [ ] Backend consegue conectar ao Supabase
  - [ ] Queries funcionando
  - [ ] Autenticação funcionando

### Testes Funcionais

- [ ] **Autenticação**
  - [ ] Login funciona
  - [ ] Registro funciona
  - [ ] Recuperação de senha funciona
  - [ ] Logout funciona

- [ ] **Funcionalidades Principais**
  - [ ] Listagem de membros funciona
  - [ ] Criação de membros funciona
  - [ ] Edição de membros funciona
  - [ ] Relatórios funcionam
  - [ ] Integrações funcionam

- [ ] **Performance**
  - [ ] Páginas carregam em tempo razoável
  - [ ] Sem erros no console do navegador
  - [ ] Sem erros nos logs do servidor

### Configuração Final

- [ ] **Domínio personalizado (opcional)**
  - [ ] Domínio configurado
  - [ ] DNS configurado
  - [ ] SSL funcionando no domínio personalizado

- [ ] **Monitoramento**
  - [ ] Logs configurados
  - [ ] Alertas configurados (se disponível)
  - [ ] Métricas sendo coletadas

- [ ] **Backup**
  - [ ] Backup do banco de dados configurado
  - [ ] Estratégia de backup definida

## 🔒 Segurança

- [ ] **Credenciais seguras**
  - [ ] Nenhuma credencial exposta no código
  - [ ] Variáveis de ambiente configuradas corretamente
  - [ ] Chaves do Supabase seguras

- [ ] **HTTPS**
  - [ ] SSL/HTTPS habilitado
  - [ ] Certificado válido
  - [ ] Redirecionamento HTTP → HTTPS (se aplicável)

- [ ] **CORS**
  - [ ] CORS configurado corretamente
  - [ ] Apenas URLs permitidas no CORS

## 📝 Documentação

- [ ] **Documentação atualizada**
  - [ ] URLs de produção documentadas
  - [ ] Processo de deploy documentado
  - [ ] Variáveis de ambiente documentadas

- [ ] **Equipe informada**
  - [ ] URLs compartilhadas com a equipe
  - [ ] Credenciais compartilhadas de forma segura
  - [ ] Processo de deploy explicado

## 🎯 Próximos Passos

Após completar o deploy:

- [ ] Monitorar aplicação nas primeiras 24h
- [ ] Coletar feedback dos usuários
- [ ] Ajustar configurações conforme necessário
- [ ] Planejar próximas melhorias

---

**✅ Checklist completo? Você está pronto para produção! 🚀**

