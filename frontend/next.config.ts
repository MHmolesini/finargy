import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export', // Genera archivos estáticos para GitHub Pages
  basePath: '/finargy', // Coincide con el nombre de tu repositorio
  assetPrefix: '/finargy',
  images: {
    unoptimized: true, // Requerido para despliegues estáticos
  },
  eslint: {
    ignoreDuringBuilds: true, // Opcional: evita que errores de lint frenen el despliegue
  },
  typescript: {
    ignoreBuildErrors: true, // Opcional: evita que errores de tipos frenen el despliegue
  }
};

export default nextConfig;
