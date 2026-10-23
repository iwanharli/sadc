import { ComingSoon } from "@/components/coming-soon"

export default async function Page({ params }: { params: Promise<{ slug: string[] }> }) {
  return <ComingSoon slug={(await params).slug} />
}
