import { api } from "@/lib/api";
import { cacheVerifyResult, type VerifyResult, type VerifyStatus } from "@/lib/verify-cache";

export function statusToPath(
  status: VerifyStatus
): "/verify/result" | "/verify/tampered" | "/verify/not-found" {
  if (status === "verified") return "/verify/result";
  if (status === "tampered" || status === "invalid_signature") return "/verify/tampered";
  return "/verify/not-found";
}

/** Look a token up and return the result-page URL to show for it. */
export async function resolveVerificationPath(token: string): Promise<string> {
  const t = token.trim();
  try {
    const result = await api.get<VerifyResult>(`/verify?token=${encodeURIComponent(t)}`, {
      noAuth: true,
    });
    cacheVerifyResult(t, result);
    const reason = result.reason ? `&reason=${encodeURIComponent(result.reason)}` : "";
    return `${statusToPath(result.status)}?token=${encodeURIComponent(t)}&status=${result.status}${reason}`;
  } catch {
    return `/verify/not-found?token=${encodeURIComponent(t)}`;
  }
}
