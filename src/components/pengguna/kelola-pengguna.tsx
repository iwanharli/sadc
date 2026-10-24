"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { KeyRound, Loader2, Pencil, Power, Search, UserPlus } from "lucide-react"
import { useRouter } from "next/navigation"
import { useMemo, useState } from "react"
import { Controller, useForm, useWatch } from "react-hook-form"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { penggunaSchema, type PenggunaInput } from "@/lib/pengguna-schema"
import { toast } from "sonner"
import { confirmDialog, swal } from "@/lib/swal"
import { cn } from "@/lib/utils"
import { buatPengguna, resetSandi, setAktifPengguna, ubahPengguna } from "@/server/actions/pengguna"

export type Pengguna = {
  id: string
  name: string
  username: string | null
  role: "OPERATOR" | "ADMIN"
  poldaId: number | null
  polda: string | null
  aktif: boolean
  terakhirMasuk: string | null
}
type Polda = { id: number; nama: string }

export function KelolaPengguna({ users, polda, selfId }: { users: Pengguna[]; polda: Polda[]; selfId: string }) {
  const router = useRouter()
  const [q, setQ] = useState("")
  const [role, setRole] = useState<"" | "OPERATOR" | "ADMIN">("")
  const [form, setForm] = useState<Pengguna | "baru" | null>(null)

  const tampil = useMemo(() => {
    const k = q.trim().toLowerCase()
    return users.filter(
      (u) =>
        (!role || u.role === role) &&
        (!k || u.name.toLowerCase().includes(k) || u.username?.includes(k) || u.polda?.toLowerCase().includes(k)),
    )
  }, [users, q, role])

  async function toggleAktif(u: Pengguna) {
    const ok = await confirmDialog({
      title: u.aktif ? `Nonaktifkan ${u.name}?` : `Aktifkan ${u.name}?`,
      text: u.aktif ? "Pengguna langsung keluar dari semua perangkat dan tidak bisa masuk." : "Pengguna bisa masuk kembali.",
      confirmText: u.aktif ? "Nonaktifkan" : "Aktifkan",
      danger: u.aktif,
    })
    if (!ok) return
    const r = await setAktifPengguna(u.id, !u.aktif)
    if (!r.ok) return swal.fire({ icon: "error", title: "Gagal", text: r.error })
    router.refresh()
  }

  async function reset(u: Pengguna) {
    const res = await swal.fire({
      title: `Reset sandi ${u.name}`,
      text: "Masukkan sandi baru (minimal 8 karakter). Pengguna akan keluar dari semua perangkat.",
      input: "password",
      inputPlaceholder: "Sandi baru",
      showCancelButton: true,
      confirmButtonText: "Simpan sandi",
      cancelButtonText: "Batal",
      inputValidator: (v) => (!v || v.length < 8 ? "Sandi minimal 8 karakter" : undefined),
    })
    if (!res.isConfirmed) return
    const r = await resetSandi(u.id, res.value)
    if (!r.ok) return swal.fire({ icon: "error", title: "Gagal", text: r.error })
    swal.fire({ icon: "success", title: "Sandi diperbarui", timer: 1600, showConfirmButton: false })
  }

  return (
    <Card className="gap-0 overflow-hidden p-0">
      <div className="flex flex-wrap items-center gap-3 border-b px-6 py-4">
        <div className="relative min-w-64 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari nama, username, atau Polda..." className="h-11 pl-10 text-[15px]" />
        </div>
        <div className="inline-flex rounded-xl border bg-background p-1">
          {[
            ["", "Semua"],
            ["OPERATOR", "Operator"],
            ["ADMIN", "Admin"],
          ].map(([v, t]) => (
            <button
              key={v}
              onClick={() => setRole(v as typeof role)}
              className={cn(
                "rounded-lg px-3.5 py-1.5 text-[15px] font-medium",
                role === v ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t}
            </button>
          ))}
        </div>
        <Button className="h-11 px-5 text-[15px]" onClick={() => setForm("baru")}>
          <UserPlus className="size-5" /> Tambah pengguna
        </Button>
      </div>

      <Table className="text-[15px]">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="h-12 pl-6 text-sm font-semibold uppercase tracking-wide">Pengguna</TableHead>
            <TableHead className="h-12 text-sm font-semibold uppercase tracking-wide">Role</TableHead>
            <TableHead className="h-12 text-sm font-semibold uppercase tracking-wide">Wilayah</TableHead>
            <TableHead className="h-12 text-sm font-semibold uppercase tracking-wide">Status</TableHead>
            <TableHead className="h-12 pr-6 text-right text-sm font-semibold uppercase tracking-wide">Aksi</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tampil.map((u) => (
            <TableRow key={u.id} className={cn(!u.aktif && "opacity-60")}>
              <TableCell className="py-4 pl-6">
                <p className="font-semibold">
                  {u.name} {u.id === selfId && <span className="text-sm font-normal text-muted-foreground">(Anda)</span>}
                </p>
                <p className="font-mono text-sm text-muted-foreground">{u.username}</p>
              </TableCell>
              <TableCell>
                <span className={cn("rounded-full px-2.5 py-1 text-sm font-medium", u.role === "ADMIN" ? "bg-primary/12 text-primary" : "bg-warning/15 text-warning")}>
                  {u.role === "ADMIN" ? "Admin" : "Operator"}
                </span>
              </TableCell>
              <TableCell>{u.polda ?? "Nasional"}</TableCell>
              <TableCell>
                <span className={cn("inline-flex items-center gap-2", u.aktif ? "text-success" : "text-muted-foreground")}>
                  <span className={cn("size-2 rounded-full", u.aktif ? "bg-success" : "bg-muted-foreground")} />
                  {u.aktif ? "Aktif" : "Nonaktif"}
                </span>
                {u.terakhirMasuk && <p className="text-sm text-muted-foreground">Masuk {u.terakhirMasuk}</p>}
              </TableCell>
              <TableCell className="pr-6">
                <div className="flex justify-end gap-1">
                  <Button variant="ghost" size="icon" onClick={() => setForm(u)} aria-label="Ubah">
                    <Pencil className="size-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => reset(u)} aria-label="Reset sandi">
                    <KeyRound className="size-4" />
                  </Button>
                  {u.id !== selfId && (
                    <Button variant="ghost" size="icon" onClick={() => toggleAktif(u)} aria-label={u.aktif ? "Nonaktifkan" : "Aktifkan"}>
                      <Power className={cn("size-4", u.aktif ? "text-destructive" : "text-success")} />
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {tampil.length === 0 && <p className="px-6 py-10 text-center text-[15px] text-muted-foreground">Tidak ada pengguna.</p>}

      {form && (
        <FormPengguna
          key={form === "baru" ? "baru" : form.id}
          awal={form === "baru" ? null : form}
          polda={polda}
          onClose={() => setForm(null)}
          onSaved={() => {
            setForm(null)
            router.refresh()
          }}
        />
      )}
    </Card>
  )
}

function FormPengguna({ awal, polda, onClose, onSaved }: { awal: Pengguna | null; polda: Polda[]; onClose: () => void; onSaved: () => void }) {
  const f = useForm<PenggunaInput>({
    resolver: zodResolver(penggunaSchema),
    defaultValues: {
      name: awal?.name ?? "",
      username: awal?.username ?? "",
      role: awal?.role ?? "OPERATOR",
      poldaId: awal?.poldaId ? String(awal.poldaId) : "",
      password: "",
    },
  })
  const role = useWatch({ control: f.control, name: "role" })
  const err = f.formState.errors

  const simpan = f.handleSubmit(async (v) => {
    const r = awal ? await ubahPengguna(awal.id, v) : await buatPengguna(v)
    if (!r.ok) {
      toast.error(r.error)
      return
    }
    onSaved()
    await new Promise((res) => setTimeout(res, 200))
    swal.fire({ icon: "success", title: awal ? "Pengguna diperbarui" : "Pengguna ditambahkan", timer: 1500, showConfirmButton: false })
  })

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl">{awal ? "Ubah pengguna" : "Tambah pengguna"}</DialogTitle>
          <DialogDescription className="text-[15px]">
            {awal ? "Perubahan role/wilayah membuat pengguna harus masuk ulang." : "Akun baru langsung aktif."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={simpan} className="space-y-4">
          <Field label="Nama lengkap & pangkat" galat={err.name?.message}>
            <Input {...f.register("name")} className="h-11 text-[15px]" placeholder="mis. Bripka Andi Saputra" />
          </Field>
          <Field label="Username" galat={err.username?.message}>
            <Input {...f.register("username")} className="h-11 font-mono text-[15px]" placeholder="op.jabar2" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Role">
              <Controller
                control={f.control}
                name="role"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="h-11 w-full text-[15px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="OPERATOR" className="text-[15px]">Operator</SelectItem>
                      <SelectItem value="ADMIN" className="text-[15px]">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
            {role === "OPERATOR" && (
              <Field label="Polda" galat={err.poldaId?.message}>
                <Controller
                  control={f.control}
                  name="poldaId"
                  render={({ field }) => (
                    <Select value={field.value ? String(field.value) : ""} onValueChange={field.onChange}>
                      <SelectTrigger className="h-11 w-full text-[15px]" aria-invalid={!!err.poldaId}>
                        <SelectValue placeholder="Pilih Polda" />
                      </SelectTrigger>
                      <SelectContent className="max-h-72">
                        {polda.map((p) => (
                          <SelectItem key={p.id} value={String(p.id)} className="text-[15px]">
                            {p.nama}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </Field>
            )}
          </div>
          {!awal && (
            <Field label="Sandi awal (min. 8 karakter)" galat={err.password?.message}>
              <Input type="password" {...f.register("password")} className="h-11 text-[15px]" autoComplete="new-password" />
            </Field>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" className="h-11" onClick={onClose}>
              Batal
            </Button>
            <Button type="submit" className="h-11" disabled={f.formState.isSubmitting}>
              {f.formState.isSubmitting && <Loader2 className="size-4 animate-spin" />} Simpan
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function Field({ label, galat, children }: { label: string; galat?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label className="text-[15px]">{label}</Label>
      {children}
      {galat && <p className="text-sm text-destructive">{galat}</p>}
    </div>
  )
}
