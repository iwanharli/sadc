import { endpoint, galat } from "@/server/integrasi"
import { applicants, blacklist, cards, companies, documentRequirements } from "@/server/integrasi-data"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// GET /api/integration/{companies|applicants|cards|blacklist|document-requirements}
const SUMBER = {
  companies: endpoint("companies", companies),
  applicants: endpoint("applicants", applicants),
  cards: endpoint("cards", cards),
  blacklist: endpoint("blacklist", blacklist),
  "document-requirements": endpoint("document-requirements", documentRequirements),
}

export async function GET(req: Request, { params }: { params: Promise<{ sumber: string }> }) {
  const { sumber } = await params
  const h = SUMBER[sumber as keyof typeof SUMBER]
  return h ? h(req) : galat(404, "NOT_FOUND", `Endpoint tidak dikenal. Pilihan: ${Object.keys(SUMBER).join(", ")}`)
}
