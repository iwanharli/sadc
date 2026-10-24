// Dijalankan sekali saat server Next.js start.
export async function register() {
  // pola resmi Next.js: impor modul Node hanya di dalam blok ini agar tidak ikut bundel edge
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./instrumentation-node")
  }
}
