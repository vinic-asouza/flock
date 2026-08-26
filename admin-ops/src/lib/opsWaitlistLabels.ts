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
