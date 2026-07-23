/**
 * Loads the Apple Pass Type ID certificate chain from environment variables.
 *
 * Certs are stored base64-encoded (PEM content) so they survive as
 * single-line env vars / secrets in any deploy target. See
 * README.md for how to obtain and encode them.
 */
export interface AppleCertificateConfig {
  wwdr: Buffer;
  signerCert: Buffer;
  signerKey: Buffer;
  signerKeyPassphrase?: string;
  teamIdentifier: string;
  passTypeIdentifier: string;
}

const REQUIRED_ENV_VARS = [
  "APPLE_WWDR_CERT_BASE64",
  "APPLE_SIGNER_CERT_BASE64",
  "APPLE_SIGNER_KEY_BASE64",
  "APPLE_TEAM_IDENTIFIER",
  "APPLE_PASS_TYPE_IDENTIFIER",
] as const;

export function isAppleCertConfigured(): boolean {
  return REQUIRED_ENV_VARS.every((key) => Boolean(process.env[key]));
}

export function loadAppleCertConfig(): AppleCertificateConfig {
  const missing = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(
      `Apple Wallet signing is not configured. Missing env vars: ${missing.join(", ")}. ` +
        "See README.md for setup instructions.",
    );
  }

  return {
    wwdr: Buffer.from(process.env.APPLE_WWDR_CERT_BASE64 as string, "base64"),
    signerCert: Buffer.from(process.env.APPLE_SIGNER_CERT_BASE64 as string, "base64"),
    signerKey: Buffer.from(process.env.APPLE_SIGNER_KEY_BASE64 as string, "base64"),
    signerKeyPassphrase: process.env.APPLE_SIGNER_KEY_PASSPHRASE,
    teamIdentifier: process.env.APPLE_TEAM_IDENTIFIER as string,
    passTypeIdentifier: process.env.APPLE_PASS_TYPE_IDENTIFIER as string,
  };
}
