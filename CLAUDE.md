# CLAUDE.md — twygo-qa-agent

> Bootstrapper de features de QA Twygo. Lê documentação polimórfica (MD/PDF/DOCX/TXT) de uma feature, entrevista o QA pra preencher gaps, faz recon do app via `playwright-test` + `chrome-devtools` MCPs, e emite 3 artefatos prontos pra alimentar a geração de testes downstream:
>
> 1. `SKILL.md` — skill operacional descrevendo o padrão canônico de teste da feature.
> 2. `ACs-canonical.md` — ACs em prosa PT-BR canonicalizada (compatível com `prose-patterns.md`).
> 3. `project.config.json` — configuração de projeto Playwright escopada à feature.
>
> Outputs ficam em `outputs/<feature-slug>/artifacts/` pro QA copiar manualmente pra onde for usar.

## Skills primeiro

Antes de implementar/gerar código aqui, leia `.claude/skills/*/SKILL.md`. As skills capturam padrões já validados, fluxos canônicos, convenções Twygo, anti-patterns proibidos e diagnósticos de bugs comuns.

A "lei" técnica deste repo está nas seções §1–§9 abaixo + nas skills. CLAUDE.md fixa as regras invariantes; SKILL.md cobre o tactical.

## Regra: feedback corretivo ⇒ proposta de skill

Quando o usuário corrigir um padrão que você usou ("não faz assim", "essa abordagem tá errada", "use o que já existe em X", "esse seletor é frágil"), **antes de continuar a tarefa**:

1. Identifique o padrão correto que ele indicou.
2. Verifique se já existe skill em `.claude/skills/` cobrindo esse padrão.
3. Se **não existe**: proponha criar nova skill — (a) padrão certo, (b) anti-pattern cometido, (c) onde o padrão certo já é usado. Pergunte antes de criar.
4. Se **existe** mas incompleta/desatualizada: proponha atualizar. Pergunte antes.
5. Só siga depois da confirmação.

**Não crie skill silenciosamente** — o usuário decide o que vira convenção persistente.

## Regra: problema vivenciado ⇒ proposta de skill

Quando o usuário relatar bug/erro ("não funciona", "deu pau") e você diagnosticar/resolver, **antes de fechar**:

1. Causa raiz era óbvia ou exigiu investigação não-trivial?
2. Se não-trivial, considere skill de **diagnóstico** (sintoma → causa → fix). O ganho é acelerar a próxima vez.
3. Busca em `.claude/skills/` se já existe.
4. Se não: proponha `debugar-X` ou `diagnosticar-X`. Pergunte antes.
5. Se existe mas faltou cobrir esse caso: proponha atualizar. Pergunte antes.

## Regra: erro próprio reconhecido ⇒ propor skill ou melhoria de código

Auto-reflexiva. Quando você (agente) reconhecer sozinho que errou — recon que recusou um seletor, prosa que contradiz `prose-patterns.md`, etc — pause e ofereça:

1. **Skill nova/atualizada** se o erro indica conhecimento estruturado faltante.
2. **Melhoria de código** se o erro indica que o código atual permite a classe do erro acontecer.

Não corrija silenciosamente. Pergunte ao usuário.

---

## §1. Propósito e escopo

Este agente **não roda specs Playwright como produto final**. Ele bootstrapa o material (SKILL+ACs+config) que outro agente (ou QA humano) usa pra escrever specs.

O que faz:
- Lê input polimórfico (MD/TXT/PDF/DOCX) → normaliza pra MD canonical.
- Entrevista QA turn-by-turn pra preencher gaps detectados no input.
- Recon: navega o app via playwright MCP + chrome-devtools MCP, mapeia elementos/ids/comportamentos.
- Emite 3 artefatos canônicos.

O que **não** faz:
- Não gera arquivos `.spec.ts` (downstream).
- Não roda regressão, não emite reports, não healing.
- Não aceita XML TestLink (input é MD-family).

## §2. Stack

- TypeScript strict (`tsconfig.json` herda do agent-playwright; `noImplicitAny`, etc).
- Node ≥ 20.
- Playwright (mantido pro smoke + login + recon via MCP).
- Vitest pra unit/integration tests da própria infra do agente.
- Libs: `marked`, `pdf-parse`, `mammoth`, `zod`, `dotenv`.
- MCPs: `playwright-test`, `chrome-devtools`.

## §3. Layout

```
twygo-qa-agent/
├── CLAUDE.md
├── README.md
├── .env.example
├── package.json
├── playwright.config.ts
├── tsconfig.json
├── .mcp.json
├── config/environment.json       # envs Twygo (staging, widgets, etc)
├── src/
│   ├── pages/                    # Page Objects herdados (BasePage, LoginPage, DashboardPage, SuperAdminPage)
│   ├── fixtures/                 # custom-fixtures, test-data
│   └── utils/                    # environment, modals, helpers, logger, constants
├── tests/
│   ├── setup/global-setup.ts     # login + storageState
│   ├── setup/smoke.spec.ts       # smoke universal
│   └── auth/login.spec.ts        # spec de referência
├── lib/
│   ├── input-normalizer/         # parsers MD/TXT/PDF/DOCX → normalized-input.md
│   ├── schemas/                  # zod schemas (project-config)
│   └── state/                    # phase machine (.state.json)
├── inputs/                       # MDs de feature fornecidos pelo QA (versionados)
├── outputs/                      # gerado (gitignored)
│   └── <feature-slug>/
│       ├── .state.json
│       ├── normalized-input.md
│       ├── qa-interview-log.md
│       ├── recon-feature.md
│       └── artifacts/
│           ├── SKILL.md
│           ├── ACs-canonical.md
│           └── project.config.json
└── .claude/
    ├── SETUP.md
    ├── PROJECT_BOOTSTRAP.md
    ├── prose-patterns.md
    ├── commands.md
    ├── commands/feature-bootstrap.md
    └── skills/                   # 8 skills novas + skills inherited
```

