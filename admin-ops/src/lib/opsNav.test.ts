import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  OPS_BRAND,
  OPS_NAV_GROUPS,
  OPS_NAV_ITEMS,
  isOpsNavCurrent,
} from "./opsNav.ts";

describe("ops nav", () => {
  it("should use Visão geral instead of Overview", () => {
    assert.equal(OPS_BRAND, "Flock Admin OPS");
    const labels = OPS_NAV_ITEMS.map((item) => item.label);
    assert.deepEqual(labels, [
      "Visão geral",
      "Igrejas",
      "Lista de espera",
      "Saúde",
    ]);
    assert.equal(
      labels.some((label) => label.toLowerCase().includes("overview")),
      false
    );
  });

  it("should group commercial destinations apart from health", () => {
    assert.deepEqual(
      OPS_NAV_GROUPS.map((group) => group.label),
      ["Operação", "Plataforma"]
    );
    assert.equal(OPS_NAV_GROUPS[0].items[0].href, "/");
    assert.equal(OPS_NAV_GROUPS[1].items[0].href, "/health");
  });

  it("should mark churches detail as current for the Igrejas item", () => {
    const churches = OPS_NAV_ITEMS.find((item) => item.href === "/churches");
    assert.ok(churches);
    assert.equal(churches.icon, "churches");
    assert.equal(isOpsNavCurrent("/churches", churches), true);
    assert.equal(
      isOpsNavCurrent("/churches/abc", churches),
      true
    );
    assert.equal(isOpsNavCurrent("/", churches), false);

    const home = OPS_NAV_ITEMS.find((item) => item.href === "/");
    assert.ok(home);
    assert.equal(isOpsNavCurrent("/", home), true);
    assert.equal(isOpsNavCurrent("/churches", home), false);
  });
});
