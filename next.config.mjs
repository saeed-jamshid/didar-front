/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  images: {
    // Only generate the sizes you actually use:
    // 75px card thumb (×1, ×2 DPR) + 480px modal hero (×1, ×2 DPR)
    deviceSizes: [96, 256, 480, 960],
    imageSizes: [48, 75, 96],

    // Quality ladder — 70 for thumbs, 80 for modal hero is plenty
    qualities: [70, 80],

    // Cache optimized images for 7 days on CDN/browser
    minimumCacheTTL: 60 * 60 * 24 * 7,

    formats: ["image/webp"], // avif is slower to encode, not worth it for a menu app

    remotePatterns: [
      {
        protocol: "http",
        hostname: "130.185.76.124",
        port: "8086",
        pathname: "/media/**",
      },
      {
        protocol: "https",
        hostname: "didarplace.ir",
        pathname: "/media/**", // tighter than /**, only allow media uploads
      },
    ],
  },
};

export default nextConfig;
