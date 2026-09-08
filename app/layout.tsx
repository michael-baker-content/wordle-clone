import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Daily Number",
  description: "One number. Five guesses. A fresh puzzle every day at midnight Eastern."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
