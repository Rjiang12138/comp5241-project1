import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The mid-term prototype stays at /prototype as the visual reference.
  // It is plain static files, so it is served straight from public/ during
  // the migration (see docs/deployment notes in DEPLOYMENT.md).
  reactStrictMode: true,
  poweredByHeader: false,
};

export default nextConfig;
