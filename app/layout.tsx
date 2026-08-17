import type { Metadata } from "next";
import { Inter } from "next/font/google";

import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Avistap — La plaque à avis Google pour votre établissement",
    template: "%s · Avistap",
  },
  description:
    "Une plaque NFC personnalisée à votre logo. Vos clients approchent leur téléphone et laissent un avis Google en quelques secondes.",
  openGraph: {
    type: "website",
    locale: "fr_FR",
    siteName: "Avistap",
  },
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
