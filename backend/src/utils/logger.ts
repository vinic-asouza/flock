/**
 * Sistema de logging centralizado
 * Permite controlar logs por ambiente (desenvolvimento vs produção)
 */

const isDevelopment = process.env.NODE_ENV !== 'production';

/**
 * Log de debug (apenas em desenvolvimento)
 */
export function debug(...args: unknown[]): void {
  if (isDevelopment) {
    console.log('[DEBUG]', ...args);
  }
}

/**
 * Log de informação (apenas em desenvolvimento)
 */
export function info(...args: unknown[]): void {
  if (isDevelopment) {
    console.log('[INFO]', ...args);
  }
}

/**
 * Log de erro (sempre logado, importante para diagnóstico)
 */
export function error(...args: unknown[]): void {
  console.error('[ERROR]', ...args);
}

/**
 * Log de warning (sempre logado)
 */
export function warn(...args: unknown[]): void {
  console.warn('[WARN]', ...args);
}

/**
 * Alias para error (mantém compatibilidade com código existente)
 */
export const logError = error;
