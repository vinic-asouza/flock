import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  hasActiveWaitlistFilters,
  parseWaitlistListSearchParams,
  serializeWaitlistListQuery,
  toWaitlistListApiParams,
  waitlistListHref,
} from "./opsWaitlistQuery.ts";

describe("parseWaitlistListSearchParams", () => {
  it("should ignore billing custom plan (waitlist uses personalizado)", () => {
    const query = parseWaitlistListSearchParams(
      new URLSearchParams("plan=custom")
    );
    assert.equal(query.plan, undefined);
  });

  it("should parse personalizado and search", () => {
    const query = parseWaitlistListSearchParams(
      new URLSearchParams("plan=personalizado&q=Ana&page=2")
    );
    assert.equal(query.plan, "personalizado");
    assert.equal(query.q, "Ana");
    assert.equal(query.page, 2);
  });

  it("should clamp limit and drop unknown sort", () => {
    const query = parseWaitlistListSearchParams(
      new URLSearchParams("limit=500&sort_by=email&page=2")
    );
    assert.equal(query.limit, 100);
    assert.equal(query.sort_by, "created_at");
    assert.equal(query.page, 2);
  });
});

describe("serializeWaitlistListQuery / waitlistListHref", () => {
  it("should omit defaults", () => {
    const href = waitlistListHref({ page: 1, sort_order: "desc" });
    assert.equal(href, "/waitlist");
  });

  it("should keep plan and q in the URL", () => {
    const href = waitlistListHref({
      q: "igreja",
      plan: "500",
      page: 2,
      sort_order: "asc",
    });
    assert.equal(href.includes("q=igreja"), true);
    assert.equal(href.includes("plan=500"), true);
    assert.equal(href.includes("page=2"), true);
    assert.equal(href.includes("sort_order=asc"), true);
  });

  it("should never serialize custom as plan", () => {
    const params = serializeWaitlistListQuery({
      page: 1,
      limit: 20,
      sort_by: "created_at",
      sort_order: "desc",
    });
    assert.equal(params.get("plan"), null);
  });
});

describe("toWaitlistListApiParams / filters", () => {
  it("should send plan not plan_type", () => {
    const params = toWaitlistListApiParams({
      page: 1,
      limit: 20,
      plan: "800",
      q: "ana",
      sort_by: "created_at",
      sort_order: "desc",
    });
    assert.equal(params.plan, "800");
    assert.equal("plan_type" in params, false);
    assert.equal(params.q, "ana");
  });

  it("should detect active filters", () => {
    assert.equal(
      hasActiveWaitlistFilters({
        page: 1,
        limit: 20,
        sort_by: "created_at",
        sort_order: "desc",
      }),
      false
    );
    assert.equal(
      hasActiveWaitlistFilters({
        page: 1,
        limit: 20,
        q: "x",
        sort_by: "created_at",
        sort_order: "desc",
      }),
      true
    );
  });
});
