/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The app only listens on 127.0.0.1, but people open it as localhost too.
  allowedDevOrigins: ['localhost', '127.0.0.1'],
  poweredByHeader: false,
  // Lets a second copy of the site build into its own folder (used for README screenshots).
  distDir: process.env.NEXT_DIST_DIR || '.next'
};

export default nextConfig;
