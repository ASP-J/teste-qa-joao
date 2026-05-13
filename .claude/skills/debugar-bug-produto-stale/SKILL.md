---
name: debugar-bug-produto-stale
description: Diagnosticar spec marcado FAILING-BY-PRODUCT-BUG (ou equivalente) que continua red. Antes de cobrar dev, revalidar via API direta / MCP / curl que o sintoma documentado ainda acontece. Se sumiu (bug foi corrigido sem reabrir o spec), re-investigar — a causa atual pode ser outra.
version: 1.0.0
---

# debugar-bug-produto-stale

## Quando usar

Sempre que um spec com comentário `// FAILING-BY-PRODUCT-BUG`, `// BLOCKED-BY-PRODUCT-BUG`, `// BUG:` ou similar continuar vermelho numa rodada. Vale também pra `test.fixme` legítimo "seed ausente"/"flag off" — seed/flag podem ter sido criados sem ninguém abrir o spec de volta.

## Por que existe

Caso real Twygo widgets, 2026-05-11 → 2026-05-13:

- TC3 do `inativar-painel-associado-modal.spec.ts` tinha bloco grande documentando bug Rails: `app/models/use_mode_item.rb#title_for` → NoMethodError → GET /linked_menus 500. Comentário citava commit, runtime e payload — alta confiança.
- Entre 11/05 e 13/05 o servidor corrigiu silenciosamente. `GET /api/v1/o/36988/panels/801930/linked_menus` passou a responder 200.
- O spec continuou red, mas em fase diferente: agora era modal "Modelo de página duplicado" no `beforeAll`.
- Sem revalidar, o time gastaria tempo cobrando dev de um bug já fechado.

## Checklist de diagnóstico

1. **Releia o comentário do spec.** Anote: endpoint citado, sintoma observável, payload/error esperado.
2. **Reproduza o endpoint direto** (não pelo Playwright). Use `curl`, MCP do navegador, ou Rails console — o que for mais barato:
   - `curl -H "Cookie: ..." https://<host>/api/v1/.../linked_menus -i` → confirma status code atual.
   - `mcp__plugin_chrome-devtools-mcp_chrome-devtools__list_network_requests` se já está com o navegador aberto.
3. **Compare**: status e payload reais bate com o que o comentário descreve?
   - Bate → bug ainda vivo. Reabra ticket, anexe o trace atual, mantenha spec red.
   - Não bate → bug corrigido. Vá pro passo 4.
4. **Reproduza só o spec failing** (não a suíte inteira) com `--headed --trace on` e capture a NOVA fase em que ele quebra. Comum: o cleanup/seed mudou, outro modal apareceu, payload mudou de shape.
5. **Atualize o comentário** do spec: nova data de validação, novo veredito (corrigido + nova causa, se houver). Se a nova causa é spec, conserte o spec. Se é outro bug, abra outro ticket.
6. **Não use `test.describe.fixme`** pra "esconder" enquanto investiga — comentário no topo + spec red é o ciclo que documenta o problema (Anti-pattern F do CLAUDE.md).

## Próximos passos

Se o diagnóstico revelar um padrão (ex.: spec ficou red por modal não previsto), considere:

- Adicionar gotcha em §7.5 do `agent-playwright/CLAUDE.md`.
- Adicionar race-handler no Page Object correspondente.
- Atualizar skill correspondente (ex.: `seletores-twygo-app`, `fechar-modais-twygo`).

## Anti-patterns

- ❌ Reabrir ticket de produto sem revalidar — barulho pro dev de produto.
- ❌ `test.fixme` em spec que era `FAILING-BY-PRODUCT-BUG` "só pra parar de chiar". Esconde do relatório.
- ❌ Apagar comentário antigo sem registrar o que mudou. A história do bug é parte da documentação operacional.
