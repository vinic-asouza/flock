export type OpsHttpLatencyRoute = {
  method: string;
  route: string;
  status_code: string;
  count: number;
  p50_ms: number | null;
  p95_ms: number | null;
};

export type OpsHttpLatencyResponse = {
  window: "process_uptime";
  note: string;
  generated_at: string;
  uptime_seconds: number;
  route_count: number;
  routes: OpsHttpLatencyRoute[];
};
