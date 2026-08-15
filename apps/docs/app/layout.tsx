import type { Metadata } from "next";
import type { ReactNode } from "react";
import { RootProvider } from "fumadocs-ui/provider/next";
import "./global.css";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const configuredSiteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://devm7mdali.github.io/Pixelshift";
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
    default: "Pixelshift — Browser image conversion",
    template: "%s · Pixelshift",
  },
  description:
    "A local-first image conversion component for Lit, React, Angular, Vue, and vanilla JavaScript.",
  applicationName: "Pixelshift",
  keywords: [
    "image converter",
    "image conversion",
    "image compression",
    "image optimization",
    "WebP converter",
    "PNG to JPEG",
    "browser image conversion",
    "React image converter",
    "Angular image converter",
    "Vue image converter",
  ],
  icons: {
    icon: [{ url: logoUrl, type: "image/svg+xml" }],
  },
  openGraph: {
    type: "website",
    url: siteUrl,
    siteName: "Pixelshift",
    title: "Pixelshift — Browser image conversion",
    description:
      "Convert images locally in the browser with one component for Lit, React, Angular, Vue, and vanilla JavaScript.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Pixelshift — Browser image conversion",
    description:
      "Convert images locally in the browser with one component for every framework.",
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
      </body>
    </html>
  );
}
