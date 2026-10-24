# Rancangan Website — Sistem Manajemen Database Satpam & Debt Collector (SADC)

> Status: **diimplementasikan** (lihat §13). Persyaratan dokumen bersifat sementara dan dapat diubah Admin lewat menu Persyaratan Dokumen.

## 1. Ringkasan

Aplikasi web untuk pendataan (enrollment) Satpam dan Debt Collector yang mengajukan **KTA & Sertifikat** dari Polri, dengan rekapitulasi terpusat.

- **Operator** — menginput/mendata pemohon, mengunggah dokumen, merekam foto/sidik jari/tanda tangan, mencetak kartu. Verifikasi berjalan **otomatis** saat semua persyaratan lengkap.
- **Admin** — melihat rekapitulasi seluruh pendataan, mengelola master data dan akun.

## 1a. Cakupan Nasional

Aplikasi dipakai **secara nasional**: satu server pusat (Mabes/Baharkam), diakses Operator dari seluruh Polda.

- **Wilayah:** semua Polda di Indonesia (master data, dapat ditambah Admin bila ada Polda baru); setiap Operator terikat ke satu Polda.
- **Kode wilayah:** kode Kemendagri 4 level (provinsi → desa/kelurahan) disalin dari database lapor-bhabinkamtibmas ke tabel `wilayah`; dipakai untuk alamat pemohon (dropdown bertingkat) dan cek kecocokan 6 digit awal NIK. Setiap Polda dipetakan ke kode provinsi.
- **Peta:** GeoJSON batas provinsi & kab/kota (sudah disederhanakan, ±250 KB & ±1,4 MB) di `public/geo/`.
- **Zona waktu:** setiap Polda menyimpan zona waktunya (WIB/WITA/WIT). Waktu disimpan dalam UTC dan ditampilkan sesuai zona Polda; rekap nasional memakai WIB.
- **Skala data:** diperkirakan ratusan ribu hingga ±1 juta pemohon. Seluruh daftar memakai paginasi & filter di server; kolom yang sering difilter diberi indeks (Polda, status, profesi, tanggal, masa berlaku kartu).
- **Rekap:** dashboard Admin menampilkan rekap per Polda dan peta sebaran nasional; Operator hanya melihat wilayahnya.
- **Infrastruktur:** server pusat + backup/DR, akses lewat jaringan VPN Polri, file dokumen di object storage (MinIO) yang dapat diperbesar.

## 2. Stack Teknologi

| Lapisan | Pilihan |
|---|---|
| Framework | Next.js 15 (App Router) + TypeScript |
| UI | Tailwind CSS v4 + shadcn/ui |
| Form & validasi | React Hook Form + Zod |
| Tabel | TanStack Table |
| Database | PostgreSQL 16+ |
| ORM | Drizzle ORM |
| Auth | Better Auth (self-hosted, session di Postgres) + RBAC |
| Penyimpanan file | MinIO (S3-compatible), privat + signed URL |
| Grafik & peta | Recharts + d3-geo (GeoJSON provinsi; react-simple-maps belum mendukung React 19) |
| PDF | @react-pdf/renderer (kartu CR80 & sertifikat A4) |
| Export | ExcelJS |
| QR | qrcode + token bertanda tangan (jose) + URL verifikasi publik |
| Background job | pg-boss (antrean di Postgres) |
| Deployment | Docker Compose (app + Postgres + MinIO + Nginx), self-hosted di jaringan VPN Polri |
| Kualitas | ESLint, Prettier, Vitest, Playwright |

## 3. Peran & Hak Akses

| Fitur | Operator | Admin |
|---|:-:|:-:|
| Tambah / edit pemohon (status Draf) | ✅ | ❌ |
| Unggah dokumen & rekam biometrik | ✅ | ❌ |
| Verifikasi | Otomatis oleh sistem | Otomatis oleh sistem |
| Cetak KTA & sertifikat (status Terverifikasi) | ✅ | ❌ |
| Lihat data | Wilayah sendiri | Semua |
| Dashboard rekapitulasi & export | Ringkas (wilayah sendiri) | ✅ Nasional |
| Bekukan / cabut / pulihkan KTA | ✅ Wilayah sendiri | ✅ Semua |
| Kelola blacklist NIK | ❌ | ✅ |
| Kelola akun operator, master data | ❌ | ✅ |
| Audit log | ❌ | ✅ |

