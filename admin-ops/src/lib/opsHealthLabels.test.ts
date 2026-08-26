import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  healthStatusLabel,
  jobLastStatusLabel,
  jobNameLabel,
  staleHealthErrorDetails,
} from "./opsHealthLabels.ts";

describe("ops health labels", () => {
  it("should use Portuguese status copy", () => {
    assert.equal(healthStatusLabel("ok"), "Ok");
    assert.equal(healthStatusLabel("degraded"), "Degradado");
    assert.equal(healthStatusLabel("error"), "Erro");
  });

  it("should label known billing jobs in Portuguese", () => {
    assert.equal(
      jobNameLabel("cleanup_pending_subscriptions"),
      "Limpeza de assinaturas pendentes"
    );
    assert.equal(
      jobNameLabel("check_subscription_expiration"),
      "Avisos de expiração"
    );
  });

  it("should say Ainda não executou when a job never ran", () => {
    assert.equal(jobLastStatusLabel(null), "Ainda não executou");
    assert.equal(jobLastStatusLabel("failed"), "Falhou");
  });

  it("should keep API details on first load and note stale payload on refresh", () => {
    assert.equal(
      staleHealthErrorDetails("Confira o backend.", false),
      "Confira o backend."
    );
    assert.equal(
      staleHealthErrorDetails(undefined, true),
      "Exibindo a última consulta bem-sucedida."
    );
    assert.equal(
      staleHealthErrorDetails("Confira o backend.", true),
      "Confira o backend. Exibindo a última consulta bem-sucedida."
    );
  });
});
