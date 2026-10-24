import "server-only"
import { and, desc, eq, inArray, sql } from "drizzle-orm"
import { db, schema } from "./db"
import { dekripsiNik } from "./nik"

/** KTA berstatus dibekukan/dicabut beserta sanksi terakhirnya. */
export async function daftarSanksi(poldaId?: number | null, status?: "DIBEKUKAN" | "DICABUT") {
  const terakhir = db
    .select({
      kartuId: schema.sanksi.kartuId,
      maxId: sql<number>`max(${schema.sanksi.id})`.as("max_id"),
    })
    .from(schema.sanksi)
    .groupBy(schema.sanksi.kartuId)
    .as("terakhir")

  return db
    .select({
      kartuId: schema.kartu.id,
      noKta: schema.kartu.noKta,
      status: schema.kartu.status,
      pengajuanId: schema.pengajuan.id,
      profesi: schema.pengajuan.profesi,
      nama: schema.pemohon.nama,
      polda: schema.polda.nama,
      alasan: schema.sanksi.alasan,
      keterangan: schema.sanksi.keterangan,
      tinjauSd: schema.sanksi.berlakuSd,
      buktiUrl: schema.sanksi.buktiUrl,
      at: schema.sanksi.at,
      oleh: schema.user.name,
    })
    .from(schema.kartu)
    .innerJoin(schema.pengajuan, eq(schema.kartu.pengajuanId, schema.pengajuan.id))
    .innerJoin(schema.pemohon, eq(schema.pengajuan.pemohonId, schema.pemohon.id))
    .innerJoin(schema.polda, eq(schema.pengajuan.poldaId, schema.polda.id))
    .leftJoin(terakhir, eq(terakhir.kartuId, schema.kartu.id))
    .leftJoin(schema.sanksi, eq(schema.sanksi.id, terakhir.maxId))
    .leftJoin(schema.user, eq(schema.sanksi.oleh, schema.user.id))
    .where(
      and(
        status ? eq(schema.kartu.status, status) : inArray(schema.kartu.status, ["DIBEKUKAN", "DICABUT"]),
        poldaId ? eq(schema.pengajuan.poldaId, poldaId) : undefined,
      ),
    )
    .orderBy(desc(schema.sanksi.at))
    .limit(200)
}

export async function daftarBlacklist() {
  const rows = await db
    .select({
      id: schema.blacklist.id,
      nikEnc: schema.blacklist.nikEnc,
      alasan: schema.blacklist.alasan,
      berlakuSd: schema.blacklist.berlakuSd,
      createdAt: schema.blacklist.createdAt,
      nama: schema.pemohon.nama,
    })
    .from(schema.blacklist)
    .leftJoin(schema.pemohon, eq(schema.pemohon.nikHash, schema.blacklist.nikHash))
    .where(eq(schema.blacklist.aktif, true))
    .orderBy(desc(schema.blacklist.createdAt))
  return rows.map(({ nikEnc, ...r }) => ({ ...r, nik: dekripsiNik(nikEnc) }))
}
