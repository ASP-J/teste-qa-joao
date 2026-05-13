---
name: mapear-fluxos-recon
description: Recon ao vivo do app Twygo, guiado pelos ACs do `normalized-input.md`. Usa `playwright-test` MCP pra navegar e dumpar DOM/test-ids/roles/labels e `chrome-devtools` MCP pra capturar console errors, network requests e detectar modais bloqueantes. Emite `recon-feature.md` com tabela de seletores por fluxo + comportamentos observados + gotchas detectados. NÃO varre cegamente — só percorre os caminhos que os ACs descrevem. Use como fase 3 do orchestrator.
version: 0.1.0
---

# mapear-fluxos-recon

## Quando usar

Phase 3 do `twygo-feature-orchestrator`, depois do Q&A enriquecer o normalized-input.

## Pré-condições

- `outputs/<slug>/normalized-input.md` consolidado com ACs+contexto preenchidos.
- StorageState válido em `outputs/.auth/storage.json` (smoke deve estar passando).
- MCPs `playwright-test` e `chrome-devtools` ativos.

## Preflight

Invoque [[atualizar-mcp-playwright]] (idempotente — skip se já rodou na sessão).

## Auth

Reusa storageState gravado pelo `globalSetup`. Não re-loga a cada fluxo.

Se storageState ausente/expirado:
1. Roda `npx playwright test tests/setup/smoke.spec.ts` pra forçar refresh do storage.
2. Se ainda falhar → invoque [[debugar-smoke-login]] ou aborte com mensagem clara.

## Recon walkthrough

Para cada AC em `normalized-input.md`:

1. Extraia URL/rota do AC (do contexto ou Q&A).
2. Navegue: `mcp__playwright-test__browser_navigate` → URL completa.
3. Dump DOM acessível: `mcp__playwright-test__browser_snapshot` → captura test-ids, roles, names, labels.
4. Capture console: `mcp__chrome-devtools__list_console_messages`.
5. Capture network: `mcp__chrome-devtools__list_network_requests` (filtrar relevantes — descartar tracker/analytics).
6. Detecte gotchas:
   - Modais oportunistas → `[[fechar-modais-twygo]]`
   - Switch Chakra → `[[interagir-switch-chakra-twygo]]`
   - Drawer de filtro → `[[testar-filtro-drawer-twygo]]`
   - Toast Chakra → `[[testar-toast-chakra-twygo]]`

## Output: `recon-feature.md`

```markdown
# Recon — <Nome da Feature> (<slug>)

> Gerado em <ISO timestamp>. Env: <env-name> (<baseURL>).
> MCP: playwright-test <vX>, chrome-devtools <vY>.
> Storage: outputs/.auth/storage.json (fresh).

## Fluxo: AC-01 — <título do AC>

**URL**: /o/36602/widgets/paineis
**Navegação**: dashboard → menu lateral "Widgets" → tab "Painéis"

### Elementos detectados

| data-test-id | tag | role | aria-label / nome | nota |
|---|---|---|---|---|
| `btn-novo-painel` | button | button | "Novo painel" | |
| `tabela-paineis` | table | table | — | tem `<thead>` |
| `switch-ativo-{id}` | label.chakra-switch | checkbox | "Ativo" | gotcha: chakra-switch — usar setSwitch() |

### Comportamentos observados

- Toast Chakra aparece em bottom-right após salvar (`.chakra-toast` — gotcha [[testar-toast-chakra-twygo]])
- Modal NPS Sofia bloqueou click no primeiro acesso — `dismissCommonModals` resolveu
- Endpoint `POST /api/v1/widgets/paineis/{id}/toggle` chamado no toggle
- Console limpo (sem errors)

### Gotchas aplicáveis

- [[interagir-switch-chakra-twygo]] — switch toggle
- [[fechar-modais-twygo]] — NPS na primeira navegação

## Fluxo: AC-02 — <título>
...
```

## Degradações documentadas no header

Se `chrome-devtools` MCP offline:

```markdown
> ⚠ DEGRADED: chrome-dev offline. Console/network não capturados.
```

Se algum AC tem URL inacessível:

```markdown
## Fluxo: AC-NN [BLOQUEADO: URL retornou 404]
```

Se elemento prometido em `normalized-input.md` não existe no DOM:

```markdown
## Discrepâncias

- `btn-export-csv` (AC-04) — prometido no input mas não encontrado em `/o/36602/widgets/paineis`. Verificar com QA ou re-rodar recon após dev habilitar.
```

## Anti-patterns proibidos

- **Não invente seletor** — só registre o que o snapshot retornou.
- **Não navegue fora dos ACs** — recon é guiado.
- **Não re-logue se storage ainda fresh** — desperdiça tempo.
- **Não tolere console errors silenciosamente** — sempre captura e lista, mesmo se aparentar inócuo (pode virar bug downstream).

## Advance state

Após gravar `recon-feature.md`, `advancePhase(..., 'phase-3')`.

## Referências

- Preflight: [[atualizar-mcp-playwright]]
- Gotchas: [[fechar-modais-twygo]], [[interagir-switch-chakra-twygo]], [[testar-toast-chakra-twygo]], [[testar-filtro-drawer-twygo]]
- Diag fallback: [[debugar-smoke-login]], [[debugar-mcp-playwright-env]]
- Próxima fase: [[montar-ac-canonico]]
