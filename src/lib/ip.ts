/** Tampilkan IP dengan rapi: loopback IPv6/IPv4 ditandai "lokal", IPv4-mapped IPv6 diringkas. */
export function formatIp(ip?: string | null) {
  if (!ip) return "—"
  const v = ip.trim()
  if (/^(0{1,4}:){7}0{0,3}1$/.test(v) || /^(0{1,4}:){7}0{1,4}$/.test(v) || v === "::1" || v === "127.0.0.1") return "127.0.0.1 (lokal)"
  const m = v.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i)
  return m ? m[1] : v
}
