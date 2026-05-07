/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  env: {
    FLASK_API_URL: process.env.FLASK_API_URL
  }
};

module.exports = nextConfig;
