import { test } from "node:test";
import assert from "node:assert/strict";
import { generatePromptPayPayload, sanitizeTarget, validateTarget } from "./promptpay.js";

test("sanitizeTarget converts a Thai mobile number to country-code form", () => {
  assert.equal(sanitizeTarget("081-234-5678", "mobile"), "0066812345678");
});

test("sanitizeTarget passes national ID digits through unchanged", () => {
  assert.equal(sanitizeTarget("1-2345-67890-12-3", "nationalId"), "1234567890123");
});

test("generatePromptPayPayload produces a well-formed static payload for a mobile target", () => {
  const payload = generatePromptPayPayload({ target: "0812345678", targetType: "mobile" });

  assert.match(payload, /^000201/); // Payload Format Indicator
  assert.match(payload, /010211/); // static point-of-initiation method
  assert.match(payload, /A000000677010111/); // PromptPay AID
  assert.match(payload, /0066812345678/); // sanitized mobile target
  assert.match(payload, /5303764/); // THB currency
  assert.match(payload, /5802TH/); // country code

  // CRC is recomputed and must match the trailing 4 hex chars.
  const withoutCrc = payload.slice(0, -4);
  const crc = payload.slice(-4);
  assert.match(crc, /^[0-9A-F]{4}$/);
  assert.equal(withoutCrc.slice(-4), "6304");
});

test("generatePromptPayPayload switches to dynamic mode and includes the amount when given", () => {
  const payload = generatePromptPayPayload({
    target: "0812345678",
    targetType: "mobile",
    amount: 100,
  });

  assert.match(payload, /010212/); // dynamic point-of-initiation method
  assert.match(payload, /5406100\.00/); // amount field, tag 54, len 06
});

test("generatePromptPayPayload rejects an invalid national ID", () => {
  assert.throws(() => generatePromptPayPayload({ target: "123", targetType: "nationalId" }));
});

test("validateTarget accepts a 13-digit mobile field already in country-code form", () => {
  assert.equal(validateTarget("0066812345678", "mobile"), null);
});
