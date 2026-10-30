import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The mid-term prototype stays at /prototype as the visual reference.
  // It is plain static files, so it is served straight from public/ during
  // the migration (see docs/deployment notes in DEPLOYMENT.md).
  reactStrictMode: true,
  poweredByHeader: false,

  experimental: {
    serverActions: {
      // Server actions accept 1 MB by default, which is smaller than a single
      // lecture deck — the COMP5241 PDFs run 3–8 MB, so every upload died with
      // a 413 before the action ever ran. This is the ceiling for the whole
      // request body; the per-file check in app/studio/actions.ts stays at
      // 12 MB so the limit is enforced where it can produce a readable error.
      bodySizeLimit: "16mb",
    },
  },
};

export default nextConfig;
