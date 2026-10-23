import { drizzle } from "drizzle-orm/node-postgres"
import { Pool } from "pg"
import * as schema from "./schema"

const globalForDb = globalThis as unknown as { poolUtc?: Pool }

// sesi DB memakai UTC agar default now() sama dengan Date dari aplikasi (kolom timestamp tanpa zona)
const pool =
  globalForDb.poolUtc ?? new Pool({ connectionString: process.env.DATABASE_URL, options: "-c timezone=UTC" })
if (process.env.NODE_ENV !== "production") globalForDb.poolUtc = pool

export const db = drizzle(pool, { schema })
export { schema }
