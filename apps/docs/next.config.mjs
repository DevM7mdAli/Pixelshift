import { createMDX } from "fumadocs-mdx/next";

const withMDX = createMDX();

// To make the build all client side
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || undefined;

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  transpilePackages: ["pixelshift-react"],
  output: "export",
  trailingSlash: true,
  basePath,
};

export default withMDX(config);
