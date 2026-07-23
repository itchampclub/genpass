import { crc16 } from "./crc16.js";

/**
 * Thai PromptPay QR payload generator, per the EMVCo "QR Code Specification
 * for Payment Systems" (EMV QR CPS) merchant-presented mode used by the
 * Thai QR Payment Standard.
 *
 * Reference test vectors match the widely used `promptpay-qr` implementation
 * (https://github.com/dtinth/promptpay-qr), reimplemented here so the app has
 * no runtime dependency on it.
 */

export type PromptPayTargetType = "mobile" | "nationalId" | "eWalletId";

export interface PromptPayInput {
  target: string;
  targetType: PromptPayTargetType;
  /** Fixed amount in THB. Omit to let the payer enter the amount (static QR). */
  amount?: number;
}

const AID = "A000000677010111";

const TAG_BY_TARGET_TYPE: Record<PromptPayTargetType, string> = {
  mobile: "01",
  nationalId: "02",
  eWalletId: "03",
};

function format(tag: string, value: string): string {
  return `${tag}${value.length.toString().padStart(2, "0")}${value}`;
}

function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

/** Normalizes a target into the exact digit string the spec expects. */
export function sanitizeTarget(rawTarget: string, targetType: PromptPayTargetType): string {
  const digits = onlyDigits(rawTarget);

  if (targetType === "mobile") {
    // Thai mobile numbers are 10 digits starting with 0, e.g. 08xxxxxxxx.
    // The field value is country code 66 + the number without its leading 0.
    const local = digits.length === 10 && digits.startsWith("0") ? digits.slice(1) : digits;
    return `0066${local}`;
  }

  // National ID (13 digits) and e-Wallet ID (15 digits) are used as-is.
  return digits;
}

export function validateTarget(rawTarget: string, targetType: PromptPayTargetType): string | null {
  const digits = onlyDigits(rawTarget);
  if (targetType === "mobile") {
    if (!(digits.length === 10 && digits.startsWith("0")) && digits.length !== 13) {
      return "Enter a 10-digit Thai mobile number, e.g. 0812345678";
    }
  } else if (targetType === "nationalId") {
    if (digits.length !== 13) return "National ID must be 13 digits";
  } else if (targetType === "eWalletId") {
    if (digits.length !== 15) return "e-Wallet ID must be 15 digits";
  }
  return null;
}

/** Builds the raw PromptPay EMV QR payload string (before rendering as a QR image). */
export function generatePromptPayPayload(input: PromptPayInput): string {
  const error = validateTarget(input.target, input.targetType);
  if (error) throw new Error(error);

  const target = sanitizeTarget(input.target, input.targetType);
  const tag = TAG_BY_TARGET_TYPE[input.targetType];
  const hasAmount = typeof input.amount === "number" && input.amount > 0;

  const parts = [
    format("00", "01"), // Payload Format Indicator
    format("01", hasAmount ? "12" : "11"), // Point of Initiation Method: 12 = dynamic, 11 = static
    format(
      "29",
      [format("00", AID), format(tag, target)].join(""), // Merchant Account Info (PromptPay)
    ),
    format("53", "764"), // Transaction Currency: THB (ISO 4217 numeric)
  ];

  if (hasAmount) {
    parts.push(format("54", (input.amount as number).toFixed(2)));
  }

  parts.push(format("58", "TH")); // Country Code

  const withoutCrc = `${parts.join("")}6304`;
  return withoutCrc + crc16(withoutCrc);
}
