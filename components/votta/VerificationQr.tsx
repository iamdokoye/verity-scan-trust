"use client";

import { forwardRef } from "react";
import { QRCodeCanvas } from "qrcode.react";

/**
 * A QR code that encodes the verification link for a token. It is drawn in
 * the browser from the link itself, so what it encodes never depends on how
 * or when the document was signed.
 */
export const VerificationQr = forwardRef<
  HTMLCanvasElement,
  { url: string; className?: string; label: string }
>(function VerificationQr({ url, className, label }, ref) {
  return (
    <QRCodeCanvas
      ref={ref}
      value={url}
      size={480}
      level="M"
      marginSize={2}
      bgColor="#ffffff"
      fgColor="#000000"
      role="img"
      aria-label={label}
      className={className}
      style={{ width: "100%", height: "auto" }}
    />
  );
});

/** Save a QR canvas as a PNG file. */
export function downloadQrPng(canvas: HTMLCanvasElement | null, filename: string) {
  if (!canvas) return;
  const link = document.createElement("a");
  link.href = canvas.toDataURL("image/png");
  link.download = filename;
  link.click();
}
