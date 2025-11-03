# 🏅 Système de Streak et Niveaux - EducaTok

## 📋 Vue d'ensemble

Le système de streak récompense la régularité d'utilisation de l'application. Les utilisateurs accumulent des jours consécutifs en restant connectés au moins le nombre de minutes requis par jour.

## 🎯 Fonctionnalités

### Pour les utilisateurs
- ✅ **Tracking automatique** : Enregistrement des connexions/déconnexions
- ⏱️ **Calcul du temps** : Suivi automatique du temps de présence quotidien
- 🔥 **Streak quotidien** : +1 jour si l'objectif de minutes est atteint
- ❌ **Pénalité** : -X jours si X jours sont manqués (sans descendre en dessous de 0)
- 🏆 **Niveaux progressifs** : Débloquage automatique selon le nombre de streaks
- 📊 **Statistiques** : Meilleur streak, total de jours actifs
- 🎨 **Badge visible** : Affiché dans le profil utilisateur

### Pour les administrateurs
- ⚙️ **Configuration du temps requis** : Nombre de minutes par jour (défaut: 10 min)
- 🎚️ **Gestion des niveaux** : Création/modification des paliers de progression
- 🎨 **Personnalisation** : Nom, badge (emoji), couleur, jours requis pour chaque niveau

## 📊 Structure de la base de données

### Table `streak_global_config`
Configuration globale du système (1 seul enregistrement)
```sql
- minutes_per_day_required: INTEGER (défaut: 10)
```

### Table `streak_levels_config`
Configuration des niveaux (modifiable par les admins)
```sql
- level_number: INTEGER (unique)
- level_name: TEXT
- level_badge: TEXT (emoji)
- days_required: INTEGER
- level_color: TEXT (hex)
```

Niveaux par défaut :
1. Débutant 🌱 (3 jours) - #10b981
2. Apprenti 🌿 (7 jours) - #3b82f6
3. Régulier 🔥 (14 jours) - #f59e0b
4. Assidu ⭐ (30 jours) - #8b5cf6
5. Expert 💎 (60 jours) - #ec4899
6. Maître 👑 (100 jours) - #f43f5e
7. Légende 🏆 (200 jours) - #fbbf24

### Table `user_streaks`
Suivi des streaks par utilisateur
```sql
- user_id: UUID
- current_streak: INTEGER (nombre de streaks accumulés)
- longest_streak: INTEGER
- total_days_active: INTEGER
- current_level: INTEGER (calculé automatiquement selon current_streak)
- last_activity_date: DATE
- last_login_at: TIMESTAMP (dernière connexion)
- last_logout_at: TIMESTAMP (dernière déconnexion)
- daily_minutes: INTEGER (minutes utilisées aujourd'hui)
```

## 🛠️ Utilisation

### Hooks

#### `useStreakSessionTracker()`
**NOUVEAU** - Hook principal pour le tracking automatique des sessions
```tsx
import { useStreakSessionTracker } from '@/streak';

// Dans un composant racine (déjà intégré dans StreakTrackerWrapper)
const { isTracking, currentStatus } = useStreakSessionTracker();
```

**Fonctionnement :**
- Écoute automatiquement les changements de statut de présence (online/offline/idle)
- Enregistre `last_login_at` quand l'utilisateur se connecte
- Enregistre `last_logout_at` et calcule le temps de session à la déconnexion
- Ajoute le temps de session à `daily_minutes`
- À minuit : vérifie si `daily_minutes >= seuil` et incrémente/décrémente `current_streak`
- Calcule automatiquement `current_level` basé sur `current_streak`
- Gère les jours manqués : soustrait le nombre de jours sautés de `current_streak`

#### `useUserStreak(userId)`
Récupère et gère le streak d'un utilisateur
```tsx
import { useUserStreak } from '@/streak';

const { 
  streak,              // Données du streak
  currentLevelDetails, // Détails du niveau actuel
  nextLevelDetails,    // Détails du prochain niveau
  updateStreak,        // Fonction pour mettre à jour manuellement
  isLoading 
} = useUserStreak(userId);
```

