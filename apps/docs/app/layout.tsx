import type { Metadata } from "next";
import type { ReactNode } from "react";
import { RootProvider } from "fumadocs-ui/provider/next";
import "./global.css";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const configuredSiteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://pixelshift.mohammed.win";
const configuredSiteBase = new URL(`${configuredSiteUrl.replace(/\/$/, "")}/`);
const siteRoot = basePath
  ? new URL(`${basePath.replace(/^\//, "")}/`, configuredSiteBase.origin)
  : configuredSiteBase;
const siteUrl = siteRoot.toString();
const logoUrl = new URL("icon.svg", siteRoot).toString();
const socialImageUrl = new URL("opengraph-image", siteRoot).toString();

export const metadata: Metadata = {
  metadataBase: siteRoot,
  title: {
    default: "Pixelshift — Browser image tools",
    template: "%s · Pixelshift",
  },
  description:
    "Local-first image tools — compress, resize, convert, crop, pick colors, encode Base64, and remove backgrounds — for Lit, React, Angular, Vue, and vanilla JavaScript.",
  applicationName: "Pixelshift",
  keywords: [
    "image converter",
    "image compressor",
    "image resizer",
    "image cropper",
    "color picker",
    "image to Base64",
    "social media image resizer",
    "YouTube thumbnail resizer",
    "background remover",
    "WebP converter",
    "browser image tools",
    "React image components",
    "Angular image components",
    "Vue image components",
  ],
  icons: {
    icon: [{ url: logoUrl, type: "image/svg+xml" }],
  },
  openGraph: {
    type: "website",
    url: siteUrl,
    siteName: "Pixelshift",
    title: "Pixelshift — Browser image tools",
    description:
      "Compress, resize, convert, crop, and edit images locally in the browser, with components for Lit, React, Angular, Vue, and vanilla JavaScript.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Pixelshift — Browser image tools",
    description:
      "Compress, resize, convert, crop, and edit images locally in the browser, with components for every framework.",
    images: [socialImageUrl],
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Pixelshift",
  url: siteUrl,
  logo: logoUrl,
  image: socialImageUrl,
  sameAs: ["https://github.com/DevM7mdAli/Pixelshift"],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      className="scroll-smooth motion-reduce:scroll-auto"
      lang="en"
      suppressHydrationWarning
    >
      <body className="m-0 min-h-screen">
        <RootProvider
          search={{
            options: { type: "static", api: `${basePath}/api/search` },
          }}
        >
          {children}
        </RootProvider>
        <script
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
          }}
          type="application/ld+json"
        />
        {/* Cloudflare Web Analytics */}
        <script
          data-cf-beacon='{"token": "9b9e2af0616847fe967225bd8c399ba1"}'
          src="https://static.cloudflareinsights.com/beacon.min.js"
          type="module"
        />
        {/* End Cloudflare Web Analytics */}
      </body>
    </html>
  );
}
