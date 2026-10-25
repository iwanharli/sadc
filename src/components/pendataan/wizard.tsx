"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Briefcase,
  Camera,
  Check,
  CircleAlert,
  CircleCheck,
  ClipboardCheck,
  FileText,
  Fingerprint,
  HandCoins,
  Loader2,
  PenLine,
  RefreshCw,
  Search,
  ShieldCheck,
  UserRound,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useState, useTransition } from "react"
import { Controller, useForm, useWatch, type FieldPath } from "react-hook-form"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { PENDIDIKAN, pendataanSchema, type PendataanData, type PendataanInput } from "@/lib/pendataan-schema"
import { pesanGalat } from "@/lib/jaringan"
import { swal } from "@/lib/swal"
import { cn } from "@/lib/utils"
import { cekNik, periksaPendataan, simpanPendataan } from "@/server/actions/pendataan"
import { bukaPdf } from "@/components/cetak/tombol-cetak"
import { CameraCapture } from "./camera-capture"
import { FileField } from "./file-field"
import { SignatureField } from "./signature-field"
import { WilayahSelect } from "./wilayah-select"

export type PerusahaanOpsi = { id: number; nama: string; jenis: "BUJP" | "PEMBIAYAAN" }
export type JenisDokumenOpsi = {
  id: number
  nama: string
  profesi: "UMUM" | "SATPAM" | "DEBT_COLLECTOR"
  wajib: boolean
  wajibUntuk: ("BARU" | "PERPANJANGAN" | "PENGGANTIAN")[] | null
  adaMasaBerlaku: boolean
}

const LANGKAH = [
  { judul: "Jenis pengajuan", ket: "Profesi, jenis, & NIK", icon: ClipboardCheck },
  { judul: "Biodata & alamat", ket: "Sesuai KTP", icon: UserRound },
  { judul: "Perusahaan & profesi", ket: "BUJP / PJPU", icon: Briefcase },
  { judul: "Dokumen", ket: "Unggah persyaratan", icon: FileText },
  { judul: "Biometrik", ket: "Foto, sidik jari, TTD", icon: Fingerprint },
  { judul: "Ringkasan", ket: "Periksa & simpan", icon: BadgeCheck },
] as const

// field yang divalidasi format-nya saat pindah langkah
const FIELD_LANGKAH: FieldPath<PendataanInput>[][] = [
  ["profesi", "jenis", "nik", "nama"],
  ["tglLahir", "noHp", "tinggiBadan"],
  ["sppiBerlakuSd"],
  [],
  [],
  [],
]

const KOSONG: PendataanInput = {
  profesi: undefined as unknown as "SATPAM",
  jenis: "BARU",
  nik: "",
  nama: "",
  tempatLahir: "",
  tglLahir: "",
  pendidikan: "",
  tinggiBadan: "",
  noHp: "",
  alamat: "",
  provinsi: "",
  kabupaten: "",
  kecamatan: "",
  kodeDesa: "",
  perusahaanId: "",
  noSertifikatGada: "",
  noSppi: "",
  sppiBerlakuSd: "",
  wilayahOperasi: "",
  dokumen: {},
  fotoKey: "",
  ttdKey: "",
  sidikJariKey: "",
}

type HasilPeriksa = Awaited<ReturnType<typeof periksaPendataan>>

