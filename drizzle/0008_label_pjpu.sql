-- Istilah perusahaan pembiayaan → PJPU pada nama persyaratan dokumen bawaan (hanya bila belum diubah Admin)
UPDATE "jenis_dokumen" SET "nama" = 'Surat tugas / kuasa dari PJPU' WHERE "kode" = 'SURAT_TUGAS' AND "nama" = 'Surat tugas / kuasa dari perusahaan pembiayaan';--> statement-breakpoint
UPDATE "jenis_dokumen" SET "nama" = 'NIB / izin usaha PJPU' WHERE "kode" = 'IZIN_PERUSAHAAN' AND "nama" = 'NIB / izin usaha perusahaan pembiayaan (OJK)';
