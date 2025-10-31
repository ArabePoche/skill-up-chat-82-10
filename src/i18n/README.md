# Système Multilingue i18n

Ce dossier contient la configuration et les fichiers de traduction pour le support multilingue de l'application.

## Langues supportées

- 🇫🇷 Français (fr) - Langue par défaut
- 🇬🇧 Anglais (en)
- 🇸🇦 Arabe (ar) - Support RTL (Right-to-Left)
- 🇪🇸 Espagnol (es)

## Structure

```
src/i18n/
├── config.ts          # Configuration i18next
├── locales/
│   ├── fr.json       # Traductions françaises
│   ├── en.json       # Traductions anglaises
│   ├── ar.json       # Traductions arabes
│   └── es.json       # Traductions espagnoles
└── README.md         # Ce fichier
```

## Utilisation dans les composants

### Import

```tsx
import { useTranslation } from 'react-i18next';
```

### Dans un composant React

```tsx
const MyComponent = () => {
  const { t } = useTranslation();
  
  return (
    <div>
      <h1>{t('common.welcome')}</h1>
      <button>{t('common.save')}</button>
    </div>
  );
};
```

### Avec des variables

```tsx
const MyComponent = () => {
  const { t } = useTranslation();
  const userName = "John";
  
  return (
    <p>{t('welcome.message', { name: userName })}</p>
  );
};
```

Dans le fichier JSON :
```json
{
  "welcome": {
    "message": "Bienvenue {{name}} !"
  }
}
```

## Changer de langue

### Via le composant LanguageSwitcher

Le composant `LanguageSwitcher` est disponible dans le menu du profil et permet de changer facilement de langue.

### Programmatiquement

```tsx
import { useTranslation } from 'react-i18next';

const MyComponent = () => {
  const { i18n } = useTranslation();
  
  const changeToEnglish = () => {
    i18n.changeLanguage('en');
  };
  
  return <button onClick={changeToEnglish}>English</button>;
};
```

## Ajouter de nouvelles traductions

1. Ouvrez les 4 fichiers JSON dans `locales/`
2. Ajoutez la nouvelle clé de traduction dans chaque fichier
3. Utilisez la clé avec `t()` dans vos composants

Exemple :

**fr.json**
```json
{
  "mySection": {
    "myKey": "Mon texte en français"
  }
}
```

**en.json**
```json
{
  "mySection": {
    "myKey": "My text in English"
  }
}
```

**Dans le composant**
```tsx
<p>{t('mySection.myKey')}</p>
```

## Support RTL pour l'arabe

Le support RTL est automatiquement géré par la configuration i18n. Quand l'utilisateur sélectionne l'arabe, la direction du document passe automatiquement en RTL.

## Détection automatique de la langue

La langue est détectée dans cet ordre :
1. Langue stockée dans localStorage (préférence utilisateur)
2. Langue du navigateur
3. Langue par défaut (français)

## Catégories de traduction disponibles

- `common` - Éléments communs (boutons, actions)
- `nav` - Navigation
- `auth` - Authentification
- `courses` - Cours et formations
- `exercise` - Exercices
- `chat` - Messagerie
- `profile` - Profil utilisateur
- `admin` - Administration
- `settings` - Paramètres

## Bonnes pratiques

1. **Organisation** : Groupez les traductions par fonctionnalité/section
2. **Cohérence** : Utilisez les mêmes termes pour les mêmes concepts
3. **Complétude** : Assurez-vous que toutes les langues ont les mêmes clés
4. **Contexte** : Donnez des clés descriptives (ex: `button.save` plutôt que `btn1`)
5. **Pluralisation** : Utilisez les fonctionnalités de pluralisation d'i18next si nécessaire

## Exemple de conversion d'un composant

### Avant

```tsx
const MyComponent = () => {
  return (
    <div>
      <h1>Bienvenue</h1>
      <button>Enregistrer</button>
    </div>
  );
};
```

### Après

```tsx
import { useTranslation } from 'react-i18next';

const MyComponent = () => {
  const { t } = useTranslation();
  
  return (
    <div>
      <h1>{t('common.welcome')}</h1>
      <button>{t('common.save')}</button>
    </div>
  );
};
```

## Ressources

- [Documentation react-i18next](https://react.i18next.com/)
- [Documentation i18next](https://www.i18next.com/)
