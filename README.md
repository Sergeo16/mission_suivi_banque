# Mission Suivi Banque - Plateforme d'Évaluation

Application web complète pour l'évaluation des banques par des agents de terrain.

## Stack Technique

- **Framework**: Next.js 14 (App Router)
- **Langage**: TypeScript
- **Base de données**: PostgreSQL
- **Styling**: Tailwind CSS + DaisyUI
- **Authentification**: Sessions avec tokens
- **Export**: Excel (xlsx)

## Installation

### Option 1 : Avec Docker (Recommandé)

1. Installer Docker et Docker Compose :
   - macOS/Windows : https://www.docker.com/products/docker-desktop
   - Linux : `sudo apt-get install docker.io docker-compose`

2. Lancer l'environnement de développement :
```bash
npm run docker:dev:build
```

Cela va :
- Créer et démarrer un conteneur PostgreSQL
- Créer et démarrer l'application Next.js
- Exécuter automatiquement les migrations et le seed au premier démarrage

L'application sera accessible sur http://localhost:3000

**Commandes Docker utiles :**
```bash
# Démarrer en mode développement
npm run docker:dev

# Reconstruire et démarrer
npm run docker:dev:build

# Arrêter les conteneurs
docker-compose -f docker-compose.dev.yml down

# Voir les logs
docker-compose -f docker-compose.dev.yml logs -f

# Exécuter les migrations manuellement
docker-compose -f docker-compose.dev.yml exec web npm run migrate

# Exécuter le seed manuellement
docker-compose -f docker-compose.dev.yml exec web npm run seed
```

### Option 2 : Installation locale (sans Docker)

1. Installer les dépendances :
```bash
npm install
```

2. Installer et configurer PostgreSQL :

   **Sur macOS (avec Homebrew) :**
   ```bash
   # Installer PostgreSQL
   brew install postgresql@14
   
   # Démarrer PostgreSQL
   brew services start postgresql@14
   
   # Créer la base de données
   createdb mission_suivi_banque
   ```

   **Sur Linux (Ubuntu/Debian) :**
   ```bash
   # Installer PostgreSQL
   sudo apt-get update
   sudo apt-get install postgresql postgresql-contrib
   
   # Démarrer PostgreSQL
   sudo systemctl start postgresql
   sudo systemctl enable postgresql
   
   # Créer la base de données (en tant qu'utilisateur postgres)
   sudo -u postgres createdb mission_suivi_banque
   ```

   **Sur Windows :**
   - Télécharger et installer PostgreSQL depuis https://www.postgresql.org/download/windows/
   - Créer la base de données via pgAdmin ou en ligne de commande :
   ```bash
   createdb -U postgres mission_suivi_banque
   ```

3. Configurer les variables d'environnement :
   Créer un fichier `.env` à la racine avec :
   ```
   DATABASE_URL=postgresql://votre_utilisateur:votre_mot_de_passe@localhost:5432/mission_suivi_banque
   ADMIN_PASSWORD=admin123
   ```
   
   **Note :** Remplacez `votre_utilisateur` et `votre_mot_de_passe` par vos identifiants PostgreSQL.
   - Par défaut sur macOS/Linux : `postgres` (sans mot de passe ou votre mot de passe)
   - Exemple : `DATABASE_URL=postgresql://postgres:monmotdepasse@localhost:5432/mission_suivi_banque`

4. Exécuter les migrations :
```bash
npm run migrate
```

5. Initialiser les données (rubriques, barème, utilisateur admin) :
```bash
npm run seed
```

6. Lancer le serveur de développement :
```bash
npm run dev
```

## Production avec Docker

Pour déployer en production :

```bash
npm run docker:prod:build
```

Cela va créer une image optimisée avec Next.js standalone.

## Dépannage

### Erreur "ECONNREFUSED" (installation locale)
Si vous obtenez une erreur de connexion :
1. Vérifiez que PostgreSQL est démarré :
   - macOS : `brew services list` (doit afficher "started")
   - Linux : `sudo systemctl status postgresql`
2. Vérifiez que la base de données existe : `psql -l | grep mission_suivi_banque`
3. Vérifiez votre fichier `.env` et la variable `DATABASE_URL`

### Problèmes avec Docker
- Si les conteneurs ne démarrent pas : `docker-compose -f docker-compose.dev.yml down` puis relancer
- Pour nettoyer complètement : `docker-compose -f docker-compose.dev.yml down -v` (supprime aussi les volumes)
- Vérifier les logs : `docker-compose -f docker-compose.dev.yml logs web` ou `docker-compose -f docker-compose.dev.yml logs db`

## Structure du Projet

- `/app` : Pages et routes API Next.js
- `/lib` : Utilitaires (DB, auth, validation, maintenance)
- `/migrations` : Scripts SQL de migration
- `/scripts` : Scripts de migration et seed

## Fonctionnalités

### Authentification
- Connexion avec email/mot de passe
- Sessions sécurisées avec tokens
- Rôles : admin, superviseur, agent

### Interface Agents
- Saisie des évaluations avec 3 volets :
  - Fonctionnement Interne (FI)
  - Qualité de Service (F_QS)
  - GAB (F_GAB)
- 12 rubriques par volet
- Notes de 1 à 5 avec commentaires

### Dashboard Admin/Superviseur
- Filtres par mission, ville, établissement, contrôleur, volet
- Statistiques et moyennes
- Export Excel des moyennes (un classeur par volet)

### Administration
- Mode maintenance (ON/OFF)
- Gestion des utilisateurs
- Gestion des référentiels (villes, établissements, missions, contrôleurs)

## Utilisateur par défaut

- Email : `admin@example.com`
- Mot de passe : `admin123` (ou celui défini dans ADMIN_PASSWORD)

## Notes

- Le mode maintenance bloque l'accès sauf pour les administrateurs
- Les rubriques sont pré-définies pour chaque volet
- L'export Excel génère un classeur avec une feuille par volet

