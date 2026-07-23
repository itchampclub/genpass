import { useEffect, useMemo, useState } from "react";
import { createPass, fileToBase64, getConfig, previewBarcode, previewPromptPay } from "./api";
import { FieldListEditor } from "./components/FieldListEditor";
import { PassPreview } from "./components/PassPreview";
import type { BarcodeMode, PassField, PassStyle, PromptPayTargetType } from "./types";

const PASS_STYLES: { value: PassStyle; label: string }[] = [
  { value: "generic", label: "Generic (ID card / membership)" },
  { value: "storeCard", label: "Store Card (loyalty / balance)" },
  { value: "coupon", label: "Coupon" },
  { value: "eventTicket", label: "Event Ticket" },
  { value: "boardingPass", label: "Boarding Pass" },
];

const BARCODE_MODES: { value: BarcodeMode; label: string }[] = [
  { value: "promptpay", label: "PromptPay" },
  { value: "custom", label: "Custom" },
  { value: "none", label: "None" },
];

function Field({
  label,
  children,
  compact = false,
}: {
  label: string;
  children: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <label className="block min-w-0">
      <span className={`block truncate font-semibold mb-1.5 ${compact ? "text-xs" : "text-sm"}`}>{label}</span>
      {children}
    </label>
  );
}

const inputClass = "w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm";

