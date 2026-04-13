/**
 * Dessine le watermark TikTok-style sur un canvas 2D.
 * Logo + texte + @auteur, alternant gauche/droite.
 */

import { WATERMARK_CONSTANTS } from '../types';

export function drawWatermark(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  watermarkText: string,
  authorName: string,
  currentTime: number,
  logoImage: HTMLImageElement | null
) {
  ctx.save();

  const paddingX = Math.round(width * 0.04);
  // Gauche pendant les 7 premières secondes, puis droite pour le reste
  const isRight = currentTime >= WATERMARK_CONSTANTS.SWITCH_INTERVAL;

  ctx.globalAlpha = 0.8;
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = 'rgba(0,0,0,0.85)';
  ctx.lineWidth = Math.max(2, Math.round(width * 0.003));
  ctx.shadowColor = 'rgba(0,0,0,0.7)';
  ctx.shadowBlur = 8;
  ctx.shadowOffsetX = 1;
  ctx.shadowOffsetY = 1;

  const logoIconSize = Math.round(width * 0.09);
  const textSize = Math.max(18, Math.round(width * 0.042));
  const authorSize = Math.max(14, Math.round(width * 0.032));

  const blockHeight = logoIconSize + Math.round(textSize * 1.2) + Math.round(authorSize * 1.2);
  const startY = Math.round((height - blockHeight) / 2);

  ctx.font = `bold ${textSize}px "Arial", sans-serif`;
  const watermarkWidth = ctx.measureText(watermarkText).width;
  ctx.font = `600 ${authorSize}px "Arial", sans-serif`;
  const authorWidth = ctx.measureText(`@${authorName}`).width;
  const blockWidth = Math.max(logoIconSize, watermarkWidth, authorWidth);

  const halfBlockWidth = Math.round(blockWidth / 2);
  const xAnchor = isRight
    ? width - paddingX - halfBlockWidth
    : paddingX + halfBlockWidth;

  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';

  // 1. Logo
  if (logoImage) {
    const logoX = Math.round(xAnchor - logoIconSize / 2);
    ctx.shadowBlur = 12;
    ctx.globalAlpha = 0.85;
    ctx.drawImage(logoImage, logoX, startY, logoIconSize, logoIconSize);
  }

  // 2. Texte principal
  ctx.globalAlpha = 0.8;
  ctx.shadowBlur = 8;
  const textY = startY + logoIconSize + Math.round(textSize * 0.3);
  ctx.font = `bold ${textSize}px "Arial", sans-serif`;
  ctx.strokeText(watermarkText, xAnchor, textY);
  ctx.fillText(watermarkText, xAnchor, textY);

  // 3. @auteur
  const authorY = textY + Math.round(textSize * 1.3);
  ctx.font = `600 ${authorSize}px "Arial", sans-serif`;
  ctx.strokeText(`@${authorName}`, xAnchor, authorY);
  ctx.fillText(`@${authorName}`, xAnchor, authorY);

  ctx.restore();
}
