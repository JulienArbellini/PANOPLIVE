# Project Context

## Objet du projet

Site vitrine deployable sur Vercel pour le groupe Panoplie, avec:

- un front public SEO/performance en Next.js App Router
- un mode edition accessible via `/admin`
- une publication du contenu via commit GitHub API sur `main`
- un contenu centralise dans `content/site.json`
- des uploads medias via Cloudinary

Le projet a ete pense pour etre editable localement et en production, sans CMS externe.

## Stack verrouillee

- Next.js 16 App Router
- TypeScript strict
- Tailwind CSS
- Vercel Analytics
- GitHub API pour publier `content/site.json`
- Cloudinary pour les images
- YouTube comme source media principale pour clips et playlist album
- Three.js pour le lecteur album immersif

## Architecture actuelle

### Front public

- Route publique principale: `/`
- Le rendu public s'appuie sur `content/site.json`
- Le composant principal est [src/components/site/page-content.tsx](/Users/arbellini/Travail/DEV/2026/GUS/src/components/site/page-content.tsx)
- Les effets de fond/cursor sont geres par [src/components/site/interactive-effects.tsx](/Users/arbellini/Travail/DEV/2026/GUS/src/components/site/interactive-effects.tsx)

### Edition / Admin

- Login: `/admin/login`
- Interface admin: `/admin`
- Le mode edition a evolue vers une logique plus visuelle, proche de l'affichage reel du site
- Le contenu publie est lu via API admin puis edite avant publication

### Contenu

- Source versionnee: [content/site.json](/Users/arbellini/Travail/DEV/2026/GUS/content/site.json)
- Typage principal: [src/types/content.ts](/Users/arbellini/Travail/DEV/2026/GUS/src/types/content.ts)
- Les sections couvrent: hero, album, clips, concerts, groupe, reseaux, contact, SEO, navigation

## Workflow de publication

- Le contenu publie est stocke dans `content/site.json` dans le repo GitHub
- L'admin peut publier directement sur `main`
- Vercel redeploie automatiquement a chaque mise a jour de `main`

Important:

- Le repo doit deja contenir `content/site.json`, sinon l'API admin renvoie une erreur
- Le workflow est volontairement sans PR ni CMS tiers

## Variables d'environnement attendues

Les variables existent dans `.env.local` et `.env.example`.

### Admin

- `ADMIN_EMAIL`
- `ADMIN_PASSWORD_HASH`
- `SESSION_SECRET`

### GitHub

- `GITHUB_OWNER`
- `GITHUB_REPO`
- `GITHUB_BRANCH`
- `GITHUB_TOKEN`
- `GITHUB_CONTENT_PATH`

### Cloudinary

- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`

### Site / reseaux

- `NEXT_PUBLIC_SITE_URL`
- variables YouTube / Instagram selon les integrations en place

Note de securite:

- Ne jamais commiter `.env.local`
- Si des tokens/secrets ont ete exposes un jour, les regenerer

## Decisions produit prises pendant les discussions

### 1. Direction generale

- V1 en francais uniquement
- Design tres immersif, cosmique, psychdelique, introspectif
- Reprise du prototype HTML/CSS/JS fourni par l'utilisateur comme reference visuelle
- Pas de backend d'envoi mail: l'email de contact est affiche

### 2. Edition

- Le besoin initial etait une edition classique dans `/admin`
- Ensuite, le besoin a evolue vers un mode edition plus visuel, proche du rendu reel de la page
- Le but est que le contenu garde au maximum les memes attributs esthetiques entre mode public et mode edition

### 3. Section groupe

- La presentation des membres devait coller au prototype original
- Le rendu vise une structure "pellicule photo" / accordéon au hover
- La largeur a ete volontairement contenue pour eviter un etalement pleine page

### 4. Section clips

- Les clips doivent pouvoir afficher les videos YouTube
- Le besoin a ensuite evolue pour afficher tous les clips disponibles, pas seulement quelques cartes statiques
- Une erreur de mismatch d'hydratation a ete corrigee autour des iframes YouTube

### 5. Reseaux sociaux

- Souhait d'afficher automatiquement les dernieres publications
- Discussion sur les limites d'acces selon la propriete du compte
- L'integration depend des droits d'acces API et du fournisseur

### 6. Ecoute de l'album

- L'utilisateur voulait proposer l'ecoute de l'album directement sur le site
- La piste retenue a ete une playlist YouTube, plus permissive pour ce cas
- Le lecteur devait se comporter comme un lecteur musical plutot qu'un lecteur video

## Evolution du lecteur album

### Etape 1

- Lecteur plus simple base sur YouTube playlist

### Etape 2

- Concept "Miroir Liquide" inline dans la section album
- Gestes:
  - tap centre = play/pause
  - swipe = piste precedente / suivante
- Etat visuel:
  - loading
  - ready
  - playing
  - paused
  - error

### Etape 3

- Le lecteur devait devenir beaucoup plus spectaculaire
- Plusieurs references visuelles ont ete fournies par l'utilisateur
- La direction retenue est devenue:
  - disque miroir
  - webcam optionnelle comme reflet vivant
  - ambiance luxe / sombre / liquide / introspective

### Etape 4

- Refactor de la logique YouTube dans [src/components/site/use-youtube-playlist-player.ts](/Users/arbellini/Travail/DEV/2026/GUS/src/components/site/use-youtube-playlist-player.ts)
- Le composant visuel principal du lecteur est [src/components/site/dream-mirror-player.tsx](/Users/arbellini/Travail/DEV/2026/GUS/src/components/site/dream-mirror-player.tsx)

### Etape 5: passage a Three.js

- Le disque est maintenant rendu en WebGL avec Three.js
- Le shader simule:
  - reflets miroir
  - distorsion liquide
  - chromatic shift
  - grain subtil
  - rainures type vinyle
  - highlights anisotropes
- Le rendu varie selon l'etat de lecture
- Le disque peut melanger pochette + webcam
- Il y a des elements reactifs autour du disque:
  - ticks exterieurs
  - barres reactives circulaires
  - particules
  - halo / sheen

### Etape 6: ajustements recents

- Un anneau 3D traversait visuellement le disque comme une "barre"
- Cet anneau a finalement ete retire completement a la demande de l'utilisateur

## Etat actuel du lecteur

Fichiers principaux:

- [src/components/site/dream-mirror-player.tsx](/Users/arbellini/Travail/DEV/2026/GUS/src/components/site/dream-mirror-player.tsx)
- [src/components/site/use-youtube-playlist-player.ts](/Users/arbellini/Travail/DEV/2026/GUS/src/components/site/use-youtube-playlist-player.ts)
- [src/app/globals.css](/Users/arbellini/Travail/DEV/2026/GUS/src/app/globals.css)

Comportement actuel:

- lecture YouTube playlist invisible
- gestuelle tactile et pointeur
- activation webcam lors de la lecture si l'utilisateur l'accepte
- webcam coupee quand la lecture est en pause
- fallback si WebGL indisponible
- design mobile allege par rapport au desktop

## Probleme rencontres et resolutions importantes

### Auth admin

- Le hash bcrypt dans `.env.local` devait etre correctement echappe/localement pris en compte
- Le login attend le mot de passe non hashe cote utilisateur

### Contenu admin introuvable

- `GET /api/admin/content 500` survenait si `content/site.json` n'etait pas encore present sur le repo GitHub cible

### Git pull avec branches divergentes

- Le repo a rencontre un `git pull` bloque a cause d'un historique divergent
- Le rebase avec `--autostash` a ete utilise
- Un conflit a eu lieu dans `content/site.json` puis a ete resolu

### Hydration YouTube

- Un mismatch React est apparu sur les iframes YouTube
- Correction via rendu plus stable cote client et suppression d'attributs dynamiques parasites

## Nettoyage / review deja effectues

Une passe de nettoyage a deja ete faite sur le code:

- suppression de code mort commente
- reduction de duplication sur certains mappings de champs
- nettoyage de listeners non correctement detaches
- correction d'un style d'erreur inefficace
- meilleure gestion de la webcam pendant pause/lecture

## Points visuels que l'utilisateur a explicitement demandes

- le mode edition doit rester tres proche du site public
- les membres doivent respecter l'esprit du prototype initial
- le lecteur album doit etre spectaculaire et non generique
- le disque doit etre au centre du concept visuel album
- pas d'anneau/barre parasite traversant le disque

## Etat de verification connu

Au moment de cette synthese:

- `npm run build` passe
- `npm run lint` passe hors warnings `next/image` deja connus sur certaines balises `<img>`

## Warnings / dettes connues

- Plusieurs images du site utilisent encore `<img>` au lieu de `next/image`
- Le lecteur simule une energie audio visuelle, pas une vraie analyse du signal YouTube
- La webcam depend des permissions navigateur et du contexte HTTPS en production

## Reprise rapide pour un futur intervenant

Si quelqu'un reprend le projet, commencer par:

1. Lire [content/site.json](/Users/arbellini/Travail/DEV/2026/GUS/content/site.json)
2. Lire [src/types/content.ts](/Users/arbellini/Travail/DEV/2026/GUS/src/types/content.ts)
3. Lire [src/components/site/page-content.tsx](/Users/arbellini/Travail/DEV/2026/GUS/src/components/site/page-content.tsx)
4. Lire [src/components/site/dream-mirror-player.tsx](/Users/arbellini/Travail/DEV/2026/GUS/src/components/site/dream-mirror-player.tsx)
5. Lire [src/components/site/use-youtube-playlist-player.ts](/Users/arbellini/Travail/DEV/2026/GUS/src/components/site/use-youtube-playlist-player.ts)
6. Verifier `.env.local` sans jamais exposer les secrets

## Intention generale a ne pas perdre

Le projet n'est pas un simple site de groupe "standard". L'intention demandee est une experience editoriale et sensorielle:

- onirique
- introspective
- miroir / reflets / double
- pop psyche
- visuellement marquee

Tout changement futur devrait proteger cette direction au lieu de revenir vers un layout trop neutre ou trop generique.
