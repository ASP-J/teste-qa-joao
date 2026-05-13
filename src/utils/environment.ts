import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import 'dotenv/config';
import { FILES } from './constants.js';

export type EnvCredentials = {
  email: string;
  password: string;
};

export type EnvSuperAdmin = {
  path?: string;
  subscriptionPlansPath?: string;
  editContractPath?: string;
};

export type EnvEntry = {
  baseUrl: string;
  credentials: EnvCredentials;
  timeout: number;
  orgId?: string;
  superAdmin?: EnvSuperAdmin;
};

type EnvFile = Record<string, EnvEntry>;

const VAR_REF = /\$\{([A-Z_][A-Z0-9_]*)\}/g;

let cachedAll: EnvFile | null = null;
let cachedActive: { name: string; entry: EnvEntry } | null = null;

function expandEnvRefs<T>(value: T, ctx = 'environment.json'): T {
  if (typeof value === 'string') {
    return value.replace(VAR_REF, (_, name: string) => {
      const v = process.env[name];
      if (v === undefined || v === '') {
        throw new Error(
          `Variável de ambiente "${name}" referenciada em ${ctx} mas não definida. ` +
            `Copie .env.example para .env e preencha (ver .claude/SETUP.md).`,
        );
      }
      return v;
    }) as unknown as T;
  }
  if (Array.isArray(value)) {
    return value.map((v) => expandEnvRefs(v, ctx)) as unknown as T;
  }
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = expandEnvRefs(v, ctx);
    }
    return out as unknown as T;
  }
  return value;
}

export function loadEnvironmentConfig(): EnvFile {
  if (cachedAll) return cachedAll;
  const raw = JSON.parse(
    readFileSync(resolve(process.cwd(), FILES.environment), 'utf-8'),
  ) as EnvFile;
  cachedAll = expandEnvRefs(raw, FILES.environment);
  return cachedAll;
}

export function getEnvByName(name: string): EnvEntry {
  const entry = loadEnvironmentConfig()[name];
  if (!entry) {
    throw new Error(`Environment "${name}" não encontrado em ${FILES.environment}`);
  }
  return entry;
}

/**
 * Resolve o ambiente ativo a partir de `process.env.TWYGO_ENV` (default: `staging`).
 * Diferente do agent-playwright original, este repo não tem `projects/<slug>/`;
 * o env é setado externamente por quem invocar o pipeline (Q&A pode redefinir).
 */
export function getActiveEnv(): { name: string; entry: EnvEntry } {
  if (cachedActive) return cachedActive;
  const name = process.env.TWYGO_ENV || 'staging';
  cachedActive = { name, entry: getEnvByName(name) };
  return cachedActive;
}

export function getBaseUrl(): string {
  return getActiveEnv().entry.baseUrl;
}

export function getOrgId(): string {
  const { name, entry } = getActiveEnv();
  if (!entry.orgId) {
    throw new Error(`orgId não definido para o env "${name}" em ${FILES.environment}`);
  }
  return entry.orgId;
}
