# Système d'appel centralisé

Ce dossier contient toute la logique des appels de l'application EducTok, centralisée pour une meilleure maintenabilité.

## Structure

```
call-system/
├── components/           # Composants d'interface pour les appels
│   ├── CallButton.tsx           # Bouton d'appel générique
│   ├── CallModal.tsx            # Modal d'appel générique
│   ├── CallsModal.tsx           # Liste des appels entrants
│   ├── IncomingCallsGrid.tsx    # Grille des appels entrants  
│   ├── IncomingCallsList.tsx    # Liste des appels entrants
│   ├── RealtimeCallProvider.tsx # Provider pour les appels temps réel
│   ├── StudentCallModal.tsx     # Modal côté étudiant
│   ├── TeacherCallModal.tsx     # Modal côté professeur
│   └── WebRTCCall.tsx          # Composant WebRTC
├── hooks/               # Hooks pour la logique d'appel
│   ├── useCallFunctionality.ts     # Logique d'initiation d'appel (étudiants)
│   ├── useCallNotifications.ts     # Notifications d'appel temps réel
│   ├── useCallSystem.tsx           # Hook principal du système d'appel
│   ├── useDirectCallModal.ts       # Appels directs dans le chat
│   ├── useLiveNotifications.ts     # Notifications de session en direct
│   └── useLiveSession.ts           # Sessions en direct (professeurs)
├── index.ts            # Export centralisé
└── README.md          # Cette documentation
```

## Usage

### Import depuis l'index centralisé

```typescript
import { 
  useCallSystem, 
  CallsModal, 
  TeacherCallModal 
} from '@/call-system';
```

### Hooks principaux

#### `useCallSystem(formationId: string)`
Hook principal pour les professeurs, gère :
- Récupération des appels entrants
- Acceptation/rejet d'appels
- Écoute temps réel

#### `useCallFunctionality(formationId: string)`
Hook pour les étudiants, permet :
- Initier des appels vers les professeurs
- Gérer l'état de l'appel
- Vérifier les permissions d'abonnement

#### `useDirectCallModal(studentId?: string, lessonId?: string)`
Hook pour les appels directs dans le chat :
- Écoute les appels du contexte actuel
- Gestion de l'acceptation/rejet

## Fonctionnalités

### Côté Étudiant
- ✅ Initiation d'appels audio/vidéo
- ✅ Vérification des permissions d'abonnement
- ✅ Interface d'attente pendant l'appel
- ✅ Gestion de fin d'appel

### Côté Professeur  
- ✅ Réception d'appels entrants en temps réel
- ✅ Interface de notification avec sonnerie
- ✅ Acceptation/rejet d'appels
- ✅ Vue de liste des appels en attente
- ✅ Appels directs depuis le chat

### Fonctionnalités avancées
- ✅ Sessions en direct (professeurs)
- ✅ Notifications push
- ✅ Intégration WebRTC (en cours)
- 🔄 Enregistrement d'appels (à venir)
- 🔄 Gestion de la qualité réseau (à venir)

## Base de données

Utilise la table `call_sessions` avec les statuts :
- `pending` : Appel en attente
- `accepted` : Appel accepté  
- `rejected` : Appel rejeté
- `ended` : Appel terminé

## Intégration WebRTC

Le composant `WebRTCCall` permet la communication en temps réel.
Configuration requise :
- Serveur STUN/TURN
- Gestion des permissions microphone/caméra
- Signaling via Supabase Realtime