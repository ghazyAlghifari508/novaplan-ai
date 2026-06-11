import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "4ew2z6h5.ap-southeast.insforge.app",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "5mb",
    },
  },
};

const withSentry = (config: NextConfig): NextConfig => {
  if (process.env.SENTRY_AUTH_TOKEN) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { withSentryConfig } = require("@sentry/nextjs");
    return withSentryConfig(config, {
      org: process.env.SENTRY_ORG || "novaplan",
      project: "novaplan-ai",
      authToken: process.env.SENTRY_AUTH_TOKEN,
      telemetry: false,
    });
  }
  return config;
};

export default withSentry(nextConfig);