import type { Metadata } from "next";
import { Barlow_Condensed } from "next/font/google";
import "./globals.css";
import faviconPng from "@/asset/Favi PNG.png";

// Scoreboard-style face for names, prices and the auction clock
const display = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Auction",
  description: "Live auction platform for team building events",
  icons: {
    icon: [{ url: faviconPng.src, type: "image/png" }],
    shortcut: [{ url: faviconPng.src, type: "image/png" }],
    apple: [{ url: faviconPng.src, type: "image/png" }],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={display.variable}>
      <body>{children}</body>
    </html>
  );
}
