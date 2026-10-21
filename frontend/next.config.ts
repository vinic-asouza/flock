import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  // Habilitar output standalone para Docker
  // Comentado para deploy sem Dockerfile no Railway
  // Descomente se for usar Dockerfile
  // output: 'standalone',
  // Rotas legadas: redirect permanente evita flash da URL antiga (DEV-162).
  async redirects() {
    return [
      { source: '/calendar', destination: '/', permanent: true },
      { source: '/groups', destination: '/ministries', permanent: true },
      { source: '/groups/:path*', destination: '/ministries/:path*', permanent: true },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: !process.env.CI,
  disableLogger: true,
});
