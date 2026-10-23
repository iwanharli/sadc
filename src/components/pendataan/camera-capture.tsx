"use client"

import { Camera, Loader2, RefreshCw, Upload } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { fileUrl, unggah } from "./upload"

/** Rekam foto wajah lewat webcam (rasio 3:4) atau unggah file. */
export function CameraCapture({ value, onChange }: { value?: string; onChange: (key: string | undefined) => void }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const video = useRef<HTMLVideoElement>(null)
  const stream = useRef<MediaStream | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    setError(null)
    navigator.mediaDevices
      ?.getUserMedia({ video: { width: 1280, height: 960, facingMode: "user" } })
      .then((s) => {
        stream.current = s
        if (video.current) video.current.srcObject = s
      })
      .catch(() => setError("Kamera tidak dapat diakses. Izinkan akses kamera atau unggah foto."))
    return () => {
      stream.current?.getTracks().forEach((t) => t.stop())
      stream.current = null
    }
  }, [open])

  async function simpan(blob: Blob, nama: string) {
    setLoading(true)
    try {
      onChange(await unggah(blob, nama))
      setOpen(false)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menyimpan foto")
    } finally {
      setLoading(false)
    }
  }

  function ambil() {
    const v = video.current
    if (!v || !v.videoWidth) return
    // potong tengah ke rasio 3:4 (pas foto)
    const h = v.videoHeight
    const w = Math.round((h * 3) / 4)
    const c = document.createElement("canvas")
    c.width = 600
    c.height = 800
    c.getContext("2d")!.drawImage(v, (v.videoWidth - w) / 2, 0, w, h, 0, 0, 600, 800)
    c.toBlob((b) => b && simpan(b, "foto.jpg"), "image/jpeg", 0.9)
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex aspect-[3/4] w-48 items-center justify-center overflow-hidden rounded-xl border-2 border-dashed bg-muted/40">
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={fileUrl(value)} alt="Foto wajah" className="size-full object-cover" />
        ) : (
          <Camera className="size-10 text-muted-foreground" />
        )}
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        <Button type="button" onClick={() => setOpen(true)}>
          {value ? <RefreshCw className="size-4" /> : <Camera className="size-4" />} {value ? "Foto ulang" : "Ambil foto"}
        </Button>
        <Button type="button" variant="outline" onClick={() => fileInput.current?.click()}>
          <Upload className="size-4" /> Unggah
        </Button>
      </div>
      <input
        ref={fileInput}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && simpan(e.target.files[0], e.target.files[0].name)}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl">Ambil foto wajah</DialogTitle>
            <DialogDescription className="text-[15px]">
              Wajah menghadap kamera, latar polos, tanpa kacamata gelap/penutup kepala.
            </DialogDescription>
          </DialogHeader>
          <div className="relative mx-auto aspect-[3/4] w-full max-w-xs overflow-hidden rounded-xl bg-black">
            {error ? (
              <p className="flex h-full items-center justify-center p-6 text-center text-sm text-white">{error}</p>
            ) : (
              <>
                <video ref={video} autoPlay playsInline muted className="size-full -scale-x-100 object-cover" />
                {/* panduan posisi wajah */}
                <div className="pointer-events-none absolute inset-x-[18%] top-[14%] bottom-[22%] rounded-[50%] border-2 border-dashed border-white/70" />
              </>
            )}
          </div>
          <Button type="button" size="lg" onClick={ambil} disabled={!!error || loading} className="h-11 text-[15px]">
            {loading ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" />} Ambil foto
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  )
}
