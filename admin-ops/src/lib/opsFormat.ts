export function displayValue(value: string | null | undefined): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : "—";
}

export function formatCnpj(cnpj: string | null | undefined): string {
  if (!cnpj) {
    return "—";
  }
  const digits = cnpj.replace(/\D/g, "");
  if (digits.length !== 14) {
    return cnpj;
  }
  return digits.replace(
    /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
    "$1.$2.$3/$4-$5"
  );
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) {
    return "—";
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

export function formatPhone(phone: string | null | undefined): string {
  if (!phone) {
    return "—";
  }
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 11) {
    return digits.replace(/^(\d{2})(\d{5})(\d{4})$/, "($1) $2-$3");
  }
  if (digits.length === 10) {
    return digits.replace(/^(\d{2})(\d{4})(\d{4})$/, "($1) $2-$3");
  }
  return phone;
}

export function formatCityState(
  city: string | null | undefined,
  state: string | null | undefined
): string {
  const cityLabel = displayValue(city);
  const stateLabel = state?.trim();
  if (!stateLabel) {
    return cityLabel;
  }
  if (cityLabel === "—") {
    return stateLabel;
  }
  return `${city?.trim()}/${stateLabel}`;
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) {
    return "—";
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
  }).format(date);
}
