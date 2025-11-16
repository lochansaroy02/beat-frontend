
/** @type {import('next').NextConfig} */
import { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";


const nextConfig: NextConfig = {
  assetPrefix: '',
  basePath: '',
  images: {
    domains: ["res.cloudinary.com",],
  },
  typescript: {
    // ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

const withNextIntl = createNextIntlPlugin();
export default withNextIntl(nextConfig);
