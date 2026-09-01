import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { waitlistPlanLabel, waitlistStatusLabel } from "./opsWaitlistLabels.ts";

describe("waitlistPlanLabel", () => {
  it("should use waitlist personalizado, not billing custom", () => {
    assert.equal(waitlistPlanLabel("personalizado"), "Personalizado");
    assert.equal(waitlistPlanLabel("500"), "Plano 500");
    assert.equal(waitlistPlanLabel("custom"), "custom");
    assert.equal(waitlistPlanLabel(null), "—");
  });
});

describe("waitlistStatusLabel", () => {
  it("should map operational statuses", () => {
    assert.equal(waitlistStatusLabel("pending"), "Pendente");
    assert.equal(waitlistStatusLabel("converted"), "Convertido");
    assert.equal(waitlistStatusLabel("discarded"), "Excluído");
  });
});
