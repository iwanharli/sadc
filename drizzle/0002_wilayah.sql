CREATE TABLE "wilayah" (
	"kode" varchar(13) PRIMARY KEY NOT NULL,
	"nama" text NOT NULL,
	"level" smallint NOT NULL,
	"parent_kode" varchar(13),
	"lat" double precision,
	"lng" double precision
);
--> statement-breakpoint
ALTER TABLE "polda" ADD COLUMN "provinsi_kode" varchar(2)[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
CREATE INDEX "wilayah_parent_idx" ON "wilayah" USING btree ("parent_kode");--> statement-breakpoint
CREATE INDEX "wilayah_level_idx" ON "wilayah" USING btree ("level");