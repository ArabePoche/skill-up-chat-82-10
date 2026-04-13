/**
 * Téléchargement de vidéo avec suivi de progression.
 */

export async function fetchVideoAsBlob(
  videoUrl: string,
  onProgress?: (percent: number) => void,
  maxProgressPercent = 40
): Promise<Blob> {
  const response = await fetch(videoUrl);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);

  const contentLength = response.headers.get('content-length');
  const total = contentLength ? parseInt(contentLength, 10) : 0;

  const reader = response.body?.getReader();
  if (!reader) throw new Error('ReadableStream non supporté');

  const chunks: Uint8Array[] = [];
  let loaded = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    loaded += value.length;
    if (total > 0) {
      onProgress?.(Math.round((loaded / total) * maxProgressPercent));
    }
  }

  return new Blob(chunks, { type: 'video/mp4' });
}
