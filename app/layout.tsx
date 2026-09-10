import type { Metadata } from "next";
import { Fraunces, Barlow_Condensed } from "next/font/google";
import "./globals.css";

const display = Fraunces({ subsets: ["latin"], variable: "--font-display", display: "swap" });
const labels = Barlow_Condensed({ subsets: ["latin"], weight: ["500", "600"], variable: "--font-label", display: "swap" });

export const metadata: Metadata = {
  title: "Jacklet — Daily Blackjack",
  description: "Jacklet. One daily blackjack run. See how far you get."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" className={`${display.variable} ${labels.variable}`}><body>{children}</body></html>;
}
