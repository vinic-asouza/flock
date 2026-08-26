import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { displayValue, formatCnpj } from "./opsFormat.ts";
import { formatOpsReadError, isNotFoundReadError } from "./opsReadErrors.ts";

function apiError(message: string, status: number, details?: string | string[]) {
  const error = new Error(message) as Error & {
    status?: number;
    details?: string | string[];
  };
  error.status = status;
  error.details = details;
  return error;
}

describe("opsFormat", () => {
  it("should format a 14-digit CNPJ", () => {
    assert.equal(formatCnpj("12345678000199"), "12.345.678/0001-99");
    assert.equal(formatCnpj(""), "—");
    assert.equal(displayValue("  "), "—");
  });
});

describe("formatOpsReadError", () => {
  it("should map 404 and 400 as not found", () => {
    const notFound = formatOpsReadError(apiError("Igreja não encontrada", 404));
    assert.equal(notFound.title, "Igreja não encontrada");
    assert.equal(isNotFoundReadError(apiError("bad", 400)), true);
    assert.equal(isNotFoundReadError(apiError("boom", 500)), false);
  });

  it("should map 429 rate limit", () => {
    const view = formatOpsReadError(apiError("Muitas requisições", 429));
    assert.equal(view.title, "Muitas requisições");
  });
});
