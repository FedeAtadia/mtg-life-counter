import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

/**
 * Self-hosted rather than fetched from Google Fonts at build time: the build
 * cannot always reach fonts.googleapis.com, and a life counter used at a table
 * with no signal should not depend on a font request either. Both faces are
 * SIL Open Font License; see app/fonts/OFL.md.
 */
const display = localFont({
  src: "./fonts/Cinzel-600.woff2",
  weight: "600",
  style: "normal",
  display: "swap",
  variable: "--font-display",
  fallback: ["Georgia", "Times New Roman", "serif"],
});

const body = localFont({
  src: [
    { path: "./fonts/Spectral-400.woff2", weight: "400", style: "normal" },
    { path: "./fonts/Spectral-600.woff2", weight: "600", style: "normal" },
  ],
  display: "swap",
  variable: "--font-body",
  fallback: ["Georgia", "Times New Roman", "serif"],
});

export const metadata: Metadata = {
  title: "MTG Life Counter",
  description:
    "Life and commander damage tracker for 2-6 player Magic: The Gathering games.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#0a0809",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${body.variable} h-full antialiased`}
    >
      <body className="h-full">{children}</body>
    </html>
  );
}
