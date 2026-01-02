# Module Offline - Fonctionnement hors connexion

## 📦 Fonctionnalités

- **Cache local** : IndexedDB pour stocker formations, leçons et fichiers audio
- **Synchronisation automatique** : Dès que la connexion revient
- **Service Worker** : Cache de l'interface et des assets statiques
- **Toast du statut de la connexion** : Affiche l'état de connexion en temps réel avec un toast

## 🚀 Utilisation

### Télécharger une formation pour usage offline

```tsx
import { OfflineDownloadButton } from '@/offline';

<OfflineDownloadButton 
  formationId={formation.id}
  formationTitle={formation.title}
/>
```

### Hook pour accéder aux données offline

```tsx
import { useOfflineFormation } from '@/offline';

const { formation, lessons, isOfflineAvailable, downloadForOffline } = useOfflineFormation(formationId);
```


## 🔄 Synchronisation

La synchronisation se fait automatiquement :
- Au retour de connexion
- Toutes les 30 secondes (vérification de connexion)
- Manuellement via le bouton de l'indicateur

## 📁 Structure

```
src/offline/
├── utils/
│   ├── offlineStore.ts      # Gestion IndexedDB
│   ├── syncManager.ts        # Synchronisation automatique
│   └── registerSW.ts         # Enregistrement Service Worker
├── hooks/
│   ├── useOfflineSync.ts     # État de connexion
│   ├── useOfflineFormation.ts # Accès aux formations offline
│   └── useOfflineGroupChat.ts # Accès au chat de groupe offline
├── components/
│   ├── OfflineIndicator.tsx  # Indicateur visuel
│   └── OfflineDownloadButton.tsx # Bouton téléchargement
└── index.ts
```

## 🎓 Chat de groupe hors ligne

Le hook `useOfflineGroupChat` permet d'accéder aux données du chat de groupe même hors connexion :

```tsx
import { useOfflineGroupChat } from '@/offline';

const { 
  messages, 
  promotionId, 
  isOfflineMode, 
  lessons, 
  exercises 
} = useOfflineGroupChat(levelId, formationId);
```

Les données sont automatiquement mises en cache lors de la navigation en ligne et récupérées depuis le cache lorsque l'utilisateur est hors ligne.
