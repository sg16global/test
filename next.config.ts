import type { NextConfig } from "next";
const isExport = process.env.NEXT_OUTPUT_MODE === "export";
const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  ...(isExport ? { output: "export", images: { unoptimized: true } } : { output: "standalone" }),
};
export default nextConfig;
