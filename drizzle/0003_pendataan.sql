ALTER TABLE "pemohon" ADD COLUMN "kode_desa" varchar(13);--> statement-breakpoint
ALTER TABLE "pengajuan" ADD COLUMN "foto_url" text;--> statement-breakpoint
ALTER TABLE "pengajuan" ADD COLUMN "ttd_url" text;--> statement-breakpoint
ALTER TABLE "pengajuan" ADD COLUMN "sidik_jari_url" text;--> statement-breakpoint
ALTER TABLE "pemohon" ADD CONSTRAINT "pemohon_kode_desa_wilayah_kode_fk" FOREIGN KEY ("kode_desa") REFERENCES "public"."wilayah"("kode") ON DELETE no action ON UPDATE no action;