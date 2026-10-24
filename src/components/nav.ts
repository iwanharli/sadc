import {
  Ban,
  Bell,
  Building2,
  FileChartColumn,
  FileText,
  LayoutDashboard,
  MapPinned,
  Printer,
  ScrollText,
  ShieldX,
  UserCog,
  UserPlus,
  Users,
  type LucideIcon,
} from "lucide-react"

export type NavItem = { href: string; label: string; icon: LucideIcon }
export type NavGroup = { label: string; items: NavItem[] }

export const operatorNav: NavGroup[] = [
  {
    label: "Beranda",
    items: [
      { href: "/operator", label: "Ringkasan", icon: LayoutDashboard },
      { href: "/operator/notifikasi", label: "Notifikasi", icon: Bell },
    ],
  },
  {
    label: "Pendataan",
    items: [
      { href: "/operator/pemohon/baru", label: "Pendataan Baru", icon: UserPlus },
      { href: "/operator/pemohon", label: "Daftar Pemohon", icon: Users },
      { href: "/operator/cetak", label: "Antrean Cetak", icon: Printer },
    ],
  },
  {
    label: "Pengawasan",
    items: [{ href: "/operator/sanksi", label: "Bekukan & Cabut KTA", icon: Ban }],
  },
]

export const adminNav: NavGroup[] = [
  {
    label: "Beranda",
    items: [
      { href: "/admin", label: "Ringkasan", icon: LayoutDashboard },
      { href: "/admin/notifikasi", label: "Notifikasi", icon: Bell },
    ],
  },
  {
    label: "Data",
    items: [
      { href: "/admin/pemohon", label: "Direktori Pemohon", icon: Users },
      { href: "/admin/perusahaan", label: "Perusahaan", icon: Building2 },
      { href: "/admin/laporan", label: "Laporan", icon: FileChartColumn },
    ],
  },
  {
    label: "Pengawasan",
    items: [
      { href: "/admin/sanksi", label: "Bekukan & Cabut KTA", icon: Ban },
      { href: "/admin/blacklist", label: "Blacklist NIK", icon: ShieldX },
    ],
  },
  {
    label: "Administrasi",
    items: [
      { href: "/admin/master/dokumen", label: "Persyaratan Dokumen", icon: FileText },
      { href: "/admin/master/wilayah", label: "Polda & Polres", icon: MapPinned },
      { href: "/admin/pengguna", label: "Pengguna", icon: UserCog },
      { href: "/admin/audit", label: "Audit Log", icon: ScrollText },
    ],
  },
]

/** Cari grup & label untuk breadcrumb berdasarkan path. */
export function findCrumb(groups: NavGroup[], pathname: string) {
  let best: { group: string; label: string; len: number } | null = null
  for (const g of groups) {
    for (const item of g.items) {
      // menu beranda (/operator, /admin) hanya cocok persis, bukan sebagai awalan
      const beranda = item.href.split("/").length === 2
      const match = pathname === item.href || (!beranda && pathname.startsWith(item.href + "/"))
      if (match && (!best || item.href.length > best.len)) {
        best = { group: g.label, label: item.label, len: item.href.length }
      }
    }
  }
  if (!best && pathname.endsWith("/profil")) return { group: "Akun", label: "Profil saya", len: 0 }
  return best
}
