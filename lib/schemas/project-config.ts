import { z } from 'zod';

export const projectConfigSchema = z.object({
  projectName: z.string().min(1),
  testAnalysisFile: z.string().default(''),
  environment: z.string().min(1),
  browsers: z.array(z.enum(['chromium', 'firefox', 'webkit'])).default(['chromium']),
  headless: z.boolean().default(true),
  reporting: z.object({
    format: z.string().default('html'),
    outputDir: z.string().default('outputs'),
    screenshotsOnFailure: z.boolean().default(true),
  }),
  performance: z
    .object({
      enableTracing: z.boolean().default(true),
      enableVideo: z.boolean().default(false),
    })
    .optional(),
  codeGeneration: z.object({
    pagesDir: z.string().default('pages'),
    featuresDir: z.string().default('tests/features'),
    overwriteExistingPages: z.boolean().default(false),
    overwriteExistingTests: z.boolean().default(true),
  }),
});

export type ProjectConfig = z.infer<typeof projectConfigSchema>;