## §4. Fluxo macro

```
QA → /feature-bootstrap <path>
       ↓
twygo-feature-orchestrator
       ↓
  preflight       → atualizar-mcp-playwright
  [phase-1] input → ler-feature-doc           → normalized-input.md
  [phase-2] Q&A   → entrevistar-qa            → qa-interview-log.md
  [phase-3] recon → mapear-fluxos-recon       → recon-feature.md
  [phase-4] ac    → montar-ac-canonico        → artifacts/ACs-canonical.md
  [phase-5] skill → montar-skill-feature      → artifacts/SKILL.md
  [phase-6] cfg   → montar-project-config     → artifacts/project.config.json
       ↓
[done] print resumo + paths
```

Estado em `outputs/<slug>/.state.json` com `lastPhase`. Skill orquestradora consulta no boot pra suportar retomada.

## §5. Convenções Twygo (mantidas do agent-playwright)

### 5.1. Test-id atributo

App Twygo usa `data-test-id` (com hífen) — NÃO `data-testid` padrão Playwright. Já configurado em `playwright.config.ts` via `use.testIdAttribute = 'data-test-id'`.

`getByTestId('foo')` resolve pra `data-test-id="foo"`.

### 5.2. Login URL

`/users/login` (não `/login`). Pós-login redireciona pra `/play?menu_id=play`.

### 5.3. Sem switch de perfil via UI

Cobre direto a rota `/o/{orgId}/...` — auto-abre contexto admin.

### 5.4. Sync alert bloqueia clicks

Modal de sincronização Twygo intercepta pointer events. Use `force:true` ou `editPage.isSyncBlocking()`.

### 5.5. Toast Chakra acumula

`.chakra-toast` acumula se múltiplas ações disparam. Use `.first()` + `waitForToastsToClear()`. Skill: `testar-toast-chakra-twygo`.

### 5.6. Switch Chakra intercepta clicks

`<label>` envolve `<input type="checkbox">` oculto. `force:true + scrollIntoViewIfNeeded()`. Skill: `interagir-switch-chakra-twygo`.

### 5.7. Modais oportunistas

NPS Sofia, sessão duplicada — bloqueiam interações. Use `dismissCommonModals` em `src/utils/modals.ts`. Skill: `fechar-modais-twygo`.

## §6. Anti-patterns proibidos em código gerado

Aplicáveis sempre que o agente emitir snippet TS (em `SKILL.md`, exemplo de spec, etc):

**A. Não fazer login em spec/snippet.**
`globalSetup` cobre via storageState. Não chamar `loginPage.login()` ou `page.goto('/users/login')` — exceto em `tests/auth/`.

**B. Não hardcodar URL/orgId/credenciais.**
Importe de `src/utils/environment.ts` (`getBaseUrl()`, `getOrgId()`, `getEnvByName('<env>')`). Rotas livres de env (`/users/login`, `/play`) podem ficar literais.

**C. Não inline helpers de UI no `test()`.**
Lógica com seletores ou multi-step belongs em Page Object. Specs chamam só métodos de POM.

**D. Comentários só justificam o WHY.**
Não descrevem o WHAT (já evidente). Não referenciam task/issue (rota PR description).

**E. Não inline dados de domínio em spec.**
Mova pra `.data.ts` adjacente ao spec.

**F. Nunca use `test.fixme` pra esconder bug de produto.**
Falhe abertamente; comente causa + fix esperado.

## §7. Skills nativas deste repo

Novas (parte do bootstrap):
- `twygo-feature-orchestrator` — coordena fases.
- `ler-feature-doc` — normaliza input via lib `lib/input-normalizer/`.
- `entrevistar-qa` — Q&A turn-by-turn.
- `mapear-fluxos-recon` — recon via MCPs.
- `montar-ac-canonico` — emite ACs canonicalizados.
- `montar-skill-feature` — emite SKILL.md.
- `montar-project-config` — emite project.config.json.
- `atualizar-mcp-playwright` — preflight de versão MCP.

Herdadas (operacionais Twygo):
- `interagir-switch-chakra-twygo` — gotcha
- `testar-toast-chakra-twygo` — gotcha
- `testar-filtro-drawer-twygo` — gotcha
- `fechar-modais-twygo` — gotcha
- `debugar-smoke-login` — diagnóstico
- `debugar-mcp-playwright-env` — diagnóstico
- `debugar-bug-produto-stale` — diagnóstico
- `auto-auditar-fails-via-devtools` — diagnóstico
- `atualizar-agents-oficiais` — manutenção
- `configurar-ambiente` — setup

## §8. Comandos

- `/feature-bootstrap <path-to-input>` — slash command que dispara o orchestrator.
- `npm test` — Vitest (unit/integration da infra do agente).
- `npm run smoke` — Playwright smoke (login + landing).
- `npm run typecheck` — `tsc --noEmit`.

## §9. Output ownership

Outputs ficam em `outputs/<slug>/`. Sempre gitignored. QA revisa e **copia manualmente** pra onde for usar (geralmente `agent-playwright/projects/<slug>/` no monorepo `twygo-agents-qa`, ou direto no repo de consumo).

Este repo **não tem conhecimento do destino final** — é standalone.
