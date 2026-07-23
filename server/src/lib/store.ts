import { randomUUID } from "node:crypto";
import type { StoredPass } from "../types.js";

/**
 * Ephemeral in-memory pass store for the MVP. Generated passes are meant to
 * be downloaded within minutes of creation, so no persistent storage is
 * needed yet. Swap for R2/S3 if passes need to survive a process restart or
 * be re-downloadable via push-update web services.
 */
const TTL_MS = 30 * 60 * 1000;
const passes = new Map<string, StoredPass>();

function sweepExpired(): void {
  const now = Date.now();
  for (const [id, pass] of passes) {
    if (now - pass.createdAt > TTL_MS) passes.delete(id);
  }
}

export function savePass(buffer: Buffer, fileName: string): StoredPass {
  sweepExpired();
  const stored: StoredPass = { id: randomUUID(), fileName, buffer, createdAt: Date.now() };
  passes.set(stored.id, stored);
  return stored;
}

export function getPass(id: string): StoredPass | undefined {
  sweepExpired();
  return passes.get(id);
}
