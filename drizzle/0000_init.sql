CREATE TYPE "public"."jenis_kelamin" AS ENUM('L', 'P');--> statement-breakpoint
CREATE TYPE "public"."jenis_pengajuan" AS ENUM('BARU', 'PERPANJANGAN', 'PENGGANTIAN');--> statement-breakpoint
CREATE TYPE "public"."jenis_perusahaan" AS ENUM('BUJP', 'PEMBIAYAAN');--> statement-breakpoint
CREATE TYPE "public"."jenis_sanksi" AS ENUM('BEKU', 'CABUT', 'PULIH');--> statement-breakpoint
CREATE TYPE "public"."jenjang_gada" AS ENUM('PRATAMA', 'MADYA', 'UTAMA');--> statement-breakpoint
CREATE TYPE "public"."profesi_dokumen" AS ENUM('UMUM', 'SATPAM', 'DEBT_COLLECTOR');--> statement-breakpoint
CREATE TYPE "public"."profesi" AS ENUM('SATPAM', 'DEBT_COLLECTOR');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('OPERATOR', 'ADMIN');--> statement-breakpoint
CREATE TYPE "public"."status_kartu" AS ENUM('AKTIF', 'DIBEKUKAN', 'DICABUT', 'KEDALUWARSA');--> statement-breakpoint
CREATE TYPE "public"."status_pengajuan" AS ENUM('DRAF', 'TERVERIFIKASI', 'DICETAK');--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text,
	"aksi" text NOT NULL,
	"entitas" text NOT NULL,
	"entitas_id" text,
	"ip" text,
	"data" jsonb,
	"at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "blacklist" (
	"id" serial PRIMARY KEY NOT NULL,
	"nik" varchar(16) NOT NULL,
	"alasan" text NOT NULL,
	"sanksi_id" integer,
	"berlaku_sd" date,
	"aktif" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "detail_dc" (
	"pengajuan_id" integer PRIMARY KEY NOT NULL,
	"no_sppi" text,
	"sppi_berlaku_sd" date,
	"wilayah_operasi" text
);
--> statement-breakpoint
CREATE TABLE "detail_satpam" (
	"pengajuan_id" integer PRIMARY KEY NOT NULL,
	"jenjang_gada" "jenjang_gada",
	"no_sertifikat_gada" text
);
--> statement-breakpoint
CREATE TABLE "dokumen" (
	"id" serial PRIMARY KEY NOT NULL,
	"pengajuan_id" integer NOT NULL,
	"jenis_dokumen_id" integer NOT NULL,
	"file_url" text NOT NULL,
	"nomor" text,
	"tgl_terbit" date,
	"berlaku_sd" date,
	"ditandai_palsu" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "jenis_dokumen" (
	"id" serial PRIMARY KEY NOT NULL,
	"kode" varchar(30) NOT NULL,
	"nama" text NOT NULL,
	"profesi" "profesi_dokumen" NOT NULL,
	"wajib" boolean DEFAULT true NOT NULL,
	"wajib_untuk" "jenis_pengajuan"[],
	"ada_masa_berlaku" boolean DEFAULT false NOT NULL,
	"urutan" integer DEFAULT 0 NOT NULL,
	"aktif" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kartu" (
	"id" serial PRIMARY KEY NOT NULL,
	"pengajuan_id" integer NOT NULL,
	"no_kta" varchar(40) NOT NULL,
	"terbit_at" date NOT NULL,
	"berlaku_sd" date NOT NULL,
	"qr_token" text NOT NULL,
	"status" "status_kartu" DEFAULT 'AKTIF' NOT NULL,
	"dicetak_by" text,
	"dicetak_at" timestamp,
	CONSTRAINT "kartu_no_kta_unique" UNIQUE("no_kta"),
	CONSTRAINT "kartu_qr_token_unique" UNIQUE("qr_token")
);
--> statement-breakpoint
CREATE TABLE "pemohon" (
	"id" serial PRIMARY KEY NOT NULL,
	"nik" varchar(16) NOT NULL,
	"nama" text NOT NULL,
	"tempat_lahir" text,
	"tgl_lahir" date,
	"jenis_kelamin" "jenis_kelamin",
	"alamat" text,
	"no_hp" varchar(20),
	"pendidikan" text,
	"tinggi_badan" integer,
	"foto_url" text,
	"ttd_url" text,
	"sidik_jari_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "pemohon_nik_unique" UNIQUE("nik")
);
--> statement-breakpoint
CREATE TABLE "pengajuan" (
	"id" serial PRIMARY KEY NOT NULL,
	"no_registrasi" varchar(40) NOT NULL,
	"pemohon_id" integer NOT NULL,
	"profesi" "profesi" NOT NULL,
	"jenis" "jenis_pengajuan" DEFAULT 'BARU' NOT NULL,
	"perusahaan_id" integer,
	"polda_id" integer NOT NULL,
	"operator_id" text NOT NULL,
	"status" "status_pengajuan" DEFAULT 'DRAF' NOT NULL,
	"kekurangan" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"terverifikasi_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "pengajuan_no_registrasi_unique" UNIQUE("no_registrasi")
);
--> statement-breakpoint
CREATE TABLE "perusahaan" (
	"id" serial PRIMARY KEY NOT NULL,
	"nama" text NOT NULL,
	"jenis" "jenis_perusahaan" NOT NULL,
	"nib" varchar(20),
	"no_izin" text,
	"alamat" text,
	"polda_id" integer,
	"aktif" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "polda" (
	"id" serial PRIMARY KEY NOT NULL,
	"kode" varchar(10) NOT NULL,
	"nama" text NOT NULL,
	"provinsi" text NOT NULL,
	CONSTRAINT "polda_kode_unique" UNIQUE("kode")
);
--> statement-breakpoint
CREATE TABLE "polres" (
	"id" serial PRIMARY KEY NOT NULL,
	"polda_id" integer NOT NULL,
	"nama" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "riwayat_status" (
	"id" serial PRIMARY KEY NOT NULL,
	"pengajuan_id" integer NOT NULL,
	"dari" text,
	"ke" text NOT NULL,
	"oleh" text,
	"catatan" text,
	"data" jsonb,
	"at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sanksi" (
	"id" serial PRIMARY KEY NOT NULL,
	"kartu_id" integer NOT NULL,
	"jenis" "jenis_sanksi" NOT NULL,
	"alasan" text NOT NULL,
	"keterangan" text,
	"bukti_url" text,
	"berlaku_sd" date,
	"oleh" text NOT NULL,
	"at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"username" text,
	"display_username" text,
	"role" "role" DEFAULT 'OPERATOR' NOT NULL,
	"polda_id" integer,
	"aktif" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email"),
	CONSTRAINT "user_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blacklist" ADD CONSTRAINT "blacklist_sanksi_id_sanksi_id_fk" FOREIGN KEY ("sanksi_id") REFERENCES "public"."sanksi"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "detail_dc" ADD CONSTRAINT "detail_dc_pengajuan_id_pengajuan_id_fk" FOREIGN KEY ("pengajuan_id") REFERENCES "public"."pengajuan"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "detail_satpam" ADD CONSTRAINT "detail_satpam_pengajuan_id_pengajuan_id_fk" FOREIGN KEY ("pengajuan_id") REFERENCES "public"."pengajuan"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dokumen" ADD CONSTRAINT "dokumen_pengajuan_id_pengajuan_id_fk" FOREIGN KEY ("pengajuan_id") REFERENCES "public"."pengajuan"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dokumen" ADD CONSTRAINT "dokumen_jenis_dokumen_id_jenis_dokumen_id_fk" FOREIGN KEY ("jenis_dokumen_id") REFERENCES "public"."jenis_dokumen"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kartu" ADD CONSTRAINT "kartu_pengajuan_id_pengajuan_id_fk" FOREIGN KEY ("pengajuan_id") REFERENCES "public"."pengajuan"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kartu" ADD CONSTRAINT "kartu_dicetak_by_user_id_fk" FOREIGN KEY ("dicetak_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pengajuan" ADD CONSTRAINT "pengajuan_pemohon_id_pemohon_id_fk" FOREIGN KEY ("pemohon_id") REFERENCES "public"."pemohon"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pengajuan" ADD CONSTRAINT "pengajuan_perusahaan_id_perusahaan_id_fk" FOREIGN KEY ("perusahaan_id") REFERENCES "public"."perusahaan"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pengajuan" ADD CONSTRAINT "pengajuan_polda_id_polda_id_fk" FOREIGN KEY ("polda_id") REFERENCES "public"."polda"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pengajuan" ADD CONSTRAINT "pengajuan_operator_id_user_id_fk" FOREIGN KEY ("operator_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "perusahaan" ADD CONSTRAINT "perusahaan_polda_id_polda_id_fk" FOREIGN KEY ("polda_id") REFERENCES "public"."polda"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "polres" ADD CONSTRAINT "polres_polda_id_polda_id_fk" FOREIGN KEY ("polda_id") REFERENCES "public"."polda"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "riwayat_status" ADD CONSTRAINT "riwayat_status_pengajuan_id_pengajuan_id_fk" FOREIGN KEY ("pengajuan_id") REFERENCES "public"."pengajuan"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "riwayat_status" ADD CONSTRAINT "riwayat_status_oleh_user_id_fk" FOREIGN KEY ("oleh") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sanksi" ADD CONSTRAINT "sanksi_kartu_id_kartu_id_fk" FOREIGN KEY ("kartu_id") REFERENCES "public"."kartu"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sanksi" ADD CONSTRAINT "sanksi_oleh_user_id_fk" FOREIGN KEY ("oleh") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_polda_id_polda_id_fk" FOREIGN KEY ("polda_id") REFERENCES "public"."polda"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "jenis_dokumen_kode_profesi" ON "jenis_dokumen" USING btree ("kode","profesi");