Operator terikat ke satu **Polda** (opsional Polres).

## 4. Alur Status Pendataan

Pendataan dilakukan **Operator**; verifikasi dilakukan **otomatis oleh sistem** begitu semua persyaratan lengkap. Admin hanya memantau.

```
DRAF (belum lengkap) → TERVERIFIKASI (otomatis) → DICETAK → AKTIF → KEDALUWARSA
AKTIF → DIBEKUKAN ↔ AKTIF
AKTIF → DICABUT
```

Jenis pengajuan: **Baru**, **Perpanjangan**, **Penggantian** (hilang/rusak).

### Aturan verifikasi otomatis

Pengajuan otomatis menjadi **TERVERIFIKASI** saat disimpan jika semua kondisi berikut terpenuhi:

1. Biodata wajib terisi; NIK 16 digit valid, tidak memiliki KTA aktif/dibekukan dengan profesi yang sama, dan **tidak masuk blacklist**.
2. Perusahaan (BUJP / perusahaan pembiayaan) dipilih dan berstatus aktif.
3. Semua dokumen **wajib** sesuai profesi & jenis pengajuan sudah diunggah, dengan nomor dokumen terisi.
4. Dokumen yang memiliki masa berlaku (SKCK, surat sehat, bebas narkoba, SPPI) **belum kedaluwarsa** pada tanggal pengajuan.
5. Biometrik lengkap: foto wajah, sidik jari, tanda tangan.
6. Khusus Satpam: jenjang Gada & nomor sertifikat terisi. Khusus Debt Collector: nomor SPPI terisi & masih berlaku.

Jika ada yang belum terpenuhi, status tetap **DRAF** dan sistem menampilkan checklist kekurangan. Setiap verifikasi otomatis dicatat di `riwayat_status` (oleh: SISTEM) beserta snapshot hasil pengecekan.

Karena keabsahan isi dokumen tidak dicek manusia, Admin dan Operator dapat **membekukan/mencabut** KTA bila belakangan ditemukan dokumen palsu.

### Pembekuan & pencabutan KTA (Admin & Operator)

- **Operator**: hanya untuk KTA di wilayah Polda-nya.
- **Admin**: seluruh KTA nasional, serta mengelola blacklist.

| Aksi | Kapan dipakai | Efek | Bisa dipulihkan |
|---|---|---|---|
| **Bekukan** | Dugaan pemalsuan / sedang diperiksa / pelanggaran ringan | KTA nonaktif sementara; scan QR menampilkan **DIBEKUKAN** | ✅ Admin / Operator wilayahnya dapat mengaktifkan kembali |
| **Cabut** | Pemalsuan terbukti / pelanggaran berat / pidana | KTA nonaktif permanen; scan QR menampilkan **DICABUT** | ❌ |

Aturan:
- Wajib isi **alasan** (pilihan: Dokumen palsu, Data tidak sesuai, Pelanggaran etik, Tindak pidana, Lainnya) + keterangan, dan opsional unggah **bukti** (BAP, laporan, surat).
- Pembekuan dapat diberi **batas waktu**; jika lewat tanpa tindak lanjut, sistem mengingatkan Admin dan Operator wilayah.
- Admin mendapat notifikasi setiap pembekuan/pencabutan oleh Operator.
- Pencabutan karena **dokumen palsu** otomatis menandai NIK pemohon (**blacklist**) selama periode default (diatur Admin), sehingga pengajuan baru dengan NIK tersebut tidak bisa terverifikasi otomatis.
- Dokumen yang terbukti palsu ditandai, dan Admin dapat melihat pengajuan lain yang diinput operator yang sama untuk ditelusuri.
- Operator dan perusahaan terkait melihat status terbaru di detail pemohon.
- Semua aksi tercatat di `sanksi`, `riwayat_status`, dan `audit_log`.

## 5. Persyaratan Dokumen (master data, default)

