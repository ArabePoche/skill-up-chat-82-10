/**
 * Chargement et mise en cache du logo EducaTok pour le watermark.
 * Supprime automatiquement le fond blanc du logo.
 */

let cachedLogoImage: HTMLImageElement | null = null;
let logoLoadPromise: Promise<HTMLImageElement | null> | null = null;

export async function loadLogoImage(): Promise<HTMLImageElement | null> {
  if (cachedLogoImage) return cachedLogoImage;
  if (logoLoadPromise) return logoLoadPromise;

  logoLoadPromise = new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = img.naturalWidth;
        tempCanvas.height = img.naturalHeight;
        const tempCtx = tempCanvas.getContext('2d');
        if (tempCtx) {
          tempCtx.drawImage(img, 0, 0);
          const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
          const data = imageData.data;
          for (let i = 0; i < data.length; i += 4) {
            if (data[i] > 230 && data[i + 1] > 230 && data[i + 2] > 230) {
              data[i + 3] = 0;
            }
          }
          tempCtx.putImageData(imageData, 0, 0);
          const cleanImg = new Image();
          cleanImg.onload = () => {
            cachedLogoImage = cleanImg;
            resolve(cleanImg);
          };
          cleanImg.onerror = () => {
            cachedLogoImage = img;
            resolve(img);
          };
          cleanImg.src = tempCanvas.toDataURL('image/png');
          return;
        }
      } catch (e) {
        console.warn('⚠️ Impossible de nettoyer le fond du logo:', e);
      }
      cachedLogoImage = img;
      resolve(img);
    };
    img.onerror = () => resolve(null);
    img.src = new URL('../../assets/educatok-logo.png', import.meta.url).href;
  });

  return logoLoadPromise;
}
