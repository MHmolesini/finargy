import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export', // Genera archivos estáticos para GitHub Pages
  basePath: '/finargy', // Coincide con el nombre de tu repositorio
  assetPrefix: '/finargy',
  images: {
    unoptimized: true, // Requerido para despliegues estáticos
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  productionBrowserSourceMaps: true,
};

export default nextConfig;
