---
name: atualizar-agents-oficiais
description: Atualiza os 3 subagents oficiais Playwright (.claude/agents/playwright-test-{planner,generator,healer}.md) re-rodando `npx playwright init-agents --loop=claude` e mostrando o diff pra QA aprovar antes de aceitar. Use quando o Playwright lançou versão nova, o changelog do plugin oficial menciona melhorias nos subagents, ou aparece bug em planner/generator/healer já corrigido upstream.
version: 1.0.0
---

# atualizar-agents-oficiais

Skill operacional para manter os 3 subagents oficiais Playwright em
sincronia com o upstream Microsoft. **Não toca nada Twygo** — só os 3
arquivos `.md` em `.claude/agents/` (e potencialmente `.mcp.json`).

A ideia: o agent-playwright NÃO forka esses 3 arquivos (ver CLAUDE.md
§6.2). A customização Twygo vive em volta — em skills, em `prose-patterns.md`,
no orquestrador. Por isso é seguro re-gerar e aceitar updates upstream.

## Quando invocar

- Release notes do plugin oficial Playwright mencionam melhoria nos
  subagents (planner/generator/healer).
- QA notou comportamento que sugere bug nos agents oficiais e quer testar
  se já foi corrigido upstream.
- Período sem atualização (>2 meses) e quer conferir se há novidade.
- Antes de iniciar projeto novo grande — vale validar que os agents estão
  na versão mais recente.

**NÃO invocar** quando:
- Arquivos em `.claude/agents/` foram editados manualmente (o init-agents
  vai sobrescrever — mas o agent-playwright não permite essa edição em
  primeiro lugar; se editou, é bug de processo).
- A working tree está suja com mudanças Twygo não-relacionadas — o diff
  vai ficar bagunçado.

## Pré-requisitos

- `node` + `npm` disponíveis (mesma versão do dev/CI).
- `npx playwright init-agents --help` retorna sem erro (Playwright recente
  o suficiente — versão do `package.json`).
- Working tree limpa em `.claude/agents/` e `.mcp.json` (`git status`).

## Fluxo canônico

### 1. Confirmar working tree limpa

```bash
git status .claude/agents/ .mcp.json
```

Saída esperada: `nothing to commit`. Se houver modificação, **pare** —
o usuário precisa decidir se commita ou stashes antes.

### 2. Capturar versão atual (referência)

```bash
sha256sum .claude/agents/playwright-test-*.md > /tmp/agents-before.sha256
```

(Linux/macOS. Windows: `Get-FileHash`.)

### 3. Re-gerar os 3 arquivos

```bash
npx playwright init-agents --loop=claude
```

O comando regrava:
- `.claude/agents/playwright-test-planner.md`
- `.claude/agents/playwright-test-generator.md`
- `.claude/agents/playwright-test-healer.md`
- E pode regravar `.mcp.json` (entrada `playwright-test`).

### 4. Diff pra revisão humana

```bash
git diff .claude/agents/ .mcp.json
```

Cenários:

| Diff | O que fazer |
|---|---|
| Vazio | Nada mudou. Encerre. |
| Só whitespace/ordem de tools | Aceitar. Commit `chore: sync playwright-test agents (no semantic change)`. |
| Tools novos / system prompt alterado | **Mostrar ao usuário**, explicar o que mudou (resumo de 1 parágrafo por arquivo). Esperar aprovação. |
| `.mcp.json` mudou comando/args | Atenção: pode ser fix de plataforma (Linux vs Windows). Confirmar com o usuário antes de aceitar — em alguns projetos a entrada foi customizada manualmente. |

### 5. Se o usuário aceitar

```bash
git add .claude/agents/ .mcp.json
git commit -m "chore: sync subagents Playwright oficiais com upstream

- planner: <resumo>
- generator: <resumo>
- healer: <resumo>
- (.mcp.json: <resumo, se mudou>)

Gerado por: npx playwright init-agents --loop=claude
Skill: atualizar-agents-oficiais"
```

### 6. Se o usuário rejeitar

```bash
git checkout -- .claude/agents/ .mcp.json
```

Restaura os arquivos pro estado anterior. Sem perda.

### 7. Pós-aceite: smoke

Re-rodar smoke pra confirmar que tudo segue funcionando:

```bash
npm run agent:smoke
```

Se quebrou: `git revert` o commit da Etapa 5 e abrir issue upstream
(github.com/microsoft/playwright) com o diff que causou regressão.

## Pegadinhas

### `.mcp.json` com `cmd /c` em Linux

A versão atual do `.mcp.json` no repo usa `cmd /c npx ...` (Windows-only).
Se o init-agents reescrever o `.mcp.json` em ambiente Linux/macOS, o comando
vai virar `npx ...` direto — **isso é correção, não regressão**. Aceite
sem hesitar (o Windows do QA pode regravar pra `cmd /c` na próxima vez
que ele rodar a skill).

### Anti-pattern: editar manualmente os 3 .md

Se você se pegou querendo "ajustar" o system prompt do planner pra ele
"saber Twygo melhor" — **PARE**. Esse é o caminho de fork que o agent
explicitamente rejeita (CLAUDE.md §6.2). A customização Twygo entra via:

- **Contexto na invocação**: o `twygo-test-orchestrator` injeta convenções
  no prompt da invocação (ver Etapas 2 e 4 daquele SKILL.md).
- **`prose-patterns.md`**: tabela PT-BR → Playwright que o orquestrador
  carrega antes do generator.
- **Skills paralelas**: `twygo-recon` corta tempo do planner; `twygo-xml-parser`
  alimenta o generator com plano estruturado.

Edição direta dos 3 arquivos = perde sincronização com upstream e não ganha
nada que não dê pra fazer pelo orquestrador.

### `npx playwright init-agents` cria pasta extra

Em primeira execução, o comando pode criar `tests/seed.spec.ts` (já existe)
ou outras pastas de exemplo. Se aparecer arquivo novo fora de `.claude/agents/`
e `.mcp.json`, revise individualmente — provavelmente é exemplo descartável.

## Saídas

- `.claude/agents/playwright-test-{planner,generator,healer}.md` atualizados
- `.mcp.json` possivelmente atualizado
- Commit `chore: sync subagents Playwright oficiais` (se aceito)
- Smoke validado

## Referências

- [Plugin Playwright para Claude](https://claude.com/plugins/playwright)
- [Microsoft Playwright MCP](https://github.com/microsoft/playwright-mcp)
- CLAUDE.md §6.1 (MCPs externos) e §6.2 (subagents oficiais)
- SETUP.md §3 e §4 (instalação inicial dos MCPs e plugin)
