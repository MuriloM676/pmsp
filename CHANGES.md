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
---

## Sessão 4 — 02/03/2026 (Hardening de Segurança)

### Melhorias Implementadas

#### 1. Refresh Token via Cookie `httpOnly` — elimina exposição a XSS

O `refresh_token` era retornado no corpo JSON do login e armazenado em `localStorage`, onde qualquer script malicioso poderia lê-lo. Agora é trafegado exclusivamente via cookie `httpOnly; Secure; SameSite=Strict`, inacessível ao JavaScript.

#### 2. RBAC real nas rotas do Frontend

O `PrivateRoute` verificava apenas `isAuthenticated`, permitindo que qualquer usuário logado acessasse `/auditoria` ou `/configuracoes` diretamente pela URL. Adicionado `RoleRoute` com verificação de `temPermissao()`.

#### 3. Clamping do parâmetro `limit` na paginação — previne DoS

Os controllers aceitavam valores arbitrários de `limit` via query string (ex.: `?limit=999999`), podendo sobrecarregar o banco. Agora o valor é sanitizado com `Math.min(MAX, Math.max(1, parseInt(limit)))`.

### Arquivos Modificados

#### Backend

| Arquivo | Alteração |
|---|---|
| `backend/package.json` | Dependência `cookie-parser` adicionada |
| `backend/src/server.js` | Import e registro do middleware `cookie-parser` |
| `backend/src/controllers/authController.js` | `login` seta cookie `sigpol_rt` (`httpOnly`, `Secure`, `SameSite=strict`, 7d) em vez de retornar `refresh_token` no JSON; `refreshToken` lê de `req.cookies.sigpol_rt`; adicionada função `logout` com `res.clearCookie()` |
| `backend/src/routes/index.js` | Rota `POST /auth/refresh` simplificada (sem body validator); adicionada rota `POST /auth/logout` |
| `backend/src/controllers/ocorrenciasController.js` | `limit` clampado a `[1, 100]` via `safeLimit`; `page` sanitizado com `Math.max(1, ...)` |
| `backend/src/controllers/policiaisController.js` | Mesmo clamping em `listar` e `listarEscalas` |
| `backend/src/controllers/viaturasController.js` | Mesmo clamping em `listar` |

#### Frontend

| Arquivo | Alteração |
|---|---|
| `frontend/src/store/authStore.ts` | `setAuth` não recebe mais o parâmetro `refresh`; `logout` remove apenas `sigpol_token` do `localStorage` |
| `frontend/src/services/api.ts` | Interceptor de 401 faz `POST /auth/refresh` com `withCredentials: true` em vez de ler `sigpol_refresh` do `localStorage`; em caso de falha chama `POST /auth/logout` antes de redirecionar |
| `frontend/src/pages/Login.tsx` | `setAuth` chamado sem o terceiro argumento `refresh_token` |
| `frontend/src/components/layout/AppLayout.tsx` | `handleLogout` agora é `async` e chama `POST /auth/logout` no servidor antes de limpar o estado local |
| `frontend/src/App.tsx` | Import de `temPermissao` adicionado; adicionado componente `RoleRoute`; rotas `/viaturas`, `/policiais`, `/escalas`, `/manutencoes`, `/inteligencia/*` exigem perfil mínimo `Supervisor`; `/auditoria` e `/configuracoes` exigem `Administrador` |

### Detalhes do `RoleRoute`

```tsx
function RoleRoute({ children, minPerfil }) {
  const { usuario } = useAuthStore()
  if (!usuario || !temPermissao(usuario.perfil, minPerfil)) {
    return <Navigate to="/" replace />
  }
  return <>{children}</>
}
```

Hierarquia de perfis: `Operador < Supervisor < Gestor < Comandante < Administrador`