#!/bin/bash
set -eu
cd "$(dirname "$0")"
mkdir -p datos/imagenes
if [ -f .env ]; then
  echo "Se conserva la configuración existente en .env."
  exit 0
fi
umask 077
temp_env=$(mktemp .env.tmp.XXXXXX)
trap 'rm -f "$temp_env"' EXIT
db_password=$(openssl rand -hex 24)
jwt_secret=$(openssl rand -hex 32)
sed -e "s/^DB_PASSWORD=$/DB_PASSWORD=$db_password/" \
    -e "s/^JWT_SECRET=$/JWT_SECRET=$jwt_secret/" .env.example > "$temp_env"
# Un enlace exclusivo evita sobrescribir las claves si dos terminales se abren a la vez.
if ln "$temp_env" .env 2>/dev/null; then
  echo "Configuración local creada en .env."
elif [ -f .env ]; then
  echo "Se conserva la configuración existente en .env."
else
  echo "No se pudo crear .env en esta carpeta." >&2
  exit 1
fi
