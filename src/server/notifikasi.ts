import "server-only"
import { and, desc, eq, gte, lte, lt } from "drizzle-orm"
import { hariIniDi } from "@/lib/waktu"
import { db, schema } from "./db"

export type JenisNotif = "KEDALUWARSA" | "SANKSI" | "TINJAU_LEWAT"
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
 * KTA segera kedaluwarsa, sanksi baru, dan pembekuan yang melewati batas tinjau.
 */
export async function getNotifikasi(user: User, tz: string) {
  const admin = user.role === "ADMIN"
  const base = admin ? "/admin/pemohon" : "/operator/pemohon"
  const wil = admin ? undefined : eq(schema.pengajuan.poldaId, user.poldaId ?? -1)
  const hariIni = hariIniDi(tz)
  const plus30 = new Date(tglKe(hariIni).getTime() + 30 * HARI).toISOString().slice(0, 10)

  const [kedaluwarsa, sanksi, tinjau] = await Promise.all([
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
  ].sort((a, b) => b.at.getTime() - a.at.getTime())

  const u = await db.query.user.findFirst({ where: eq(schema.user.id, user.id), columns: { notifDibacaAt: true } })
  const dibaca = u?.notifDibacaAt ?? new Date(0)
  return { items, belumDibaca: items.filter((i) => i.at > dibaca).length, dibacaAt: dibaca }
}
