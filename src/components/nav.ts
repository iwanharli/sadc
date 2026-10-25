import {
  Ban,
  Bell,
  Building2,
  FileChartColumn,
  FileText,
  HandCoins,
  KeyRound,
  LayoutDashboard,
  MapPinned,
  ScrollText,
  ShieldCheck,
  ShieldX,
  UserCog,
  UserPlus,
  type LucideIcon,
} from "lucide-react"

export type NavSub = { href: string; label: string }
export type NavItem = { href: string; label: string; icon: LucideIcon; children?: NavSub[] }
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
      { href: "/operator/satpam", label: "Daftar Satpam", icon: ShieldCheck },
      { href: "/operator/petugas-penagih", label: "Daftar Petugas Penagih", icon: HandCoins },
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
      { href: "/admin/satpam", label: "Daftar Satpam", icon: ShieldCheck },
      { href: "/admin/petugas-penagih", label: "Daftar Petugas Penagih", icon: HandCoins },
      {
        href: "/admin/perusahaan",
        label: "Daftar Perusahaan",
        icon: Building2,
        children: [
          { href: "/admin/perusahaan/bujp", label: "BUJP" },
          { href: "/admin/perusahaan/pjpu", label: "PJPU" },
        ],
      },
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
      { href: "/admin/integrasi", label: "Integrasi API", icon: KeyRound },
      { href: "/admin/audit", label: "Audit Log", icon: ScrollText },
    ],
  },
]

/** Cari grup & label untuk breadcrumb berdasarkan path (submenu: induk › anak). */
export function findCrumb(groups: NavGroup[], pathname: string) {
  let best: { group: string; label: string; len: number } | null = null
  const cocok = (href: string) => {
    // menu beranda (/operator, /admin) hanya cocok persis, bukan sebagai awalan
    const beranda = href.split("/").length === 2
    return pathname === href || (!beranda && pathname.startsWith(href + "/"))
  }
  for (const g of groups) {
    for (const item of g.items) {
      const kandidat = [{ href: item.href, group: g.label, label: item.label }, ...(item.children ?? []).map((c) => ({ href: c.href, group: item.label, label: c.label }))]
      for (const k of kandidat) {
        if (cocok(k.href) && (!best || k.href.length > best.len)) best = { group: k.group, label: k.label, len: k.href.length }
      }
    }
  }
  if (!best && pathname.endsWith("/profil")) return { group: "Akun", label: "Profil saya", len: 0 }
  return best
}
