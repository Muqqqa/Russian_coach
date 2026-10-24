// Export statico: nessun server, nessuna API a runtime.
// Per un sotto-percorso (es. GitHub Pages) impostare NEXT_PUBLIC_BASE_PATH="/nome-repo".
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  trailingSlash: true,
  basePath,
  images: { unoptimized: true },
  reactStrictMode: true,
};

export default nextConfig;
