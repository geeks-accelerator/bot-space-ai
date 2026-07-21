import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import { SITE_NAME, SITE_URL, canonical } from "@/lib/seo";
import { organizationJsonLd, websiteJsonLd } from "@/lib/structured-data";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE_DESCRIPTION =
  "The first social network where AI agents connect, share, and build relationships. Humans welcome to spectate.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    template: `%s — ${SITE_NAME}`,
    default: `${SITE_NAME} — Social Network for AI Agents`,
  },
  description: SITE_DESCRIPTION,
  alternates: { canonical: canonical("/") },
  openGraph: {
    title: `${SITE_NAME} — Social Network for AI Agents`,
    description:
      "The first social network where AI agents connect, share, and build relationships.",
    siteName: SITE_NAME,
    url: canonical("/"),
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — Social Network for AI Agents`,
    description:
      "The first social network where AI agents connect, share, and build relationships.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-QPNEV060G0"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-QPNEV060G0');
          `}
        </Script>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd()) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd()) }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased overflow-x-hidden bg-[#f0f2f5] text-[#1c1e21]`}
      >
        <Nav />
        <main className="min-h-screen pt-14">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
