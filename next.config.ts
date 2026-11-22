import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    // O Tailwind roda por um carregador de CSS do Turbopack. Com o cache em disco do
    // `next dev`, uma mudança em classes ou tokens feita com o servidor desligado podia
    // continuar mostrando o CSS antigo. Sem esse cache o dev sempre compila o CSS atual.
    turbopackFileSystemCacheForDev: false,
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