export function PendataanWizard({
  perusahaan,
  jenisDokumen,
  initial,
}: {
  perusahaan: PerusahaanOpsi[]
  jenisDokumen: JenisDokumenOpsi[]
  initial?: PendataanInput
}) {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [maxStep, setMaxStep] = useState(initial ? LANGKAH.length - 1 : 0)
  const [menyimpan, startSimpan] = useTransition()
  const [cekNikLoading, setCekNikLoading] = useState(false)
  const [periksa, setPeriksa] = useState<HasilPeriksa | null>(null)

  const form = useForm<PendataanInput, unknown, PendataanData>({
    resolver: zodResolver(pendataanSchema),
    defaultValues: initial ?? KOSONG,
    mode: "onTouched",
  })
  const { register, control, formState, trigger, getValues, setValue, reset } = form
  const errors = formState.errors

  const profesi = useWatch({ control, name: "profesi" })
  const jenis = useWatch({ control, name: "jenis" })
  const nik = useWatch({ control, name: "nik" })
  const [provinsi, kabupaten, kecamatan, kodeDesa] = useWatch({ control, name: ["provinsi", "kabupaten", "kecamatan", "kodeDesa"] })

  const dokumenProfesi = jenisDokumen.filter((d) => d.profesi === "UMUM" || d.profesi === profesi)
  const perusahaanProfesi = perusahaan.filter((p) => p.jenis === (profesi === "SATPAM" ? "BUJP" : "PEMBIAYAAN"))

  const periksaUlang = useCallback(() => {
    setPeriksa(null)
    periksaPendataan(getValues())
      .then(setPeriksa)
      .catch((e) => setPeriksa({ ok: false, error: pesanGalat(e, "Gagal memeriksa persyaratan") }))
  }, [getValues])

  // jalankan pemeriksaan otomatis setiap masuk langkah ringkasan
  useEffect(() => {
    if (step === LANGKAH.length - 1) periksaUlang()
  }, [step, periksaUlang])

  async function ke(target: number) {
    if (target > step) {
      for (let i = step; i < target; i++) {
        if (!(await trigger(FIELD_LANGKAH[i]))) {
          setStep(i)
          return
        }
      }
    }
    setStep(target)
    setMaxStep((m) => Math.max(m, target))
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  async function onCekNik() {
    if (!(await trigger("nik"))) return
    setCekNikLoading(true)
    try {
      let hasil: Awaited<ReturnType<typeof cekNik>>
      try {
        hasil = await cekNik(getValues("nik"))
      } catch (e) {
        await swal.fire({ icon: "error", title: "Gagal mengecek NIK", text: pesanGalat(e), confirmButtonText: "Tutup" })
        return
      }
      if (!hasil) {
        await swal.fire({ icon: "info", title: "NIK belum terdaftar", text: "Lanjutkan pendataan sebagai pemohon baru.", confirmButtonText: "Oke" })
        return
      }
      const riwayat = hasil.riwayat
        .map((r) => `<li><b>${r.noRegistrasi}</b> · ${r.profesi === "SATPAM" ? "Satpam" : "Penagih Utang"} · ${r.kartu ?? r.status}</li>`)
        .join("")
      const ok = await swal.fire({
        icon: "question",
        title: "NIK sudah terdaftar",
        html: `<p>Pemohon <b>${hasil.nama}</b> sudah pernah didata.</p>${riwayat ? `<ul style="text-align:left;margin-top:12px;line-height:1.7">${riwayat}</ul>` : ""}<p style="margin-top:12px">Isi otomatis biodata & alamat dari data sebelumnya?</p>`,
        showCancelButton: true,
        confirmButtonText: "Isi otomatis",
        cancelButtonText: "Tidak",
      })
      if (ok.isConfirmed) {
        const data: Partial<typeof hasil> = { ...hasil }
        delete data.riwayat
        reset({ ...getValues(), ...data }, { keepDefaultValues: true })
      }
    } finally {
      setCekNikLoading(false)
    }
  }

  function simpan() {
    startSimpan(async () => {
      if (!(await trigger())) {
        await swal.fire({ icon: "warning", title: "Periksa kembali isian", text: "Ada format isian yang belum benar.", confirmButtonText: "Oke" })
        return
      }
      // tidak diulang otomatis: menyimpan dua kali bisa menerbitkan KTA ganda
      let res: Awaited<ReturnType<typeof simpanPendataan>>
      try {
        res = await simpanPendataan(getValues())
      } catch (e) {
        await swal.fire({
          icon: "error",
          title: "Gagal menyimpan",
          html: `${pesanGalat(e)}<br/><br/>Sebelum menyimpan ulang, pastikan di Daftar Satpam / Penagih Utang bahwa data ini belum tersimpan.`,
          confirmButtonText: "Tutup",
        })
        return
      }
      if (!res.ok) {
        const daftar = res.kekurangan?.length
          ? `<ul style="text-align:left;margin-top:10px;line-height:1.7;list-style:disc;padding-left:20px">${res.kekurangan
              .map((k) => `<li>${k}</li>`)
              .join("")}</ul>`
          : ""
        await swal.fire({
          icon: "warning",
          title: res.kekurangan?.length ? "Data belum lengkap" : "Gagal menyimpan",
          html: `${res.kekurangan?.length ? "Lengkapi kekurangan berikut lalu simpan kembali. Data belum disimpan." : res.error}${daftar}`,
          confirmButtonText: "Perbaiki",
        })
        return
      }
      const pilih = await swal.fire({
        icon: "success",
        title: "KTA diterbitkan",
        html: `Semua persyaratan terpenuhi. Nomor KTA <b style="font-family:monospace">${res.data.noKta}</b>`,
        showDenyButton: true,
        showCancelButton: true,
        confirmButtonText: "Cetak KTA",
        denyButtonText: "Cetak sertifikat",
        cancelButtonText: "Lihat detail",
        customClass: { popup: "sadc-swal", confirmButton: "swal-btn-primary", denyButton: "swal-btn-outline", cancelButton: "swal-btn-ghost" },
      })
      if (pilih.isConfirmed) bukaPdf(res.data.kartuId, "kta")
      if (pilih.isDenied) bukaPdf(res.data.kartuId, "sertifikat")
      router.push(`/operator/pemohon/${res.data.id}`)
      router.refresh()
    })
  }

  const field = (name: FieldPath<PendataanInput>) => (errors as Record<string, { message?: string }>)[name]?.message

  return (
    <div className="grid gap-6 xl:grid-cols-[300px_1fr]">
      {/* Stepper */}
      <Card className="h-fit gap-0 p-3 xl:sticky xl:top-24">
        <ol className="flex gap-1 overflow-x-auto xl:flex-col">
          {LANGKAH.map((l, i) => {
            const selesai = i < step || (i <= maxStep && i !== step)
            const aktif = i === step
            return (
              <li key={l.judul} className="shrink-0">
                <button
                  type="button"
                  disabled={i > maxStep}
                  onClick={() => ke(i)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors disabled:opacity-50",
                    aktif ? "bg-accent ring-1 ring-primary/25" : "hover:bg-muted/60",
                  )}
                >
                  <span
                    className={cn(
                      "flex size-10 shrink-0 items-center justify-center rounded-lg border",
                      aktif && "border-transparent bg-primary text-primary-foreground",
                      selesai && !aktif && "border-transparent bg-success/15 text-success",
                    )}
                  >
                    {selesai && !aktif ? <Check className="size-5" /> : <l.icon className="size-5" />}
                  </span>
                  <span className="hidden min-w-0 sm:block">
                    <span className="block text-sm text-muted-foreground">Langkah {i + 1}</span>
                    <span className="block truncate text-[15px] font-semibold">{l.judul}</span>
                  </span>
                </button>
              </li>
            )
          })}
        </ol>
      </Card>

      <form onSubmit={(e) => e.preventDefault()} className="min-w-0">
        <Card className="gap-0 p-0">
          <div className="border-b px-6 py-5 md:px-8">
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-primary">
              Langkah {step + 1} dari {LANGKAH.length}
            </p>
            <h2 className="mt-1 text-2xl font-bold">{LANGKAH[step].judul}</h2>
            <p className="text-[15px] text-muted-foreground">{LANGKAH[step].ket}</p>
          </div>

          <div className="space-y-6 px-6 py-6 md:px-8 md:py-8">
            {/* 1. Jenis pengajuan */}
            {step === 0 && (
              <>
                <Bagian judul="Profesi pemohon">
                  <Controller
                    control={control}
                    name="profesi"
                    render={({ field: f }) => (
                      <div className="grid gap-4 sm:grid-cols-2">
                        {[
                          { v: "SATPAM", t: "Satpam", d: "Satuan Pengamanan · KTA & sertifikat Gada", icon: ShieldCheck },
                          { v: "DEBT_COLLECTOR", t: "Penagih Utang", d: "Penagih utang · bertugas di PJPU", icon: HandCoins },
                        ].map((o) => (
                          <button
                            key={o.v}
                            type="button"
                            onClick={() => f.onChange(o.v)}
                            className={cn(
                              "flex items-start gap-4 rounded-2xl border-2 p-5 text-left transition-all hover:border-primary/50",
                              f.value === o.v ? "border-primary bg-accent/60 shadow-sm" : "border-border",
                            )}
                          >
                            <span
                              className={cn(
                                "flex size-12 shrink-0 items-center justify-center rounded-xl",
                                o.v === "SATPAM" ? "bg-series-satpam/15 text-series-satpam" : "bg-series-dc/15 text-series-dc",
                              )}
                            >
                              <o.icon className="size-6" />
                            </span>
                            <span>
                              <span className="block text-lg font-semibold">{o.t}</span>
                              <span className="block text-[15px] text-muted-foreground">{o.d}</span>
                            </span>
                            {f.value === o.v && <CircleCheck className="ml-auto size-6 shrink-0 text-primary" />}
                          </button>
                        ))}
                      </div>
                    )}
                  />
                  <Galat pesan={field("profesi")} />
                </Bagian>

                <Bagian judul="Jenis pengajuan">
                  <Controller
                    control={control}
                    name="jenis"
                    render={({ field: f }) => (
                      <div className="grid gap-3 sm:grid-cols-3">
                        {[
                          { v: "BARU", t: "Baru", d: "Belum pernah punya KTA" },
                          { v: "PERPANJANGAN", t: "Perpanjangan", d: "KTA akan/sudah habis" },
                          { v: "PENGGANTIAN", t: "Penggantian", d: "KTA hilang / rusak" },
                        ].map((o) => (
                          <button
                            key={o.v}
                            type="button"
                            onClick={() => f.onChange(o.v)}
                            className={cn(
                              "rounded-xl border-2 px-4 py-3 text-left transition-all hover:border-primary/50",
                              f.value === o.v ? "border-primary bg-accent/60" : "border-border",
                            )}
                          >
                            <span className="block text-[15px] font-semibold">{o.t}</span>
                            <span className="block text-sm text-muted-foreground">{o.d}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  />
                </Bagian>

                <div className="grid gap-5 md:grid-cols-2">
                  <Isian label="NIK (16 digit)" galat={field("nik")}>
                    <div className="flex gap-2">
                      <Input
                        {...register("nik")}
                        inputMode="numeric"
                        maxLength={16}
                        placeholder="3273xxxxxxxxxxxx"
                        className="h-11 font-mono text-[15px] tracking-wider"
                        aria-invalid={!!field("nik")}
                      />
                      <Button type="button" variant="outline" className="h-11" onClick={onCekNik} disabled={cekNikLoading || nik?.length !== 16}>
                        {cekNikLoading ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />} Cek
                      </Button>
                    </div>
                  </Isian>
                  <Isian label="Nama lengkap (sesuai KTP)" galat={field("nama")}>
                    <Input {...register("nama")} className="h-11 text-[15px]" aria-invalid={!!field("nama")} />
                  </Isian>
                </div>
              </>
            )}

            {/* 2. Biodata */}
            {step === 1 && (
              <>
                <div className="grid gap-5 md:grid-cols-2">
                  <Isian label="Tempat lahir">
                    <Input {...register("tempatLahir")} className="h-11 text-[15px]" />
                  </Isian>
                  <Isian label="Tanggal lahir" galat={field("tglLahir")}>
                    <Input type="date" {...register("tglLahir")} className="h-11 text-[15px]" />
                  </Isian>
                  <Isian label="Jenis kelamin">
                    <Controller
                      control={control}
                      name="jenisKelamin"
                      render={({ field: f }) => (
                        <div className="grid grid-cols-2 gap-3">
                          {[
                            ["L", "Laki-laki"],
                            ["P", "Perempuan"],
                          ].map(([v, t]) => (
                            <button
                              key={v}
                              type="button"
                              onClick={() => f.onChange(v)}
                              className={cn(
                                "h-11 rounded-lg border-2 text-[15px] font-medium transition-all",
                                f.value === v ? "border-primary bg-accent/60" : "border-border hover:border-primary/50",
                              )}
                            >
                              {t}
                            </button>
                          ))}
                        </div>
                      )}
                    />
                  </Isian>
                  <Isian label="Pendidikan terakhir">
                    <Controller
                      control={control}
                      name="pendidikan"
                      render={({ field: f }) => (
                        <Select value={f.value ?? ""} onValueChange={f.onChange}>
                          <SelectTrigger className="h-11 w-full text-[15px]">
                            <SelectValue placeholder="Pilih pendidikan" />
                          </SelectTrigger>
                          <SelectContent>
                            {PENDIDIKAN.map((p) => (
                              <SelectItem key={p} value={p} className="text-[15px]">
                                {p}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </Isian>
                  <Isian label="Nomor HP" galat={field("noHp")}>
                    <Input {...register("noHp")} inputMode="tel" placeholder="081234567890" className="h-11 text-[15px]" />
                  </Isian>
                  <Isian label="Tinggi badan (cm)" galat={field("tinggiBadan")} opsional>
                    <Input {...register("tinggiBadan")} inputMode="numeric" className="h-11 text-[15px]" />
                  </Isian>
                </div>

                <Bagian judul="Alamat sesuai KTP" ket="6 digit awal NIK akan dicocokkan dengan kecamatan yang dipilih.">
                  <WilayahSelect
                    value={{ provinsi, kabupaten, kecamatan, kodeDesa }}
                    onChange={(v) => {
                      setValue("provinsi", v.provinsi ?? "")
                      setValue("kabupaten", v.kabupaten ?? "")
                      setValue("kecamatan", v.kecamatan ?? "")
                      setValue("kodeDesa", v.kodeDesa ?? "", { shouldDirty: true })
                    }}
                  />
                  <Isian label="Jalan, nomor rumah, RT/RW">
                    <Textarea {...register("alamat")} rows={3} className="text-[15px]" />
                  </Isian>
                </Bagian>
              </>
            )}

            {/* 3. Perusahaan & profesi */}
            {step === 2 && (
              <>
                <Isian label={profesi === "SATPAM" ? "BUJP / perusahaan tempat bertugas" : "PJPU tempat bertugas"}>
                  <Controller
                    control={control}
                    name="perusahaanId"
                    render={({ field: f }) => (
                      <Select value={f.value ? String(f.value) : ""} onValueChange={f.onChange}>
                        <SelectTrigger className="h-11 w-full text-[15px]">
                          <SelectValue placeholder="Pilih perusahaan" />
                        </SelectTrigger>
                        <SelectContent>
                          {perusahaanProfesi.length === 0 && (
                            <p className="p-3 text-sm text-muted-foreground">Belum ada perusahaan terdaftar di Polda ini.</p>
                          )}
                          {perusahaanProfesi.map((p) => (
                            <SelectItem key={p.id} value={String(p.id)} className="text-[15px]">
                              {p.nama}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </Isian>

                {profesi === "SATPAM" ? (
                  <div className="grid gap-5 md:grid-cols-2">
                    <Isian label="Jenjang pelatihan Gada">
                      <Controller
                        control={control}
                        name="jenjangGada"
                        render={({ field: f }) => (
                          <div className="grid grid-cols-3 gap-2">
                            {(["PRATAMA", "MADYA", "UTAMA"] as const).map((g) => (
                              <button
                                key={g}
                                type="button"
                                onClick={() => f.onChange(g)}
                                className={cn(
                                  "h-11 rounded-lg border-2 text-[15px] font-medium capitalize transition-all",
                                  f.value === g ? "border-primary bg-accent/60" : "border-border hover:border-primary/50",
                                )}
                              >
                                {g.toLowerCase()}
                              </button>
                            ))}
                          </div>
                        )}
                      />
                    </Isian>
                    <Isian label="Nomor sertifikat Gada">
                      <Input {...register("noSertifikatGada")} className="h-11 text-[15px]" />
                    </Isian>
                  </div>
                ) : (
                  <div className="grid gap-5 md:grid-cols-2">
                    <Isian label="Nomor sertifikat profesi penagihan (SPPI)">
                      <Input {...register("noSppi")} className="h-11 text-[15px]" />
                    </Isian>
                    <Isian label="SPPI berlaku sampai" galat={field("sppiBerlakuSd")}>
                      <Input type="date" {...register("sppiBerlakuSd")} className="h-11 text-[15px]" />
                    </Isian>
                    <Isian label="Wilayah operasi penagihan" opsional className="md:col-span-2">
                      <Input {...register("wilayahOperasi")} placeholder="mis. Kota Bandung & Kab. Bandung" className="h-11 text-[15px]" />
                    </Isian>
                  </div>
                )}
              </>
            )}

            {/* 4. Dokumen */}
            {step === 3 && (
              <div className="space-y-4">
                {dokumenProfesi.map((j) => {
                  const wajib = j.wajib && (!j.wajibUntuk?.length || j.wajibUntuk.includes(jenis))
                  const key = String(j.id)
                  return (
                    <div key={j.id} className="rounded-2xl border p-5">
                      <div className="mb-4 flex flex-wrap items-center gap-2">
                        <p className="text-[17px] font-semibold">{j.nama}</p>
                        <span
                          className={cn(
                            "rounded-full px-2.5 py-0.5 text-sm font-medium",
                            wajib ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground",
                          )}
                        >
                          {wajib ? "Wajib" : "Opsional"}
                        </span>
                        {j.adaMasaBerlaku && <span className="rounded-full bg-info/10 px-2.5 py-0.5 text-sm font-medium text-info">Ada masa berlaku</span>}
                      </div>
                      <div className="grid gap-4 lg:grid-cols-2">
                        <Controller
                          control={control}
                          name={`dokumen.${key}.fileKey`}
                          render={({ field: f }) => <FileField value={f.value} onChange={f.onChange} />}
                        />
                        <div className={cn("grid gap-3", j.adaMasaBerlaku ? "sm:grid-cols-3" : "sm:grid-cols-2")}>
                          <Isian label="Nomor dokumen" kecil>
                            <Input {...register(`dokumen.${key}.nomor`)} className="h-11 text-[15px]" />
                          </Isian>
                          <Isian label="Tanggal terbit" kecil opsional>
                            <Input type="date" {...register(`dokumen.${key}.tglTerbit`)} className="h-11 text-[15px]" />
                          </Isian>
                          {j.adaMasaBerlaku && (
                            <Isian label="Berlaku sampai" kecil>
                              <Input type="date" {...register(`dokumen.${key}.berlakuSd`)} className="h-11 text-[15px]" />
                            </Isian>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* 5. Biometrik */}
            {step === 4 && (
              <div className="grid gap-5 lg:grid-cols-3">
                <PanelBio judul="Foto wajah" ket="Standar pas foto, rasio 3:4" icon={Camera}>
                  <Controller control={control} name="fotoKey" render={({ field: f }) => <CameraCapture value={f.value} onChange={f.onChange} />} />
                </PanelBio>
                <PanelBio judul="Sidik jari" ket="Hasil scan dari fingerprint scanner" icon={Fingerprint}>
                  <Controller
                    control={control}
                    name="sidikJariKey"
                    render={({ field: f }) => <FileField value={f.value} onChange={f.onChange} accept="image/png,image/jpeg,image/webp" />}
                  />
                  <p className="mt-3 text-sm text-muted-foreground">
                    Integrasi langsung dengan alat fingerprint menyusul; sementara unggah gambar hasil scan.
                  </p>
                </PanelBio>
                <PanelBio judul="Tanda tangan" ket="Tanda tangan di area putih" icon={PenLine}>
                  <Controller control={control} name="ttdKey" render={({ field: f }) => <SignatureField value={f.value} onChange={f.onChange} />} />
                </PanelBio>
              </div>
            )}

            {/* 6. Ringkasan */}
            {step === 5 && <Ringkasan periksa={periksa} onUlang={periksaUlang} />}
          </div>

          <div className="flex flex-wrap items-center gap-3 border-t bg-muted/30 px-6 py-4 md:px-8">
            <Button type="button" variant="outline" size="lg" className="h-11 text-[15px]" disabled={step === 0} onClick={() => ke(step - 1)}>
              <ArrowLeft className="size-4" /> Kembali
            </Button>
            <div className="ml-auto">
              {step < LANGKAH.length - 1 ? (
                <Button type="button" size="lg" className="h-11 px-6 text-[15px]" onClick={() => ke(step + 1)}>
                  Lanjut <ArrowRight className="size-4" />
                </Button>
              ) : (
                <Button
                  type="button"
                  size="lg"
                  className="h-11 px-6 text-[15px]"
                  disabled={menyimpan || !periksa?.ok || !periksa.data.lolos}
                  onClick={simpan}
                >
                  {menyimpan ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                  Simpan & terbitkan KTA
                </Button>
              )}
            </div>
          </div>
        </Card>
      </form>
    </div>
  )
}

function Ringkasan({ periksa, onUlang }: { periksa: HasilPeriksa | null; onUlang: () => void }) {
  if (!periksa) {
    return (
      <div className="flex items-center gap-3 py-10 text-[15px] text-muted-foreground">
        <Loader2 className="size-5 animate-spin" /> Memeriksa persyaratan...
      </div>
    )
  }
  if (!periksa.ok) {
    return (
      <Alert variant="destructive">
        <CircleAlert />
        <AlertTitle>Gagal memeriksa</AlertTitle>
        <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
          <span>{periksa.error}</span>
          <Button type="button" variant="outline" size="sm" onClick={onUlang}>
            <RefreshCw className="size-4" /> Periksa ulang
          </Button>
        </AlertDescription>
      </Alert>
    )
  }
  const { lolos, hasil, kekurangan } = periksa.data
  return (
    <div className="space-y-6">
      <div
        className={cn(
          "flex items-start gap-4 rounded-2xl border p-5",
          lolos ? "border-success/40 bg-success/10" : "border-warning/50 bg-warning/10",
        )}
      >
        {lolos ? <CircleCheck className="size-8 shrink-0 text-success" /> : <CircleAlert className="size-8 shrink-0 text-warning" />}
        <div>
          <p className="text-lg font-semibold">{lolos ? "Semua persyaratan terpenuhi" : `${kekurangan.length} kekurangan ditemukan`}</p>
          <p className="text-[15px] text-muted-foreground">
            {lolos
              ? "Saat disimpan, pengajuan terverifikasi otomatis dan KTA langsung diterbitkan."
              : "Data belum bisa disimpan. Kembali ke langkah terkait untuk melengkapinya."}
          </p>
        </div>
      </div>
      <ul className="divide-y rounded-2xl border">
        {hasil.map((h) => (
          <li key={h.kode} className="flex gap-4 px-5 py-4">
            {h.kekurangan.length === 0 ? (
              <CircleCheck className="mt-0.5 size-6 shrink-0 text-success" />
            ) : (
              <CircleAlert className="mt-0.5 size-6 shrink-0 text-warning" />
            )}
            <div>
              <p className="text-[16px] font-semibold">{h.nama}</p>
              {h.kekurangan.length > 0 && (
                <ul className="mt-1 list-disc space-y-0.5 pl-5 text-[15px] text-muted-foreground">
                  {h.kekurangan.map((k) => (
                    <li key={k}>{k}</li>
                  ))}
                </ul>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

function Bagian({ judul, ket, children }: { judul: string; ket?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">{judul}</h3>
        {ket && <p className="text-[15px] text-muted-foreground">{ket}</p>}
      </div>
      {children}
    </section>
  )
}

function Isian({
  label,
  galat,
  opsional,
  kecil,
  className,
  children,
}: {
  label: string
  galat?: string
  opsional?: boolean
  kecil?: boolean
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={cn("space-y-2", className)}>
      <Label className={kecil ? "text-sm" : "text-[15px]"}>
        {label}
        {opsional && <span className="font-normal text-muted-foreground"> (opsional)</span>}
      </Label>
      {children}
      <Galat pesan={galat} />
    </div>
  )
}

function Galat({ pesan }: { pesan?: string }) {
  return pesan ? <p className="text-sm text-destructive">{pesan}</p> : null
}

function PanelBio({ judul, ket, icon: Icon, children }: { judul: string; ket: string; icon: typeof Camera; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border p-5">
      <div className="mb-5 flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="size-5" />
        </span>
        <div>
          <p className="text-[17px] font-semibold">{judul}</p>
          <p className="text-sm text-muted-foreground">{ket}</p>
        </div>
      </div>
      {children}
    </div>
  )
}
