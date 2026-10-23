"use client"

import { FileText, Loader2, RefreshCw, Trash2, Upload } from "lucide-react"
import { useRef, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { fileUrl, isPdf, unggah } from "./upload"

/** Kotak unggah dokumen (PDF/gambar, maks 5 MB) dengan pratinjau. */
export function FileField({
  value,
  onChange,
  accept = "application/pdf,image/jpeg,image/png,image/webp",
  invalid,
}: {
  value?: string
  onChange: (key: string | undefined) => void
  accept?: string
  invalid?: boolean
}) {
  const input = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)

  async function pilih(file?: File) {
    if (!file) return
    setLoading(true)
    try {
      onChange(await unggah(file, file.name))
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal mengunggah")
    } finally {
      setLoading(false)
      if (input.current) input.current.value = ""
    }
  }

  return (
    <div>
      <input ref={input} type="file" accept={accept} className="hidden" onChange={(e) => pilih(e.target.files?.[0])} />
      {value ? (
        <div className="flex items-center gap-3 rounded-xl border bg-muted/30 p-3">
          <a href={fileUrl(value)} target="_blank" rel="noreferrer" className="shrink-0">
            {isPdf(value) ? (
              <div className="flex size-14 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
                <FileText className="size-7" />
              </div>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={fileUrl(value)} alt="Pratinjau" className="size-14 rounded-lg object-cover" />
            )}
          </a>
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-medium text-success">Terunggah</p>
            <a href={fileUrl(value)} target="_blank" rel="noreferrer" className="text-sm text-primary hover:underline">
              Lihat file
            </a>
          </div>
          <Button type="button" variant="ghost" size="icon" onClick={() => input.current?.click()} aria-label="Ganti file">
            {loading ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
          </Button>
          <Button type="button" variant="ghost" size="icon" onClick={() => onChange(undefined)} aria-label="Hapus file">
            <Trash2 className="size-4 text-destructive" />
          </Button>
        </div>
      ) : (
        <button
          type="button"
          disabled={loading}
          onClick={() => input.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault()
            pilih(e.dataTransfer.files?.[0])
          }}
          className={cn(
            "flex w-full items-center gap-4 rounded-xl border-2 border-dashed p-4 text-left transition-colors hover:border-primary/60 hover:bg-accent/40",
            invalid && "border-destructive/50",
          )}
        >
          <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            {loading ? <Loader2 className="size-6 animate-spin" /> : <Upload className="size-6" />}
          </div>
          <div>
            <p className="text-[15px] font-medium">{loading ? "Mengunggah..." : "Klik atau tarik file ke sini"}</p>
            <p className="text-sm text-muted-foreground">PDF, JPG, PNG, atau WEBP · maks 5 MB</p>
          </div>
        </button>
      )}
    </div>
  )
}
