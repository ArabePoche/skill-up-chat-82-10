# 🏅 Système de Streak et Niveaux - EducaTok

## 📋 Vue d'ensemble

Le système de streak récompense la régularité d'utilisation de l'application. Les utilisateurs accumulent des jours consécutifs en utilisant l'app au moins le nombre de minutes requis par jour.

## 🎯 Fonctionnalités

### Pour les utilisateurs
- ✅ **Streak quotidien** : +1 jour si l'objectif de minutes est atteint
- ❌ **Pénalité** : -1 jour si un jour est manqué
- 🏆 **Niveaux progressifs** : Débloquage automatique selon le nombre de jours
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
- current_streak: INTEGER
- longest_streak: INTEGER
- total_days_active: INTEGER
- current_level: INTEGER (calculé automatiquement)
- last_activity_date: DATE
```

## 🛠️ Utilisation

### Hooks

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

#### `useStreakTracker(userId)`
Suit automatiquement l'activité et valide les streaks
```tsx
import { useStreakTracker } from '@/streak';

const { 
  todayUsage,          // Minutes utilisées aujourd'hui
  requiredMinutes,     // Minutes requises par jour
  isStreakValidated    // Objectif atteint aujourd'hui ?
} = useStreakTracker(userId);
```

### Composants

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

#### `<StreakTrackerWrapper />`
Active le tracking automatique (déjà intégré dans App.tsx)
```tsx
import { StreakTrackerWrapper } from '@/streak';

// Dans App.tsx (déjà fait)
<StreakTrackerWrapper />
```

## 🔄 Fonctionnement automatique

### Validation du streak
1. Le `StreakTrackerWrapper` surveille l'utilisation quotidienne
2. Quand l'utilisateur atteint le minimum de minutes requis :
   - Le streak est incrémenté (+1 jour)
   - Le niveau est recalculé automatiquement
   - La date d'activité est mise à jour

### Décrémention du streak
1. Si l'utilisateur manque un jour :
   - Au prochain lancement, le streak est décrémenté (-1)
   - Le niveau est recalculé si nécessaire

### Calcul du niveau
- Automatique via trigger PostgreSQL
- Trouve le niveau le plus élevé où `days_required <= current_streak`
- Mise à jour immédiate après chaque changement de streak

## 🎨 Intégration dans le profil

Le badge est déjà intégré dans `src/pages/Profil.tsx` :
```tsx
<StreakBadge userId={viewedUserId} variant="compact" />
```

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

## 🚀 Évolutions futures

- [ ] Notifications lors de changement de niveau
- [ ] Récompenses pour les meilleurs streaks
- [ ] Classement des utilisateurs par streak
- [ ] Système de rattrapage (1 joker par mois)
- [ ] Edge Function pour décrémenter les streaks à minuit
