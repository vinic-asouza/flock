# Dockerfile para o Frontend (Next.js)
# Multi-stage build para otimizar o tamanho da imagem

# Estágio 1: Dependências
FROM node:20-alpine AS deps

WORKDIR /app

# Copiar arquivos de dependências
COPY package*.json ./

# Instalar dependências
RUN npm ci

# Estágio 2: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copiar dependências do estágio anterior
COPY --from=deps /app/node_modules ./node_modules

# Copiar código fonte
COPY . .

# Variáveis de ambiente para build (devem ser fornecidas no build)
# NEXT_PUBLIC_API_URL será injetado no build time
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# Build da aplicação
RUN npm run build

# Estágio 3: Produção
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Criar usuário não-root
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

# Copiar arquivos necessários do build standalone
# O modo standalone do Next.js cria uma estrutura otimizada em .next/standalone
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Copiar a estrutura standalone completa
# O Next.js standalone coloca tudo em .next/standalone, incluindo server.js
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Ajustar permissões
RUN chown -R nextjs:nodejs /app

USER nextjs

# Expor porta
EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Comando para iniciar
# No modo standalone, o server.js está na raiz do diretório standalone
CMD ["node", "server.js"]

