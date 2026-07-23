# GenPass

Create Apple Wallet passes (`.pkpass`) from a mobile-first, installable PWA —
similar to [passcreator.com](https://www.passcreator.com/en/create-your-own-pkpass-file-for-apple-wallet),
with first-class support for **Thai PromptPay QR codes**.

- Build any of Apple's 5 pass styles (generic, store card, coupon, event
  ticket, boarding pass) with custom colors, logo, and text fields.
- Add a QR/barcode that's either a **PromptPay payment QR** (mobile number,
  national ID, or e-Wallet ID, with an optional fixed amount) or any custom
  barcode message.
- Generate, then download the signed `.pkpass` — opening it in Safari on
  iOS triggers "Add to Apple Wallet".
- Installable as a **PWA**: add GenPass itself to your home screen.

## Project structure

```
genpass/
├── server/   # Node + Hono API: builds & signs .pkpass files
└── web/      # Vite + React PWA: the pass builder UI
```

### Why the API isn't a Cloudflare Worker / edge function

Signing a `.pkpass` requires a detached PKCS#7 signature over the pass
manifest, using your Apple **Pass Type ID** certificate chained to Apple's
WWDR intermediate certificate. The [`passkit-generator`](https://github.com/alexandercerutti/passkit-generator)
library that does this needs Node's native crypto stack, which isn't
reliably available on edge/Workers runtimes — so `server/` is a plain
Node.js service (Hono on `@hono/node-server`), deployable anywhere Node 20+
runs (a small container, Fly.io, Render, a VM, ...).

## Quick start

```bash
npm install

# Terminal 1 — API (http://localhost:8788)
npm run dev:server

# Terminal 2 — PWA (http://localhost:5174, proxies /api to :8788)
npm run dev:web
```

Until Apple certificates are configured (see below), the UI shows a warning
banner and pass generation returns a clear error instead of failing
silently.

## Configuring Apple Wallet signing

You need an Apple Developer account ($99/yr) to get a Pass Type ID
certificate — there's no way around this, it's how Apple authenticates
passes.

1. In developer.apple.com → Certificates, Identifiers & Profiles, create a
   **Pass Type ID** (e.g. `pass.com.yourcompany.genpass`) and note your
   **Team ID**.
2. Create + download a certificate for that Pass Type ID, then export the
   signer cert/key and Apple's WWDR G4 intermediate cert, all as
   base64-encoded PEM (single line):

   ```bash
   openssl pkcs12 -in Certificates.p12 -clcerts -nokeys -out signerCert.pem -passin pass:YOUR_P12_PASSWORD
   openssl pkcs12 -in Certificates.p12 -nocerts -out signerKey.pem -passin pass:YOUR_P12_PASSWORD -passout pass:YOUR_KEY_PASSPHRASE

   base64 -w0 signerCert.pem > signerCert.b64
   base64 -w0 signerKey.pem > signerKey.b64
   base64 -w0 AppleWWDRCAG4.pem > wwdr.b64
   ```

3. Copy `server/.env.example` to `server/.env` and fill in
   `APPLE_WWDR_CERT_BASE64`, `APPLE_SIGNER_CERT_BASE64`,
   `APPLE_SIGNER_KEY_BASE64`, `APPLE_SIGNER_KEY_PASSPHRASE` (if set),
   `APPLE_TEAM_IDENTIFIER`, and `APPLE_PASS_TYPE_IDENTIFIER`.

**Never commit `.env` or real certificate material** — these are secrets;
inject them via your host's secret manager in production.

## PromptPay QR

`server/src/lib/promptpay.ts` generates the EMVCo-compliant PromptPay
payload (merchant-presented mode, Thai QR Payment Standard) from scratch —
no external QR-payload dependency. Apple Wallet renders the QR natively
from this payload string (no image generation needed). Covered by unit
tests: `npm test -w server`.

## PWA / mobile

- `web/vite.config.ts` uses `vite-plugin-pwa` for the manifest + service
  worker (installable, offline app-shell; API calls are always
  network-only so passes/QR previews never go stale).
- Layout is mobile-first: single column, sticky bottom "Generate pass" /
  "Add to Wallet" action bar, ≥44px touch targets, 16px inputs (avoids
  iOS Safari zoom-on-focus), safe-area padding for notched devices. It
  progressively enhances to a two-column layout (form + sticky live
  preview) at desktop widths.

## API reference

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/config` | Whether Apple signing is configured |
| POST | `/api/promptpay/preview` | `{ targetType, target, amount? }` → PromptPay payload + QR data URL |
| POST | `/api/barcode/preview` | `{ message }` → QR data URL, for previewing non-PromptPay barcodes |
| POST | `/api/passes` | Builds and signs a `.pkpass`; returns `{ id, downloadUrl }` |
| GET | `/api/passes/:id/download` | Streams the signed `.pkpass` (30-minute in-memory TTL) |

## Known limitations (MVP)

- Passes are held in memory with a 30-minute TTL — fine for "generate and
  download now", not for push updates or long-lived re-downloads. Swap
  `server/src/lib/store.ts` for object storage (S3/R2) if you need that.
- No web service / push-update support (`webServiceURL`, APNs) — passes are
  static once downloaded.
- Only PNG uploads are supported for the logo image; the pass icon falls
  back to a bundled placeholder unless you supply your own.
