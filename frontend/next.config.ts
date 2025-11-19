import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Habilitar output standalone para Docker
  // Comentado para deploy sem Dockerfile no Railway
  // Descomente se for usar Dockerfile
  // output: 'standalone',
};

export default nextConfig;
