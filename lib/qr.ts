/**
 * The backend stores each QR code as a complete data URI
 * ("data:image/png;base64,..."). Accept either that or bare base64 so the
 * value can be used as an <img src> without double-prefixing it.
 */
export function qrImageSrc(value: string): string {
  return value.startsWith("data:") ? value : `data:image/png;base64,${value}`;
}
