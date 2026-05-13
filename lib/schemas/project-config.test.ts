import { describe, expect, it } from 'vitest';
import { projectConfigSchema } from './project-config.js';

describe('projectConfigSchema', () => {
  it('accepts minimal valid config', () => {
    const r = projectConfigSchema.safeParse({
      projectName: 'foo',
      environment: 'staging',
      browsers: ['chromium'],
      headless: true,
      reporting: { format: 'html', outputDir: 'outputs', screenshotsOnFailure: true },
      codeGeneration: {
        pagesDir: 'pages',
        featuresDir: 'tests/features',
        overwriteExistingPages: false,
        overwriteExistingTests: true,
      },
    });
    expect(r.success).toBe(true);
  });

  it('rejects missing projectName', () => {
    const r = projectConfigSchema.safeParse({
      environment: 'staging',
      reporting: { format: 'html', outputDir: 'outputs', screenshotsOnFailure: true },
      codeGeneration: {
        pagesDir: 'pages',
        featuresDir: 'tests/features',
        overwriteExistingPages: false,
        overwriteExistingTests: true,
      },
    });
    expect(r.success).toBe(false);
  });

  it('rejects unknown browser', () => {
    const r = projectConfigSchema.safeParse({
      projectName: 'foo',
      environment: 'staging',
      browsers: ['edge'],
      reporting: { format: 'html', outputDir: 'outputs', screenshotsOnFailure: true },
      codeGeneration: {
        pagesDir: 'pages',
        featuresDir: 'tests/features',
        overwriteExistingPages: false,
        overwriteExistingTests: true,
      },
    });
    expect(r.success).toBe(false);
  });
});
