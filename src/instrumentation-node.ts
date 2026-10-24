import { mulaiJobs } from "./server/jobs"

const g = globalThis as unknown as { sadcJobs?: boolean }
if (process.env.JOBS_ENABLED !== "false" && !g.sadcJobs) {
  g.sadcJobs = true
  mulaiJobs().catch((e) => console.error("[jobs] gagal memulai penjadwal:", e))
}
