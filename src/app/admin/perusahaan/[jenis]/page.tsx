import { and, asc, count, eq, ilike, or, sql, type SQL } from "drizzle-orm"
import { notFound } from "next/navigation"
import { MasterPerusahaan } from "@/components/master/master-perusahaan"
import { PageHeader } from "@/components/page-header"
import { parsePerHalaman } from "@/lib/filter-pemohon"
import { requireUser } from "@/server/auth"
import { db, schema } from "@/server/db"

type SP = { q?: string; polda?: string; page?: string; per?: string }

const JENIS = {
  bujp: { kode: "BUJP", judul: "Daftar BUJP", ket: "Badan Usaha Jasa Pengamanan — tempat bertugas Satpam" },
  pjpu: { kode: "PEMBIAYAAN", judul: "Daftar PJPU", ket: "Perusahaan Jasa Penagihan Utang — tempat bertugas Petugas Penagih" },
} as const

export default async function PerusahaanPage({
  params,
  searchParams,
}: {
  params: Promise<{ jenis: string }>
  searchParams: Promise<SP>
}) {
  await requireUser("ADMIN")
  const slug = (await params).jenis
  if (slug !== "bujp" && slug !== "pjpu") notFound()
  const info = JENIS[slug]
  const sp = await searchParams
  const perPage = parsePerHalaman(sp.per)
  const jenis = info.kode
  const poldaId = Number(sp.polda) || undefined
  const q = sp.q?.trim()
  const { perusahaan: pr } = schema

  const where = and(
    ...([
      eq(pr.jenis, jenis),
      poldaId ? eq(pr.poldaId, poldaId) : undefined,
      q ? or(ilike(pr.nama, `%${q}%`), ilike(pr.nib, `%${q}%`)) : undefined,
    ] as (SQL | undefined)[]),
  )
  const [[{ total }], [{ semua }], polda] = await Promise.all([
    db.select({ total: count() }).from(pr).where(where),
    db.select({ semua: count() }).from(pr).where(eq(pr.jenis, jenis)),
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
      <PageHeader eyebrow="Daftar Perusahaan" title={info.judul} description={`${info.ket} · ${semua.toLocaleString("id-ID")} perusahaan di seluruh Polda`} />
      <MasterPerusahaan
        jenis={jenis}
        basePath={`/admin/perusahaan/${slug}`}
        rows={rows}
        polda={polda}
        total={total}
        page={page}
        pages={pages}
        perPage={perPage}
        params={{ q, polda: sp.polda, per: sp.per }}
      />
    </>
  )
}
