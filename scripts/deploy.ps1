# Script de Deploy Unificado (PowerShell)
# Este script ajuda a fazer deploy do projeto completo

$ErrorActionPreference = "Stop"

Write-Host "🚀 Iniciando processo de deploy..." -ForegroundColor Cyan

# Verificar se Docker está instalado
try {
    docker --version | Out-Null
    Write-Host "✅ Docker encontrado" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker não está instalado. Por favor, instale o Docker Desktop primeiro." -ForegroundColor Red
    exit 1
}

# Verificar se docker-compose está instalado
try {
    docker-compose --version | Out-Null
    Write-Host "✅ docker-compose encontrado" -ForegroundColor Green
} catch {
    Write-Host "❌ docker-compose não está instalado." -ForegroundColor Red
    exit 1
}

# Verificar arquivos .env
if (-not (Test-Path "backend\.env")) {
    Write-Host "⚠️  Arquivo backend\.env não encontrado" -ForegroundColor Yellow
    Write-Host "Por favor, crie o arquivo backend\.env manualmente" -ForegroundColor Yellow
}

if (-not (Test-Path "frontend\.env.local")) {
    Write-Host "⚠️  Arquivo frontend\.env.local não encontrado" -ForegroundColor Yellow
    Write-Host "Por favor, crie o arquivo frontend\.env.local manualmente" -ForegroundColor Yellow
}

# Menu
Write-Host ""
Write-Host "Escolha uma opção:"
Write-Host "1) Build das imagens Docker"
Write-Host "2) Iniciar containers (desenvolvimento)"
Write-Host "3) Build e iniciar (produção)"
Write-Host "4) Parar containers"
Write-Host "5) Ver logs"
Write-Host "6) Rebuild completo"

$option = Read-Host "Opção (1-6)"

switch ($option) {
    "1" {
        Write-Host "🔨 Construindo imagens Docker..." -ForegroundColor Green
        docker-compose build
        Write-Host "✅ Build concluído!" -ForegroundColor Green
    }
    "2" {
        Write-Host "🚀 Iniciando containers..." -ForegroundColor Green
        docker-compose up -d
        Write-Host "✅ Containers iniciados!" -ForegroundColor Green
        Write-Host "Backend: http://localhost:4000" -ForegroundColor Cyan
        Write-Host "Frontend: http://localhost:3000" -ForegroundColor Cyan
    }
    "3" {
        Write-Host "🔨 Construindo e iniciando..." -ForegroundColor Green
        docker-compose up -d --build
        Write-Host "✅ Deploy concluído!" -ForegroundColor Green
        Write-Host "Backend: http://localhost:4000" -ForegroundColor Cyan
        Write-Host "Frontend: http://localhost:3000" -ForegroundColor Cyan
    }
    "4" {
        Write-Host "🛑 Parando containers..." -ForegroundColor Yellow
        docker-compose down
        Write-Host "✅ Containers parados!" -ForegroundColor Green
    }
    "5" {
        Write-Host "📋 Mostrando logs..." -ForegroundColor Green
        docker-compose logs -f
    }
    "6" {
        Write-Host "🗑️  Removendo containers e imagens antigas..." -ForegroundColor Yellow
        docker-compose down -v --rmi all
        Write-Host "🔨 Reconstruindo tudo..." -ForegroundColor Green
        docker-compose build --no-cache
        Write-Host "🚀 Iniciando containers..." -ForegroundColor Green
        docker-compose up -d
        Write-Host "✅ Rebuild completo concluído!" -ForegroundColor Green
    }
    default {
        Write-Host "❌ Opção inválida" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "✨ Processo concluído!" -ForegroundColor Green

