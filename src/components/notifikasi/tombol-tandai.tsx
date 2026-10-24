"use client"

import { CheckCheck, Loader2 } from "lucide-react"
import { useTransition } from "react"
import { Button } from "@/components/ui/button"
import { tandaiSemuaDibaca } from "@/server/actions/notifikasi"

export function TombolTandaiDibaca() {
  const [pending, start] = useTransition()
  return (
    <Button variant="ghost" className="ml-auto h-10 text-[15px]" disabled={pending} onClick={() => start(() => tandaiSemuaDibaca())}>
      {pending ? <Loader2 className="size-4 animate-spin" /> : <CheckCheck className="size-4" />} Tandai semua dibaca
    </Button>
  )
}
