import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatLatencyMs,
  formatUptimeSeconds,
  latencyWindowLabel,
} from "./opsHttpLatencyLabels.ts";

describe("opsHttpLatencyLabels", () => {
  it("formats ms and null", () => {
    assert.equal(formatLatencyMs(null), "—");
    assert.equal(formatLatencyMs(250), "250 ms");
  });

  it("formats uptime", () => {
    assert.equal(formatUptimeSeconds(45), "45s");
    assert.equal(formatUptimeSeconds(90), "1m 30s");
    assert.equal(formatUptimeSeconds(3660), "1h 1m");
  });

  it("labels process window", () => {
    assert.equal(
      latencyWindowLabel("process_uptime"),
      "Desde o último restart da API"
    );
  });
});
