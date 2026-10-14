/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Support loading local audio files or static audio assets
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb',
    },
  },
};

export default nextConfig;
