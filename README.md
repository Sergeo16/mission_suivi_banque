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

### Prérequis

- **Node.js** : Version 18 ou supérieure
- **npm** ou **yarn** : Gestionnaire de paquets Node.js
- **Docker** et **Docker Compose** (optionnel, pour le mode Docker)
- **PostgreSQL** : Version 14 ou supérieure (si installation locale)

---

## Modes de Lancement

### 🐳 Mode 1 : Développement avec Docker (Recommandé)

**Avantages :** Configuration automatique, pas besoin d'installer PostgreSQL localement, environnement isolé.

#### Installation initiale

1. Installer Docker et Docker Compose :
   - **macOS/Windows** : https://www.docker.com/products/docker-desktop
   - **Linux** : `sudo apt-get install docker.io docker-compose`

2. Lancer l'environnement de développement :
```bash
npm run docker:dev:build
```

Cette commande va :
- ✅ Créer et démarrer un conteneur PostgreSQL
- ✅ Créer et démarrer l'application Next.js
- ✅ Exécuter automatiquement les migrations et le seed au premier démarrage
- ✅ L'application sera accessible sur **http://localhost:3000** (local) et **http://VOTRE_IP:3000** (réseau local)

#### Commandes Docker disponibles

```bash
# Démarrer en mode développement (sans reconstruire)
npm run docker:dev

# Reconstruire et démarrer (après modifications du Dockerfile)
npm run docker:dev:build

# Arrêter les conteneurs
docker-compose -f docker-compose.dev.yml down

# Arrêter et supprimer les volumes (nettoyage complet)
docker-compose -f docker-compose.dev.yml down -v

# Voir les logs en temps réel
docker-compose -f docker-compose.dev.yml logs -f

# Voir les logs du conteneur web uniquement
docker-compose -f docker-compose.dev.yml logs web

# Voir les logs de la base de données
docker-compose -f docker-compose.dev.yml logs db

# Exécuter les migrations manuellement
docker-compose -f docker-compose.dev.yml exec web npm run migrate

# Exécuter le seed manuellement
docker-compose -f docker-compose.dev.yml exec web npm run seed

# Mettre à jour les rubriques depuis Excel
docker-compose -f docker-compose.dev.yml exec web npm run update-rubriques

# Accéder au shell du conteneur web
docker-compose -f docker-compose.dev.yml exec web sh

# Accéder à PostgreSQL directement
docker-compose -f docker-compose.dev.yml exec db psql -U mission_banque_user -d mission_banque_db
```

---

### 💻 Mode 2 : Développement local (sans Docker)

**Avantages :** Plus de contrôle, pas besoin de Docker, développement plus rapide.

#### Installation

1. **Installer les dépendances :**
```bash
npm install
```

2. **Installer et configurer PostgreSQL :**

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

3. **Configurer les variables d'environnement :**

   Créer un fichier `.env` à la racine du projet avec :
   ```env
   DATABASE_URL=postgresql://votre_utilisateur:votre_mot_de_passe@localhost:5432/mission_suivi_banque
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ADMIN_PASSWORD=admin123
   NODE_ENV=development
   ```
   
   **Note :** Remplacez `votre_utilisateur` et `votre_mot_de_passe` par vos identifiants PostgreSQL.
   - Par défaut sur macOS/Linux : `postgres` (sans mot de passe ou votre mot de passe)
   - Exemple : `DATABASE_URL=postgresql://postgres:monmotdepasse@localhost:5432/mission_suivi_banque`

4. **Initialiser la base de données :**
```bash
# Exécuter les migrations
npm run migrate

# Initialiser les données (rubriques, barème, utilisateur admin)
npm run seed

# Mettre à jour les rubriques depuis le fichier synthese.xlsx
npm run update-rubriques
```

   **Note :** L'étape `update-rubriques` remplit les colonnes `composante_evaluee`, `criteres_indicateurs` et `mode_verification` des rubriques avec les données du fichier Excel.

5. **Lancer le serveur de développement :**
```bash
npm run dev
```

