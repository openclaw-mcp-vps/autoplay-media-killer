import type { Metadata } from "next";
import { JetBrains_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://autoplay-media-killer.com"),
  title: {
    default: "Autoplay Media Killer",
    template: "%s | Autoplay Media Killer",
  },
  description:
    "Stop autoplay videos, audio blasts, and intrusive embedded media with one extension and a synced whitelist across your devices.",
  keywords: [
    "autoplay blocker",
    "browser extension",
    "stop autoplay video",
    "autoplay audio blocker",
    "whitelist manager",
  ],
  openGraph: {
    title: "Autoplay Media Killer",
    description:
      "Kill autoplay media across all websites. Block noisy autoplay with granular controls and account sync.",
    url: "https://autoplay-media-killer.com",
    siteName: "Autoplay Media Killer",
    type: "website",
    images: [
      {
        url: "/og-image.svg",
        width: 1200,
        height: 630,
        alt: "Autoplay Media Killer dashboard preview",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Autoplay Media Killer",
    description:
      "Take back control from autoplaying videos and audio. Granular controls, whitelist sync, and a clean dashboard.",
    images: ["/og-image.svg"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${jetbrainsMono.variable} h-full`}
    >
      <body className="min-h-full bg-background font-sans text-foreground">
        {children}
      </body>
    </html>
  );
}
