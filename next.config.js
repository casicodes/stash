/** @type {import('next').NextConfig} */
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const nextConfig = {
  reactStrictMode: true,
  // Prevent Next from inferring the wrong workspace root when multiple lockfiles exist.
  // This avoids missing server chunk modules during dev/build (e.g. "./611.js").
  outputFileTracingRoot: __dirname,
  experimental: {
    // Optimize barrel file imports for faster builds and better tree-shaking
    // See: https://vercel.com/blog/how-we-optimized-package-imports-in-next-js
    optimizePackageImports: [
      "framer-motion",
      "lucide-react",
      "@radix-ui/react-alert-dialog",
      "@radix-ui/react-context-menu",
    ],
  },
};

export default nextConfig;