### Umum (kedua profesi)
| Kode | Dokumen | Wajib | Ada masa berlaku |
|---|---|:-:|:-:|
| KTP | KTP | ✅ | |
| KK | Kartu Keluarga | ✅ | |
| IJAZAH | Ijazah terakhir (min. SMA/SMK) | ✅ | |
| SKCK | SKCK | ✅ | ✅ |
| SEHAT | Surat keterangan sehat jasmani & rohani | ✅ | ✅ |
| NARKOBA | Surat keterangan bebas narkoba | ✅ | ✅ |

### Khusus Satpam
| Kode | Dokumen | Wajib |
|---|---|:-:|
| GADA | Sertifikat Gada Pratama / Madya / Utama | ✅ |
| SK_BUJP | Surat keterangan kerja / penugasan dari BUJP / perusahaan | ✅ |
| KTA_LAMA | KTA lama (perpanjangan/penggantian) | Kondisional |

### Khusus Debt Collector
| Kode | Dokumen | Wajib |
|---|---|:-:|
| SPPI | Sertifikat profesi penagihan (lembaga terdaftar OJK) | ✅ |
| SURAT_TUGAS | Surat tugas / kuasa dari perusahaan pembiayaan | ✅ |
| IZIN_PERUSAHAAN | NIB / izin usaha perusahaan pembiayaan (OJK) | ✅ |
| KTA_LAMA | KTA lama | Kondisional |

## 6. Peta Halaman (Sitemap)

### Publik
- `/login`
- `/verifikasi/[token]` — hasil scan QR: nama, foto, profesi, perusahaan, status & masa berlaku (**tanpa** NIK/alamat)

### Operator (`/operator`)
- `/operator` — beranda: ringkasan pendataan wilayah, daftar Draf yang belum lengkap & antrean cetak
- `/operator/pemohon` — daftar pemohon (filter status, profesi, cari NIK/nama)
- `/operator/pemohon/baru` — wizard pendataan:
  1. Pilih profesi & jenis pengajuan (cek NIK duplikat)
  2. Biodata
  3. Perusahaan & data profesi
  4. Unggah dokumen (checklist sesuai profesi)
  5. Biometrik: foto wajah, sidik jari, tanda tangan
  6. Ringkasan + checklist kelengkapan → simpan (otomatis terverifikasi bila lengkap)
- `/operator/pemohon/[id]` — detail, checklist kekurangan, riwayat status, aksi bekukan/cabut/pulihkan
- `/operator/sanksi` — daftar KTA dibekukan/dicabut di wilayahnya
- `/operator/cetak` — antrean cetak (status Terverifikasi), terbitkan KTA, cetak/cetak ulang KTA & sertifikat (PDF)
- `/operator/notifikasi` — KTA segera kedaluwarsa, draf terbengkalai, antrean cetak tertunda, sanksi
- `/operator/profil` — profil, sesi masuk, aktivitas, ganti sandi

### Admin (`/admin`)
- `/admin` — dashboard rekapitulasi:
  - KPI: total pemohon, aktif, draf (belum lengkap), menunggu cetak, kedaluwarsa ≤30 hari
  - Grafik pendataan harian per profesi (periode 7/30/90 hari) & Polda teratas
  - Peta sebaran per Polda/provinsi (choropleth)
  - Tabel rekap per Polda
- `/admin/pemohon` — direktori nasional, filter lengkap (termasuk Polda), ekspor Excel
- `/admin/pemohon/[id]` — detail + aksi bekukan/cabut/aktifkan (form alasan & bukti)
- `/admin/sanksi` — daftar KTA dibekukan/dicabut, pembekuan yang melewati batas waktu
- `/admin/blacklist` — daftar NIK diblokir, cabut blokir
- `/admin/perusahaan` — master BUJP & perusahaan pembiayaan
- `/admin/master/dokumen` — atur persyaratan dokumen per profesi
- `/admin/pengguna` — kelola akun operator & admin (tambah, ubah, nonaktifkan, reset sandi)
- `/admin/audit` — audit log
- `/admin/notifikasi`, `/admin/profil`
- *(belum)* `/admin/master/wilayah` — Polda / Polres

