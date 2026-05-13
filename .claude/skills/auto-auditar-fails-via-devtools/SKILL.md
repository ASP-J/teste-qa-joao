---
name: auto-auditar-fails-via-devtools
description: Quando uma run de Playwright termina com 3+ falhas OU >40% de fails com erros genéricos (timeout, "mensagem genérica", elemento não visível, click não acionável), AGENTE proativamente dispara auditoria via chrome-devtools-mcp pra confirmar se é flakiness/spec frágil vs bug produto. Se chrome-mcp ✅ em N TCs, agente PROPÕE melhorias concretas nas suites Playwright + lista patches sugeridos antes de aplicar. Evita ciclos de "agente chuta fix → quebra mais coisa → QA gasta hora".
version: 1.0.0
---

# auto-auditar-fails-via-devtools

## Quando usar

**Gatilho automático** (agente decide sozinho, sem QA pedir):

Após cada `npm run agent:run` OU `npm run agent:regression`, se o triage
report mostrar QUALQUER um destes sintomas:

- ❌ **3+ falhas** numa mesma suite
- ❌ **>40% de fails** (ex: 5 fails de 8 testes)
- ❌ **2+ fails com mensagem "genérica"** (categoria "mensagem genérica — abra o trace pra diagnosticar" do guessDiagnosis do triage)
- ❌ **2+ fails com erros sintomáticos de flakiness**: `TimeoutError`, `locator.click: Timeout`, `not visible`, `not actionable`, `ERR_NETWORK_CHANGED`

Nesses casos, NÃO chute fix direto. Pause e dispare auditoria via
chrome-devtools-mcp ANTES de mexer no código.

**Gatilho manual** (QA pede):

- "audita esses fails via devtools"
- "compara o que tá rolando no chrome"
- "roda no devtools pra ver"
- "/auditar-fails" (futuro slash command)

## Por que existe

Caso real Twygo widgets, 2026-05-13:

- Suite "Listagem de painéis" deu **5/8 fail** após primeira mudança.
- Sem auditoria via devtools, o reflexo seria chutar fix por TC: trocar
  seletor de tab, aumentar timeout em waitFor, retry no goto, etc.
- Chute → quebra outra coisa → 3/8 fail → quebra mais → 5/8 de novo.
- Custo da abordagem chute: 1h + frustração do QA.
- Quando rodei chrome-mcp manualmente nos 5 TCs failing:
  - 5/5 confirmavam que **produto está OK** (chrome-mcp ✅)
  - Divergência era **timing/render** (3 casos) + **spec/seed errado** (1 caso) + **flakiness rede** (1 caso)
- Fix correto baseado na auditoria:
  - Trocar `page.goto` por `safeGoto` (domcontentloaded + dismiss)
  - Aumentar timeout do tab pra 60s
  - Retry no `safeGoto` pra ERR_NETWORK_CHANGED
  - F1 paginação: asserir nome do 1º row (não count)
- Resultado pós-auditoria: **8/8** em 1 run. Sem regressão de outros TCs.

A regra vira ritual: **muitas falhas genéricas → devtools antes do código**.

## Algoritmo de gatilho

Pseudo-código pra detectar quando disparar (a ser implementado em
`agent:triage` ou orchestrator):

```ts
function shouldAutoAudit(triage: TriageResult): boolean {
  const failedCount = triage.failures.length;
  const totalCount = failedCount + triage.passed;
  const failRate = failedCount / totalCount;

  const genericFails = triage.failures.filter(
    (f) =>
      f.diagnosis.includes('mensagem genérica') ||
      f.diagnosis.includes('elemento não apareceu') ||
      f.diagnosis.includes('click não foi acionável') ||
      f.diagnosis.includes('poll esgotado') ||
      f.errorMessage?.match(/TimeoutError|ERR_NETWORK_CHANGED|not visible|not actionable/i),
  ).length;

  return failedCount >= 3 || failRate > 0.4 || genericFails >= 2;
}
```

## Fluxo da auditoria (8 passos)

Quando gatilho dispara:

### 1. Anuncia intenção pro QA

> "Detectei 5 falhas com erros genéricos. Antes de chutar fix, vou
> auditar cada uma via chrome-devtools-mcp pra confirmar se é
> flakiness/spec ou bug produto. Estimativa: 10min. OK?"

QA pode pular (override manual). Default = roda.

### 2. Carrega contexto

- Lê `outputs/<slug>/triage-report.md` → lista de falhas com diagnose
- Lê o spec source de cada TC failing
- Lê `outputs/.../error-context.md` de cada (snapshot a11y + steps)

### 3. Reproduz cada TC via chrome-devtools-mcp

Pra cada TC failing:

1. `mcp.new_page` ou `mcp.navigate_page` pra URL inicial
2. Executa os steps DO SPEC manualmente via mcp.click/fill/take_snapshot
3. Em cada passo crítico:
   - Captura snapshot
   - Lista network requests (`mcp.list_network_requests({resourceTypes:['xhr','fetch']})`)
   - Lista console messages (`mcp.list_console_messages()`)
4. Anota: chegou no resultado esperado? Onde divergiu?

### 4. Classifica em matriz canônica

