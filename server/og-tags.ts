// Module partagé : injection de balises Open Graph dynamiques pour les liens
// partagés (vidéos, etc.). Utilisé à la fois par le plugin Vite en dev et par
// le serveur Express en prod.

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const SUPABASE_ANON_KEY =
  process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

interface VideoMeta {
  id: string;
  title: string;
  description: string;
  thumbnail_url: string;
  authorName: string;
}

const escapeHtml = (str: string): string =>
  str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const truncate = (str: string, max: number): string =>
  str.length > max ? str.slice(0, max - 1).trimEnd() + '…' : str;

// Cache en mémoire avec TTL pour éviter de hammer Supabase à chaque crawl.
const cache = new Map<string, { data: VideoMeta | null; expiresAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 min

async function fetchVideoMeta(videoId: string): Promise<VideoMeta | null> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;

  const cached = cache.get(videoId);
  if (cached && cached.expiresAt > Date.now()) return cached.data;

  try {
    const url =
      `${SUPABASE_URL}/rest/v1/videos` +
      `?id=eq.${encodeURIComponent(videoId)}` +
      `&select=id,title,description,thumbnail_url,profiles:author_id(first_name,last_name,username)`;

    const res = await fetch(url, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        Accept: 'application/json',
      },
    });

    if (!res.ok) {
      cache.set(videoId, { data: null, expiresAt: Date.now() + 30_000 });
      return null;
    }

    const rows = (await res.json()) as Array<{
      id: string;
      title: string;
      description: string | null;
      thumbnail_url: string | null;
      profiles?: {
        first_name?: string | null;
        last_name?: string | null;
        username?: string | null;
      } | null;
    }>;

    const row = rows?.[0];
    if (!row) {
      cache.set(videoId, { data: null, expiresAt: Date.now() + CACHE_TTL_MS });
      return null;
    }

    const author = row.profiles ?? {};
    const authorName =
      [author.first_name, author.last_name].filter(Boolean).join(' ').trim() ||
      author.username ||
      '';

    const meta: VideoMeta = {
      id: row.id,
      title: row.title || 'Vidéo REZO',
      description: row.description || '',
      thumbnail_url: row.thumbnail_url || '',
      authorName,
    };

    cache.set(videoId, { data: meta, expiresAt: Date.now() + CACHE_TTL_MS });
    return meta;
  } catch (err) {
    console.error('[og-tags] fetchVideoMeta failed', err);
    return null;
  }
}

function renderMetaBlock(meta: VideoMeta, canonicalUrl: string): string {
  const fullTitle = meta.authorName
    ? `${truncate(meta.title, 80)} – ${meta.authorName} | REZO`
    : `${truncate(meta.title, 80)} | REZO`;

  const description =
    meta.description.trim() ||
    `Regarde "${truncate(meta.title, 60)}"${meta.authorName ? ` de ${meta.authorName}` : ''} sur REZO.`;
  const desc = truncate(description, 200);

  const image = meta.thumbnail_url;

  const tags: string[] = [
    `<title>${escapeHtml(fullTitle)}</title>`,
    `<meta name="description" content="${escapeHtml(desc)}" />`,
    `<link rel="canonical" href="${escapeHtml(canonicalUrl)}" />`,

    `<meta property="og:type" content="video.other" />`,
    `<meta property="og:site_name" content="REZO" />`,
    `<meta property="og:title" content="${escapeHtml(fullTitle)}" />`,
    `<meta property="og:description" content="${escapeHtml(desc)}" />`,
    `<meta property="og:url" content="${escapeHtml(canonicalUrl)}" />`,
  ];

  if (image) {
    tags.push(
      `<meta property="og:image" content="${escapeHtml(image)}" />`,
      `<meta property="og:image:secure_url" content="${escapeHtml(image)}" />`,
      `<meta property="og:image:width" content="1200" />`,
      `<meta property="og:image:height" content="630" />`,
      `<meta property="og:image:alt" content="${escapeHtml(truncate(meta.title, 100))}" />`,
    );
  }

  tags.push(
    `<meta name="twitter:card" content="${image ? 'summary_large_image' : 'summary'}" />`,
    `<meta name="twitter:title" content="${escapeHtml(fullTitle)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(desc)}" />`,
  );
  if (image) {
    tags.push(`<meta name="twitter:image" content="${escapeHtml(image)}" />`);
  }

  return tags.join('\n    ');
}

// Regex larges pour retirer toutes les balises génériques d'index.html qu'on
// va remplacer par les valeurs spécifiques à la vidéo.
const STRIP_PATTERNS: RegExp[] = [
  /<title>[\s\S]*?<\/title>\s*/i,
  /<meta\s+name=["']description["'][^>]*>\s*/gi,
  /<meta\s+property=["']og:[^"']+["'][^>]*>\s*/gi,
  /<meta\s+name=["']twitter:[^"']+["'][^>]*>\s*/gi,
  /<link\s+rel=["']canonical["'][^>]*>\s*/gi,
];

function stripExistingTags(html: string): string {
  let out = html;
  for (const pattern of STRIP_PATTERNS) {
    out = out.replace(pattern, '');
  }
  return out;
}

function injectIntoHead(html: string, block: string): string {
  // Insère juste avant </head>
  if (html.includes('</head>')) {
    return html.replace('</head>', `    ${block}\n  </head>`);
  }
  return html + block;
}

/**
 * Détecte si l'URL correspond à une page partageable pour laquelle on doit
 * injecter des balises OG dynamiques. Retourne { type, id } ou null.
 */
export function matchShareableRoute(
  pathname: string,
): { type: 'video'; id: string } | null {
  const m = pathname.match(/^\/(?:video|videos)\/([^/?#]+)/);
  if (m) return { type: 'video', id: m[1] };
  return null;
}

/**
 * Construit la version transformée du HTML en injectant les balises OG pour
 * une URL partagée (ex: /video/:id). Retourne le HTML d'origine si rien à
 * faire (route non partageable, ressource introuvable…).
 */
export async function transformHtmlForShare(
  html: string,
  pathname: string,
  fullUrl: string,
): Promise<string> {
  const route = matchShareableRoute(pathname);
  if (!route) return html;

  if (route.type === 'video') {
    const meta = await fetchVideoMeta(route.id);
    if (!meta) return html;
    const block = renderMetaBlock(meta, fullUrl);
    return injectIntoHead(stripExistingTags(html), block);
  }

  return html;
}
