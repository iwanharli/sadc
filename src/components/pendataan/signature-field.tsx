"use client"

import { Check, Eraser, Loader2, PenLine, RefreshCw } from "lucide-react"
import SignaturePad from "signature_pad"
import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { fileUrl, unggah } from "./upload"

/** Tanda tangan digital di kanvas (mouse, stylus, atau signature pad USB yang berperilaku sebagai pointer). */
export function SignatureField({ value, onChange }: { value?: string; onChange: (key: string | undefined) => void }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const pad = useRef<SignaturePad | null>(null)
  const [editing, setEditing] = useState(!value)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!editing || !canvas.current) return
    const c = canvas.current
    const ratio = Math.max(window.devicePixelRatio || 1, 1)
    c.width = c.offsetWidth * ratio
    c.height = c.offsetHeight * ratio
    c.getContext("2d")!.scale(ratio, ratio)
    pad.current = new SignaturePad(c, { penColor: "#0b1f3a", backgroundColor: "rgb(255,255,255)", minWidth: 1, maxWidth: 2.6 })
    return () => pad.current?.off()
  }, [editing])

  async function simpan() {
    if (!pad.current || pad.current.isEmpty()) {
      toast.error("Tanda tangan masih kosong")
      return
    }
    setLoading(true)
    try {
      // toBlob langsung dari kanvas (fetch ke data: URL diblokir CSP connect-src)
      const blob = await new Promise<Blob>((ok, gagal) =>
        canvas.current!.toBlob((b) => (b ? ok(b) : gagal(new Error("Gagal membaca tanda tangan"))), "image/png"),
      )
      onChange(await unggah(blob, "ttd.png"))
      setEditing(false)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menyimpan tanda tangan")
    } finally {
      setLoading(false)
    }
  }

  if (!editing && value) {
    return (
      <div className="flex flex-col items-center gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={fileUrl(value)} alt="Tanda tangan" className="h-40 w-full max-w-md rounded-xl border bg-white object-contain" />
        <Button type="button" variant="outline" onClick={() => setEditing(true)}>
          <RefreshCw className="size-4" /> Ulangi tanda tangan
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative w-full max-w-md">
        <canvas ref={canvas} className="h-40 w-full touch-none rounded-xl border-2 border-dashed bg-white" />
        <PenLine className="pointer-events-none absolute right-3 bottom-3 size-5 text-slate-300" />
      </div>
      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={() => pad.current?.clear()}>
          <Eraser className="size-4" /> Bersihkan
        </Button>
        <Button type="button" onClick={simpan} disabled={loading}>
          {loading ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />} Simpan tanda tangan
        </Button>
      </div>
    </div>
  )
}