export default function App() {
  const [style, setStyle] = useState<PassStyle>("generic");
  const [organizationName, setOrganizationName] = useState("Acme Co");
  const [description, setDescription] = useState("Membership Pass");
  const [logoText, setLogoText] = useState("Acme Co");
  const [backgroundColor, setBackgroundColor] = useState("#1a56db");
  const [foregroundColor, setForegroundColor] = useState("#ffffff");
  const [labelColor, setLabelColor] = useState("#c7d2fe");

  const [headerFields, setHeaderFields] = useState<PassField[]>([]);
  const [primaryFields, setPrimaryFields] = useState<PassField[]>([
    { key: "name", label: "NAME", value: "Somchai Jaidee" },
  ]);
  const [secondaryFields, setSecondaryFields] = useState<PassField[]>([]);
  const [auxiliaryFields, setAuxiliaryFields] = useState<PassField[]>([]);
  const [backFields, setBackFields] = useState<PassField[]>([]);

  const [logoBase64, setLogoBase64] = useState<string | undefined>();

  const [barcodeMode, setBarcodeMode] = useState<BarcodeMode>("promptpay");
  const [promptPayTargetType, setPromptPayTargetType] = useState<PromptPayTargetType>("mobile");
  const [promptPayTarget, setPromptPayTarget] = useState("0812345678");
  const [promptPayAmount, setPromptPayAmount] = useState("");
  const [customBarcodeMessage, setCustomBarcodeMessage] = useState("");

  const [qrDataUrl, setQrDataUrl] = useState<string | undefined>();
  const [qrError, setQrError] = useState<string | null>(null);

  const [configured, setConfigured] = useState<boolean | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [result, setResult] = useState<{ downloadUrl: string } | null>(null);

  useEffect(() => {
    getConfig()
      .then((c) => setConfigured(c.appleWalletConfigured))
      .catch(() => setConfigured(false));
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setQrError(null);
      if (barcodeMode === "promptpay" && promptPayTarget.trim()) {
        previewPromptPay({
          targetType: promptPayTargetType,
          target: promptPayTarget,
          amount: promptPayAmount ? Number(promptPayAmount) : undefined,
        })
          .then((res) => setQrDataUrl(res.qrDataUrl))
          .catch((err) => {
            setQrDataUrl(undefined);
            setQrError(err.message);
          });
      } else if (barcodeMode === "custom" && customBarcodeMessage.trim()) {
        previewBarcode(customBarcodeMessage)
          .then((res) => setQrDataUrl(res.qrDataUrl))
          .catch((err) => {
            setQrDataUrl(undefined);
            setQrError(err.message);
          });
      } else {
        setQrDataUrl(undefined);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [barcodeMode, promptPayTargetType, promptPayTarget, promptPayAmount, customBarcodeMessage]);

  const canSubmit = useMemo(() => {
    if (!organizationName.trim() || !description.trim()) return false;
    if (barcodeMode === "promptpay" && !promptPayTarget.trim()) return false;
    if (barcodeMode === "custom" && !customBarcodeMessage.trim()) return false;
    return true;
  }, [organizationName, description, barcodeMode, promptPayTarget, customBarcodeMessage]);

  async function handleLogoUpload(file: File | undefined) {
    if (!file) {
      setLogoBase64(undefined);
      return;
    }
    setLogoBase64(await fileToBase64(file));
  }

  async function handleSubmit() {
    setSubmitting(true);
    setSubmitError(null);
    setResult(null);
    try {
      const response = await createPass({
        style,
        organizationName,
        description,
        logoText: logoText || undefined,
        backgroundColor,
        foregroundColor,
        labelColor,
        headerFields: headerFields.filter((f) => f.value),
        primaryFields: primaryFields.filter((f) => f.value),
        secondaryFields: secondaryFields.filter((f) => f.value),
        auxiliaryFields: auxiliaryFields.filter((f) => f.value),
        backFields: backFields.filter((f) => f.value),
        promptPay:
          barcodeMode === "promptpay"
            ? {
                targetType: promptPayTargetType,
                target: promptPayTarget,
                amount: promptPayAmount ? Number(promptPayAmount) : undefined,
              }
            : undefined,
        barcodeMessage: barcodeMode === "custom" ? customBarcodeMessage : undefined,
        images: logoBase64 ? { "logo.png": logoBase64, "logo@2x.png": logoBase64 } : undefined,
      });
      setResult({ downloadUrl: response.downloadUrl });
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to create pass");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-dvh bg-gray-50 text-gray-900 flex flex-col">
      <header className="sticky top-0 z-10 border-b bg-white px-4 py-3 pt-safe-t">
        <h1 className="text-lg font-bold leading-tight">GenPass</h1>
        <p className="text-xs text-gray-500 leading-snug">
          Build an Apple Wallet pass with a Thai PromptPay QR, then add it to Wallet.
        </p>
      </header>

      {configured === false && (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-800 text-xs px-4 py-2">
          Apple Wallet signing isn't configured on this server yet — pass generation will fail. See{" "}
          <code>server/.env.example</code>.
        </div>
      )}

      <main className="flex-1 w-full max-w-5xl mx-auto px-4 py-5 pb-32 lg:pb-8 grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
        {/* Preview: shown first on mobile for immediate feedback, sticky on the side on desktop */}
        <section className="order-1 lg:order-2">
          <div className="lg:sticky lg:top-20 bg-white rounded-xl border p-5 flex flex-col items-center gap-3">
            <PassPreview
              style={style}
              organizationName={organizationName}
              description={description}
              logoText={logoText}
              backgroundColor={backgroundColor}
              foregroundColor={foregroundColor}
              labelColor={labelColor}
              headerFields={headerFields}
              primaryFields={primaryFields}
              secondaryFields={secondaryFields}
              auxiliaryFields={auxiliaryFields}
              qrDataUrl={qrDataUrl}
            />
            <p className="text-xs text-gray-400 text-center max-w-[320px]">
              Stylized approximation — Apple Wallet's real rendering depends on the pass type and iOS
              version. Open the downloaded .pkpass on an iPhone (Safari) to add it for real.
            </p>

            {/* Generate button lives here too on desktop, inline with the preview */}
            <div className="hidden lg:block w-full space-y-2">
              <button
                type="button"
                disabled={!canSubmit || submitting}
                onClick={handleSubmit}
                className="w-full rounded-lg bg-blue-600 text-white font-semibold py-3 text-sm disabled:opacity-50 active:bg-blue-700"
              >
                {submitting ? "Generating…" : "Generate pass"}
              </button>
              {submitError && <p className="text-sm text-red-600">{submitError}</p>}
              {result && (
                <a
                  href={result.downloadUrl}
                  className="block text-center rounded-lg bg-black text-white font-semibold py-3 text-sm"
                >
                  Download .pkpass — Add to Apple Wallet
                </a>
              )}
            </div>
          </div>
        </section>

        {/* Form */}
        <section className="order-2 lg:order-1 space-y-6 bg-white rounded-xl border p-4 sm:p-5">
          <Field label="Pass type">
            <select className={inputClass} value={style} onChange={(e) => setStyle(e.target.value as PassStyle)}>
              {PASS_STYLES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Organization name">
              <input
                className={inputClass}
                value={organizationName}
                onChange={(e) => setOrganizationName(e.target.value)}
              />
            </Field>
            <Field label="Logo text">
              <input className={inputClass} value={logoText} onChange={(e) => setLogoText(e.target.value)} />
            </Field>
          </div>

          <Field label="Description">
            <input className={inputClass} value={description} onChange={(e) => setDescription(e.target.value)} />
          </Field>

          <Field label="Logo image (optional)">
            <input
              type="file"
              accept="image/png"
              onChange={(e) => handleLogoUpload(e.target.files?.[0])}
              className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-gray-100 file:px-3 file:py-2 file:text-sm"
            />
          </Field>

          <div className="grid grid-cols-3 gap-3">
            <Field label="Fill" compact>
              <input
                type="color"
                className="w-full h-11 rounded-lg border border-gray-300"
                value={backgroundColor}
                onChange={(e) => setBackgroundColor(e.target.value)}
              />
            </Field>
            <Field label="Text" compact>
              <input
                type="color"
                className="w-full h-11 rounded-lg border border-gray-300"
                value={foregroundColor}
                onChange={(e) => setForegroundColor(e.target.value)}
              />
            </Field>
            <Field label="Label" compact>
              <input
                type="color"
                className="w-full h-11 rounded-lg border border-gray-300"
                value={labelColor}
                onChange={(e) => setLabelColor(e.target.value)}
              />
            </Field>
          </div>

          <FieldListEditor title="Header field" fields={headerFields} maxFields={1} onChange={setHeaderFields} />
          <FieldListEditor title="Primary fields" fields={primaryFields} maxFields={2} onChange={setPrimaryFields} />
          <FieldListEditor
            title="Secondary fields"
            fields={secondaryFields}
            maxFields={3}
            onChange={setSecondaryFields}
          />
          <FieldListEditor
            title="Auxiliary fields"
            fields={auxiliaryFields}
            maxFields={3}
            onChange={setAuxiliaryFields}
          />
          <FieldListEditor title="Back-of-pass fields" fields={backFields} maxFields={5} onChange={setBackFields} />

          <div className="border-t pt-4 space-y-3">
            <span className="block text-sm font-semibold">QR code / barcode</span>
            <div className="grid grid-cols-3 gap-2 p-1 bg-gray-100 rounded-lg">
              {BARCODE_MODES.map((mode) => (
                <button
                  key={mode.value}
                  type="button"
                  onClick={() => setBarcodeMode(mode.value)}
                  className={`rounded-md py-2.5 text-sm font-medium transition-colors ${
                    barcodeMode === mode.value ? "bg-white shadow text-blue-700" : "text-gray-500"
                  }`}
                >
                  {mode.label}
                </button>
              ))}
            </div>

            {barcodeMode === "promptpay" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Target type">
                  <select
                    className={inputClass}
                    value={promptPayTargetType}
                    onChange={(e) => setPromptPayTargetType(e.target.value as PromptPayTargetType)}
                  >
                    <option value="mobile">Mobile number</option>
                    <option value="nationalId">National ID</option>
                    <option value="eWalletId">e-Wallet ID</option>
                  </select>
                </Field>
                <Field label="Amount (optional, THB)">
                  <input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="0.01"
                    className={inputClass}
                    value={promptPayAmount}
                    onChange={(e) => setPromptPayAmount(e.target.value)}
                    placeholder="Let payer enter amount"
                  />
                </Field>
                <div className="sm:col-span-2">
                  <Field
                    label={
                      promptPayTargetType === "mobile"
                        ? "Mobile number (e.g. 0812345678)"
                        : promptPayTargetType === "nationalId"
                          ? "National ID (13 digits)"
                          : "e-Wallet ID (15 digits)"
                    }
                  >
                    <input
                      inputMode="numeric"
                      className={inputClass}
                      value={promptPayTarget}
                      onChange={(e) => setPromptPayTarget(e.target.value)}
                    />
                  </Field>
                </div>
              </div>
            )}

            {barcodeMode === "custom" && (
              <Field label="Barcode message">
                <input
                  className={inputClass}
                  value={customBarcodeMessage}
                  onChange={(e) => setCustomBarcodeMessage(e.target.value)}
                  placeholder="Any text encoded as a QR code"
                />
              </Field>
            )}

            {qrError && <p className="text-xs text-red-600">{qrError}</p>}
          </div>
        </section>
      </main>

      {/* Sticky bottom action bar — mobile only; desktop uses the inline button next to the preview */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 bg-white border-t px-4 pt-3 pb-[calc(env(safe-area-inset-bottom,0px)+0.75rem)] space-y-2">
        {submitError && <p className="text-xs text-red-600">{submitError}</p>}
        {result ? (
          <a
            href={result.downloadUrl}
            className="block text-center rounded-lg bg-black text-white font-semibold py-3.5 text-sm"
          >
            Download .pkpass — Add to Apple Wallet
          </a>
        ) : (
          <button
            type="button"
            disabled={!canSubmit || submitting}
            onClick={handleSubmit}
            className="w-full rounded-lg bg-blue-600 text-white font-semibold py-3.5 text-sm disabled:opacity-50 active:bg-blue-700"
          >
            {submitting ? "Generating…" : "Generate pass"}
          </button>
        )}
      </div>
    </div>
  );
}
