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
    assert.equal(query.status, "pending");
  });

  it("should parse personalizado and search", () => {
    const query = parseWaitlistListSearchParams(
      new URLSearchParams("plan=personalizado&q=Ana&page=2")
    );
    assert.equal(query.plan, "personalizado");
    assert.equal(query.q, "Ana");
    assert.equal(query.page, 2);
  });

  it("should parse status filter and drop unknown status", () => {
    const converted = parseWaitlistListSearchParams(
      new URLSearchParams("status=converted")
    );
    assert.equal(converted.status, "converted");
    const all = parseWaitlistListSearchParams(new URLSearchParams("status=all"));
    assert.equal(all.status, "all");
    const unknown = parseWaitlistListSearchParams(
      new URLSearchParams("status=deleted")
    );
    assert.equal(unknown.status, "pending");
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
  it("should omit defaults including pending status", () => {
    const href = waitlistListHref({ page: 1, sort_order: "desc" });
    assert.equal(href, "/waitlist");
  });

  it("should keep plan, q and non-default status in the URL", () => {
    const href = waitlistListHref({
      q: "igreja",
      plan: "500",
      status: "all",
      page: 2,
      sort_order: "asc",
    });
    assert.equal(href.includes("q=igreja"), true);
    assert.equal(href.includes("plan=500"), true);
    assert.equal(href.includes("status=all"), true);
    assert.equal(href.includes("page=2"), true);
    assert.equal(href.includes("sort_order=asc"), true);
  });

  it("should never serialize custom as plan", () => {
    const params = serializeWaitlistListQuery({
      page: 1,
      limit: 20,
      status: "pending",
      sort_by: "created_at",
      sort_order: "desc",
    });
    assert.equal(params.get("plan"), null);
    assert.equal(params.get("status"), null);
  });
});

describe("toWaitlistListApiParams / filters", () => {
  it("should send plan not plan_type and omit default pending", () => {
    const params = toWaitlistListApiParams({
      page: 1,
      limit: 20,
      plan: "800",
      q: "ana",
      status: "pending",
      sort_by: "created_at",
      sort_order: "desc",
    });
    assert.equal(params.plan, "800");
    assert.equal("plan_type" in params, false);
    assert.equal(params.q, "ana");
    assert.equal("status" in params, false);
  });

  it("should send status all to the API", () => {
    const params = toWaitlistListApiParams({
      page: 1,
      limit: 20,
      status: "all",
      sort_by: "created_at",
      sort_order: "desc",
    });
    assert.equal(params.status, "all");
  });

  it("should detect active filters including non-pending status", () => {
    assert.equal(
      hasActiveWaitlistFilters({
        page: 1,
        limit: 20,
        status: "pending",
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
        status: "pending",
        sort_by: "created_at",
        sort_order: "desc",
      }),
      true
    );
    assert.equal(
      hasActiveWaitlistFilters({
        page: 1,
        limit: 20,
        status: "converted",
        sort_by: "created_at",
        sort_order: "desc",
      }),
      true
    );
  });
});
