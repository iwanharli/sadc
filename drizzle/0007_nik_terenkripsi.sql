ALTER TABLE "blacklist" ALTER COLUMN "nik" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "pemohon" ALTER COLUMN "nik" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "blacklist" ADD COLUMN "nik_hash" varchar(64);--> statement-breakpoint
ALTER TABLE "blacklist" ADD COLUMN "nik_enc" text;--> statement-breakpoint
ALTER TABLE "pemohon" ADD COLUMN "nik_hash" varchar(64);--> statement-breakpoint
ALTER TABLE "pemohon" ADD COLUMN "nik_enc" text;--> statement-breakpoint
ALTER TABLE "pemohon" ADD COLUMN "nik_wilayah" varchar(6);--> statement-breakpoint
CREATE INDEX "blacklist_nik_hash_idx" ON "blacklist" USING btree ("nik_hash");--> statement-breakpoint
CREATE INDEX "pemohon_nik_wilayah_idx" ON "pemohon" USING btree ("nik_wilayah");--> statement-breakpoint
ALTER TABLE "pemohon" ADD CONSTRAINT "pemohon_nik_hash_unique" UNIQUE("nik_hash");