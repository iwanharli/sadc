import { HalamanProfil } from "@/components/profil/halaman-profil"
import { requireUser } from "@/server/auth"
import { getZona } from "@/server/zona"

export default async function ProfilPage() {
  const user = await requireUser("ADMIN")
  return <HalamanProfil userId={user.id} tz={await getZona()} />
}
