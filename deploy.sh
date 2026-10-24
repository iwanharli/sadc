#!/usr/bin/env bash
# Deploy SADC ke server produksi (dijalankan dari komputer lokal).
#
# Pemakaian: ./deploy.sh [perintah]
#   deploy     (default) push ke GitHub lalu perbarui server
#   status     status pm2 & cek kesehatan
#   logs       tampilkan log aplikasi terakhir
#   rollback   kembali ke build sebelumnya
#   help       bantuan
#
# Autentikasi SSH memakai SSH key. Bila belum ada key, berikan sandi lewat variabel lingkungan:
#   SSHPASS='sandi' ./deploy.sh        (butuh `sshpass`; sandi TIDAK pernah disimpan di repo)
set -euo pipefail

cd "$(dirname "$0")"

# ---- konfigurasi (bisa ditimpa lewat env atau file .deploy.env) ----
[[ -f .deploy.env ]] && source .deploy.env
DEPLOY_HOST="${DEPLOY_HOST:-root@217.76.51.113}"
DEPLOY_DIR="${DEPLOY_DIR:-/var/www/_demo-project/sadc}"
PM2_NAME="${PM2_NAME:-sadc-3612}"
APP_PORT="${APP_PORT:-3612}"
APP_URL="${APP_URL:-https://sadc.kecup.in}"
BRANCH="${BRANCH:-main}"

c_info() { printf "\033[36m▸ %s\033[0m\n" "$*"; }
c_ok()   { printf "\033[32m✓ %s\033[0m\n" "$*"; }
c_err()  { printf "\033[31m✗ %s\033[0m\n" "$*" >&2; }

SSH_OPTS=(-o ConnectTimeout=20 -o ServerAliveInterval=30 -o StrictHostKeyChecking=accept-new)
remote() {
  if [[ -n "${SSHPASS:-}" ]]; then
    command -v sshpass >/dev/null || { c_err "sshpass belum terpasang (brew install sshpass) — atau pakai SSH key"; exit 1; }
    sshpass -e ssh "${SSH_OPTS[@]}" "$DEPLOY_HOST" "$@"
  else
    ssh "${SSH_OPTS[@]}" -o BatchMode=yes "$DEPLOY_HOST" "$@"
  fi
}

usage() { sed -n '2,12p' "$0" | sed 's/^# \{0,1\}//'; }

push_kode() {
  if [[ -n "$(git status --porcelain)" ]]; then
    c_err "Ada perubahan yang belum di-commit. Commit dulu sebelum deploy:"
    git status --short | head -20
    exit 1
  fi
  local cabang; cabang="$(git rev-parse --abbrev-ref HEAD)"
  [[ "$cabang" == "$BRANCH" ]] || { c_err "Sedang di branch '$cabang'; deploy hanya dari '$BRANCH'"; exit 1; }
  c_info "Push ke GitHub ($BRANCH)"
  git push -q origin "$BRANCH"
  c_ok "Kode lokal: $(git log --oneline -1)"
}

deploy() {
  push_kode
  c_info "Memperbarui server $DEPLOY_HOST"
  remote "DEPLOY_DIR='$DEPLOY_DIR' PM2_NAME='$PM2_NAME' APP_PORT='$APP_PORT' BRANCH='$BRANCH' bash -s" <<'REMOTE'
set -euo pipefail
cd "$DEPLOY_DIR"
info() { printf "  \033[36m›\033[0m %s\n" "$*"; }

lama="$(git rev-parse HEAD)"
git fetch -q origin "$BRANCH"
git reset -q --hard "origin/$BRANCH"
baru="$(git rev-parse HEAD)"
info "versi: $(git log --oneline -1)"

if [[ "$lama" == "$baru" && -d .next ]]; then
  info "tidak ada commit baru — tetap build ulang"
fi

if [[ ! -d node_modules ]] || ! git diff --quiet "$lama" "$baru" -- package-lock.json; then
  info "install dependensi (npm ci)"
  npm ci --no-audit --no-fund --loglevel=error
fi

info "migrasi database"
npx drizzle-kit migrate 2>&1 | grep -E "applied|error" || true

info "build (folder terpisah agar versi berjalan tidak terganggu)"
rm -rf .next-build
if ! NEXT_DIST_DIR=.next-build npm run build > /tmp/sadc-build.log 2>&1; then
  git checkout -q -- tsconfig.json 2>/dev/null || true
  tail -30 /tmp/sadc-build.log
  echo "BUILD GAGAL — versi lama tetap berjalan"
  exit 1
fi
# next build menambahkan path tipe ke tsconfig; kembalikan agar git tetap bersih
git checkout -q -- tsconfig.json 2>/dev/null || true

info "ganti build & restart $PM2_NAME"
rm -rf .next.prev
[[ -d .next ]] && mv .next .next.prev
mv .next-build .next
pm2 restart "$PM2_NAME" --update-env >/dev/null

sehat=0
for i in $(seq 1 30); do
  if [[ "$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:$APP_PORT/login")" == "200" ]]; then sehat=1; break; fi
  sleep 1
done
if [[ "$sehat" != 1 ]]; then
  echo "APLIKASI TIDAK SEHAT — kembali ke build sebelumnya"
  if [[ -d .next.prev ]]; then rm -rf .next && mv .next.prev .next && pm2 restart "$PM2_NAME" >/dev/null; fi
  pm2 logs "$PM2_NAME" --lines 20 --nostream 2>&1 | tail -20
  exit 1
fi
pm2 save >/dev/null
info "aplikasi sehat"
REMOTE
  c_info "Cek dari internet"
  local kode; kode="$(curl -s -o /dev/null -w '%{http_code}' "$APP_URL/login")"
  [[ "$kode" == "200" ]] && c_ok "Deploy selesai → $APP_URL" || { c_err "$APP_URL/login membalas $kode"; exit 1; }
}

status() {
  remote "pm2 describe '$PM2_NAME' | grep -E 'status|uptime|restarts|exec cwd' ; cd '$DEPLOY_DIR' && echo && git log --oneline -1"
  printf "Publik %s/login → " "$APP_URL"; curl -s -o /dev/null -w '%{http_code}\n' "$APP_URL/login"
}

logs() { remote "pm2 logs '$PM2_NAME' --lines ${LINES:-60} --nostream"; }

rollback() {
  c_info "Kembali ke build sebelumnya"
  remote "DEPLOY_DIR='$DEPLOY_DIR' PM2_NAME='$PM2_NAME' bash -s" <<'REMOTE'
set -euo pipefail
cd "$DEPLOY_DIR"
[[ -d .next.prev ]] || { echo "Tidak ada build sebelumnya (.next.prev)"; exit 1; }
mv .next .next.gagal && mv .next.prev .next && mv .next.gagal .next.prev
pm2 restart "$PM2_NAME" >/dev/null && echo "  build ditukar & aplikasi di-restart"
REMOTE
  c_ok "Rollback selesai (catatan: kode & migrasi database tidak ikut dikembalikan)"
}

case "${1:-deploy}" in
  deploy)   deploy ;;
  status)   status ;;
  logs)     logs ;;
  rollback) rollback ;;
  help|-h|--help) usage ;;
  *) c_err "Perintah tidak dikenal: $1"; usage; exit 1 ;;
esac
