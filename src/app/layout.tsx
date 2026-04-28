import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { SiteHeader } from "@/components/site-header";
import { getBaseUrl } from "@/lib/env";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const baseUrl = getBaseUrl();

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: "Qrft | QR-Codes erstellen und verwalten",
    template: "%s | Qrft",
  },
  description:
    "Erstelle statische und dynamische QR-Codes mit Logo, Farben, PNG/SVG-Export und selbst gehosteten Kurzlinks.",
  keywords: [
    "QR-Code",
    "Generator",
    "Kurzlink",
    "Redirect",
    "Tracking",
    "Selbst gehostet",
  ],
  authors: [{ name: "Qrft" }],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "Qrft",
    title: "Qrft | QR-Codes erstellen und verwalten",
    description:
      "Ein schnelles QR-Code-Tool für statische Codes, dynamische Kurzlinks und Scan-Statistiken.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Qrft | QR-Codes erstellen und verwalten",
    description:
      "Gestalte QR-Codes mit Logo, Farben und dynamischen Ziel-URLs.",
  },
  robots: {
    index: true,
    follow: true,
    "max-image-preview": "large",
    "max-snippet": -1,
    "max-video-preview": -1,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="de"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col bg-background text-foreground">
        <SiteHeader />
        <main className="flex flex-1 flex-col">{children}</main>
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
