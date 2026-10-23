import { Construction } from "lucide-react"
import { EmptyState } from "./empty-state"
import { PageHeader } from "./page-header"

function toTitle(slug: string[]) {
  const last = slug[slug.length - 1] ?? ""
  return last.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
}

/** Halaman sementara untuk menu yang belum dibangun. */
export function ComingSoon({ slug }: { slug: string[] }) {
  return (
    <>
      <PageHeader title={toTitle(slug)} />
      <EmptyState
        icon={Construction}
        title="Halaman sedang dikembangkan"
        description="Fitur ini akan tersedia pada tahap pengembangan berikutnya."
      />
    </>
  )
}
