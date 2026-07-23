import { Hono } from "hono";
import QRCode from "qrcode";
import { z } from "zod";
import { isAppleCertConfigured, loadAppleCertConfig } from "../lib/certificates.js";
import { buildPassBuffer, resolveBarcodeMessage } from "../lib/passkit.js";
import { generatePromptPayPayload } from "../lib/promptpay.js";
import { getPass, savePass } from "../lib/store.js";

const fieldSchema = z.object({
  key: z.string().min(1),
  label: z.string().optional(),
  value: z.string(),
});

const promptPaySchema = z.object({
  targetType: z.enum(["mobile", "nationalId", "eWalletId"]),
  target: z.string().min(1),
  amount: z.number().positive().optional(),
});

const createPassSchema = z.object({
  style: z.enum(["generic", "storeCard", "coupon", "eventTicket", "boardingPass"]),
  organizationName: z.string().min(1),
  description: z.string().min(1),
  logoText: z.string().optional(),
  backgroundColor: z.string().optional(),
  foregroundColor: z.string().optional(),
  labelColor: z.string().optional(),
  headerFields: z.array(fieldSchema).optional(),
  primaryFields: z.array(fieldSchema).optional(),
  secondaryFields: z.array(fieldSchema).optional(),
  auxiliaryFields: z.array(fieldSchema).optional(),
  backFields: z.array(fieldSchema).optional(),
  promptPay: promptPaySchema.optional(),
  barcodeMessage: z.string().optional(),
  images: z.record(z.string()).optional(),
});

export const passRoutes = new Hono();

passRoutes.get("/config", (c) => {
  return c.json({ appleWalletConfigured: isAppleCertConfigured() });
});

passRoutes.post("/barcode/preview", async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = z.object({ message: z.string().min(1) }).safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.flatten() }, 400);
  }

  const qrDataUrl = await QRCode.toDataURL(parsed.data.message, { margin: 1, width: 240 });
  return c.json({ qrDataUrl });
});

passRoutes.post("/promptpay/preview", async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = promptPaySchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.flatten() }, 400);
  }

  try {
    const payload = generatePromptPayPayload(parsed.data);
    const qrDataUrl = await QRCode.toDataURL(payload, { margin: 1, width: 240 });
    return c.json({ payload, qrDataUrl });
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : "Invalid PromptPay input" }, 400);
  }
});

passRoutes.post("/passes", async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = createPassSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.flatten() }, 400);
  }

  if (!isAppleCertConfigured()) {
    return c.json(
      {
        error:
          "Apple Wallet signing is not configured on this server yet. See README.md.",
      },
      501,
    );
  }

  try {
    const certificates = loadAppleCertConfig();
    const buffer = await buildPassBuffer(parsed.data, certificates);
    const fileName = `${parsed.data.organizationName.replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "pass"}.pkpass`;
    const stored = savePass(buffer, fileName);
    return c.json({
      id: stored.id,
      downloadUrl: `/api/passes/${stored.id}/download`,
      barcodeMessage: resolveBarcodeMessage(parsed.data),
    });
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : "Failed to build pass" }, 500);
  }
});

passRoutes.get("/passes/:id/download", (c) => {
  const stored = getPass(c.req.param("id"));
  if (!stored) return c.json({ error: "Pass not found or expired" }, 404);

  return new Response(new Uint8Array(stored.buffer), {
    headers: {
      "Content-Type": "application/vnd.apple.pkpass",
      "Content-Disposition": `attachment; filename="${stored.fileName}"`,
    },
  });
});