L'application sera accessible sur :
- **Local** : http://localhost:3000
- **Réseau local** : http://VOTRE_IP:3000 (voir section "Accès depuis le réseau local" ci-dessous)

---

### 🚀 Mode 3 : Production avec Docker

**Pour déployer en production :**

```bash
npm run docker:prod:build
```

Cette commande va :
- ✅ Créer une image optimisée avec Next.js standalone
- ✅ Utiliser le fichier `docker-compose.yml` (production)
- ✅ Démarrer les conteneurs en mode production

**Commandes production :**
```bash
# Démarrer en production
npm run docker:prod

# Reconstruire et démarrer en production
npm run docker:prod:build

# Arrêter les conteneurs de production
docker-compose down
```

---

## Commandes NPM Disponibles

### Développement
```bash
npm run dev              # Lancer le serveur de développement (mode local)
npm run build            # Construire l'application pour la production
npm run start            # Lancer le serveur de production (après build)
npm run lint             # Vérifier le code avec ESLint
```

### Base de données
```bash
npm run migrate          # Exécuter les migrations SQL
npm run seed             # Initialiser les données (rubriques, barème, admin)
npm run update-rubriques # Mettre à jour les rubriques depuis synthese.xlsx
```

### Docker - Développement
```bash
npm run docker:dev           # Démarrer les conteneurs de développement
npm run docker:dev:build    # Reconstruire et démarrer les conteneurs
```

### Docker - Production
```bash
npm run docker:prod          # Démarrer les conteneurs de production
npm run docker:prod:build   # Reconstruire et démarrer les conteneurs de production
```

## Dépannage

### Erreur "ECONNREFUSED" (installation locale)

Si vous obtenez une erreur de connexion à la base de données :

1. **Vérifiez que PostgreSQL est démarré :**
   - **macOS** : `brew services list` (doit afficher "started")
   - **Linux** : `sudo systemctl status postgresql`
   - **Windows** : Vérifier dans les services Windows

2. **Vérifiez que la base de données existe :**
   ```bash
   psql -l | grep mission_suivi_banque
   ```
   Si elle n'existe pas, créez-la :
   ```bash
   createdb mission_suivi_banque
   ```

3. **Vérifiez votre fichier `.env` et la variable `DATABASE_URL`**
   - Format attendu : `postgresql://utilisateur:motdepasse@localhost:5432/mission_suivi_banque`
   - Vérifiez que les identifiants sont corrects

### Problèmes avec Docker

**Les conteneurs ne démarrent pas :**
```bash
# Arrêter tous les conteneurs
docker-compose -f docker-compose.dev.yml down

# Relancer
npm run docker:dev:build
```

**Nettoyage complet (supprime aussi les volumes et données) :**
```bash
docker-compose -f docker-compose.dev.yml down -v
```

**Vérifier les logs pour diagnostiquer :**
```bash
# Logs de tous les conteneurs
docker-compose -f docker-compose.dev.yml logs -f

# Logs du conteneur web uniquement
docker-compose -f docker-compose.dev.yml logs web

# Logs de la base de données
docker-compose -f docker-compose.dev.yml logs db
```

**Erreur "port already in use" :**
- Le port 3000 ou 5432 est déjà utilisé
- Arrêtez l'application qui utilise le port ou modifiez les ports dans `docker-compose.dev.yml`

**Erreur de permissions Docker :**
- Sur Linux, ajoutez votre utilisateur au groupe docker : `sudo usermod -aG docker $USER`
- Redémarrez votre session

### Problèmes de migrations

**Les migrations échouent :**
```bash
# En Docker
docker-compose -f docker-compose.dev.yml exec web npm run migrate

# En local
npm run migrate
```

**Réinitialiser complètement la base de données :**
```bash
# ⚠️ ATTENTION : Cela supprime toutes les données !
# En Docker
docker-compose -f docker-compose.dev.yml down -v
npm run docker:dev:build

# En local
dropdb mission_suivi_banque
createdb mission_suivi_banque
npm run migrate
npm run seed
npm run update-rubriques
```

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

