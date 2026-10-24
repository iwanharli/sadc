import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // folder build bisa dipisah (mis. NEXT_DIST_DIR=.next-check) agar build/test
  // tidak menimpa .next milik `next dev` yang sedang berjalan
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // indikator dev Next.js di kanan bawah agar tidak menutupi kartu wilayah di sidebar
  devIndicators: { position: "bottom-right" },
  // header keamanan untuk semua halaman
  async headers() {
    const produksi = process.env.NODE_ENV === "production"
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // kamera dipakai untuk foto wajah pemohon (hanya dari origin sendiri)
          { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=(), payment=()" },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              // Next.js membutuhkan inline script; 'unsafe-eval' hanya untuk mode pengembangan
              // static.cloudflareinsights.com: beacon Web Analytics yang disisipkan Cloudflare
              `script-src 'self' 'unsafe-inline' https://static.cloudflareinsights.com${produksi ? "" : " 'unsafe-eval'"}`,
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob:",
              "font-src 'self' data:",
              // websocket HMR saat pengembangan
              `connect-src 'self' https://cloudflareinsights.com${produksi ? "" : " ws: wss:"}`,
              "media-src 'self' blob:",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "object-src 'none'",
            ].join("; "),
          },
          ...(produksi ? [{ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" }] : []),
        ],
      },
    ]
  },
};

export default nextConfig;
