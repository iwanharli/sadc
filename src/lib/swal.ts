"use client"

import Swal, { type SweetAlertOptions } from "sweetalert2"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

/** SweetAlert2 yang mengikuti token tema (terang/gelap) dan gaya tombol shadcn. */
export const swal = Swal.mixin({
  buttonsStyling: false,
  reverseButtons: true,
  customClass: {
    popup: "sadc-swal",
    confirmButton: cn(buttonVariants({ size: "lg" }), "min-w-28"),
    cancelButton: cn(buttonVariants({ variant: "outline", size: "lg" }), "min-w-28"),
    denyButton: cn(buttonVariants({ variant: "destructive", size: "lg" }), "min-w-28"),
  },
})

type ConfirmOptions = Pick<SweetAlertOptions, "title" | "text" | "html" | "icon"> & {
  confirmText?: string
  cancelText?: string
  danger?: boolean
}

/** Dialog konfirmasi; resolve true bila pengguna menyetujui. */
export async function confirmDialog({ confirmText = "Ya, lanjutkan", cancelText = "Batal", danger, ...opts }: ConfirmOptions) {
  const res = await swal.fire({
    icon: danger ? "warning" : "question",
    showCancelButton: true,
    confirmButtonText: confirmText,
    cancelButtonText: cancelText,
    customClass: danger
      ? {
          popup: "sadc-swal",
          confirmButton: cn(buttonVariants({ size: "lg" }), "min-w-28 bg-destructive text-white hover:bg-destructive/90"),
          cancelButton: cn(buttonVariants({ variant: "outline", size: "lg" }), "min-w-28"),
        }
      : undefined,
    ...opts,
  })
  return res.isConfirmed
}

export function successDialog(title: string, text?: string) {
  return swal.fire({ icon: "success", title, text, timer: 1800, showConfirmButton: false })
}

export function errorDialog(title: string, text?: string) {
  return swal.fire({ icon: "error", title, text, confirmButtonText: "Tutup" })
}
