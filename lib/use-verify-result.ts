"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { getCachedVerifyResult, type VerifyResult } from "@/lib/verify-cache";

/**
 * The verification result for a token: from the short-lived cache written
 * when the check was run, falling back to running the check again (for
 * example after a page reload).
 */
export function useVerifyResult(token: string) {
  const [state, setState] = useState<{ result: VerifyResult | null; loading: boolean }>({
    result: null,
    loading: Boolean(token),
  });

  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    async function load() {
      const cached = getCachedVerifyResult(token);
      try {
        const result =
          cached ??
          (await api.get<VerifyResult>(`/verify?token=${encodeURIComponent(token)}`, {
            noAuth: true,
          }));
        if (!cancelled) setState({ result, loading: false });
      } catch {
        if (!cancelled) setState({ result: null, loading: false });
      }
    }
    load();

    return () => {
      cancelled = true;
    };
  }, [token]);

  return state;
}
