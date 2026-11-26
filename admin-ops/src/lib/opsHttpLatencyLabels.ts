export function formatLatencyMs(ms: number | null): string {
  if (ms === null) {
    return "—";
  }
  return `${ms.toLocaleString("pt-BR")} ms`;
}

export function formatUptimeSeconds(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const mins = Math.floor(seconds / 60);
  if (mins < 60) {
    const rem = seconds % 60;
    return rem > 0 ? `${mins}m ${rem}s` : `${mins}m`;
  }
  const hours = Math.floor(mins / 60);
  const remMins = mins % 60;
  return remMins > 0 ? `${hours}h ${remMins}m` : `${hours}h`;
}

export function latencyWindowLabel(window: string): string {
  if (window === "process_uptime") {
    return "Desde o último restart da API";
  }
  return window;
}
