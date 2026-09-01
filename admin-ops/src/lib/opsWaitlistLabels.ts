import type { OpsWaitlistStatus } from "@/lib/opsWaitlistQuery";

export function waitlistPlanLabel(value: string | null | undefined): string {
  if (!value) {
    return "—";
  }
  if (value === "personalizado") {
    return "Personalizado";
  }
  if (["200", "500", "800"].includes(value)) {
    return `Plano ${value}`;
  }
  return value;
}

export function waitlistStatusLabel(status: OpsWaitlistStatus): string {
  if (status === "converted") {
    return "Convertido";
  }
  if (status === "discarded") {
    return "Excluído";
  }
  return "Pendente";
}
