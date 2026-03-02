#!/bin/sh
# entrypoint.sh — roda seed na primeira vez, depois sobe o servidor

echo "🚔 SIGPOL Backend iniciando..."

# Aguarda o banco estar pronto (redundante com healthcheck, mas seguro)
echo "Aguardando PostgreSQL..."
sleep 2

# Roda o seed se a flag não existir
SEED_FLAG="/app/logs/.seed_done"
if [ ! -f "$SEED_FLAG" ]; then
  echo "📦 Executando seed de usuários iniciais..."
  node /app/src/seed.js && touch "$SEED_FLAG" || echo "⚠ Seed falhou (banco pode não estar pronto ainda)"
fi

# Inicia o servidor
echo "🟢 Iniciando API..."
exec node src/server.js
