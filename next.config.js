/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Suppress react-router-dom hydration warnings
  // since we're using CSR with react-router inside Next.js
  experimental: {},
};

module.exports = nextConfig;
