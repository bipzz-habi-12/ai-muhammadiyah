import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Muhammadiyah",
  description: "Asisten edukasi Islami modern.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className="h-full antialiased">
      <head>
        {/* Design v2 typeface pair: Hanken Grotesk (UI) + Newsreader (serif
            voice for formal headings/quotes). Loaded via <link> rather than
            next/font so the production build has no build-time font fetch. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        {/* App Router root layout wraps every route, so this loads globally —
            the no-page-custom-font rule is a pages/ router false positive here. */}
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500;600;700&family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;1,6..72,400&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
