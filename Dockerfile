FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Créer le répertoire public s'il n'existe pas (requis par Next.js)
RUN mkdir -p ./public

ENV NEXT_TELEMETRY_DISABLED 1

RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Installer tsx globalement pour les migrations et seed
RUN npm install -g tsx

# Créer le répertoire public (même s'il est vide, Next.js en a besoin)
# Le répertoire public est vide, donc on le crée simplement sans copier depuis le builder
RUN mkdir -p ./public

# Copier le build standalone (le contenu de standalone est copié à la racine)
# Cela inclut server.js, node_modules, package.json, etc.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./

# Copier les fichiers statiques dans .next/static
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copier les scripts et fichiers nécessaires pour les migrations
COPY --from=builder --chown=nextjs:nodejs /app/scripts ./scripts
COPY --from=builder --chown=nextjs:nodejs /app/migrations ./migrations
COPY --from=builder --chown=nextjs:nodejs /app/lib ./lib
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json
COPY --from=builder --chown=nextjs:nodejs /app/tsconfig.json ./tsconfig.json
COPY --from=builder --chown=nextjs:nodejs /app/next.config.js ./next.config.js

# Installer les dépendances nécessaires pour les scripts (dotenv, pg) dans node_modules
# Ces packages sont nécessaires pour les scripts de migration et seed
RUN npm install dotenv pg --save --prefix /app

# Rendre le script railway-entrypoint.sh exécutable
RUN chmod +x scripts/railway-entrypoint.sh

USER nextjs

EXPOSE 3000

# Utiliser la variable PORT fournie par Railway (défaut: 3000)
# Ne pas forcer PORT=3000 pour permettre à Railway de définir son propre port
# Next.js standalone utilise automatiquement PORT et HOSTNAME
ENV HOSTNAME "0.0.0.0"

# Avec Next.js standalone, server.js est à la racine après copie
# Next.js standalone devrait automatiquement utiliser PORT et HOSTNAME
# Utiliser le script d'entrée Railway pour exécuter les migrations au démarrage
CMD ["sh", "scripts/railway-entrypoint.sh"]

