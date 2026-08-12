import type { Metadata } from "next";
import "./globals.css";
import { themeBootstrapScript } from "@/lib/theme";

export const metadata: Metadata = {
  title: "M-Agent",
  description:
    "Platform AI untuk belajar, bekerja, dan meneliti — berpijak pada nilai Islam Berkemajuan.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className="h-full antialiased" suppressHydrationWarning>
      <head>
        {/* Applies the cached theme (light/dark/system) before first paint so
            there's no flash of the wrong theme; keeps every route in sync
            (including logged-out pages that never touch user_memory). */}
        <script dangerouslySetInnerHTML={{ __html: themeBootstrapScript }} />
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
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
