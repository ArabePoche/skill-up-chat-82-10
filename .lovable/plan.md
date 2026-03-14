

## Plan : Rendre le fond du logo transparent dans le watermark vidéo

### Problème
Le logo `educatok-logo.png` a un fond opaque (blanc ou coloré) qui apparaît comme un rectangle non professionnel par-dessus la vidéo.

### Solution
Modifier la fonction `loadLogoImage()` dans `src/utils/videoWatermark.ts` pour supprimer automatiquement le fond blanc/clair du logo au moment du chargement, en utilisant un canvas temporaire et la manipulation de pixels.

### Détails techniques

**Fichier modifié** : `src/utils/videoWatermark.ts`

1. Après le chargement de l'image du logo, la dessiner sur un **canvas temporaire invisible**
2. Lire tous les pixels avec `getImageData`
3. Pour chaque pixel **blanc ou presque blanc** (R > 230, G > 230, B > 230) → mettre l'alpha à 0 (transparent)
4. Remettre les pixels nettoyés sur le canvas avec `putImageData`
5. Créer une nouvelle image à partir du canvas nettoyé (`canvas.toDataURL('image/png')`)
6. Mettre en cache cette version transparente

Cela garantit que le logo s'affiche proprement sur la vidéo, sans rectangle de fond visible, peu importe la couleur de la scène derrière.

