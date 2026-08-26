import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  commerciallyActiveLabel,
  planTypeLabel,
  sortBreakdownEntries,
  subscriptionStatusLabel,
} from "./opsChurchLabels.ts";

describe("ops church labels", () => {
  it("should not use a generic Ativo badge copy", () => {
    assert.equal(commerciallyActiveLabel(true), "Comercialmente ativa");
    assert.equal(commerciallyActiveLabel(false), "Comercialmente inativa");
    assert.equal(planTypeLabel(null), "Sem plano");
    assert.equal(planTypeLabel("none"), "Sem plano");
    assert.equal(planTypeLabel("500"), "Plano 500");
    assert.equal(subscriptionStatusLabel(null), "Sem assinatura");
    assert.equal(subscriptionStatusLabel("none"), "Sem assinatura");
    assert.equal(subscriptionStatusLabel("trialing"), "Em trial");
  });

  it("should keep none buckets last in breakdowns", () => {
    const sorted = sortBreakdownEntries(
      [
        ["none", 4],
        ["500", 1],
        ["100", 2],
      ],
      "plan"
    );
    assert.deepEqual(
      sorted.map(([key]) => key),
      ["100", "500", "none"]
    );
  });
});
