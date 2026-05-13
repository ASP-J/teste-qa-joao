export const TIMEOUTS = {
  short: 5_000,
  default: 10_000,
  long: 30_000,
  navigation: 45_000,
} as const;

/**
 * Paths fixos do agente (não dependem de projeto). Para paths específicos do
 * projeto ativo (inputs/, specs/, tests/features/, etc.), usar helpers de
 * `src/utils/environment.ts` (getProjectDir, resolveProjectPath).
 */
export const PATHS = {
  outputs: 'outputs',
  pages: 'src/pages',
  screenshots: 'outputs/screenshots',
  traces: 'outputs/traces',
  templates: 'templates',
} as const;

export const FILES = {
  pageObjectTemplate: 'templates/page-object-template.ts',
  testTemplate: 'templates/test-template.ts',
  environment: 'config/environment.json',
} as const;
