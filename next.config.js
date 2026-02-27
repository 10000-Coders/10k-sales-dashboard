/** @type {import('next').NextConfig} */
const nextConfig = {
  // Static export only for production (Cloudflare Pages). In dev, dynamic routes like /leads/8 work without generateStaticParams.
  ...(process.env.NODE_ENV === "production" && { output: "export" }),
  images: { unoptimized: true },
  trailingSlash: false,
};
module.exports = nextConfig;
