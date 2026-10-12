#!/usr/bin/env bash
# Backup database Finka ke file .dump (format custom pg_dump, terkompresi).
# Pakai:  DATABASE_URL=postgres://... ./scripts/backup.sh [folder_tujuan]
# Simpan hasilnya DI LUAR server (Google Drive, S3, dll), bukan hanya di mesin yang sama.
set -euo pipefail
: "${DATABASE_URL:?DATABASE_URL belum diset}"
DIR="${1:-./backups}"
KEEP="${KEEP:-14}"            # simpan N backup terbaru
mkdir -p "$DIR"
FILE="$DIR/finka-$(date +%Y%m%d-%H%M%S).dump"
pg_dump --format=custom --no-owner --no-privileges --file="$FILE" "$DATABASE_URL"
# pastikan file bisa dibaca kembali sebelum dianggap berhasil
pg_restore --list "$FILE" > /dev/null
echo "Backup OK: $FILE ($(du -h "$FILE" | cut -f1))"
ls -1t "$DIR"/finka-*.dump | tail -n +$((KEEP+1)) | xargs -r rm -f
