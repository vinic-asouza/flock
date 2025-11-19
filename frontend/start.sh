#!/bin/sh
# Script de start customizado para Next.js no Railway

# Garantir que estamos escutando em todas as interfaces
export HOSTNAME="0.0.0.0"

# Usar a porta fornecida pelo Railway ou padrão 3000
PORT=${PORT:-3000}

# Iniciar o Next.js
exec next start -H "$HOSTNAME" -p "$PORT"

