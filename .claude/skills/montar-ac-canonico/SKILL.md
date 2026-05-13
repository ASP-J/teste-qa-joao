---
name: montar-ac-canonico
description: Lê `normalized-input.md` + `qa-interview-log.md` + `recon-feature.md` e emite `artifacts/ACs-canonical.md` com ACs em prosa PT-BR canonicalizada (Dado/Quando/Então), seletores referenciados validados contra o recon, e gotchas aplicáveis linkados. Use como fase 4 do orchestrator. Falha se AC referencia seletor inexistente — marca com `⚠ Seletores não encontrados` e pausa pra decisão do QA.
version: 0.1.0
---

# montar-ac-canonico

## Quando usar

Phase 4 do `twygo-feature-orchestrator`. Pré-condições: fases 1-3 completadas.

## Input

3 arquivos:
- `outputs/<slug>/normalized-input.md`
- `outputs/<slug>/qa-interview-log.md`
- `outputs/<slug>/recon-feature.md`

## Output

`outputs/<slug>/artifacts/ACs-canonical.md`.

## Template por AC

```markdown
## AC-01: <título curto>

**Prioridade**: alta | média | baixa
**Tipo**: feliz | erro | bloqueio | edge

### Pré-condições

- Usuário logado como Master no env `staging` (orgId 36602)
- Existe ao menos 1 painel cadastrado

### Cenário

**Dado** que estou em `/o/36602/widgets/paineis`
**Quando** clico em `getByTestId('switch-ativo-{id}')`
**E** confirmo no modal `getByRole('button', { name: 'Confirmar' })`
**Então** vejo toast `getByText('Painel inativado')`
**E** linha da tabela mostra status "Inativo"

### Seletores referenciados

- `getByTestId('switch-ativo-{id}')` — fonte: recon (Fluxo AC-01)
- `getByRole('button', { name: 'Confirmar' })` — fonte: recon (modal de confirmação)
- `getByText('Painel inativado')` — fonte: recon (toast observado)

### Gotchas aplicáveis

- [[interagir-switch-chakra-twygo]] — switch toggle
- [[testar-toast-chakra-twygo]] — toast assertion
- [[fechar-modais-twygo]] — NPS pode aparecer
```

## Validações antes de gravar

Para cada AC:

1. **Cada seletor referenciado existe no `recon-feature.md`** — se não, registra warning:

```markdown
### ⚠ Seletores não encontrados

- `getByTestId('btn-export-pdf')` — referenciado em AC-04 mas ausente do recon.
```

Pausa o orchestrator: pergunta ao QA:
- (a) Re-rodar recon focado no fluxo AC-04
- (b) Marcar AC-04 como inviável
- (c) Ajustar texto do AC pra remover referência

2. **Prosa segue `prose-patterns.md`** — verifica padrões Dado/Quando/Então. Tenta auto-normalizar via mapping. Se falhar, deixa raw + inline warning:

```markdown
> ⚠ Prosa não-canônica — revisar manualmente.
```

3. **Sem referência a XML/TestLink** — este repo não usa esse formato.

## Anti-patterns proibidos

- **Não invente seletor** — só referencie o que tá no recon.
- **Não use seletores frágeis** (`page.locator('div > span:nth-child(3)')`) — sempre `getByTestId` / `getByRole` / `getByLabel`.
- **Não esqueça pré-condições** — login + perfil + dependências sempre listados.
- **Não use vocabulário inglês** no Dado/Quando/Então (Twygo é PT-BR).

## Source-of-truth por campo

| Campo | Vem de |
|---|---|
| Título AC | normalized-input (já enriquecido pelo Q&A) |
| Prioridade, Tipo | Q&A log |
| Pré-condições | normalized-input + Q&A |
| Seletores | recon-feature.md (table) |
| Gotchas aplicáveis | recon-feature.md (seção "Gotchas aplicáveis") |

## Advance state

Após gravar artifact, `advancePhase(..., 'phase-4')`.

## Referências

- Prosa canônica: `.claude/prose-patterns.md`
- Próxima fase: [[montar-skill-feature]]
