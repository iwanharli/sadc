import { CircleAlert, CircleCheck, FileText, History, IdCard } from "lucide-react"
import { ChartCard } from "@/components/dashboard/chart-card"
import { cn } from "@/lib/utils"
import { formatTanggal, formatWaktu, hariIniDi } from "@/lib/waktu"
import type { detailPengajuan } from "@/server/pendataan"
import { labelJenis, labelProfesi } from "./status-badge"

type Detail = NonNullable<Awaited<ReturnType<typeof detailPengajuan>>>

const file = (key: string) => `/api/files/${key}`

export function DetailPemohon({ d, tz }: { d: Detail; tz: string }) {
  const { pengajuan: p, pemohon } = d
  const hariIni = hariIniDi(tz)
  const tgl = (v?: string | Date | null, jam = false) => (jam && v instanceof Date ? formatWaktu(v, tz) : formatTanggal(v, tz))

  return (
    <div className="space-y-6">
      {p.status === "DRAF" && p.kekurangan.length > 0 && (
        <div className="flex items-start gap-4 rounded-2xl border border-warning/50 bg-warning/10 p-5">
          <CircleAlert className="size-7 shrink-0 text-warning" />
          <div>
            <p className="text-lg font-semibold">{p.kekurangan.length} persyaratan belum terpenuhi</p>
            <ul className="mt-2 grid list-disc gap-x-8 gap-y-1 pl-5 text-[15px] sm:grid-cols-2">
              {p.kekurangan.map((k) => (
                <li key={k}>{k}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
      {p.status !== "DRAF" && (
        <div className="flex items-start gap-4 rounded-2xl border border-success/40 bg-success/10 p-5">
          <CircleCheck className="size-7 shrink-0 text-success" />
          <div>
            <p className="text-lg font-semibold">Terverifikasi otomatis</p>
            <p className="text-[15px] text-muted-foreground">
              Semua persyaratan terpenuhi pada {tgl(p.terverifikasiAt, true)}.
              {p.status === "TERVERIFIKASI" && " Menunggu pencetakan KTA & sertifikat."}
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <ChartCard title="Data pemohon" description="Sesuai KTP">
            <div className="flex flex-col gap-6 sm:flex-row">
              <div className="flex shrink-0 flex-col items-center gap-3">
                {p.fotoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={file(p.fotoUrl)} alt={pemohon.nama} className="aspect-[3/4] w-36 rounded-xl border object-cover" />
                ) : (
                  <div className="flex aspect-[3/4] w-36 items-center justify-center rounded-xl border-2 border-dashed text-sm text-muted-foreground">
                    Belum ada foto
                  </div>
                )}
              </div>
              <dl className="grid flex-1 gap-x-8 gap-y-4 sm:grid-cols-2">
                <Item label="Nama lengkap" value={pemohon.nama} />
                <Item label="NIK" value={pemohon.nik} mono />
                <Item label="Tempat, tanggal lahir" value={`${pemohon.tempatLahir ?? "—"}, ${tgl(pemohon.tglLahir)}`} />
                <Item label="Jenis kelamin" value={pemohon.jenisKelamin === "L" ? "Laki-laki" : pemohon.jenisKelamin === "P" ? "Perempuan" : "—"} />
                <Item label="Pendidikan terakhir" value={pemohon.pendidikan} />
                <Item label="Nomor HP" value={pemohon.noHp} />
                <Item label="Tinggi badan" value={pemohon.tinggiBadan ? `${pemohon.tinggiBadan} cm` : null} />
                <Item label="Alamat" value={[pemohon.alamat, d.wilayah].filter(Boolean).join(", ")} className="sm:col-span-2" />
              </dl>
            </div>
          </ChartCard>

          <ChartCard title="Pengajuan & profesi">
            <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
              <Item label="Profesi" value={labelProfesi(p.profesi)} />
              <Item label="Jenis pengajuan" value={labelJenis(p.jenis)} />
              <Item label="Nomor registrasi" value={p.noRegistrasi} mono />
              <Item label={p.profesi === "SATPAM" ? "BUJP / perusahaan" : "Perusahaan pembiayaan"} value={d.perusahaan?.nama} className="lg:col-span-2" />
              <Item label="Polda" value={d.polda.nama} />
              {p.profesi === "SATPAM" ? (
                <>
                  <Item label="Jenjang Gada" value={d.satpam?.jenjangGada ? d.satpam.jenjangGada[0] + d.satpam.jenjangGada.slice(1).toLowerCase() : null} />
                  <Item label="No. sertifikat Gada" value={d.satpam?.noSertifikatGada} mono />
                </>
              ) : (
                <>
                  <Item label="No. SPPI" value={d.dc?.noSppi} mono />
                  <Item label="SPPI berlaku s.d." value={d.dc?.sppiBerlakuSd ? tgl(d.dc.sppiBerlakuSd) : null} />
                  <Item label="Wilayah operasi" value={d.dc?.wilayahOperasi} />
                </>
              )}
              <Item label="Didata oleh" value={d.operator} />
              <Item label="Tanggal pendataan" value={tgl(p.createdAt, true)} />
            </dl>
          </ChartCard>

          <ChartCard title="Dokumen persyaratan" description={`${d.dokumen.length} dokumen terunggah`} bodyClassName="p-0">
            {d.dokumen.length === 0 ? (
              <p className="p-6 text-[15px] text-muted-foreground">Belum ada dokumen.</p>
            ) : (
              <ul className="divide-y">
                {d.dokumen.map((doc) => {
                  const lewat = doc.berlakuSd && doc.berlakuSd < hariIni
                  return (
                    <li key={doc.id} className="flex flex-wrap items-center gap-4 px-6 py-4">
                      <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <FileText className="size-5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[16px] font-semibold">{doc.nama}</p>
                        <p className="text-sm text-muted-foreground">
                          No. <span className="font-mono">{doc.nomor ?? "—"}</span>
                          {doc.tglTerbit && <> · terbit {tgl(doc.tglTerbit)}</>}
                          {doc.berlakuSd && (
                            <span className={cn(lewat && "font-medium text-destructive")}>
                              {" "}
                              · berlaku s.d. {tgl(doc.berlakuSd)}
                              {lewat && " (kedaluwarsa)"}
                            </span>
                          )}
                        </p>
                      </div>
                      <a
                        href={file(doc.fileUrl)}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-lg border px-3.5 py-2 text-[15px] font-medium hover:bg-accent"
                      >
                        Lihat
                      </a>
                    </li>
                  )
                })}
              </ul>
            )}
          </ChartCard>
        </div>

        <div className="space-y-6">
          {d.kartu && (
            <ChartCard title="KTA">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <IdCard className="size-6 text-primary" />
                  <span className="font-mono text-lg font-semibold">{d.kartu.noKta}</span>
                </div>
                <dl className="grid gap-3">
                  <Item label="Terbit" value={tgl(d.kartu.terbitAt)} />
                  <Item label="Berlaku sampai" value={tgl(d.kartu.berlakuSd)} />
                </dl>
              </div>
            </ChartCard>
          )}

          <ChartCard title="Biometrik">
            <div className="grid grid-cols-2 gap-4">
              <Bio label="Sidik jari" k={p.sidikJariUrl} />
              <Bio label="Tanda tangan" k={p.ttdUrl} putih />
            </div>
          </ChartCard>

          <ChartCard title="Riwayat status" bodyClassName="p-0">
            <ol className="relative space-y-0 px-6 py-5">
              {d.riwayat.map((r, i) => (
                <li key={r.id} className="relative flex gap-4 pb-6 last:pb-0">
                  {i < d.riwayat.length - 1 && <span className="absolute top-9 bottom-0 left-[17px] w-px bg-border" />}
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <History className="size-4" />
                  </span>
                  <div>
                    <p className="text-[15px] font-semibold">{r.ke === "TERVERIFIKASI" ? "Terverifikasi" : r.ke === "DICETAK" ? "Dicetak" : "Draf"}</p>
                    <p className="text-[15px] text-muted-foreground">{r.catatan}</p>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {tgl(r.at, true)} · {r.oleh ?? "Sistem"}
                    </p>
                  </div>
                </li>
              ))}
              {d.riwayat.length === 0 && <p className="text-[15px] text-muted-foreground">Belum ada riwayat.</p>}
            </ol>
          </ChartCard>
        </div>
      </div>
    </div>
  )
}

function Item({ label, value, mono, className }: { label: string; value?: string | null; mono?: boolean; className?: string }) {
  return (
    <div className={className}>
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className={cn("mt-0.5 text-[16px] font-medium", mono && "font-mono", !value && "text-muted-foreground")}>{value || "—"}</dd>
    </div>
  )
}

function Bio({ label, k, putih }: { label: string; k: string | null; putih?: boolean }) {
  return (
    <div>
      <p className="mb-2 text-sm text-muted-foreground">{label}</p>
      {k ? (
        <a href={file(k)} target="_blank" rel="noreferrer">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={file(k)} alt={label} className={cn("h-28 w-full rounded-lg border object-contain", putih && "bg-white")} />
        </a>
      ) : (
        <div className="flex h-28 items-center justify-center rounded-lg border-2 border-dashed text-sm text-muted-foreground">Belum ada</div>
      )}
    </div>
  )
}