| chrome-mcp | Playwright | Categoria | Ação |
|---|---|---|---|
| ✅ | ✅ | OK | (não deveria estar aqui — re-checar triage) |
| ✅ | ❌ | Flakiness / spec frágil / seletor frágil | Patch helper/spec |
| ❌ | ❌ | Bug produto / seed inviável | Escalar dev produto |
| ❌ | ✅ | Raro — Playwright passa por caminho inválido | Auditar prosa do XML |

### 5. Agrupa fixes por padrão

Se ≥2 TCs falharam pelo MESMO motivo (ex: NPS Sofia bloqueando goto em
ambos), proponha **1 fix sistêmico** em `src/utils/modals.ts` ou Page
Object compartilhado — NÃO N patches duplicados.

Padrões recorrentes Twygo conhecidos:

| Padrão | Sintoma | Fix sistêmico |
|---|---|---|
| NPS bloqueia `load` event | timeout em page.goto/waitForURL | `safeGoto` ou `waitUntil:'domcontentloaded'` |
| React SPA hidrata tardio | tab/breadcrumb não visível em 30s | timeout 60s explícito |
| Chakra Switch hidden input 0×0 | click não acionável | `.click({force:true})` ou click no track span |
| Backend valida campo X em endpoint específico | 4xx silencioso, UI parece travada | criar dado sempre com campo X até backend mergear fix |
| Assert depende de count exato do seed | `not.toEqual(N)` falha randomico | asserir invariante (nome mudou, URL mudou) |
| Network flakiness | ERR_NETWORK_CHANGED, ERR_TIMED_OUT | retry transparente no helper |

### 6. Apresenta plano de patches pro QA antes de aplicar

NÃO aplique direto. Mostre:

```
Auditoria completa. Veredito:

| TC | chrome | Playwright | Categoria | Fix sugerido |
|---|---|---|---|---|
| F1 | ✅ | ❌ | Spec frágil | Asserir nome 1ª row (não count) |
| F2 | ✅ | ❌ | Timing | Timeout 60s no waitFor tab |
| F3 | ✅ | ❌ | Flakiness rede | Retry safeGoto |
| F4 | ❌ | ❌ | Bug produto | Escalar dev (ticket: ...) |
| F5 | ❌ | ❌ | Seed inviável | Atualizar data.ts |

Vou aplicar F1, F2, F3 (mesmo arquivo helper). F4 fica RED documentado.
F5 atualiza data file. OK?
```

QA aprova → aplica. QA recusa → arquivo proposta em
`outputs/<slug>/auditoria-proposta-<ts>.md` pra revisão depois.

### 7. Aplica patches

Modificações pequenas e focadas (1 conceito por commit lógico). NUNCA:
- Refactor estrutural durante fix de flakiness
- Trocar nome de variáveis sem motivo
- Introduzir abstração nova ("já que estamos aqui...")

### 8. Re-roda Playwright + triage

Confirma:
- Falhas alvo viraram ✅
- Não regredi ninguém que estava ✅
- Triage report novo lista só os fails de bug produto declarados

Se regrediu alguém, **reverte** ou itera mais auditoria. Não enterra
fail por baixo de retry cego.

## Quando NÃO disparar

- **Failures de fase prévia** (Pre-flight, Parse XML, Generator) — esses não
  são UI, devtools não ajuda. Diagnosticar diretamente.
- **1 falha isolada** — overkill auditar 1 TC com devtools. Vai pelo
  trace direto.
- **Fails com mensagem específica** já diagnosticada (`Descrição não pode
  ficar vazio(a)`, `404 Not Found`, etc) — pula auditoria, vai pro fix
  conhecido. devtools é pra erros genéricos.
- **QA pediu override** ("não audita, só rode o fix") — respeita decisão.

## Métricas de sucesso

Pra cada disparo da skill, registra (em
`outputs/<slug>/auditoria-metrics.jsonl`):

```jsonl
{"ts":"2026-05-13T17:50:00Z","totalFails":5,"audited":5,"chromeOK":4,"chromeFail":1,"fixesApplied":3,"passedAfterFix":4}
```

Trend ideal: `passedAfterFix / totalFails ≥ 0.6` na maioria das auditorias.
Se cair abaixo, revisar heurística (talvez chromeMCP ≠ humano em
algum caso, atualizar tabela canônica).

## Skills relacionadas

- `comparar-chrome-mcp-vs-playwright` — fluxo da auditoria em 5 passos (manual). Esta skill é a versão **automática**.
- `criar-spec-resiliente-twygo` — princípios pra generator/healer não gerar specs flaky no futuro
- `debugar-via-network-e-console` — usado no passo 3 (lista network/console durante a reprodução)
- `twygo-triage-report` — fonte do input desta skill (lê as falhas + diagnoses)
- `debugar-bug-produto-stale` — revalidar bugs marcados FAILING-BY-PRODUCT-BUG

## Anti-patterns

- ❌ Chutar fix antes de auditar (caso real: 1h gasta + regressão).
- ❌ Auditar 1 TC isolado quando há padrão em N — perde oportunidade do
  fix sistêmico.
- ❌ Aplicar todos os patches sem mostrar pro QA — perde signal e
  responsabilidade.
- ❌ Não medir resultado pós-fix — se passa de 5 fails pra 5 fails
  diferentes, é regressão. Revertar.
- ❌ Esconder bugs produto sob retry cego — auditoria existe pra
  SEPARAR flakiness de bug, não unificar.
