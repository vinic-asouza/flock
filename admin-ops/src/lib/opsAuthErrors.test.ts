import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatOpsAuthError } from "./opsAuthErrors.ts";

function apiError(message: string, status: number, details?: string | string[]) {
  const error = new Error(message) as Error & {
    status?: number;
    details?: string | string[];
  };
  error.status = status;
  error.details = details;
  return error;
}

describe("formatOpsAuthError", () => {
  it("should map 401 to generic invalid credentials", () => {
    const view = formatOpsAuthError(
      apiError("Credenciais inválidas", 401, "Invalid login credentials")
    );
    assert.equal(view.title, "Credenciais inválidas");
    assert.equal(view.details, "Confira o e-mail e a senha e tente novamente.");
  });

  it("should map unconfirmed email even when status is 401", () => {
    const view = formatOpsAuthError(
      apiError("Email não confirmado", 401, "Necessário realizar confirmação de email.")
    );
    assert.equal(view.title, "E-mail não confirmado");
  });

  it("should keep 403 allowlist and church membership details", () => {
    const view = formatOpsAuthError(
      apiError(
        "Acesso negado",
        403,
        "Contas vinculadas a uma igreja não podem acessar o Admin OPS."
      )
    );
    assert.equal(view.title, "Acesso negado");
    assert.equal(
      view.details,
      "Contas vinculadas a uma igreja não podem acessar o Admin OPS."
    );
  });

  it("should map 429 rate limit", () => {
    const view = formatOpsAuthError(
      apiError("Muitas tentativas de login", 429)
    );
    assert.equal(view.title, "Muitas tentativas de login");
  });
});
