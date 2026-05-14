import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "hiotgmmhhtklltjmsvic.supabase.co",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "5mb",
    },
  },
  instrumentationFiles: ["instrumentation.ts"],
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