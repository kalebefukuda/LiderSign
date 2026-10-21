#!/bin/sh
set -e

cd /app

if [ -d prisma/migrations ] && [ -n "$(ls -A prisma/migrations 2>/dev/null)" ]; then
    echo "[lidersign] aplicando migrações do banco..."
    prisma migrate deploy --schema prisma/schema.prisma
else
    echo "[lidersign] nenhuma migração encontrada: sincronizando o schema com o banco"
    prisma db push --skip-generate --schema prisma/schema.prisma
fi

echo "[lidersign] iniciando na porta ${PORT:-3000}"
exec node dist/main.js
