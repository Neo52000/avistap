# AvisTap — La plaque avis

[![CI](https://github.com/Neo52000/avistap/actions/workflows/ci.yml/badge.svg)](https://github.com/Neo52000/avistap/actions/workflows/ci.yml)

Plateforme e-commerce des plaques NFC « avis Google » : un tunnel de vente
public et un back office pensé comme une liste de tâches d'atelier.

Un client configure sa plaque, paie, et reçoit un lien de suivi. Côté atelier,
la **Queue de production** affiche ce qu'il faut fabriquer — nom de
l'établissement, options, logo à télécharger et lien à encoder sur la puce —
avec les boutons pour faire avancer la commande depuis un smartphone.

## Stack

| Brique | Choix |
|---|---|
| Framework | Next.js 15 (App Router) · React 19 · TypeScript |
| Styles | Tailwind CSS 4 (configuration CSS-first, pas de `tailwind.config.js`) |
| Base, auth, stockage | Supabase (PostgreSQL, Auth, Storage) |
| Paiement | Stripe Checkout + webhook |
| Emails | Brevo (optionnel) |
| Hébergement | Netlify |

## Démarrage

```bash
npm install
cp .env.example .env.local   # puis renseigner les valeurs
npm run dev
```

### Variables d'environnement

Tout est documenté dans `.env.example`. Les trois indispensables :

- `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_ANON_KEY` — tableau de
  bord Supabase, *Project Settings → API*.
- `SUPABASE_SERVICE_ROLE_KEY` — même écran. **Contourne la RLS** : uniquement
  côté serveur, jamais préfixée `NEXT_PUBLIC_`.

Sans `STRIPE_SECRET_KEY`, le tunnel bascule en **mode simulé** : la commande est
créée puis marquée payée immédiatement. Tout le parcours (suivi client, queue de
production, expédition) reste testable sans compte Stripe.

### Base de données

Les migrations sont dans `supabase/migrations/`, à appliquer dans l'ordre des
noms de fichiers — via le SQL Editor du tableau de bord, ou avec la CLI :

```bash
supabase link --project-ref <ref>
supabase db push
```

Le schéma crée 7 tables, active la RLS partout, seede 3 packs et 2 options à des
**tarifs provisoires** modifiables depuis `/admin/produits`.

### Créer le premier compte admin

1. Créer l'utilisateur dans Supabase (*Authentication → Users → Add user*),
   avec un mot de passe.
2. Le promouvoir, dans le SQL Editor :

```sql
update public.profiles set role = 'admin' where email = 'vous@exemple.fr';
```

3. Se connecter sur `/login`.

### Webhook Stripe en local

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

Reporter le `whsec_…` affiché dans `STRIPE_WEBHOOK_SECRET`. Carte de test :
`4242 4242 4242 4242`, date future, CVC quelconque.

## Comment ça tourne

### Le prix ne vient jamais du navigateur

`lib/pricing.ts` est importé côté client (affichage temps réel) **et** côté
serveur (`/api/checkout`). Avant d'ouvrir la session Stripe, le serveur relit le
catalogue en base et refait le calcul : le montant envoyé par le navigateur est
ignoré.

### Le paiement est confirmé par le webhook, pas par la page de succès

`/checkout/success` ne prouve rien — n'importe qui peut l'ouvrir. C'est
`checkout.session.completed`, signé par Stripe, qui fait passer la commande en
`pending` (= à produire). La transition est idempotente : un rejeu Stripe ne
crée ni doublon d'email, ni second lien NFC.

### Le lien NFC est une indirection, et c'est le point clé

On encode `avistap.fr/r/{slug}` sur la puce, **jamais** le lien Google du client.

Le jour où le client change de fiche Google, on modifie `target_url` depuis la
fiche commande du back office et la plaque déjà livrée continue de fonctionner.
Encoder le lien Google en dur rendrait la plaque obsolète.

Le slug est généré automatiquement à la confirmation du paiement et s'affiche
dans la Queue de production, avec un bouton « copier », prêt pour l'encodeur.

### Statuts

`awaiting_payment` → `pending` → `printing` → `shipped` → `delivered`
(plus `cancelled`).

`pending` signifie **payée et à produire** : c'est exactement le filtre de la
Queue de production. Le passage en `shipped` déclenche l'email client.

## Marque et métadonnées

La marque s'écrit **AvisTap** (T majuscule), accompagnée du descripteur
« La plaque avis ». `lib/site.ts` en est la source unique : nom, descripteur,
email de contact et URL publique. Rien n'est codé en dur ailleurs — changer de
domaine ou d'adresse de contact se fait à un seul endroit.

Trois variables pilotent l'identité (voir `.env.example`) :
`NEXT_PUBLIC_SITE_NAME`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SUPPORT_EMAIL`.

> **Allégation à étayer.** La meta-description annonce « Multipliez vos avis
> Google par 5 ». Une allégation chiffrée doit pouvoir être justifiée
> (art. L121-2 du code de la consommation, pratiques commerciales trompeuses).
> Sans mesure à l'appui — par exemple un avant/après sur un panel de clients —
> préférer une formulation qualitative. La ligne est isolée et commentée dans
> `app/layout.tsx`.

## Sécurité

- **RLS active sur toutes les tables.** Le catalogue actif est lisible
  publiquement ; commandes, lignes, événements, profils et liens NFC ne le sont
  pas du tout avec la clé anon (vérifié en impersonnant le rôle `anon`).
- **Suivi client sans compte** via la RPC `get_order_tracking(token)`, qui ne
  renvoie que le statut, le numéro, les événements et le suivi transporteur —
  jamais l'email, l'adresse ni les montants.
- **Helpers privilégiés hors du schéma exposé.** Toute fonction de `public` est
  appelable via `/rest/v1/rpc/`. `is_admin()`, `handle_new_user()` et
  `prevent_role_escalation()` vivent donc dans le schéma `private`, que
  PostgREST ne publie pas.
- **Back office à deux couches** : `middleware.ts` vérifie la session,
  `requireAdmin()` vérifie le rôle dans chaque page et chaque server action —
  une server action est un point d'entrée HTTP à part entière.
- **Bucket `logos` privé.** L'upload passe par `/api/upload-logo` (validation
  MIME et taille, écriture en service role) ; le back office affiche les
  fichiers via des URL signées à durée limitée.

### Points ouverts

- `/api/upload-logo` est public par nature (le configurateur est ouvert à tous).
  Type et taille sont validés, mais il n'y a pas encore de limitation de débit :
  à ajouter avant une exposition publique durable.
- `/cgv` et `/mentions-legales` sont des trames à compléter — mentions
  obligatoires pour une vente en ligne en France.

## Intégration continue

`.github/workflows/ci.yml` lance `npm run lint` puis `npm run build` sur chaque
pull request et sur les poussées vers `main`. `next build` vérifie aussi les
types TypeScript, donc une erreur de type fait échouer la CI.

Le workflow n'utilise **aucun secret** : il s'appuie sur des variables Supabase
factices. C'est possible parce qu'aucune page interrogeant la base n'est
prérendue au build — toutes sont rendues à la demande.

## Structure

```
app/
  page.tsx                    landing
  configurateur/              configurateur + upload logo
  suivi/[token]/              suivi client public
  r/[slug]/route.ts           redirection NFC
  checkout/{success,cancel}/
  api/{checkout,upload-logo,stripe/webhook}/
  login/
  admin/
    production/               Queue de production (pièce maîtresse)
    commandes/[id]/           fiche complète, statuts, lien NFC
    produits/                 édition des tarifs
    actions.ts                server actions
components/
lib/
  pricing.ts                  source unique du calcul de prix
  orders-server.ts            transition « payée », génération du lien NFC
  supabase/{client,server,admin}.ts
  site.ts                     marque, URL publique, email de contact
  auth.ts  storage.ts  notifications.ts  validation.ts
supabase/migrations/
```

## Déploiement

`netlify.toml` est prêt (runtime Next.js). Reporter toutes les variables de
`.env.example` dans *Site configuration → Environment variables*, avec
`NEXT_PUBLIC_SITE_URL=https://avistap.fr`.

Créer ensuite le webhook Stripe en production vers
`https://avistap.fr/api/stripe/webhook`, événement `checkout.session.completed`.

## Licence

Propriétaire — tous droits réservés. Voir [LICENSE](./LICENSE).
