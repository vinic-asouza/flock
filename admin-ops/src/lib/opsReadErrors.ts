export interface OpsReadErrorView {
  title: string;
  details?: string;
  status?: number;
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

export function getErrorStatus(err: unknown): number | undefined {
  if (!(err instanceof Error)) {
    return undefined;
  }
  return (err as Error & ApiErrorLike).status;
}

export function formatOpsReadError(err: unknown): OpsReadErrorView {
  if (!(err instanceof Error)) {
    return { title: "Não foi possível carregar os dados. Tente novamente." };
  }

  const apiError = err as Error & ApiErrorLike;
  const status = apiError.status;
  const rawDetails = detailsToText(apiError.details);
  const combined = `${apiError.message} ${rawDetails || ""}`.toLowerCase();

  if (status === 429) {
    return {
      title: "Muitas requisições",
      details: rawDetails || "Aguarde um momento e tente novamente.",
      status,
    };
  }

  if (status === 404) {
    return {
      title: "Igreja não encontrada",
      details: "Essa Igreja não existe ou o identificador é inválido.",
      status,
    };
  }

  if (status === 400) {
    return {
      title: apiError.message || "Identificador inválido",
      details: rawDetails || "Confira o endereço e volte à lista de Igrejas.",
      status,
    };
  }

  if (status === 403) {
    return {
      title: apiError.message || "Acesso negado",
      details: rawDetails || "Esta conta não tem acesso ao Admin OPS.",
      status,
    };
  }

  if (status === 401) {
    return {
      title: "Sessão expirada",
      details: "Entre novamente para continuar.",
      status,
    };
  }

  if (!status && combined.includes("network")) {
    return {
      title: "Não foi possível conectar à API",
      details:
        "Confira se o backend está no ar e se NEXT_PUBLIC_API_URL está correto.",
    };
  }

  return {
    title: apiError.message || "Não foi possível carregar os dados.",
    details: rawDetails,
    status,
  };
}

export function formatOpsWaitlistMutationError(err: unknown): string {
  if (!(err instanceof Error)) {
    return "Não foi possível atualizar o lead. Tente novamente.";
  }

  const status = getErrorStatus(err);
  if (status === 409) {
    return "Este lead já não está pendente.";
  }
  if (status === 404) {
    return "Lead não encontrado.";
  }
  if (status === 429) {
    return "Muitas requisições. Aguarde um momento e tente novamente.";
  }

  return err.message || "Não foi possível atualizar o lead.";
}

export function isNotFoundReadError(err: unknown): boolean {
  const status = getErrorStatus(err);
  return status === 404 || status === 400;
}
