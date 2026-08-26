import {
  healthStatusBadgeClass,
  healthStatusLabel,
} from "@/lib/opsHealthLabels";
import type { OpsHealthStatus } from "@/types/opsHealth";

export function HealthStatusBadge({ status }: { status: OpsHealthStatus }) {
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${healthStatusBadgeClass(status)}`}
    >
      {healthStatusLabel(status)}
    </span>
  );
}
