#!/usr/bin/env bash
# Pulihkan backup ke database TUJUAN. MENIMPA data yang ada di database tujuan.
# Pakai:  TARGET_DATABASE_URL=postgres://... ./scripts/restore.sh file.dump
# Sebaiknya uji dulu ke database kosong/terpisah, bukan langsung ke produksi.
set -euo pipefail
: "${TARGET_DATABASE_URL:?TARGET_DATABASE_URL belum diset}"
FILE="${1:?Sebutkan file .dump}"
read -r -p "Ini akan MENIMPA isi database tujuan. Ketik 'ya' untuk lanjut: " OK
[ "$OK" = "ya" ] || { echo "Dibatalkan."; exit 1; }
pg_restore --clean --if-exists --no-owner --no-privileges --dbname="$TARGET_DATABASE_URL" "$FILE"
echo "Restore selesai."
