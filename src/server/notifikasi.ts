import "server-only"
import { and, desc, eq, gte, lte, lt, sql } from "drizzle-orm"
import { hariIniDi } from "@/lib/waktu"
import { db, schema } from "./db"

export type JenisNotif = "KEDALUWARSA" | "DRAF_LAMA" | "SANKSI" | "TINJAU_LEWAT" | "CETAK_TERTUNDA"
export type Notif = {
  id: string
  jenis: JenisNotif
  judul: string
  isi: string
  at: Date
  href: string
}

type User = { id: string; role: string; poldaId?: number | null }

const BATAS = 25
const HARI = 86_400_000
const tglKe = (s: string) => new Date(s + "T00:00:00Z")

/**
 * Notifikasi dihitung dari kondisi data saat ini (tanpa tabel antrean):
 * KTA segera kedaluwarsa, draf terbengkalai, sanksi baru, pembekuan lewat batas tinjau, antrean cetak tertunda.
 */
export async function getNotifikasi(user: User, tz: string) {
  const admin = user.role === "ADMIN"
  const base = admin ? "/admin/pemohon" : "/operator/pemohon"
  const wil = admin ? undefined : eq(schema.pengajuan.poldaId, user.poldaId ?? -1)
  const hariIni = hariIniDi(tz)
  const plus30 = new Date(tglKe(hariIni).getTime() + 30 * HARI).toISOString().slice(0, 10)

  const [kedaluwarsa, sanksi, tinjau, draf, cetak] = await Promise.all([
    db
      .select({ pengajuanId: schema.pengajuan.id, nama: schema.pemohon.nama, noKta: schema.kartu.noKta, berlakuSd: schema.kartu.berlakuSd, polda: schema.polda.nama })
      .from(schema.kartu)
      .innerJoin(schema.pengajuan, eq(schema.kartu.pengajuanId, schema.pengajuan.id))
      .innerJoin(schema.pemohon, eq(schema.pengajuan.pemohonId, schema.pemohon.id))
      .innerJoin(schema.polda, eq(schema.pengajuan.poldaId, schema.polda.id))
      .where(and(eq(schema.kartu.status, "AKTIF"), lte(schema.kartu.berlakuSd, plus30), gte(schema.kartu.berlakuSd, hariIni), wil))
      .orderBy(schema.kartu.berlakuSd)
      .limit(BATAS),
    db
      .select({ id: schema.sanksi.id, jenis: schema.sanksi.jenis, alasan: schema.sanksi.alasan, at: schema.sanksi.at, pengajuanId: schema.pengajuan.id, nama: schema.pemohon.nama, noKta: schema.kartu.noKta, oleh: schema.user.name })
      .from(schema.sanksi)
      .innerJoin(schema.kartu, eq(schema.sanksi.kartuId, schema.kartu.id))
      .innerJoin(schema.pengajuan, eq(schema.kartu.pengajuanId, schema.pengajuan.id))
      .innerJoin(schema.pemohon, eq(schema.pengajuan.pemohonId, schema.pemohon.id))
      .leftJoin(schema.user, eq(schema.sanksi.oleh, schema.user.id))
      .where(and(gte(schema.sanksi.at, new Date(Date.now() - 14 * HARI)), wil))
      .orderBy(desc(schema.sanksi.at))
      .limit(BATAS),
    db
      .select({ id: schema.sanksi.id, tinjauSd: schema.sanksi.berlakuSd, pengajuanId: schema.pengajuan.id, nama: schema.pemohon.nama, noKta: schema.kartu.noKta })
      .from(schema.sanksi)
      .innerJoin(schema.kartu, eq(schema.sanksi.kartuId, schema.kartu.id))
      .innerJoin(schema.pengajuan, eq(schema.kartu.pengajuanId, schema.pengajuan.id))
      .innerJoin(schema.pemohon, eq(schema.pengajuan.pemohonId, schema.pemohon.id))
      .where(and(eq(schema.kartu.status, "DIBEKUKAN"), eq(schema.sanksi.jenis, "BEKU"), lt(schema.sanksi.berlakuSd, hariIni), wil))
      .orderBy(desc(schema.sanksi.berlakuSd))
      .limit(BATAS),
    // draf yang lebih dari 7 hari tidak dilengkapi (hanya relevan bagi Operator)
    admin
      ? Promise.resolve([])
      : db
          .select({ id: schema.pengajuan.id, nama: schema.pemohon.nama, createdAt: schema.pengajuan.createdAt, kurang: sql<number>`jsonb_array_length(${schema.pengajuan.kekurangan})` })
          .from(schema.pengajuan)
          .innerJoin(schema.pemohon, eq(schema.pengajuan.pemohonId, schema.pemohon.id))
          .where(and(eq(schema.pengajuan.status, "DRAF"), lt(schema.pengajuan.updatedAt, new Date(Date.now() - 7 * HARI)), wil))
          .orderBy(desc(schema.pengajuan.updatedAt))
          .limit(BATAS),
    admin
      ? Promise.resolve([] as { n: number; tertua: Date | null }[])
      : db
          .select({ n: sql<number>`count(*)::int`, tertua: sql<string | null>`to_char(min(${schema.pengajuan.terverifikasiAt}), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`.mapWith((v) => (v ? new Date(v) : null)) })
          .from(schema.pengajuan)
          .where(and(eq(schema.pengajuan.status, "TERVERIFIKASI"), lt(schema.pengajuan.terverifikasiAt, new Date(Date.now() - 3 * HARI)), wil)),
  ])

  const items: Notif[] = [
    ...kedaluwarsa.map((k) => ({
      id: `exp-${k.noKta}`,
      jenis: "KEDALUWARSA" as const,
      judul: `KTA ${k.nama} segera kedaluwarsa`,
      isi: `${k.noKta} berakhir ${k.berlakuSd}${admin ? ` · ${k.polda.replace(/^Polda /, "")}` : ""}. Ingatkan untuk perpanjangan.`,
      // dianggap "baru" sejak masuk jendela 30 hari
      at: new Date(tglKe(k.berlakuSd).getTime() - 30 * HARI),
      href: `${base}/${k.pengajuanId}`,
    })),
    ...sanksi.map((s) => ({
      id: `sanksi-${s.id}`,
      jenis: "SANKSI" as const,
      judul: `KTA ${s.nama} ${s.jenis === "BEKU" ? "dibekukan" : s.jenis === "CABUT" ? "dicabut" : "dipulihkan"}`,
      isi: `${s.noKta} · ${s.alasan}${s.oleh ? ` · oleh ${s.oleh}` : ""}`,
      at: s.at,
      href: `${base}/${s.pengajuanId}`,
    })),
    ...tinjau.map((t) => ({
      id: `tinjau-${t.id}`,
      jenis: "TINJAU_LEWAT" as const,
      judul: `Pembekuan KTA ${t.nama} melewati batas tinjau`,
      isi: `${t.noKta} seharusnya ditinjau paling lambat ${t.tinjauSd}. Pulihkan atau cabut.`,
      at: tglKe(t.tinjauSd!),
      href: `${base}/${t.pengajuanId}`,
    })),
    ...draf.map((d) => ({
      id: `draf-${d.id}`,
      jenis: "DRAF_LAMA" as const,
      judul: `Draf ${d.nama} belum dilengkapi`,
      isi: `Masih ${d.kurang} kekurangan sejak lebih dari 7 hari.`,
      at: new Date(d.createdAt.getTime() + 7 * HARI),
      href: `${base}/${d.id}`,
    })),
    ...cetak
      .filter((c) => c.n > 0)
      .map((c) => ({
        id: "cetak",
        jenis: "CETAK_TERTUNDA" as const,
        judul: `${c.n} KTA belum diterbitkan lebih dari 3 hari`,
        isi: "Pengajuan sudah terverifikasi otomatis dan menunggu dicetak.",
        at: c.tertua ? new Date(c.tertua.getTime() + 3 * HARI) : new Date(),
        href: "/operator/cetak",
      })),
  ].sort((a, b) => b.at.getTime() - a.at.getTime())

  const u = await db.query.user.findFirst({ where: eq(schema.user.id, user.id), columns: { notifDibacaAt: true } })
  const dibaca = u?.notifDibacaAt ?? new Date(0)
  return { items, belumDibaca: items.filter((i) => i.at > dibaca).length, dibacaAt: dibaca }
}
