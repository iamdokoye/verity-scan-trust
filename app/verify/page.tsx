import { Suspense } from "react";
import { VerifyRedirect } from "./VerifyRedirect";

/**
 * Landing target for the QR codes and share links the backend issues
 * (`<FRONTEND_URL>/verify?token=…`). Runs the check and forwards to the
 * matching result page.
 */
export default function VerifyPage() {
  return (
    <Suspense fallback={null}>
      <VerifyRedirect />
    </Suspense>
  );
}
