#!/usr/bin/env zsh
set -euo pipefail

# =========================
#  BLUTONIUM BACKUP SCRIPT
# =========================
# - nimmt DIRECT_DATABASE_URL (Fallback: DATABASE_URL)
# - erstellt DB-Dump (pg_dump --format=custom)
# - packt optional public/uploads
# - räumt alte Backups auf:
#     a) behalte nur die letzten N Dateien (count-basiert)
#     b) zusätzlich: lösche alles, was älter als X Tage ist (zeit-basiert)

# ---- Einstellungen ----------------------------------------------------------
# DB-URL aus Umgebung
DB_URL="${DIRECT_DATABASE_URL:-${DATABASE_URL:-}}"
if [[ -z "${DB_URL}" ]]; then
  echo "❌ Keine DB-URL gefunden. Bitte DIRECT_DATABASE_URL oder DATABASE_URL in .env setzen."
  exit 1
fi

# Zielordner für Backups
BACKUP_DIR="backups"
mkdir -p "$BACKUP_DIR"

# Ordner mit Upload-Bildern (optional)
UPLOADS_DIR="public/uploads"   # leer lassen, um Upload-Backup zu deaktivieren

# Anzahl-Behalte-Regel
KEEP_DB_DUMPS=20          # so viele DB-Dumps behalten
KEEP_UPLOAD_TARS=8        # so viele Upload-Archive behalten

# Zeit-Regel (zusätzlich zur Anzahl-Regel)
PRUNE_OLDER_THAN_DAYS=14  # alles löschen, was älter als 14 Tage ist

# Dateinamen mit Zeitstempel
TS="$(date +%F_%H-%M-%S)"
DB_DUMP="${BACKUP_DIR}/db_${TS}.dump"
UPLOAD_TAR="${BACKUP_DIR}/uploads_${TS}.tar.gz"

echo "▶️  Starte Backup um $(date '+%F %T')"
echo "    DB_URL: (ausgeblendet)"
echo "    Zielordner: ${BACKUP_DIR}"

# ---- 1) Datenbank dumpen ----------------------------------------------------
pg_dump "$DB_URL" --no-owner --format=custom --file "$DB_DUMP"
echo "✅ DB-Dump erstellt: ${DB_DUMP}"

# ---- 2) Optional: Uploads packen -------------------------------------------
if [[ -n "${UPLOADS_DIR}" && -d "${UPLOADS_DIR}" ]]; then
  # -C in das Elternverzeichnis wechseln, damit das Archiv sauber 'uploads/' enthält
  tar -C "$(dirname "$UPLOADS_DIR")" -czf "$UPLOAD_TAR" "$(basename "$UPLOADS_DIR")"
  echo "✅ Uploads gepackt: ${UPLOAD_TAR}"
else
  echo "ℹ️  UPLOADS_DIR '${UPLOADS_DIR}' nicht gefunden – überspringe Upload-Backup."
fi

# ---- 3) Aufräumen: alte Backups löschen ------------------------------------
# 3a) Behalte nur die neuesten N (count-basiert)
DB_TO_DELETE=($(ls -1t ${BACKUP_DIR}/db_*.dump 2>/dev/null | tail -n +$((KEEP_DB_DUMPS+1)) || true))
if (( ${#DB_TO_DELETE[@]} > 0 )); then
  echo "🧹 Entferne alte DB-Dumps (über ${KEEP_DB_DUMPS} Stück hinaus):"
  print -l -- $DB_TO_DELETE | sed 's/^/   - /'
  print -l -- $DB_TO_DELETE | xargs -I{} rm -f "{}"
fi

UP_TO_DELETE=($(ls -1t ${BACKUP_DIR}/uploads_*.tar.gz 2>/dev/null | tail -n +$((KEEP_UPLOAD_TARS+1)) || true))
if (( ${#UP_TO_DELETE[@]} > 0 )); then
  echo "🧹 Entferne alte Upload-Archive (über ${KEEP_UPLOAD_TARS} Stück hinaus):"
  print -l -- $UP_TO_DELETE | sed 's/^/   - /'
  print -l -- $UP_TO_DELETE | xargs -I{} rm -f "{}"
fi

# 3b) Zusätzlich alles löschen, was älter als X Tage ist (zeit-basiert)
if [[ -n "${PRUNE_OLDER_THAN_DAYS:-}" && "${PRUNE_OLDER_THAN_DAYS}" -gt 0 ]]; then
  find "${BACKUP_DIR}" -type f -mtime +${PRUNE_OLDER_THAN_DAYS} -print -delete \
    | sed 's/^/   - /' || true
  echo "🧽 Entfernt: Dateien älter als ${PRUNE_OLDER_THAN_DAYS} Tage."
fi

echo "🎉 Backup fertig um $(date '+%F %T')"