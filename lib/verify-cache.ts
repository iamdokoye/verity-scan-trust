"use client";

export type VerifyStatus =
  | "verified"
  | "tampered"
  | "invalid_signature"
  | "superseded"
  | "revoked"
  | "not_found";

export type VerifyResult = {
  status: VerifyStatus;
  reason?: string | null;
  studentName?: string;
  matricNumber?: string;
  institution?: string;
  documentType?: string;
  programme?: string | null;
  sha256Hash?: string;
  signedAt?: string;
  verifiedAt?: string;
  message?: string;
};

const PREFIX = "votta_verify_result:";
const TTL_MS = 2 * 60 * 1000;

export function cacheVerifyResult(token: string, result: VerifyResult) {
  try {
    sessionStorage.setItem(
      `${PREFIX}${token}`,
      JSON.stringify({ result, savedAt: Date.now() })
    );
  } catch {
    // sessionStorage may be unavailable in private or restricted contexts.
  }
}

export function getCachedVerifyResult(token: string): VerifyResult | null {
  try {
    const raw = sessionStorage.getItem(`${PREFIX}${token}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      result?: VerifyResult;
      savedAt?: number;
    };
    if (!parsed.result || !parsed.savedAt) return null;
    if (Date.now() - parsed.savedAt > TTL_MS) {
      sessionStorage.removeItem(`${PREFIX}${token}`);
      return null;
    }
    return parsed.result;
  } catch {
    return null;
  }
}
