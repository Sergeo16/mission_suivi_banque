#!/bin/sh

echo "â³ Attente de la base de donnÃ©es..."
# Attendre que PostgreSQL soit prÃªt
# D'abord vÃ©rifier que le serveur PostgreSQL rÃ©pond
until pg_isready -h db -U mission_banque_user > /dev/null 2>&1; do
  echo "â³ En attente de PostgreSQL..."
  sleep 2
done

# Ensuite vÃ©rifier que la base de donnÃ©es existe et est accessible
until pg_isready -h db -U mission_banque_user -d mission_banque_db > /dev/null 2>&1; do
  echo "â³ En attente que la base de donnÃ©es soit prÃªte..."
  sleep 2
done

echo "âœ… Base de donnÃ©es prÃªte!"

# ExÃ©cuter les migrations
echo "ðŸ”„ ExÃ©cution des migrations..."
npm run migrate || echo "âš ï¸  Migrations dÃ©jÃ  exÃ©cutÃ©es ou erreur (non bloquant)"

# ExÃ©cuter le seed
echo "ðŸŒ± ExÃ©cution du seed..."
npm run seed || echo "âš ï¸  Seed dÃ©jÃ  exÃ©cutÃ© ou erreur (non bloquant)"

echo "âœ… Initialisation terminÃ©e!"

# ExÃ©cuter la commande passÃ©e en paramÃ¨tre (gÃ©nÃ©ralement npm install && npm run dev)
exec "$@"
