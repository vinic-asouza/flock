import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  churchDetailHref,
  churchesListHref,
  isFilterableBreakdownKey,
  parseChurchListSearchParams,
  serializeChurchListQuery,
  toChurchListApiParams,
} from "./opsChurchQuery.ts";

describe("parseChurchListSearchParams", () => {
  it("should ignore none buckets that the API rejects", () => {
    const query = parseChurchListSearchParams(
      new URLSearchParams("plan_type=none&subscription_status=none")
    );
    assert.equal(query.plan_type, undefined);
    assert.equal(query.subscription_status, undefined);
  });

  it("should parse commercially_active boolean from query string", () => {
    const active = parseChurchListSearchParams(
      new URLSearchParams("commercially_active=true")
    );
    const inactive = parseChurchListSearchParams(
      new URLSearchParams("commercially_active=false")
    );
    const invalid = parseChurchListSearchParams(
      new URLSearchParams("commercially_active=yes")
    );

    assert.equal(active.commercially_active, true);
    assert.equal(inactive.commercially_active, false);
    assert.equal(invalid.commercially_active, undefined);
  });

  it("should clamp limit and drop unknown sort", () => {
    const query = parseChurchListSearchParams(
      new URLSearchParams("limit=500&sort_by=members&page=2")
    );
    assert.equal(query.limit, 100);
    assert.equal(query.sort_by, "created_at");
    assert.equal(query.page, 2);
  });
});

describe("serializeChurchListQuery / churchesListHref", () => {
  it("should omit default page and never serialize none", () => {
    const href = churchesListHref({
      page: 1,
      limit: 20,
      sort_by: "created_at",
      sort_order: "desc",
      commercially_active: true,
    });
    assert.equal(href, "/churches?commercially_active=true");
  });

  it("should keep boolean commercially_active in API params", () => {
    const params = toChurchListApiParams({
      page: 1,
      limit: 20,
      sort_by: "name",
      sort_order: "asc",
      commercially_active: false,
      q: "matriz",
    });
    assert.equal(params.commercially_active, false);
    assert.equal(params.q, "matriz");
    assert.equal(params.sort_by, "name");
  });

  it("should omit empty search from the serialized query", () => {
    const params = serializeChurchListQuery({
      page: 1,
      limit: 20,
      sort_by: "created_at",
      sort_order: "desc",
    });
    assert.equal(params.toString(), "");
  });

  it("should round-trip list filters on the ficha URL", () => {
    const listQuery = parseChurchListSearchParams(
      new URLSearchParams("q=Tocixi&commercially_active=true&page=2")
    );
    const href = churchDetailHref("b494bd0b-ceb3-4228-b88a-bf3631202e27", listQuery);
    assert.equal(
      href,
      "/churches/b494bd0b-ceb3-4228-b88a-bf3631202e27?page=2&q=Tocixi&commercially_active=true"
    );

    const fromFicha = parseChurchListSearchParams(
      new URLSearchParams(href.split("?")[1])
    );
    assert.equal(churchesListHref(fromFicha), "/churches?page=2&q=Tocixi&commercially_active=true");
  });

  it("should omit querystring on the ficha when the list has no filters", () => {
    assert.equal(
      churchDetailHref("b494bd0b-ceb3-4228-b88a-bf3631202e27"),
      "/churches/b494bd0b-ceb3-4228-b88a-bf3631202e27"
    );
  });
});

describe("isFilterableBreakdownKey", () => {
  it("should reject none and unknown keys", () => {
    assert.equal(isFilterableBreakdownKey("none", "plan"), false);
    assert.equal(isFilterableBreakdownKey("500", "plan"), true);
    assert.equal(isFilterableBreakdownKey("active", "status"), true);
    assert.equal(isFilterableBreakdownKey("none", "status"), false);
    assert.equal(isFilterableBreakdownKey("bogus", "plan"), false);
  });
});
