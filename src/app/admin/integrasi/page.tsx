import { desc, eq, gte, and, count } from "drizzle-orm"
import { headers } from "next/headers"
import { ChartCard } from "@/components/dashboard/chart-card"
import { KelolaToken } from "@/components/integrasi/kelola-token"
import { PageHeader } from "@/components/page-header"
import { formatWaktu } from "@/lib/waktu"
import { requireUser } from "@/server/auth"
import { db, schema } from "@/server/db"
import { BATAS_PER_MENIT } from "@/server/integrasi"
import { getZona } from "@/server/zona"

const ENDPOINT = [
  { path: "companies", ket: "Perusahaan BUJP & PJPU" },
  { path: "applicants", ket: "Pengajuan beserta data pemohon (nama & NIK lengkap)" },
  { path: "cards", ket: "KTA beserta riwayat sanksi" },
  { path: "blacklist", ket: "NIK yang diblokir" },
  { path: "document-requirements", ket: "Persyaratan dokumen" },
]

export default async function IntegrasiPage() {
  await requireUser("ADMIN")
  const sehari = new Date(Date.now() - 86_400_000)
  const [rows, [panggilan], tz, h] = await Promise.all([
    db.select().from(schema.integrasiToken).orderBy(desc(schema.integrasiToken.aktif), desc(schema.integrasiToken.createdAt)),
    db.select({ n: count() }).from(schema.auditLog).where(and(eq(schema.auditLog.aksi, "API_INTEGRASI"), gte(schema.auditLog.at, sehari))),
    getZona(),
    headers(),
  ])
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "sadc.kecup.in"
  const dasar = `${h.get("x-forwarded-proto") ?? "https"}://${host}/api/integration`

  return (
    <>
      <PageHeader
        eyebrow="Administrasi"
        title="Integrasi API"
        description="Akses baca-saja untuk sistem lain, misalnya Baharkam Command Center. Setiap pemanggilan tercatat di Audit Log."
      />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <KelolaToken
          rows={rows.map((r) => ({
            id: r.id,
            nama: r.nama,
            awalan: r.awalan,
            ipIzin: r.ipIzin,
            aktif: r.aktif && !r.dicabutAt,
            dibuat: formatWaktu(r.createdAt, tz),
            terakhirDipakai: r.terakhirDipakai ? formatWaktu(r.terakhirDipakai, tz) : null,
            ipTerakhir: r.ipTerakhir,
            dicabut: r.dicabutAt ? formatWaktu(r.dicabutAt, tz) : null,
            bisaDisalin: !!r.tokenEnc,
          }))}
        />
        <ChartCard title="Endpoint" description={`${panggilan.n.toLocaleString("id-ID")} pemanggilan dalam 24 jam terakhir`}>
          <div className="space-y-4 text-[15px]">
            <p className="break-all rounded-lg bg-muted/60 px-3 py-2 font-mono text-sm">GET {dasar}/…</p>
            <ul className="space-y-3">
              {ENDPOINT.map((e) => (
                <li key={e.path}>
                  <p className="font-mono font-semibold">/{e.path}</p>
                  <p className="text-muted-foreground">{e.ket}</p>
                </li>
              ))}
            </ul>
            <p className="border-t pt-4 text-muted-foreground">
              Header <span className="font-mono">Authorization: Bearer &lt;token&gt;</span>. Paginasi kursor (<span className="font-mono">limit</span>,{" "}
              <span className="font-mono">cursor</span>), sinkron bertahap <span className="font-mono">updatedSince</span>, filter{" "}
              <span className="font-mono">polda</span>. Batas {BATAS_PER_MENIT} permintaan/menit per token.
            </p>
          </div>
        </ChartCard>
      </div>
    </>
  )
}
