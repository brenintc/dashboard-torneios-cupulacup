import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  typescript: {
    // Ignora erros de TypeScript durante o build do Vercel para subir instantaneamente
    ignoreBuildErrors: true,
  },
}

export default nextConfig