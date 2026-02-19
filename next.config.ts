import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
    // Static export for maximum portability — switch to 'standalone' if adding API routes later
    output: 'export',
};

export default nextConfig;
