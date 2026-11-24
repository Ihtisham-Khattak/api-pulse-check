/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The app only listens on 127.0.0.1, but people open it as localhost too.
  allowedDevOrigins: ['localhost', '127.0.0.1'],
  poweredByHeader: false
};

export default nextConfig;
