// Next.js chỉ lo giao diện. Express (../src) vẫn là API: mọi /api/* được chuyển tiếp sang đó.
const API_URL = process.env.API_URL || 'http://localhost:3000';

/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: { root: import.meta.dirname },
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${API_URL}/api/:path*` }];
  },
};
export default nextConfig;
