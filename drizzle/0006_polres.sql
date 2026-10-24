ALTER TABLE "polres" ADD COLUMN "kabupaten_kode" varchar(5)[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "polres" ADD COLUMN "aktif" boolean DEFAULT true NOT NULL;--> statement-breakpoint
CREATE INDEX "polres_polda_idx" ON "polres" USING btree ("polda_id");