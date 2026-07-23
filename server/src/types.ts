export type PassStyle = "generic" | "storeCard" | "coupon" | "eventTicket" | "boardingPass";

export interface PassFieldInput {
  key: string;
  label?: string;
  value: string;
}

export interface PromptPayOptions {
  targetType: "mobile" | "nationalId" | "eWalletId";
  target: string;
  amount?: number;
}

export interface CreatePassRequest {
  style: PassStyle;
  organizationName: string;
  description: string;
  logoText?: string;
  /** Hex colors, e.g. "#1a56db". Converted to Apple's rgb() format. */
  backgroundColor?: string;
  foregroundColor?: string;
  labelColor?: string;
  headerFields?: PassFieldInput[];
  primaryFields?: PassFieldInput[];
  secondaryFields?: PassFieldInput[];
  auxiliaryFields?: PassFieldInput[];
  backFields?: PassFieldInput[];
  /** Thai PromptPay QR — mutually exclusive with `barcodeMessage`. */
  promptPay?: PromptPayOptions;
  /** Arbitrary barcode/QR content for non-PromptPay passes. */
  barcodeMessage?: string;
  /** Base64-encoded PNG uploads, keyed by pass.json asset name (logo.png, icon.png, strip.png, ...). */
  images?: Record<string, string>;
}

export interface StoredPass {
  id: string;
  fileName: string;
  buffer: Buffer;
  createdAt: number;
}
