import type { CreatePassRequest, PromptPayOptions } from "./types";

async function asJson<T>(res: Response): Promise<T> {
  const body = await res.json();
  if (!res.ok) {
    const message = typeof body?.error === "string" ? body.error : JSON.stringify(body?.error ?? body);
    throw new Error(message || `Request failed with status ${res.status}`);
  }
  return body as T;
}

export function getConfig() {
  return fetch("/api/config").then((res) => asJson<{ appleWalletConfigured: boolean }>(res));
}

export function previewPromptPay(options: PromptPayOptions) {
  return fetch("/api/promptpay/preview", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(options),
  }).then((res) => asJson<{ payload: string; qrDataUrl: string }>(res));
}

export function previewBarcode(message: string) {
  return fetch("/api/barcode/preview", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  }).then((res) => asJson<{ qrDataUrl: string }>(res));
}

export function createPass(request: CreatePassRequest) {
  return fetch("/api/passes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  }).then((res) => asJson<{ id: string; downloadUrl: string; barcodeMessage?: string }>(res));
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1] ?? "");
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
