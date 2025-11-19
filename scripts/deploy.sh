#!/bin/bash

# Script de Deploy Unificado
# Este script ajuda a fazer deploy do projeto completo

set -e  # Parar em caso de erro

echo "🚀 Iniciando processo de deploy..."

# Cores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Verificar se Docker está instalado
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker não está instalado. Por favor, instale o Docker primeiro.${NC}"
    exit 1
fi

# Verificar se docker-compose está instalado
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ docker-compose não está instalado. Por favor, instale o docker-compose primeiro.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Docker e docker-compose encontrados${NC}"

# Verificar arquivos .env
if [ ! -f "backend/.env" ]; then
    echo -e "${YELLOW}⚠️  Arquivo backend/.env não encontrado${NC}"
    echo "Criando arquivo de exemplo..."
    cp backend/.env.example backend/.env 2>/dev/null || echo "Por favor, crie o arquivo backend/.env manualmente"
fi

if [ ! -f "frontend/.env.local" ]; then
    echo -e "${YELLOW}⚠️  Arquivo frontend/.env.local não encontrado${NC}"
    echo "Criando arquivo de exemplo..."
    cp frontend/.env.example frontend/.env.local 2>/dev/null || echo "Por favor, crie o arquivo frontend/.env.local manualmente"
fi

# Perguntar o que fazer
echo ""
echo "Escolha uma opção:"
echo "1) Build das imagens Docker"
echo "2) Iniciar containers (desenvolvimento)"
echo "3) Build e iniciar (produção)"
echo "4) Parar containers"
echo "5) Ver logs"
echo "6) Rebuild completo"

read -p "Opção (1-6): " option

case $option in
    1)
        echo -e "${GREEN}🔨 Construindo imagens Docker...${NC}"
        docker-compose build
        echo -e "${GREEN}✅ Build concluído!${NC}"
        ;;
    2)
        echo -e "${GREEN}🚀 Iniciando containers...${NC}"
        docker-compose up -d
        echo -e "${GREEN}✅ Containers iniciados!${NC}"
        echo "Backend: http://localhost:4000"
        echo "Frontend: http://localhost:3000"
        ;;
    3)
        echo -e "${GREEN}🔨 Construindo e iniciando...${NC}"
        docker-compose up -d --build
        echo -e "${GREEN}✅ Deploy concluído!${NC}"
        echo "Backend: http://localhost:4000"
        echo "Frontend: http://localhost:3000"
        ;;
    4)
        echo -e "${YELLOW}🛑 Parando containers...${NC}"
        docker-compose down
        echo -e "${GREEN}✅ Containers parados!${NC}"
        ;;
    5)
        echo -e "${GREEN}📋 Mostrando logs...${NC}"
        docker-compose logs -f
        ;;
    6)
        echo -e "${YELLOW}🗑️  Removendo containers e imagens antigas...${NC}"
        docker-compose down -v --rmi all
        echo -e "${GREEN}🔨 Reconstruindo tudo...${NC}"
        docker-compose build --no-cache
        echo -e "${GREEN}🚀 Iniciando containers...${NC}"
        docker-compose up -d
        echo -e "${GREEN}✅ Rebuild completo concluído!${NC}"
        ;;
    *)
        echo -e "${RED}❌ Opção inválida${NC}"
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}✨ Processo concluído!${NC}"

