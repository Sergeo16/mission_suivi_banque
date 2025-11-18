#!/bin/sh
set -e

echo "⏳ Attente de la base de données..."
# Attendre que PostgreSQL soit prêt
# Utiliser les variables d'environnement du docker-compose
until pg_isready -h db -U mission_banque_user -d mission_banque_db > /dev/null 2>&1; do
  echo "⏳ En attente de PostgreSQL..."
  sleep 2
done

echo "✅ Base de données prête!"

# Exécuter les migrations
echo "🔄 Exécution des migrations..."
npm run migrate || echo "⚠️  Migrations déjà exécutées ou erreur (non bloquant)"

# Exécuter le seed
echo "🌱 Exécution du seed..."
npm run seed || echo "⚠️  Seed déjà exécuté ou erreur (non bloquant)"

echo "✅ Initialisation terminée!"

# Exécuter la commande passée en paramètre (généralement npm install && npm run dev)
exec "$@"

