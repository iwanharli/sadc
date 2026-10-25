# Spesifikasi API Integrasi untuk sadc

Untuk: pengembang repo `iwanharli/sadc`
Dari: tim Baharkam Command Center (Pusat)
Status: usulan v0.1, untuk dibahas dan disepakati bersama

## 1. Latar belakang

Aplikasi sadc (Satpam dan Petugas Penagih) dipasang di setiap Polda. Baharkam Command Center (Pusat) hanya **memantau**: menarik data dari semua instance Polda dan menampilkannya. Pusat tidak menulis apa pun ke instance Polda.

Saat ini sadc belum punya API data; data hanya keluar lewat ekspor Excel dan database Postgres. Agar Pusat bisa menarik data, setiap instance perlu menyediakan 5 endpoint baca-saja di bawah `/integration/*`.

Data ini dipakai untuk: Ringkasan Command Center (jumlah terdaftar dan KTA terbit), Profil Wilayah, Laporan Executive, dan menu Satpam serta Petugas Penagih (dasbor, perusahaan, pemohon, KTA, sanksi, blacklist, persyaratan dokumen, ekspor).

Istilah di Pusat: nilai internal `DEBT_COLLECTOR` ditampilkan sebagai **"Petugas Penagih"**. "Terdaftar" berarti pemohon yang tercatat dengan status apa pun; "baru terdaftar" berarti pemohon yang dibuat pada periode yang dipilih.

## 2. Aturan umum semua endpoint

| Hal | Ketentuan |
|---|---|
| Protokol | HTTPS saja |
| Metode | `GET` saja. Tidak ada tulis, ubah, atau hapus |
| Autentikasi | Header `Authorization: Bearer <token>`. Token khusus klien "Pusat", hak baca-saja, bisa dirotasi, dapat dicabut |
| Pembatasan | Daftar IP yang diizinkan (IP server Pusat). Batas laju minimal 60 permintaan per menit |
| Peran | Peran khusus `INTEGRASI`, hanya boleh mengakses `/integration/*` |
| Format | JSON, UTF-8. Waktu ISO 8601 dengan zona waktu |
| Paginasi | Kursor. Parameter `limit` (bawaan 500, maksimal 2000) dan `cursor`. Respons memuat `nextCursor` (null bila habis) |
| Sinkron bertahap | Parameter `updatedSince` (ISO 8601). Setiap baris wajib punya `updatedAt` |
| Data terhapus | Baris yang dihapus dikembalikan dengan `deleted: true` agar Pusat ikut menghapus |
| Kesalahan | `401`, `403`, `429`, `400` dengan isi `{ "error": { "code": "...", "message": "..." } }` |
| Pencatatan | Setiap pemanggilan dicatat di log audit instance |

Bentuk respons daftar:

```json
{
  "data": [ ... ],
  "nextCursor": null,
  "generatedAt": "2026-10-25T16:00:00+07:00",
  "poldaKode": "JATIM"
}
```

`poldaKode` wajib ada di setiap respons: kode resmi Polda instance tersebut, agar Pusat bisa memetakan ke daftar Polda resmi (sadc memakai 34 Polda, Pusat 36; pemetaannya disimpan di Pusat).

## 3. Daftar endpoint

### 3.1 `GET /integration/companies`

Perusahaan yang menaungi pemohon. Mendukung `updatedSince`.

```json
{
  "data": [
    {
      "id": "PSH-0001",
      "nama": "PT Garda Nusantara",
      "nib": "1234567890123",
      "jenis": "BUJP",
      "poldaKode": "JATIM",
      "aktif": true,
      "updatedAt": "2026-10-20T10:00:00+07:00",
      "deleted": false
    }
  ]
}
```

- `jenis`: `BUJP` (badan usaha jasa pengamanan, untuk satpam) atau `PEMBIAYAAN` (perusahaan pembiayaan, untuk petugas penagih).

### 3.2 `GET /integration/applicants?updatedSince=`

Pemohon (calon dan pemegang KTA). Mendukung `updatedSince`, `from`/`to` (tanggal dibuat), `profesi`, `status`.

