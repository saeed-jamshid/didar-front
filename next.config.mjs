/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    //TODO
    ignoreBuildErrors: true,
  },
  images: {
    qualities: [50, 60, 70, 80],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "didarplace.ir",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
