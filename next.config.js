/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME || "GateKeep",
    NEXT_PUBLIC_APP_VERSION: process.env.NEXT_PUBLIC_APP_VERSION || process.env.npm_package_version || "0.0.0",
    NEXT_PUBLIC_UPDATES_OWNER: process.env.NEXT_PUBLIC_UPDATES_OWNER || "raynaythegreat",
    NEXT_PUBLIC_UPDATES_REPO: process.env.NEXT_PUBLIC_UPDATES_REPO || "AI-Gatekeep",
  },
};

module.exports = nextConfig;