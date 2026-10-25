ALTER TABLE "jenis_dokumen" ADD COLUMN "jamak" boolean DEFAULT false NOT NULL;--> statement-breakpoint
UPDATE "jenis_dokumen" SET "jamak" = true WHERE "kode" IN ('GADA', 'SPPI');