#### `useStreakConfig()`
Récupère la configuration du système
```tsx
import { useStreakConfig } from '@/streak';

const { 
  globalConfig, // Configuration globale
  levels,       // Liste des niveaux
  isLoading 
} = useStreakConfig();
```

### Composants

#### `<StreakTrackerWrapper />`
Active le tracking automatique (déjà intégré dans App.tsx)
```tsx
import { StreakTrackerWrapper } from '@/streak';

// Dans App.tsx (déjà fait)
<StreakTrackerWrapper />
```

#### `<StreakBadge />`
Affiche le badge de streak et niveau
```tsx
import { StreakBadge } from '@/streak';

// Variant "full" - toutes les infos
<StreakBadge userId={userId} variant="full" />

// Variant "compact" - version réduite
<StreakBadge userId={userId} variant="compact" />

// Variant "mini" - juste le badge
<StreakBadge userId={userId} variant="mini" />
```

#### `<StreakLevelsList />`
Liste tous les niveaux disponibles
```tsx
import { StreakLevelsList } from '@/streak';

<StreakLevelsList 
  currentLevel={user.currentLevel}
  currentStreak={user.currentStreak}
/>
```

## 🔄 Fonctionnement automatique

### 1. Tracking des sessions
- **Connexion** : Quand l'utilisateur se connecte (passage à "online")
  - Enregistre `last_login_at` avec l'heure actuelle
  - Démarre une session de tracking
  - Vérifie et valide le streak quotidien

- **Déconnexion** : Quand l'utilisateur se déconnecte (passage à "offline" ou "idle")
  - Enregistre `last_logout_at` avec l'heure actuelle
  - Calcule le temps de session (logout - login)
  - Ajoute le temps à `daily_minutes`

### 2. Validation du streak (à minuit)
1. Vérifie si `daily_minutes >= minutes_per_day_required`
2. Si oui : `current_streak += 1`
3. Si non : le streak ne change pas pour aujourd'hui
4. Réinitialise `daily_minutes` à 0 pour le nouveau jour

### 3. Gestion des jours manqués
1. Calcule le nombre de jours écoulés depuis `last_activity_date`
2. Si plus d'un jour : `current_streak -= (jours_manqués)`
3. Le streak ne peut pas descendre en dessous de 0

### 4. Calcul automatique du niveau
- À chaque changement de streak, le niveau est recalculé
- Trouve le niveau le plus élevé où `days_required <= current_streak`
- Exemple : 
  - 13 streaks → Niveau 3 (Régulier - 14 jours requis)
  - 15 streaks → Niveau 4 (Assidu - 30 jours requis)

## 🔐 Sécurité (RLS)

- **Lecture** : Tous peuvent voir les streaks (profils publics)
- **Écriture** : Seul l'utilisateur peut modifier son propre streak
- **Configuration** : Seuls les admins peuvent modifier les niveaux et la config globale

## 📝 Administration

Pour gérer les niveaux et la configuration :

1. Accéder à la base de données Supabase
2. Table `streak_global_config` : Modifier `minutes_per_day_required`
3. Table `streak_levels_config` : Ajouter/modifier des niveaux
   ```sql
   INSERT INTO streak_levels_config (level_number, level_name, level_badge, days_required, level_color)
   VALUES (8, 'Immortel', '🔥', 365, '#ef4444');
   ```

## 🚀 Avantages du nouveau système

✅ **Automatique** : Pas besoin d'action manuelle de l'utilisateur  
✅ **Précis** : Calcul exact du temps de présence  
✅ **Flexible** : Configuration admin pour les seuils et niveaux  
✅ **Équitable** : Pénalité proportionnelle aux jours manqués  
✅ **Transparent** : Historique complet avec login/logout  
✅ **Performant** : Mise à jour en temps réel via Supabase Realtime  

## 📈 Évolutions futures

- [ ] Notifications lors de changement de niveau
- [ ] Récompenses pour les meilleurs streaks
- [ ] Classement des utilisateurs par streak
- [ ] Système de rattrapage (1 joker par mois)
- [ ] Statistiques hebdomadaires et mensuelles
- [ ] Badges spéciaux pour les records
