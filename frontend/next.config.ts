import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  // Habilitar output standalone para Docker
  // Comentado para deploy sem Dockerfile no Railway
  // Descomente se for usar Dockerfile
  // output: 'standalone',
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: !process.env.CI,
  disableLogger: true,
});