```json
{
  "data": [
    {
      "id": "PMH-000123",
      "noRegistrasi": "REG/2026/10/000123",
      "nama": "Andi Wijaya",
      "nik": "3578012345670001",
      "jenisKelamin": "L",
      "pendidikan": "SMA",
      "profesi": "SATPAM",
      "jenis": "BARU",
      "perusahaanId": "PSH-0001",
      "poldaKode": "JATIM",
      "status": "TERVERIFIKASI",
      "dibuat": "2026-10-12T09:00:00+07:00",
      "kekuranganDokumen": ["Surat keterangan sehat"],
      "detailProfesi": { "gada": "GADA_PRATAMA", "sertifikatNo": "..." },
      "updatedAt": "2026-10-18T14:00:00+07:00",
      "deleted": false
    }
  ]
}
```

- `profesi`: `SATPAM` | `DEBT_COLLECTOR`.
- `jenis`: `BARU` | `PERPANJANGAN`.
- `status`: `DRAF` | `TERVERIFIKASI` | `DICETAK`.
- `detailProfesi`: untuk satpam jenjang Gada; untuk petugas penagih nomor sertifikat SPPI. Mohon dijelaskan pilihan nilainya.
- **Nama dan NIK dikirim lengkap, tanpa disamarkan.** Ini keputusan Pusat karena data dipakai untuk pementaan penerima manfaat. Kanal wajib HTTPS dan token dilindungi sesuai bagian 2.

### 3.3 `GET /integration/cards?updatedSince=`

Kartu Tanda Anggota (KTA) beserta sanksinya. Mendukung `updatedSince`.

```json
{
  "data": [
    {
      "id": "KTA-000045",
      "nomor": "KTA/JATIM/2026/000045",
      "pemohonId": "PMH-000123",
      "terbit": "2026-10-18",
      "berlakuSampai": "2029-10-18",
      "status": "AKTIF",
      "sanksi": [
        { "jenis": "TEGURAN", "alasan": "...", "tanggal": "2026-11-01" }
      ],
      "updatedAt": "2026-10-18T14:05:00+07:00",
      "deleted": false
    }
  ]
}
```

- `status`: `AKTIF` | `DIBEKUKAN` | `DICABUT`.
- Mohon daftar nilai `jenis` sanksi disertakan dalam dokumentasi.

### 3.4 `GET /integration/blacklist`

NIK yang diblokir. Mendukung `updatedSince`.

```json
{
  "data": [
    {
      "id": "BL-0007",
      "nama": "Rudi Hartono",
      "nik": "3578012345670099",
      "alasan": "Pemalsuan dokumen",
      "sejak": "2026-08-01",
      "berlakuSampai": null,
      "aktif": true,
      "profesi": "DEBT_COLLECTOR",
      "poldaKode": "JATIM",
      "updatedAt": "2026-08-01T10:00:00+07:00",
      "deleted": false
    }
  ]
}
```

### 3.5 `GET /integration/document-requirements`

Daftar persyaratan dokumen per profesi dan jenis permohonan. Tidak perlu `updatedSince`.

```json
{
  "data": [
    { "kode": "SKCK", "nama": "SKCK", "profesi": "SATPAM", "jenis": "BARU", "wajib": true },
    { "kode": "SURAT_SEHAT", "nama": "Surat keterangan sehat", "profesi": "SATPAM", "jenis": "BARU", "wajib": true }
  ]
}
```

## 4. Yang kami butuhkan dari tim repo

1. Persetujuan bentuk respons di atas, atau usulan perubahan. Mohon jangan mengubah nama kolom tanpa kabar.
2. Pembuatan mekanisme token `INTEGRASI` dan penerbitan token untuk Pusat per instance Polda.
3. Dokumentasi pilihan nilai (jenjang Gada, jenis sanksi, kekurangan dokumen) dan definisi status.
4. Kode resmi Polda di tiap instance, serta konfirmasi daftar 34 Polda dibanding 36 di Pusat.
5. Instance uji (staging) dengan data contoh.

## 5. Di luar cakupan

- Tidak ada endpoint tulis dari Pusat ke instance Polda.
- Tidak ada foto atau berkas dalam respons daftar (foto resmi dibahas terpisah bila Pusat membutuhkannya).
- Tidak ada perubahan pada alur pendaftaran di sadc.

## 6. Pertanyaan terbuka untuk tim repo

1. Apakah Postgres sadc sudah menyimpan `updatedAt` di semua tabel terkait, atau perlu migrasi?
2. Apakah penghapusan data di sadc bersifat hapus keras atau tandai hapus? Ini menentukan cara kami menerima `deleted: true`.
3. Apakah satu NIK bisa punya lebih dari satu pemohon (misalnya perpanjangan)? Bagaimana kami mengenali riwayatnya?
4. Kapan instance Polda yang pertama siap dipasangi endpoint ini?
