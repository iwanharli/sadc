import { and, asc, count, eq, ilike, or, sql, type SQL } from "drizzle-orm"
import { MasterPerusahaan } from "@/components/master/master-perusahaan"
import { PageHeader } from "@/components/page-header"
import { parsePerHalaman } from "@/lib/filter-pemohon"
import { requireUser } from "@/server/auth"
import { db, schema } from "@/server/db"

type SP = { q?: string; jenis?: string; polda?: string; page?: string; per?: string }

export default async function PerusahaanPage({ searchParams }: { searchParams: Promise<SP> }) {
  await requireUser("ADMIN")
  const sp = await searchParams
  const perPage = parsePerHalaman(sp.per)
  const jenis = sp.jenis === "BUJP" || sp.jenis === "PEMBIAYAAN" ? sp.jenis : undefined
  const poldaId = Number(sp.polda) || undefined
  const q = sp.q?.trim()
  const { perusahaan: pr } = schema

  const where = and(
    ...([
      jenis ? eq(pr.jenis, jenis) : undefined,
      poldaId ? eq(pr.poldaId, poldaId) : undefined,
      q ? or(ilike(pr.nama, `%${q}%`), ilike(pr.nib, `%${q}%`)) : undefined,
    ] as (SQL | undefined)[]),
  )
  const [[{ total }], [{ bujp, pjpu }], polda] = await Promise.all([
    db.select({ total: count() }).from(pr).where(where),
    db
      .select({
        bujp: sql<number>`count(*) filter (where ${pr.jenis} = 'BUJP')`.mapWith(Number),
        pjpu: sql<number>`count(*) filter (where ${pr.jenis} = 'PEMBIAYAAN')`.mapWith(Number),
      })
      .from(pr),
    db.select({ id: schema.polda.id, nama: schema.polda.nama }).from(schema.polda).orderBy(schema.polda.nama),
  ])
  const pages = Math.max(1, Math.ceil(total / perPage))
  const page = Math.min(Math.max(1, Number(sp.page) || 1), pages)

  const rows = await db
    .select({
      id: pr.id,
      nama: pr.nama,
      jenis: pr.jenis,
      nib: pr.nib,
      noIzin: pr.noIzin,
      alamat: pr.alamat,
      poldaId: pr.poldaId,
      polda: schema.polda.nama,
      aktif: pr.aktif,
      pemohon: sql<number>`(select count(*)::int from pengajuan g where g.perusahaan_id = perusahaan.id)`,
    })
    .from(pr)
    .leftJoin(schema.polda, eq(pr.poldaId, schema.polda.id))
    .where(where)
    .orderBy(asc(schema.polda.nama), asc(pr.nama))
    .limit(perPage)
    .offset((page - 1) * perPage)

  return (
    <>
      <PageHeader eyebrow="Data" title="Daftar Perusahaan" description={`${bujp} BUJP · ${pjpu} PJPU di seluruh Polda`} />
      <MasterPerusahaan
        rows={rows}
        polda={polda}
        total={total}
        page={page}
        pages={pages}
        perPage={perPage}
        params={{ q, jenis, polda: sp.polda, per: sp.per }}
      />
    </>
  )
}
