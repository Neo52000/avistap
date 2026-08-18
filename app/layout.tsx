import type { Metadata } from "next";
import { Inter } from "next/font/google";

import { BRAND, SITE_NAME, siteUrl } from "@/lib/site";

import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: `${BRAND} — La plaque avis Google NFC & QR Code`,
    template: `%s · ${BRAND}`,
  },
  // ⚠️ « par 5 » est une allégation chiffrée : elle doit pouvoir être étayée
  // (art. L121-2 du code de la consommation). Sans données à l'appui, préférer
  // une formulation qualitative — voir la note dans le README.
  description:
    "Multipliez vos avis Google par 5 directement au comptoir. Plaques NFC et QR code pour commerçants, livrées prêtes à l'emploi et sans aucun abonnement.",
  keywords: [
    "plaque avis Google",
    "plaque NFC",
    "QR code avis Google",
    "avis Google commerçant",
    "plaque NFC sans abonnement",
  ],
  applicationName: SITE_NAME,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "fr_FR",
    siteName: SITE_NAME,
    url: "/",
    title: `${BRAND} — La plaque avis Google NFC & QR Code`,
    description:
      "Collectez vos avis Google directement au comptoir. Plaques NFC et QR code pour commerçants, sans abonnement.",
  },
  twitter: {
    card: "summary_large_image",
    title: `${BRAND} — La plaque avis Google NFC & QR Code`,
    description:
      "Collectez vos avis Google directement au comptoir. Plaques NFC et QR code pour commerçants, sans abonnement.",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body className={`${inter.variable} font-sans`}>{children}</body>
    </html>
  );
}
