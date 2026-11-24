import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  // Smaller responses and no framework fingerprint.
  poweredByHeader: false,
  reactStrictMode: true,
  // No Next.js button in the corner during development. Build errors still
  // show as an overlay.
  devIndicators: false,
};

// Finds the request configuration at src/i18n/request.ts.
const withNextIntl = createNextIntlPlugin();

export default withNextIntl(nextConfig);
