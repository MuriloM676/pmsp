# Registro de Alterações — SIGPOL

---

## Sessão 1 — 01/03/2026

### Arquivo Criado

| Arquivo | Descrição |
|---|---|
| `.gitignore` | Regras de exclusão do Git para Node.js, Vite, TypeScript, Docker, SSL, banco de dados, IDEs e OS |

---

## Sessão 2 — 01/03/2026 (Novas Páginas e Correções de Rota)

### Problemas Corrigidos

| # | Problema | Solução |
|---|---|---|
| 1 | Criar ocorrência dava erro 404 mas a ocorrência era criada | O `onSuccess` já navegava para `/ocorrencias/:id`, mas a rota não existia — criada a página `OcorrenciaDetalhe` e registrada a rota |
| 2 | Clicar em ocorrência em `/ocorrencias` dava 404 | Mesma correção do item 1 |
| 3 | Botão `+ Cadastrar PM` em `/policiais` não fazia nada | Adicionado modal completo de cadastro com formulário e integração à API |
| 4 | `/escalas` retornava 404 | Criada a página `Escalas` e registrada a rota |
| 5 | `/manutencoes` retornava 404 | Criada a página `Manutencoes`, adicionado endpoint `GET /manutencoes` no backend e registrada a rota |
| 6 | `/inteligencia/stats` retornava 404 | Criada a página `IntelStats` e registrada a rota |
| 7 | `/auditoria` retornava 404 | Criada a página `Auditoria` e registrada a rota |
| 8 | `/configuracoes` retornava 404 | Criada a página `Configuracoes` e registrada a rota |

### Novos Arquivos Criados

#### Frontend — Páginas

| Arquivo | Rota | Descrição |
|---|---|---|
| `frontend/src/pages/OcorrenciaDetalhe.tsx` | `/ocorrencias/:id` | Detalhe completo da ocorrência com modal de atualização de status |
| `frontend/src/pages/Escalas.tsx` | `/escalas` | Listagem de efetivo escalado por dia e modal para inserir escala |
| `frontend/src/pages/Manutencoes.tsx` | `/manutencoes` | Listagem, registro e conclusão de manutenções de viaturas |
| `frontend/src/pages/IntelStats.tsx` | `/inteligencia/stats` | Estatísticas por prioridade, status, natureza e alertas de tendência |
| `frontend/src/pages/Auditoria.tsx` | `/auditoria` | Últimos 100 eventos de auditoria do sistema com atualização automática |
| `frontend/src/pages/Configuracoes.tsx` | `/configuracoes` | Perfil, parâmetros do sistema, preferências de alertas e integrações |

### Arquivos Modificados

#### Frontend

#### `frontend/src/App.tsx`
- Adicionados imports das 6 novas páginas: `OcorrenciaDetalhe`, `Escalas`, `Manutencoes`, `IntelStats`, `Auditoria`, `Configuracoes`
- Adicionadas as respectivas rotas no React Router:
  - `/ocorrencias/:id` → `OcorrenciaDetalhe`
  - `/escalas` → `Escalas`
  - `/manutencoes` → `Manutencoes`
  - `/inteligencia/stats` → `IntelStats`
  - `/auditoria` → `Auditoria`
  - `/configuracoes` → `Configuracoes`

#### `frontend/src/pages/Policiais.tsx`
- Adicionados imports: `useMutation`, `useQueryClient`, `useForm`, `Modal`, `Field`, `PostoGraduacao`, `SituacaoPM`
- Adicionado array `POSTOS` com todos os postos/graduações
- Adicionada interface `PMForm` com os campos do formulário
- Adicionado estado `modalOpen`
- Adicionado `useMutation` para chamar `policiaisService.criar()`
- Adicionado `useForm` com valores padrão
- Botão `+ Cadastrar PM` agora abre o modal (antes era inerte)
- Adicionado `<Modal>` com formulário completo de cadastro (RG PM, CPF, nome completo, nome de guerra, sexo, posto/graduação, situação, e-mail, telefone)

#### `frontend/src/services/api.ts`
- `viaturasService`: adicionados os métodos `listarManutencoes` e `concluirManutencao` (o método `criarManutencao` já existia)
- Adicionado `auditoriaService` com o método `listar` chamando `GET /auditoria`

#### `frontend/src/types/index.ts`
- Interface `Ocorrencia`: adicionados campos `observacoes?: string` e `morte_no_local: boolean` (usados na página de detalhe)

#### Backend

#### `backend/src/controllers/viaturasController.js`
- Adicionada função `listarManutencoes` — `GET /manutencoes` com suporte a filtro por `resolvido`, paginação e join com a tabela `viaturas`
- Adicionada `listarManutencoes` no `module.exports`

#### `backend/src/routes/index.js`
- Adicionada rota `GET /manutencoes` chamando `viaturasController.listarManutencoes` (a rota `POST /manutencoes` já existia)

---

## Sessão 3 — 01/03/2026 (Docker Build Fix)

### Problema
O build Docker do frontend falhava com `exit code 2` porque o compilador TypeScript (`tsc`) em modo estrito rejeita alguns padrões que o servidor de linguagem do VS Code aceita silenciosamente.

### Causa Raiz
O TypeScript com `strict: true` (definido no `tsconfig.json`) bloqueia conversões de tipo quando os dois tipos não compartilham campos suficientes. O cast duplo via `unknown` é o padrão correto nesses casos.

### Arquivos Modificados

#### `frontend/src/pages/OcorrenciaDetalhe.tsx`
- Adicionado tipo `Ocorrencia` e `PrioridadeOcorrencia` no import de `@/types`
- Query tipada explicitamente: `.then(r => r.data as Ocorrencia)`
- Cast explícito na expressão de cor: `prioridadeCor[oc.prioridade as PrioridadeOcorrencia]`

#### `frontend/src/pages/Escalas.tsx`
- Cast do formulário corrigido de `d as Record<string, unknown>` para `d as unknown as Record<string, unknown>`

#### `frontend/src/pages/Policiais.tsx`
- Mesmo cast aplicado ao formulário de cadastro: `d as unknown as Record<string, unknown>`

### Erros de Build Corrigidos

```
src/pages/Escalas.tsx(139,59): error TS2352
src/pages/OcorrenciaDetalhe.tsx(56,14): error TS7053
src/pages/OcorrenciaDetalhe.tsx(82,43): error TS7053
src/pages/Policiais.tsx(148,59): error TS2352
```