- Email : `sergeobusiness1@gmail.com`
- Mot de passe : `Pass_w0rd`
- Rôle : `admin`

## Accès à l'Application

### Accès local (sur la même machine)

- **Page principale** : http://localhost:3000
- **Page d'administration** : http://localhost:3000/admin

### Accès depuis le réseau local

L'application est configurée pour être accessible depuis d'autres machines sur le même réseau local.

#### 1. Trouver votre adresse IP locale

**Sur Windows :**
```bash
ipconfig
```
Cherchez la ligne "Adresse IPv4" sous votre connexion réseau active (généralement commence par `192.168.x.x` ou `10.x.x.x`)

**Sur macOS/Linux :**
```bash
# macOS
ifconfig | grep "inet " | grep -v 127.0.0.1

# Linux
ip addr show | grep "inet " | grep -v 127.0.0.1

# Ou plus simplement
hostname -I
```

#### 2. Accéder depuis une autre machine

Une fois que vous avez votre adresse IP locale (par exemple `192.168.1.100`), vous pouvez accéder à l'application depuis n'importe quelle machine sur le même réseau :

- **Page principale** : http://192.168.1.100:3000
- **Page d'administration** : http://192.168.1.100:3000/admin

**Remplacez `192.168.1.100` par votre propre adresse IP.**

#### 3. Configuration du pare-feu

Si vous ne pouvez pas accéder depuis une autre machine, vérifiez que le pare-feu autorise les connexions sur le port 3000 :

**Windows :**
```bash
# Ouvrir le port 3000 dans le pare-feu Windows
netsh advfirewall firewall add rule name="Next.js Dev Server" dir=in action=allow protocol=TCP localport=3000
```

**macOS :**
- Allez dans **Préférences Système** > **Sécurité et confidentialité** > **Pare-feu**
- Cliquez sur **Options du pare-feu** et ajoutez une exception pour le port 3000

**Linux (UFW) :**
```bash
sudo ufw allow 3000/tcp
```

#### 4. Configuration Docker (optionnel)

Si vous utilisez Docker et souhaitez que `NEXT_PUBLIC_APP_URL` utilise votre IP réseau au lieu de localhost, modifiez `docker-compose.dev.yml` :

```yaml
environment:
  NEXT_PUBLIC_APP_URL: http://192.168.1.100:3000  # Remplacez par votre IP
```

Puis redémarrez les conteneurs :
```bash
docker-compose -f docker-compose.dev.yml down
npm run docker:dev:build
```

### Fonctionnalités

**Page principale** (`/`) :
- Saisie des évaluations par les agents
- Formulaire guidé : Ville → Établissement → Période → Contrôleur → Volet
- Évaluation des 12 rubriques par volet avec notes (1-5) et observations

**Page d'administration** (`/admin`) :
- **Accès** : Direct (authentification désactivée)
- **Synthèse** : Filtres et export Excel des évaluations
- **Maintenance** : Activer/désactiver le mode maintenance
- **Utilisateurs** : Gestion des utilisateurs (à venir)
- **Référentiels** : Gestion des villes, établissements, missions, contrôleurs (à venir)

## Notes Importantes

- ⚠️ **Authentification désactivée** : La page `/admin` est accessible sans authentification
- 🔒 **Sécurité réseau** : L'accès depuis le réseau local expose l'application à toutes les machines sur le même réseau. En production, utilisez un reverse proxy (nginx, traefik) avec HTTPS et authentification.
- 🔧 **Mode maintenance** : Permet de bloquer l'accès à l'application (sauf admin)
- 📊 **Rubriques** : Les rubriques sont pré-définies pour chaque volet (FI, F_QS, F_GAB)
- 📁 **Export Excel** : Génère un classeur avec une feuille par combinaison (Ville, Établissement) pour chaque volet
- 📝 **Fichier synthese.xlsx** : Doit être présent à la racine du projet pour mettre à jour les rubriques
- 🌐 **Accès réseau** : L'application écoute sur `0.0.0.0` par défaut, ce qui permet l'accès depuis le réseau local. Assurez-vous que votre pare-feu est correctement configuré.

