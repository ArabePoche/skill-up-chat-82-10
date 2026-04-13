/**
 * Utilitaires pour MediaRecorder : détection du mime type supporté et extension.
 */

export function getSupportedRecorderMimeType(): string {
  if (typeof MediaRecorder === 'undefined') return '';

  const mimeTypes = [
    'video/mp4;codecs=h264,aac',
    'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
    'video/mp4',
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
  ];

  for (const mime of mimeTypes) {
    if (MediaRecorder.isTypeSupported(mime)) return mime;
  }
  return '';
}

export function getFileExtension(mimeType: string): string {
  return mimeType.includes('mp4') ? 'mp4' : 'webm';
}
