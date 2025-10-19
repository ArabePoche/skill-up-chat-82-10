/**
 * Utilitaire pour détecter et transformer les URLs en liens cliquables
 */

import React from 'react';

// Regex pour détecter les URLs (http, https, www, et domaines simples)
const URL_REGEX = /(https?:\/\/[^\s]+)|(www\.[^\s]+)|([a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?\.)+[a-zA-Z]{2,}(?:\/[^\s]*)?/gi;

/**
 * Transforme un texte contenant des URLs en JSX avec des liens cliquables
 * @param text - Le texte à analyser
 * @returns Un tableau de JSX éléments (texte et liens)
 */
export const linkify = (text: string): React.ReactNode[] => {
  if (!text) return [];

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;

  // Trouver toutes les URLs dans le texte
  const matches = Array.from(text.matchAll(URL_REGEX));

  matches.forEach((match, index) => {
    const url = match[0];
    const startIndex = match.index!;

    // Ajouter le texte avant l'URL
    if (startIndex > lastIndex) {
      parts.push(text.substring(lastIndex, startIndex));
    }

    // Créer l'URL complète (ajouter https:// si nécessaire)
    const href = url.startsWith('http://') || url.startsWith('https://') 
      ? url 
      : `https://${url}`;

    // Ajouter le lien cliquable
    parts.push(
      <a
        key={`link-${index}`}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-600 hover:text-blue-800 underline font-medium break-all"
        onClick={(e) => e.stopPropagation()}
      >
        {url}
      </a>
    );

    lastIndex = startIndex + url.length;
  });

  // Ajouter le texte restant après la dernière URL
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts.length > 0 ? parts : [text];
};

/**
 * Composant pour afficher du texte avec des liens cliquables
 */
interface LinkifiedTextProps {
  text: string;
  className?: string;
}

export const LinkifiedText: React.FC<LinkifiedTextProps> = ({ text, className = '' }) => {
  const parts = linkify(text);

  return (
    <>
      {parts}
    </>
  );
};
