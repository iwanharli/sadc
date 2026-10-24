import { Label } from "@/components/ui/label"

export function Field({ label, galat, children }: { label: string; galat?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label className="text-[15px]">{label}</Label>
      {children}
      {galat && <p className="text-sm text-destructive">{galat}</p>}
    </div>
  )
}

export function Cek({
  checked,
  onChange,
  label,
  ket,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
  ket?: string
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition-colors hover:bg-accent/40 has-[:checked]:border-primary/50 has-[:checked]:bg-accent/40">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-1 size-4 accent-[var(--primary)]" />
      <span>
        <span className="block text-[15px] font-medium">{label}</span>
        {ket && <span className="block text-sm text-muted-foreground">{ket}</span>}
      </span>
    </label>
  )
}
