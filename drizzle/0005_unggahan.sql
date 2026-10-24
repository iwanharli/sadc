CREATE TABLE "unggahan" (
	"key" varchar(64) PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"polda_id" integer,
	"terenkripsi" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "unggahan" ADD CONSTRAINT "unggahan_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unggahan" ADD CONSTRAINT "unggahan_polda_id_polda_id_fk" FOREIGN KEY ("polda_id") REFERENCES "public"."polda"("id") ON DELETE no action ON UPDATE no action;