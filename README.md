# KÔLÔ — VERSION FINALE PRÊTE À HÉBERGER

Marketplace web Congo-Brazzaville en HTML/CSS/JavaScript + Supabase. Aucun Python.

## Fonctionnalités
- annonces publiques et recherche
- filtres ville/catégorie/tri
- comptes Supabase (inscription/connexion)
- publication d'annonces authentifiée
- upload de photos Supabase Storage
- favoris
- messagerie liée aux annonces
- espace utilisateur et gestion de ses annonces
- profil utilisateur
- responsive mobile/PC
- sécurité RLS côté Supabase

## Installation
1. Créer un projet Supabase.
2. Dans SQL Editor, exécuter `supabase/schema.sql`.
3. Dans Supabase > Project Settings > API, récupérer Project URL et clé publishable/anon.
4. Modifier `js/config.js` avec ces deux valeurs.
5. Ne jamais mettre la clé `service_role` dans le site.
6. Héberger le dossier sur GitHub Pages, Netlify, Vercel ou tout hébergeur statique.

## Authentification
Dans Supabase > Authentication > Providers, activer Email. Pour un lancement simple, tu peux désactiver temporairement la confirmation email, ou conserver la confirmation pour plus de sécurité.

## Images
Le script SQL crée le bucket public `listing-images`. Les utilisateurs authentifiés peuvent envoyer leurs images dans leur propre dossier UUID.

## Important avant production
Le paiement, les annonces sponsorisées et les abonnements professionnels ne sont pas facturés automatiquement dans cette version : ils doivent être reliés à un prestataire de paiement et à une logique serveur avant de prendre de l'argent aux utilisateurs.
