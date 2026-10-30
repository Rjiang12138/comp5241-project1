import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The mid-term prototype stays at /prototype as the visual reference.
  // It is plain static files, so it is served straight from public/ during
  // the migration (see docs/deployment notes in DEPLOYMENT.md).
  reactStrictMode: true,
  poweredByHeader: false,

  // Where the build lands. `.next` unless something overrides it.
  //
  // The override exists for the authoring sandbox this project is developed in:
  // its file guard refuses any bulk delete of 50+ files, and `next build`
  // clears stale artifacts before compiling. Pointing the build at a fresh
  // directory sidesteps that without touching a single line of app code.
  // `npm run dev` and a plain `npm run build` are unaffected — they get `.next`.
  distDir: process.env.NEXT_DIST_DIR || ".next",

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
