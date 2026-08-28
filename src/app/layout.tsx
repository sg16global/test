import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://transfer.sg16engine.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "sg16-transfer · super fast cross-platform file sharing",
  description:
    "Share files at LAN speed between Android, iPhone and PC. Works online and fully offline with LAN direct pairing.",
  manifest: "/manifest.webmanifest",
  applicationName: "sg16-transfer",
  appleWebApp: { capable: true, title: "sg16-transfer", statusBarStyle: "black-translucent" },
  icons: { icon: "/icon-512.png", apple: "/icon-512.png" },
  openGraph: {
    title: "SG16 Transfer",
    images: [{ url: "/logo-sg16.jpg", width: 1280, height: 1280, alt: "SG16 Transfer" }],
  },
};

export const viewport: Viewport = {
      themeColor: "#0a0806",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen text-neutral-100 antialiased selection:bg-orange-500/30">
        {children}
      </body>
    </html>
  );
}
