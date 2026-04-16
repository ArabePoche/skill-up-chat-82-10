/**
 * Registry des templates de sites scolaires.
 * Mapping template_key → import dynamique du module de template.
 * Lazy-loading automatique pour ne charger que le template nécessaire.
 */
import type { TemplateDefinition } from './types';

type TemplateLoader = () => Promise<{ default: TemplateDefinition }>;

const templateLoaders: Record<string, TemplateLoader> = {
  default: () => import('./templates/default/index'),
  modern: () => import('./templates/modern/index'),
  pro: () => import('./templates/pro/index'),
  futuristic: () => import('./templates/futuristic/index'),
};

/** Charge la définition d'un template par sa clé */
export async function loadTemplate(key: string): Promise<TemplateDefinition> {
  const loader = templateLoaders[key] || templateLoaders['default'];
  const module = await loader();
  return module.default;
}

/** Liste des clés de templates disponibles */
export function getAvailableTemplateKeys(): string[] {
  return Object.keys(templateLoaders);
}
