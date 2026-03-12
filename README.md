# PANOPLIVE

Site vitrine du groupe Panoplie, en Next.js, avec une interface d'edition admin et publication via GitHub API pour deploiement automatique sur Vercel.

## Stack

- Next.js (App Router) + TypeScript + Tailwind CSS
- Admin protege (`/admin/login` -> `/admin`)
- Contenu source: `content/site.json`
- Publication: commit direct sur `main` via GitHub API
- Upload images: Cloudinary signe cote serveur
- Analytics: Vercel Analytics

## Demarrage local

```bash
npm install
cp .env.example .env.local
npm run dev
```

## Configuration auth admin

1. Genere un hash bcrypt:

```bash
npm run hash-password -- "votre-mot-de-passe"
```

2. Renseigne dans `.env.local`:

- `ADMIN_EMAIL`
- `ADMIN_PASSWORD_HASH`
- `SESSION_SECRET`

## Configuration publication GitHub

Pour publier depuis l'admin en ligne:

- `GITHUB_OWNER`
- `GITHUB_REPO`
- `GITHUB_BRANCH` (par defaut `main`)
- `GITHUB_TOKEN` (token avec permissions `contents:write`)
- `GITHUB_CONTENT_PATH` (par defaut `content/site.json`)

Si ces variables ne sont pas definies, l'API publie en mode local (ecriture fichier locale uniquement).

## Configuration Cloudinary

- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`

Depuis `/admin`, chaque champ image propose un upload vers Cloudinary.

## Workflow edition

1. Aller sur `/admin/login`
2. Editer les sections (SEO, hero, album, clips, concerts, membres, footer)
3. Cliquer `Publier`
4. Le JSON est commit sur `main`
5. Vercel redeploie automatiquement

## Deploiement Vercel

1. Connecter le repo GitHub a Vercel
2. Ajouter les variables d'environnement du `.env.example` dans Vercel
3. Push sur `main` ou publier depuis l'admin

## Routes

- Public: `/`
- Admin: `/admin/login`, `/admin`
- API:
  - `POST /api/admin/login`
  - `POST /api/admin/logout`
  - `GET /api/admin/content`
  - `POST /api/admin/publish`
  - `POST /api/admin/cloudinary/sign`
