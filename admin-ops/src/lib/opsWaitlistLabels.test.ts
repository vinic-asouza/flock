import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { waitlistPlanLabel } from "./opsWaitlistLabels.ts";

describe("waitlistPlanLabel", () => {
  it("should use waitlist personalizado, not billing custom", () => {
    assert.equal(waitlistPlanLabel("personalizado"), "Personalizado");
    assert.equal(waitlistPlanLabel("500"), "Plano 500");
    assert.equal(waitlistPlanLabel("custom"), "custom");
    assert.equal(waitlistPlanLabel(null), "—");
  });
});
