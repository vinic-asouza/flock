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

# Copiar arquivos necessários
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Ajustar permissões
RUN chown -R nextjs:nodejs /app

USER nextjs

# Expor porta
EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Comando para iniciar
CMD ["node", "server.js"]

