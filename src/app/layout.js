import "./globals.css";
import { asset } from "@/lib/asset";

export const metadata = {
  title: "Aurelia Longevity | Inside the future of human longevity",
  description:
    "A cinematic journey through a luxury longevity and regenerative medicine clinic: advanced diagnostics, cellular health and personalized care. Concept website.",
};

export const viewport = {
  themeColor: "#f6f3ee",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }} />
        <link rel="preconnect" href="https://api.fontshare.com" crossOrigin="" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="preload" as="image" href={asset("/photos/hero.webp")} fetchPriority="high" />
        <link href="https://api.fontshare.com/v2/css?f[]=boska@300,400&display=swap" rel="stylesheet" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link href="https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500&display=swap" rel="stylesheet" />
        <noscript>
          <style>{`[data-reveal]{opacity:1!important;transform:none!important}`}</style>
        </noscript>
      </head>
      <body>{children}</body>
    </html>
  );
}
