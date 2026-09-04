import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Purely client-side app: `next build` emits a static site into `out/`.
  output: "export",
  images: { unoptimized: true },
};

export default nextConfig;
