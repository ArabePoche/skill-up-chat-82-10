/**
 * FileIcon - Composant pour afficher les icônes de fichiers officielles
 * Utilise le package file-icon-vectors pour les icônes de type Word, Excel, PDF, etc.
 */
import React from 'react';
import 'file-icon-vectors/dist/file-icon-vivid.min.css';

interface FileIconProps {
  fileName?: string;
  fileType?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

// Mapping des extensions vers les noms d'icônes file-icon-vectors
const extensionToIcon: Record<string, string> = {
  // Documents Microsoft Office
  doc: 'doc',
  docx: 'docx',
  xls: 'xls',
  xlsx: 'xlsx',
  ppt: 'ppt',
  pptx: 'pptx',
  
  // PDF
  pdf: 'pdf',
  
  // Images
  jpg: 'jpg',
  jpeg: 'jpg',
  png: 'png',
  gif: 'gif',
  svg: 'svg',
  webp: 'webp',
  bmp: 'bmp',
  ico: 'ico',
  tiff: 'tiff',
  tif: 'tiff',
  
  // Audio
  mp3: 'mp3',
  wav: 'wav',
  ogg: 'ogg',
  flac: 'flac',
  aac: 'aac',
  wma: 'wma',
  m4a: 'm4a',
  
  // Video
  mp4: 'mp4',
  avi: 'avi',
  mkv: 'mkv',
  mov: 'mov',
  wmv: 'wmv',
  flv: 'flv',
  webm: 'webm',
  
  // Archives
  zip: 'zip',
  rar: 'rar',
  '7z': '7z',
  tar: 'tar',
  gz: 'gz',
  
  // Code
  js: 'js',
  ts: 'ts',
  jsx: 'jsx',
  tsx: 'tsx',
  html: 'html',
  css: 'css',
  json: 'json',
  xml: 'xml',
  py: 'py',
  java: 'java',
  php: 'php',
  rb: 'rb',
  go: 'go',
  rs: 'rs',
  c: 'c',
  cpp: 'cpp',
  h: 'h',
  sql: 'sql',
  
  // Texte
  txt: 'txt',
  rtf: 'rtf',
  md: 'md',
  csv: 'csv',
  
  // Autres
  exe: 'exe',
  dmg: 'dmg',
  iso: 'iso',
  apk: 'apk',
};

// Mapping des types MIME vers les extensions
const mimeToExtension: Record<string, string> = {
  'application/pdf': 'pdf',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.ms-excel': 'xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'application/vnd.ms-powerpoint': 'ppt',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/svg+xml': 'svg',
  'image/webp': 'webp',
  'audio/mpeg': 'mp3',
  'audio/wav': 'wav',
  'audio/ogg': 'ogg',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/quicktime': 'mov',
  'application/zip': 'zip',
  'application/x-rar-compressed': 'rar',
  'application/json': 'json',
  'text/html': 'html',
  'text/css': 'css',
  'text/javascript': 'js',
  'text/plain': 'txt',
  'text/csv': 'csv',
};

const sizeClasses: Record<string, string> = {
  sm: 'fiv-size-sm',
  md: 'fiv-size-md',
  lg: 'fiv-size-lg',
  xl: 'fiv-size-xl',
};

const getExtensionFromFileName = (fileName: string): string => {
  const parts = fileName.split('.');
  if (parts.length > 1) {
    return parts[parts.length - 1].toLowerCase();
  }
  return '';
};

const getIconName = (fileName?: string, fileType?: string): string => {
  // D'abord essayer avec le type MIME
  if (fileType && mimeToExtension[fileType]) {
    const ext = mimeToExtension[fileType];
    if (extensionToIcon[ext]) {
      return extensionToIcon[ext];
    }
  }
  
  // Ensuite essayer avec l'extension du nom de fichier
  if (fileName) {
    const ext = getExtensionFromFileName(fileName);
    if (extensionToIcon[ext]) {
      return extensionToIcon[ext];
    }
  }
  
  // Fallback générique basé sur le type MIME
  if (fileType) {
    if (fileType.startsWith('image/')) return 'image';
    if (fileType.startsWith('audio/')) return 'audio';
    if (fileType.startsWith('video/')) return 'video';
    if (fileType.startsWith('text/')) return 'txt';
  }
  
  // Icône par défaut
  return 'blank';
};

const FileIcon: React.FC<FileIconProps> = ({
  fileName,
  fileType,
  size = 'md',
  className = '',
}) => {
  const iconName = getIconName(fileName, fileType);
  const sizeClass = sizeClasses[size] || '';
  
  return (
    <span 
      className={`fiv-viv fiv-icon-${iconName} ${sizeClass} ${className}`}
      aria-label={`Fichier ${iconName}`}
    />
  );
};

export default FileIcon;
