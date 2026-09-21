import { redirect } from 'next/navigation';

/**
 * Calendário fora da superfície do MVP (DEV-128).
 * Código do módulo permanece no repo; rota redireciona para o Painel.
 */
export default function CalendarPage() {
  redirect('/');
}
