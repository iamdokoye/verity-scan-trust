import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Votta — Tamper-Evident Academic Records",
  description: "Verify any academic credential instantly with Votta.",
  authors: [{ name: "Votta" }],
  openGraph: {
    title: "Votta — Tamper-Evident Academic Records",
    description: "Verify any academic credential instantly with Votta.",
    type: "website",
    images: [
      "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/dc02047c-6bb3-441e-b25c-cd60ebe318db/id-preview-4855e519--f6778746-07a2-404f-9d51-46a17bf64cb2.lovable.app-1778180209777.png",
    ],
  },
  twitter: {
    card: "summary",
    title: "Votta — Tamper-Evident Academic Records",
    description: "Verify any academic credential instantly with Votta.",
    images: [
      "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/dc02047c-6bb3-441e-b25c-cd60ebe318db/id-preview-4855e519--f6778746-07a2-404f-9d51-46a17bf64cb2.lovable.app-1778180209777.png",
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
        />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