## 7. Model Data (ringkas)

```
users            id, nama, username, password_hash, role(OPERATOR|ADMIN), polda_id, aktif
polda            id, kode, nama, provinsi
polres           id, polda_id, nama
perusahaan       id, nama, jenis(BUJP|PEMBIAYAAN), nib, no_izin, alamat, polda_id
pemohon          id, nik(unique), nama, tempat_lahir, tgl_lahir, jk, alamat, no_hp,
                 pendidikan, tinggi_badan, foto_url, ttd_url, sidik_jari_ref
pengajuan        id, no_registrasi, pemohon_id, profesi(SATPAM|DEBT_COLLECTOR),
                 jenis(BARU|PERPANJANGAN|PENGGANTIAN), perusahaan_id, polda_id,
                 operator_id, status, kekurangan(json), terverifikasi_at
detail_satpam    pengajuan_id, jenjang_gada, no_sertifikat_gada
detail_dc        pengajuan_id, no_sppi, sppi_berlaku_sd, wilayah_operasi
jenis_dokumen    id, kode, nama, profesi(UMUM|SATPAM|DC), wajib, ada_masa_berlaku
dokumen          id, pengajuan_id, jenis_dokumen_id, file_url, nomor, tgl_terbit,
                 berlaku_sd
kartu            id, pengajuan_id, no_kta, terbit_at, berlaku_sd, qr_token,
                 status(AKTIF|DIBEKUKAN|DICABUT|KEDALUWARSA), dicetak_by, dicetak_at
sanksi           id, kartu_id, jenis(BEKU|CABUT|PULIH), alasan, keterangan, bukti_url,
                 berlaku_sd, oleh(user_id: admin/operator), at
blacklist        id, nik, alasan, sanksi_id, berlaku_sd, aktif
riwayat_status   id, pengajuan_id, dari, ke, oleh, catatan, at
audit_log        id, user_id, aksi, entitas, entitas_id, ip, at
```

Format nomor (usulan):
- No. registrasi: `REG/{KODE_POLDA}/{YYYYMM}/{URUT}`
- No. KTA: `{S|D}-{KODE_POLDA}-{YYYY}-{URUT6}`

## 8. Keamanan & Data Pribadi

Sudah diterapkan:
- RBAC + pembatasan data per Polda di level query; Admin & Operator dicek ulang di setiap server action.
- Password di-hash (Better Auth), sesi 8 jam, cookie `httpOnly`/`SameSite=Lax` (`Secure` di produksi HTTPS), rate limit login.
- **File unggahan dienkripsi AES-256-GCM** di disk (`STORAGE_ENC_KEY`); isi file dicek sesuai formatnya (PDF/JPG/PNG/WEBP, maks 5 MB).
- **Akses file dibatasi**: Admin; pengunggahnya; atau Operator Polda yang memiliki pengajuan/sanksi terkait (tabel `unggahan`).
- Audit log untuk lihat data pemohon, ubah, cetak, sanksi, akun, master data, dan ekspor.
- Halaman verifikasi publik menampilkan data minimal (nama disamarkan, tanpa NIK/alamat) dan dibatasi 30 permintaan/menit per IP.
- QR berisi token acak 144-bit, bukan data pribadi.
- Header keamanan: CSP, `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy` (kamera hanya origin sendiri), HSTS di produksi.

Belum / catatan:
- **NIK di database belum dienkripsi per kolom**: NIK dipakai untuk pencarian awalan & keunikan. Opsi berikutnya: enkripsi kolom + *blind index* (HMAC) untuk pencarian persis — konsekuensinya pencarian NIK sebagian tidak lagi bisa. Sementara itu gunakan enkripsi disk/volume database di server.
- Rate limit verifikasi publik masih di memori (satu instance); bila multi-instance pindahkan ke Redis/Postgres.

## 9. Integrasi Hardware (tahap lanjut)

Fase awal memakai input berbasis browser:
- Foto: webcam (getUserMedia) + crop ICAO 3x4
- Tanda tangan: canvas / signature pad
- Sidik jari: unggah file dulu; SDK scanner (agent lokal) di fase berikutnya
- Cetak: layout kartu ukuran CR80 → PDF/print browser; driver card printer di fase berikutnya

