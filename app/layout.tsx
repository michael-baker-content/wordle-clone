import type { Metadata } from "next";
import { Fraunces, Barlow_Condensed } from "next/font/google";
import "./globals.css";

const display = Fraunces({ subsets: ["latin"], variable: "--font-display", display: "swap" });
const labels = Barlow_Condensed({ subsets: ["latin"], weight: ["500", "600"], variable: "--font-label", display: "swap" });
const siteUrl = process.env.SITE_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
const description = "One daily blackjack challenge. Play your hand, spend points on jokers, and see how far you can go.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Jacklet — Daily Blackjack",
  description,
  openGraph: { type: "website", siteName: "Jacklet", title: "Jacklet — Daily Blackjack", description, url: "/" },
  twitter: { card: "summary_large_image", title: "Jacklet — Daily Blackjack", description, images: [{ url: "/opengraph-image", alt: "Jacklet — Daily Blackjack. One daily deck. How far can you go?" }] }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" className={`${display.variable} ${labels.variable}`}><body>{children}</body></html>;
}
