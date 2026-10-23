import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // folder build bisa dipisah (mis. NEXT_DIST_DIR=.next-check) agar build/test
  // tidak menimpa .next milik `next dev` yang sedang berjalan
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // indikator dev Next.js di kanan bawah agar tidak menutupi kartu wilayah di sidebar
  devIndicators: { position: "bottom-right" },
};

export default nextConfig;
