import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PKPass } from "passkit-generator";
import type { AppleCertificateConfig } from "./certificates.js";
import { generatePromptPayPayload } from "./promptpay.js";
import type { CreatePassRequest, PassFieldInput } from "../types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_ASSETS_DIR = join(__dirname, "..", "..", "assets", "default.pass");

const DEFAULT_ICON_FILES = ["icon.png", "icon@2x.png", "icon@3x.png"] as const;

function loadDefaultIcons(): Record<string, Buffer> {
  const icons: Record<string, Buffer> = {};
  for (const file of DEFAULT_ICON_FILES) {
    icons[file] = readFileSync(join(DEFAULT_ASSETS_DIR, file));
  }
  return icons;
}

/** Converts "#1a56db" (or "1a56db") into Apple's "rgb(26, 86, 219)" format. */
function hexToRgb(hex: string): string {
  const clean = hex.replace(/^#/, "");
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `rgb(${r}, ${g}, ${b})`;
}

function toFieldContent(field: PassFieldInput) {
  return { key: field.key, label: field.label, value: field.value };
}

export function resolveBarcodeMessage(request: CreatePassRequest): string | undefined {
  if (request.promptPay) {
    return generatePromptPayPayload({
      targetType: request.promptPay.targetType,
      target: request.promptPay.target,
      amount: request.promptPay.amount,
    });
  }
  return request.barcodeMessage;
}

export async function buildPassBuffer(
  request: CreatePassRequest,
  certificates: AppleCertificateConfig,
): Promise<Buffer> {
  const images: Record<string, Buffer> = { ...loadDefaultIcons() };
  for (const [name, base64] of Object.entries(request.images ?? {})) {
    images[name] = Buffer.from(base64, "base64");
  }

  const pass = new PKPass(
    images,
    {
      wwdr: certificates.wwdr,
      signerCert: certificates.signerCert,
      signerKey: certificates.signerKey,
      signerKeyPassphrase: certificates.signerKeyPassphrase,
    },
    {
      formatVersion: 1,
      serialNumber: randomUUID(),
      description: request.description,
      organizationName: request.organizationName,
      passTypeIdentifier: certificates.passTypeIdentifier,
      teamIdentifier: certificates.teamIdentifier,
      ...(request.logoText ? { logoText: request.logoText } : {}),
      ...(request.backgroundColor ? { backgroundColor: hexToRgb(request.backgroundColor) } : {}),
      ...(request.foregroundColor ? { foregroundColor: hexToRgb(request.foregroundColor) } : {}),
      ...(request.labelColor ? { labelColor: hexToRgb(request.labelColor) } : {}),
    },
  );

  pass.type = request.style;

  for (const field of request.headerFields ?? []) pass.headerFields.push(toFieldContent(field));
  for (const field of request.primaryFields ?? []) pass.primaryFields.push(toFieldContent(field));
  for (const field of request.secondaryFields ?? []) pass.secondaryFields.push(toFieldContent(field));
  for (const field of request.auxiliaryFields ?? []) pass.auxiliaryFields.push(toFieldContent(field));
  for (const field of request.backFields ?? []) pass.backFields.push(toFieldContent(field));

  const barcodeMessage = resolveBarcodeMessage(request);
  if (barcodeMessage) {
    pass.setBarcodes({
      format: "PKBarcodeFormatQR",
      message: barcodeMessage,
      messageEncoding: "iso-8859-1",
      ...(request.promptPay ? { altText: "PromptPay" } : {}),
    });
  }

  return pass.getAsBuffer();
}
