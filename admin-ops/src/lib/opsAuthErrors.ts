export interface OpsAuthErrorView {
  title: string;
  details?: string;
}

interface ApiErrorLike {
  message?: string;
  status?: number;
  details?: string | string[];
}

function detailsToText(details: string | string[] | undefined): string | undefined {
  if (!details) {
    return undefined;
  }
  return Array.isArray(details) ? details.join("; ") : details;
}

export function formatOpsAuthError(err: unknown): OpsAuthErrorView {
  if (!(err instanceof Error)) {
    return { title: "Não foi possível entrar. Tente novamente." };
  }

  const apiError = err as Error & ApiErrorLike;
  const status = apiError.status;
  const rawDetails = detailsToText(apiError.details);
  const combined = `${apiError.message} ${rawDetails || ""}`.toLowerCase();

  if (status === 429) {
    return {
      title: "Muitas tentativas de login",
      details: rawDetails || "Tente novamente em alguns minutos.",
    };
  }

  if (
    combined.includes("email não confirmado") ||
    combined.includes("confirm your email") ||
    combined.includes("not confirmed")
  ) {
    return {
      title: "E-mail não confirmado",
      details: "Verifique sua caixa de entrada e confirme o e-mail antes de entrar.",
    };
  }

  if (status === 403) {
    return {
      title: apiError.message || "Acesso negado",
      details: rawDetails || "Esta conta não tem acesso ao Admin OPS.",
    };
  }

  if (status === 401) {
    return {
      title: "Credenciais inválidas",
      details: "Confira o e-mail e a senha e tente novamente.",
    };
  }

  if (status === 400) {
    return {
      title: apiError.message || "Dados inválidos",
      details: rawDetails,
    };
  }

  if (!status && combined.includes("network")) {
    return {
      title: "Não foi possível conectar à API",
      details: "Confira se o backend está no ar e se NEXT_PUBLIC_API_URL está correto.",
    };
  }

  return {
    title: apiError.message || "Não foi possível entrar. Tente novamente.",
    details: rawDetails,
  };
}
