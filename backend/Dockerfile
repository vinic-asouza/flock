# Dockerfile para o Backend
# Multi-stage build para otimizar o tamanho da imagem

# Estágio 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Instalar dependências necessárias para compilar pacotes nativos (canvas)
# canvas precisa de Python, build tools e bibliotecas gráficas
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    giflib-dev \
    pixman-dev

# Copiar arquivos de dependências
COPY package*.json ./

# Instalar TODAS as dependências (incluindo devDependencies) para compilar canvas
# O canvas precisa ser compilado durante o build
RUN npm ci

# Copiar código fonte
COPY . .

# Compilar TypeScript
RUN npm run build

# Estágio 2: Produção
FROM node:20-alpine

WORKDIR /app

# Instalar apenas as bibliotecas runtime necessárias para canvas (sem build tools)
RUN apk add --no-cache \
    cairo \
    jpeg \
    pango \
    giflib \
    pixman

# Copiar apenas arquivos necessários do estágio de build
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

# Criar usuário não-root para segurança
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Ajustar permissões
RUN chown -R nodejs:nodejs /app

USER nodejs

# Expor porta
EXPOSE 4000

# Variáveis de ambiente padrão
ENV NODE_ENV=production
ENV PORT=4000

# Comando para iniciar a aplicação
CMD ["node", "dist/app.js"]

