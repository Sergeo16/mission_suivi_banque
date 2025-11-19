# Guide de Déploiement sur Render

Guide étape par étape pour déployer votre application sur Render.

## 🚀 Déploiement Rapide

### Étape 1 : Créer un compte Render

1. Allez sur https://render.com
2. Créez un compte (gratuit)
3. Connectez votre compte GitHub

### Étape 2 : Créer la base de données PostgreSQL

1. Dans votre dashboard Render, cliquez sur **"New +"**
2. Sélectionnez **"PostgreSQL"**
3. Configuration :
   - **Name** : `mission-suivi-banque-db`
   - **Database** : `mission_suivi_banque`
   - **User** : `mission_banque_user`
   - **Plan** : Free (ou Starter pour éviter le sleep)
4. Cliquez sur **"Create Database"**
5. Notez la `Internal Database URL` (sera utilisée automatiquement)

### Étape 3 : Créer le service web

#### Option A : Utiliser render.yaml (Recommandé)

1. Assurez-vous que `render.yaml` est dans votre dépôt
2. Dans Render, cliquez sur **"New +"** > **"Blueprint"**
3. Connectez votre dépôt GitHub
4. Render détectera automatiquement `render.yaml`
5. Cliquez sur **"Apply"**

#### Option B : Configuration manuelle

1. Cliquez sur **"New +"** > **"Web Service"**
2. Connectez votre dépôt GitHub
3. Sélectionnez le dépôt `mission_suivi_banque`
4. Configuration :
   - **Name** : `mission-suivi-banque`
   - **Environment** : `Docker`
   - **Region** : Choisissez la région la plus proche
   - **Branch** : `main`
   - **Root Directory** : `/` (racine)
   - **Dockerfile Path** : `./Dockerfile`
   - **Docker Context** : `.`
   - **Plan** : Free

5. **Variables d'environnement** :
   - `NODE_ENV` = `production`
   - `DATABASE_URL` = Cliquez sur **"Link Resource"** et sélectionnez votre base de données PostgreSQL
   - `NEXT_PUBLIC_APP_URL` = Votre URL Render (ex: `https://mission-suivi-banque.onrender.com`)
   - `ADMIN_PASSWORD` = `admin123` (changez en production)

6. Cliquez sur **"Create Web Service"**

### Étape 4 : Attendre le déploiement

Render va :
1. ✅ Construire l'image Docker
2. ✅ Exécuter automatiquement les migrations (via `railway-entrypoint.sh`)
3. ✅ Exécuter le seed
4. ✅ Démarrer l'application

### Étape 5 : Obtenir votre URL

Une fois le déploiement terminé :
1. Render génère automatiquement une URL : `https://mission-suivi-banque.onrender.com`
2. Mettez à jour `NEXT_PUBLIC_APP_URL` avec cette URL si nécessaire
3. Redéployez pour appliquer les changements

## 🔧 Configuration Avancée

### Éviter le "Sleep" (Plan Free)

Le plan gratuit "sleep" après 15 minutes d'inactivité. Pour éviter cela :

1. **Option 1** : Utiliser un service de monitoring (gratuit)
   - UptimeRobot : https://uptimerobot.com
   - Ping votre URL toutes les 5 minutes

2. **Option 2** : Passer au plan Starter ($7/mois)
   - Pas de sleep
   - Plus de ressources

### Migrer les données depuis Railway

Si vous avez des données sur Railway à migrer :

```bash
# 1. Exporter depuis Railway
pg_dump $RAILWAY_DATABASE_URL > backup.sql

# 2. Importer vers Render
# Récupérez la DATABASE_URL depuis Render > Database > Internal Database URL
psql $RENDER_DATABASE_URL < backup.sql
```

## 🐛 Dépannage

### L'application ne démarre pas

1. Vérifiez les logs dans Render > Logs
2. Assurez-vous que `DATABASE_URL` est bien lié à votre base de données
3. Vérifiez que toutes les variables d'environnement sont définies

### Les migrations échouent

Les migrations s'exécutent automatiquement au démarrage. Si elles échouent :
1. Consultez les logs pour voir l'erreur
2. Vous pouvez exécuter manuellement via Render Shell :
   - Render > Shell
   - `npm run migrate`

### L'application "sleep" trop souvent

- Utilisez UptimeRobot pour ping votre URL
- Ou passez au plan Starter

## 📝 Notes Importantes

- **Plan Free** : Services "sleep" après 15 min d'inactivité
- **PostgreSQL Free** : Valable 90 jours, puis $7/mois ou recréer
- **Build Time** : Limité à 90 minutes sur le plan gratuit
- **Bandwidth** : 100GB/mois sur le plan gratuit

## 🔄 Mise à jour

Pour mettre à jour l'application :
1. Poussez vos changements sur GitHub
2. Render détectera automatiquement et redéploiera
3. Les migrations seront réexécutées automatiquement

## 📚 Ressources

- Documentation Render : https://render.com/docs
- Support Render : https://render.com/docs/support