## 10. Tahapan Pengembangan

| Fase | Isi |
|---|---|
| 1. Fondasi | Setup proyek, DB & migrasi, auth + RBAC, layout Operator/Admin, master Polda |
| 2. Pendataan | Wizard pendataan, unggah dokumen, cek NIK duplikat, daftar & detail pemohon |
| 3. Verifikasi otomatis | Mesin aturan kelengkapan, checklist kekurangan, riwayat status |
| 4. Kartu | Generate KTA & sertifikat (PDF), QR, halaman verifikasi publik |
| 5. Rekapitulasi | Dashboard, grafik, peta sebaran, export Excel/PDF |
| 6. Pengamanan | Audit log, enkripsi, notifikasi kedaluwarsa, pengujian |
| 7. Hardware | Integrasi biometrik & card printer |

## 11. Hal yang Masih Terbuka

- Masa berlaku KTA resmi (saat ini 2 tahun, diatur `MASA_BERLAKU_KTA_TAHUN`); berbeda antara Satpam & Debt Collector?
- Struktur Polda terbaru (Papua pemekaran) & cakupan Polda Metro Jaya per kab/kota.
- Pejabat penanda tangan sertifikat.
- Desain resmi kartu & sertifikat (logo, tata letak, hologram).
- Daftar dokumen resmi dari Binmas/Baharkam Polri (mengganti daftar default).

## 12. Pengembangan Lanjutan (di luar cakupan saat ini)

Integrasi dengan instansi lain **ditunda** ke tahap pengembangan berikutnya. Pada versi awal, semua data diinput manual oleh Operator dan verifikasi otomatis hanya mengecek **kelengkapan**.

Rencana integrasi ke depan:
- **Dukcapil** — validasi NIK & biodata.
- **SKCK online Polri** — cek keabsahan & masa berlaku SKCK.
- **APPI / lembaga sertifikasi OJK** — cek nomor SPPI Debt Collector.
- **OJK** — cek izin perusahaan pembiayaan.
- **Data BUJP (Binmas/Baharkam)** — cek izin operasional BUJP & sertifikat Gada.

Agar mudah ditambahkan nanti, aturan verifikasi otomatis dibuat modular (setiap aturan = satu fungsi pengecekan), sehingga validator eksternal cukup ditambahkan sebagai aturan baru.

## 13. Status Implementasi

| Area | Status |
|---|---|
| Login, role Operator/Admin, login cepat akun demo | ✅ |
| Tampilan (shadcn/ui, tema terang/gelap otomatis, SweetAlert2), zona waktu mengikuti pengguna | ✅ |
| Kode wilayah Kemendagri (4 level) & GeoJSON provinsi/kab-kota | ✅ |
| Formulir pendataan 6 langkah, unggah dokumen, kamera, tanda tangan | ✅ |
| Verifikasi otomatis (8 aturan) & daftar kekurangan | ✅ |
| Daftar & detail pemohon (Operator) dan direktori nasional + ekspor Excel (Admin) | ✅ |
| Antrean cetak, nomor KTA, PDF KTA (CR80) & sertifikat (A4), QR | ✅ |
| Verifikasi QR publik | ✅ |
| Bekukan / cabut / pulihkan KTA, blacklist otomatis, daftar sanksi | ✅ |
| Kelola pengguna, master persyaratan dokumen, master perusahaan | ✅ |
| Dashboard ringkasan, grafik, peta sebaran | ✅ |
| Notifikasi, profil & ganti sandi, audit log | ✅ |
| Job terjadwal (pg-boss, tiap jam): KTA kedaluwarsa & blacklist berakhir, per zona waktu Polda | ✅ |
| Enkripsi file, akses file per Polda, rate limit, header keamanan | ✅ |
| Enkripsi kolom NIK | ⏳ (lihat §8) |
| Penyimpanan MinIO, Docker Compose, tes otomatis (Vitest/Playwright) | ⏳ |
| Integrasi hardware & instansi lain, ABIS | ⏳ ditunda |

