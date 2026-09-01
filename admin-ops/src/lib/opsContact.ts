export function mailtoHref(email: string | null | undefined): string | null {
  const trimmed = email?.trim();
  if (!trimmed || !trimmed.includes("@")) {
    return null;
  }
  return `mailto:${trimmed}`;
}

export function whatsappHref(phone: string | null | undefined): string | null {
  const digits = (phone ?? "").replace(/\D/g, "");
  if (digits.length < 10) {
    return null;
  }
  const e164 = digits.startsWith("55") ? digits : `55${digits}`;
  return `https://wa.me/${e164}`;
}
