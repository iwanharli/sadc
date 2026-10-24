# SADC — Sistem Pendataan Satpam & Debt Collector

Rancangan lengkap: [docs/RANCANGAN.md](docs/RANCANGAN.md)

## Menjalankan

Prasyarat: Node.js 20+ dan PostgreSQL yang sedang berjalan.

```bash
./run.sh            # setup otomatis (npm install, .env, database, migrasi, seed) lalu jalankan dev
```

Perintah lain:

| Perintah | Fungsi |
|---|---|
| `./run.sh dev --port 4000` | Jalankan development di port lain |
| `./run.sh setup` | Hanya setup (tanpa menjalankan server) |
| `./run.sh start` | Build & jalankan mode produksi |
| `./run.sh migrate` / `seed` | Migrasi / isi data awal |
| `./run.sh demo` | Isi data demo pendataan (±2.400 pemohon; jumlah diatur `DEMO_JUMLAH`) |
| `./run.sh wilayah` | Impor kode wilayah Kemendagri & GeoJSON (sumber: `WILAYAH_SOURCE_URL`) |
| `./run.sh reset-db` | Hapus & buat ulang database (minta konfirmasi) |
| `./run.sh studio` | Buka Drizzle Studio |
| `npm run job:kedaluwarsa` | Jalankan manual pemeriksaan KTA kedaluwarsa (otomatis tiap jam via pg-boss) |
| `npm run storage:enkripsi` | Enkripsi file unggahan lama yang belum terenkripsi |
| `./run.sh lint` | Typecheck & lint |
| `./run.sh help` | Bantuan |

Akun demo (seed) — sandi semua akun: `SadcDemo2026` (atur lewat `DEMO_PASSWORD`):

| Username | Role | Wilayah |
|---|---|---|
| admin | ADMIN | Nasional |
| `op.<kode-polda>` (mis. `op.mtrjaya`, `op.jabar`, `op.papua`) | OPERATOR | satu akun per Polda (34 Polda) |
| op.mtrjaya2 | OPERATOR | Polda Metro Jaya (operator kedua) |

Tombol **"Akun demo · masuk 1 klik"** di halaman login hanya muncul bila `DEMO_LOGIN=true`. **Matikan di produksi.**

## Data wilayah

Kode wilayah Kemendagri (38 provinsi, 514 kab/kota, 7.285 kecamatan, 83.708 desa/kelurahan) dan GeoJSON batas
provinsi & kab/kota diimpor dari database aplikasi **lapor-bhabinkamtibmas** (`WILAYAH_SOURCE_URL`, tabel
`regions` & `villages`). Hasilnya disalin ke tabel `wilayah` dan `public/geo/*.geojson`, sehingga SADC tidak
bergantung pada database tersebut saat berjalan. Setiap Polda dipetakan ke kode provinsi lewat kolom `polda.provinsi_kode`.

## Skrip database

- `npm run db:generate` — buat migrasi dari perubahan `src/server/db/schema.ts`
- `npm run db:migrate` — terapkan migrasi
- `npm run db:seed` — isi Polda, persyaratan dokumen, akun awal
- `npm run db:studio` — Drizzle Studio

## Struktur

```
src/
  app/
    login/        halaman login
    operator/     area Operator
    admin/        area Admin
    api/auth/     endpoint Better Auth
  components/     sidebar, header, tema, kartu statistik (ui/ = shadcn)
  lib/swal.ts     SweetAlert2 bertema (confirmDialog, successDialog, errorDialog)
  server/
    db/           skema Drizzle & koneksi
    auth.ts       konfigurasi Better Auth + requireUser()
    queries.ts    query rekap
scripts/seed.ts
drizzle/          file migrasi
```

## Deploy

Deploy ke server produksi (https://sadc.kecup.in) dari komputer lokal:

```bash
./deploy.sh            # push ke GitHub, lalu update server (build terpisah + cek kesehatan + rollback otomatis bila gagal)
./deploy.sh status     # status pm2 & cek situs
./deploy.sh logs       # log aplikasi
./deploy.sh rollback   # kembali ke build sebelumnya
```

Autentikasi memakai SSH key. Tanpa key, berikan sandi sekali jalan: `SSHPASS='...' ./deploy.sh` (butuh `sshpass`). Tujuan (host, folder, nama pm2) bisa diubah lewat file `.deploy.env` (tidak masuk git).
