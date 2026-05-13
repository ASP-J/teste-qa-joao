---
name: entrevistar-qa
description: Entrevista turn-by-turn o QA pra preencher os gaps detectados em `normalized-input.md`. Faz uma pergunta por turno (multiple-choice quando possível), salva incrementalmente em `qa-interview-log.md` e atualiza `normalized-input.md` enriquecido ao final. Cobre 8 categorias: URL/perfil/dependências/seletores conhecidos/estados/prioridade/edge cases/dados. Use como fase 2 do orchestrator depois de `ler-feature-doc` ter rodado.
version: 0.1.0
---

# entrevistar-qa

## Quando usar

Phase 2 do `twygo-feature-orchestrator`, depois de `ler-feature-doc` produzir `normalized-input.md`.

## Input

`outputs/<slug>/normalized-input.md` — especialmente a seção `## Gaps detectados`.

## Output

`outputs/<slug>/qa-interview-log.md` (incremental, append-only):

```markdown
# Q&A — <Nome da Feature> (<slug>)

## Turn 1
**Categoria**: URL/Perfil
**Pergunta**: Qual env o teste roda? `staging` (stage10), `staging-widgets`, outro?
**Resposta**: staging
**Decisão**: env=staging, baseURL=https://stage10.stage.twygoead.com/, orgId=36602

## Turn 2
...
```

E ao final, `normalized-input.md` enriquecido com as respostas (seções `## Contexto`, `## ACs detectados` atualizadas; `## Gaps detectados` esvaziada ou anotada com "INCOMPLETO" pros que o QA não soube responder).

## Categorias de pergunta

Cubra na ordem (skip se já está no normalized):

1. **URL/Env** — Qual env? URL base do fluxo principal?
2. **Perfil** — Qual perfil de usuário? (Master, admin, comum, etc)
3. **Dependências** — Org? Contrato? Plano? Flag? Algum setup precisa estar feito?
4. **Seletores conhecidos** — Você já sabe algum `data-test-id` da feature? Senão, recon vai descobrir.
5. **Estados a cobrir** — Feliz? Erro? Loading? Vazio? Bloqueio?
6. **Prioridade** — Alta/média/baixa por AC?
7. **Edge cases** — Algum caso especial que o doc não mencionou?
8. **Dados de teste** — Precisa de fixtures? Mocks? Dados pré-cadastrados?

## Formato das perguntas

**Prefira multiple-choice quando possível**:

> Categoria: URL/Env
> Qual env?
> A) staging (stage10.stage.twygoead.com — orgId 36602)
> B) staging-widgets (widgets.stage.twygoead.com — orgId 36988)
> C) staging-without-credits (eduapi — orgId 36912)
> D) outro (especifique)

**Aceite "não sei" como resposta válida** — marque AC/contexto como `INCOMPLETO — recon tentará inferir` e siga.

## Incrementalidade

Após cada resposta:

1. Append turn em `qa-interview-log.md`.
2. Atualize `.state.json` com `notes: "phase-2:turn-N"` (rastreia progresso intra-fase).
3. Só atualize `normalized-input.md` consolidado quando o Q&A inteiro terminar (evita corromper em meio à sessão).

## Quando parar

Quando todos os gaps de `normalized-input.md` foram endereçados OU o QA responder "chega, segue" para os restantes (marca como INCOMPLETO).

## Retomada

Se `qa-interview-log.md` já existe e `.state.json.notes` indica turn-N inacabado, pergunte:

> Detectei Q&A pausado no turn N. Retomar dali ou recomeçar?

## Anti-patterns proibidos

- **Não infira respostas** — sempre pergunte. Se a info estava no doc, ainda confirma rapidamente.
- **Não faça múltiplas perguntas por turn** — uma de cada vez. Cognitive load + clareza.
- **Não termine sem preencher seções** — se ficou IN­COMPLETO, marque explicitamente.

## Advance state

Após `normalized-input.md` enriquecido consolidado, `advancePhase(..., 'phase-2')`.

## Referências

- Fase anterior: [[ler-feature-doc]]
- Próxima fase: [[mapear-fluxos-recon]]
