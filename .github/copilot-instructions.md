# Project Guidelines

## Production-Safe Mode

- L'application est en production. Toute modification doit viser zero regression fonctionnelle.
- Ne jamais changer silencieusement un comportement existant. Si un changement de comportement est voulu, il doit etre explicite.
- Ne jamais modifier des parties non demandees par la tache en cours.
- Si un doute subsiste sur l'intention fonctionnelle, demander une clarification avant d'agir.

## Database Safety

- Ne jamais proposer ni appliquer un changement de schema Supabase sans migration explicitement definie.
- Si une evolution SQL est necessaire, preparer une migration claire et isolee au lieu d'un changement implicite.

## Type Safety

- Ne jamais modifier des types TypeScript globaux sans validation complete de l'impact.
- Avant de finaliser un changement touchant des types partages, executer une validation ciblee puis une validation projet adaptee quand elle existe.
- Par defaut, une validation complete pour des types partages signifie au minimum: verification ciblee du fichier ou de la zone touchee, puis `npm run build` si disponible.

## Change Discipline

- Privilegier les changements minimaux, locaux et reversibles.
- Eviter les refactors opportunistes si ils ne sont pas necessaires pour la demande.
- En cas de risque de regression ou d'ambiguite produit, s'arreter et demander confirmation.
- Ne demander une clarification que si le doute porte sur le comportement metier, le perimetre fonctionnel, ou un risque reel de regression; ne pas bloquer pour de simples details d'implementation.