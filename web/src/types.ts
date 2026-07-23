export type PassStyle = "generic" | "storeCard" | "coupon" | "eventTicket" | "boardingPass";

export interface PassField {
  key: string;
  label: string;
  value: string;
}

export type PromptPayTargetType = "mobile" | "nationalId" | "eWalletId";

export interface PromptPayOptions {
  targetType: PromptPayTargetType;
  target: string;
  amount?: number;
}

export interface CreatePassRequest {
  style: PassStyle;
  organizationName: string;
  description: string;
  logoText?: string;
  backgroundColor?: string;
  foregroundColor?: string;
  labelColor?: string;
  headerFields?: PassField[];
  primaryFields?: PassField[];
  secondaryFields?: PassField[];
  auxiliaryFields?: PassField[];
  backFields?: PassField[];
  promptPay?: PromptPayOptions;
  barcodeMessage?: string;
  images?: Record<string, string>;
}

export type BarcodeMode = "none" | "promptpay" | "custom";
