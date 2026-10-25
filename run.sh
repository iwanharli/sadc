#!/usr/bin/env bash
# Skrip bantu menjalankan SADC.
# Pemakaian: ./run.sh [perintah] [--port N]
set -euo pipefail

cd "$(dirname "$0")"

PORT=3000
CMD="${1:-dev}"
[[ $# -gt 0 ]] && shift
while [[ $# -gt 0 ]]; do
  case "$1" in
    -p|--port) PORT="$2"; shift 2 ;;
    *) echo "Opsi tidak dikenal: $1"; exit 1 ;;
  esac
done

c_info() { printf "\033[36m▸ %s\033[0m\n" "$*"; }
c_ok()   { printf "\033[32m✓ %s\033[0m\n" "$*"; }
c_err()  { printf "\033[31m✗ %s\033[0m\n" "$*" >&2; }

usage() {
  cat <<EOF
SADC — Sistem Pendataan Satpam & Penagih Utang

Pemakaian: ./run.sh [perintah] [--port N]

Perintah:
  dev        Jalankan mode development (default). Otomatis setup bila belum.
  setup      Install dependensi, buat .env, buat database, migrasi & seed
  build      Build produksi
  start      Build lalu jalankan mode produksi
  migrate    Terapkan migrasi database
  seed       Isi data awal (Polda, persyaratan dokumen, akun demo)
  wilayah    Impor kode wilayah Kemendagri & GeoJSON dari WILAYAH_SOURCE_URL
  demo       Isi data demo pendataan (±2.400 pemohon) agar dashboard terisi
  reset-db   Hapus & buat ulang database, lalu migrasi & seed
  studio     Buka Drizzle Studio (lihat isi database)
  lint       Jalankan typecheck & lint
  help       Tampilkan bantuan ini

Contoh:
  ./run.sh                 # setup otomatis + jalankan di http://localhost:3000
  ./run.sh dev --port 4000
  ./run.sh reset-db
EOF
}

require() {
  command -v "$1" >/dev/null 2>&1 || { c_err "'$1' tidak ditemukan. $2"; exit 1; }
}

load_env() {
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
}

db_name() {
  # ambil nama database dari DATABASE_URL (bagian setelah '/' terakhir, tanpa query)
  local url="${DATABASE_URL%%\?*}"
  echo "${url##*/}"
}

ensure_env() {
  if [[ ! -f .env ]]; then
    c_info "Membuat .env dari .env.example"
    cp .env.example .env
    local secret
    secret="$(openssl rand -base64 32 2>/dev/null || head -c 32 /dev/urandom | base64)"
    # isi secret acak & pakai user OS untuk koneksi Postgres lokal
    sed -i.bak "s#^BETTER_AUTH_SECRET=.*#BETTER_AUTH_SECRET=${secret}#" .env
    # kunci enkripsi file unggahan
    sed -i.bak "s#^STORAGE_ENC_KEY=.*#STORAGE_ENC_KEY=$(openssl rand -base64 32 2>/dev/null || head -c 32 /dev/urandom | base64)#" .env
    sed -i.bak "s#^DATABASE_URL=.*#DATABASE_URL=postgres://${USER}@localhost:5432/sadc#" .env
    rm -f .env.bak
    c_ok ".env dibuat — periksa DATABASE_URL bila Postgres Anda memakai user/sandi lain"
  fi
  load_env
}

ensure_deps() {
  require node "Install Node.js 20+ terlebih dahulu."
  if [[ ! -d node_modules ]]; then
    c_info "Install dependensi (npm install)"
    npm install
  fi
}

check_db_server() {
  require psql "Install PostgreSQL (mis. Postgres.app atau 'brew install postgresql')."
  if ! psql "${DATABASE_URL%/*}/postgres" -tAc "select 1" >/dev/null 2>&1; then
    c_err "Tidak bisa terhubung ke PostgreSQL. Pastikan server berjalan dan DATABASE_URL di .env benar."
    exit 1
  fi
}

ensure_db() {
  check_db_server
  local name
  name="$(db_name)"
  if ! psql "$DATABASE_URL" -tAc "select 1" >/dev/null 2>&1; then
    c_info "Membuat database '${name}'"
    psql "${DATABASE_URL%/*}/postgres" -qc "create database \"${name}\""
    c_ok "Database '${name}' dibuat"
    return 1 # menandakan database baru
  fi
  return 0
}

do_migrate() { c_info "Migrasi database"; npm run --silent db:migrate; c_ok "Migrasi selesai"; }
do_seed()    { c_info "Seed data awal"; npm run --silent db:seed; }
do_wilayah() { c_info "Impor kode wilayah Kemendagri + GeoJSON"; npm run --silent db:wilayah; }

do_setup() {
  ensure_deps
  ensure_env
  local fresh=0
  ensure_db || fresh=1
  do_migrate
  if [[ $fresh -eq 1 ]] || [[ "$(psql "$DATABASE_URL" -tAc 'select count(*) from polda' 2>/dev/null)" == "0" ]]; then
    do_seed
  fi
  if [[ "$(psql "$DATABASE_URL" -tAc 'select count(*) from wilayah' 2>/dev/null)" == "0" ]]; then
    if [[ -n "${WILAYAH_SOURCE_URL:-}" ]]; then
      do_wilayah
    else
      c_info "Tabel wilayah kosong — atur WILAYAH_SOURCE_URL di .env lalu jalankan ./run.sh wilayah"
    fi
  fi
  c_ok "Setup selesai"
}

case "$CMD" in
  dev)
    do_setup
    c_info "Menjalankan development di http://localhost:${PORT}"
    [[ "${DEMO_LOGIN:-}" == "true" ]] && c_info "Login demo aktif — sandi: ${DEMO_PASSWORD:-SadcDemo2026}"
    exec npx next dev -p "$PORT"
    ;;
  setup)   do_setup ;;
  build)   ensure_deps; ensure_env; npm run build ;;
  start)
    do_setup
    npm run build
    c_info "Menjalankan produksi di http://localhost:${PORT}"
    exec npx next start -p "$PORT"
    ;;
  migrate) ensure_deps; ensure_env; ensure_db || true; do_migrate ;;
  seed)    ensure_deps; ensure_env; do_seed ;;
  wilayah) ensure_deps; ensure_env; do_wilayah ;;
  demo)    ensure_deps; ensure_env; c_info "Membuat data demo pendataan"; npm run --silent db:demo ;;
  reset-db)
    ensure_deps; ensure_env; check_db_server
    name="$(db_name)"
    read -r -p "Hapus SEMUA data di database '${name}'? ketik 'ya' untuk lanjut: " jawab
    [[ "$jawab" == "ya" ]] || { echo "Dibatalkan."; exit 0; }
    psql "${DATABASE_URL%/*}/postgres" -qc "drop database if exists \"${name}\" with (force)"
    psql "${DATABASE_URL%/*}/postgres" -qc "create database \"${name}\""
    do_migrate
    do_seed
    [[ -n "${WILAYAH_SOURCE_URL:-}" ]] && do_wilayah
    c_ok "Database direset"
    ;;
  studio)  ensure_deps; ensure_env; exec npm run db:studio ;;
  lint)    ensure_deps; npx tsc --noEmit && npm run lint && c_ok "Tidak ada error" ;;
  help|-h|--help) usage ;;
  *) c_err "Perintah tidak dikenal: $CMD"; echo; usage; exit 1 ;;
esac
