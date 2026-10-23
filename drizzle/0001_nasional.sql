ALTER TABLE "polda" ADD COLUMN "zona_waktu" text DEFAULT 'Asia/Jakarta' NOT NULL;--> statement-breakpoint
CREATE INDEX "kartu_status_berlaku_idx" ON "kartu" USING btree ("status","berlaku_sd");--> statement-breakpoint
CREATE INDEX "pengajuan_polda_status_idx" ON "pengajuan" USING btree ("polda_id","status");--> statement-breakpoint
CREATE INDEX "pengajuan_profesi_idx" ON "pengajuan" USING btree ("profesi");--> statement-breakpoint
CREATE INDEX "pengajuan_created_idx" ON "pengajuan" USING btree ("created_at");