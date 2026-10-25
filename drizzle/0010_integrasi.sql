CREATE TABLE "integrasi_token" (
	"id" serial PRIMARY KEY NOT NULL,
	"nama" text NOT NULL,
	"token_hash" varchar(64) NOT NULL,
	"awalan" varchar(16) NOT NULL,
	"ip_izin" text[] DEFAULT '{}' NOT NULL,
	"aktif" boolean DEFAULT true NOT NULL,
	"dibuat_oleh" text,
	"terakhir_dipakai" timestamp,
	"ip_terakhir" text,
	"dicabut_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "integrasi_token_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
ALTER TABLE "blacklist" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "kartu" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "sanksi" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "integrasi_token" ADD CONSTRAINT "integrasi_token_dibuat_oleh_user_id_fk" FOREIGN KEY ("dibuat_oleh") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
UPDATE "sanksi" SET "updated_at" = "at";--> statement-breakpoint
UPDATE "blacklist" SET "updated_at" = "created_at";--> statement-breakpoint
UPDATE "kartu" k SET "updated_at" = greatest(coalesce(k."dicetak_at", k."terbit_at"::timestamp), coalesce((SELECT max(s."at") FROM "sanksi" s WHERE s."kartu_id" = k."id"), k."terbit_at"::timestamp));--> statement-breakpoint
CREATE INDEX "kartu_updated_idx" ON "kartu" ("updated_at", "id");--> statement-breakpoint
CREATE INDEX "pengajuan_updated_idx" ON "pengajuan" ("updated_at", "id");--> statement-breakpoint
CREATE INDEX "perusahaan_updated_idx" ON "perusahaan" ("updated_at", "id");--> statement-breakpoint
CREATE INDEX "blacklist_updated_idx" ON "blacklist" ("updated_at", "id");
