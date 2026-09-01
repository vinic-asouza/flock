import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mailtoHref, whatsappHref } from "./opsContact.ts";

describe("opsContact", () => {
  it("should build mailto for a valid email", () => {
    assert.equal(mailtoHref(" ana@test.com "), "mailto:ana@test.com");
    assert.equal(mailtoHref("sem-arroba"), null);
    assert.equal(mailtoHref(""), null);
  });

  it("should build WhatsApp links with BR country code", () => {
    assert.equal(whatsappHref("14999999999"), "https://wa.me/5514999999999");
    assert.equal(whatsappHref("(14) 99999-9999"), "https://wa.me/5514999999999");
    assert.equal(whatsappHref("5514999999999"), "https://wa.me/5514999999999");
    assert.equal(whatsappHref("123"), null);
  });
});
