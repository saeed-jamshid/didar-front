/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    //TODO
    ignoreBuildErrors: true,
  },
  images: {
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
