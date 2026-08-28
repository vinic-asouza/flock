#!/usr/bin/env bash
# Instala as dependências de todos os apps do monorepo Flock.
# Idempotente: pode rodar repetidamente contra estado em cache.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

install_app() {
  local app="$1"
  echo "==> Instalando dependências: ${app}"
  ( cd "${ROOT_DIR}/${app}" && npm ci --no-audit --no-fund )
}

install_app backend
install_app frontend
install_app landing
install_app admin-ops

echo "==> Compilando backend (TypeScript)"
( cd "${ROOT_DIR}/backend" && npm run build )

echo "==> Dependências instaladas com sucesso."
