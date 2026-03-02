# 🚔 SIGPOL — Sistema Integrado de Gestão Policial
## Polícia Militar do Estado de São Paulo

> **Classificação: INTERNO RESTRITO**
> Este sistema contém dados sensíveis de segurança pública. Acesso limitado a usuários autorizados.

---

## 📐 Arquitetura

```
┌──────────────────────────────────────────────────────┐
│                    INTERNET / INTRANET                │
└───────────────────────┬──────────────────────────────┘
                        │ HTTPS (TLS 1.3)
                   ┌────▼─────┐
                   │  NGINX   │  Proxy reverso + SSL
                   └────┬─────┘
           ┌────────────┴────────────┐
      ┌────▼────┐              ┌─────▼─────┐
      │ REACT   │              │  NODE.JS  │
      │Frontend │              │  Express  │  API REST
      └─────────┘              └─────┬─────┘
                                     │
                          ┌──────────┴──────────┐
                     ┌────▼────┐          ┌─────▼────┐
                     │POSTGRES │          │  REDIS   │
                     │+PostGIS │          │  Cache   │
                     └─────────┘          └──────────┘
```

---

## 📦 Módulos

| Módulo | Descrição |
|--------|-----------|
| **Ocorrências** | Registro e acompanhamento de BOs com geolocalização |
| **Efetivo / RH** | Gestão de policiais, escalas e licenças |
| **Viaturas** | Frota, rastreamento GPS e manutenção |
| **Inteligência** | Heatmap, estatísticas e análise de tendências criminais |
| **Auditoria** | Log imutável de todas as ações do sistema |

---

## 🛠️ Stack Tecnológica

- **Frontend:** React 18 + TypeScript + Tailwind CSS + Leaflet.js
- **Backend:** Node.js 18 + Express 4 + JWT
- **Banco de dados:** PostgreSQL 16 + PostGIS (geoespacial)
- **Cache/Sessões:** Redis 7
- **Containerização:** Docker + Docker Compose
- **Proxy/SSL:** Nginx

---

## 🚀 Como Executar (Desenvolvimento)

### Pré-requisitos
- Docker e Docker Compose instalados
- Node.js 18+

### 1. Configurar variáveis de ambiente
```bash
cp backend/.env.example backend/.env
# Editar backend/.env com as credenciais reais
```

### 2. Subir containers
```bash
docker compose up -d
```

### 3. Verificar saúde
```bash
curl http://localhost:3001/api/v1/health
```

### 4. Desenvolvimento local (sem Docker)
```bash
# Backend
cd backend
npm install
npm run dev

# Frontend
cd frontend
npm install
npm start
```

---

## 🔐 Segurança

| Camada | Implementação |
|--------|---------------|
| Autenticação | JWT com expiração de 8h + Refresh Token |
| Senhas | Bcrypt com 12 rounds |
| Anti brute-force | Bloqueio após 5 tentativas + Rate Limiting |
| Autorização | RBAC (Role-Based Access Control) por perfil |
| Headers HTTP | Helmet.js (CSP, HSTS, X-Frame-Options...) |
| CORS | Lista branca de origens |
| Criptografia | TLS 1.3 + pgcrypto para dados sensíveis |
| Auditoria | Log imutável de todas as ações |
| LGPD | CPF e dados pessoais criptografados no banco |

---

## 👤 Perfis de Acesso (RBAC)

| Perfil | Permissões |
|--------|------------|
| **Operador** | Registrar BOs, consultar ocorrências da própria unidade |
| **Supervisor** | Despachar viaturas, alterar status, gerenciar escalas |
| **Gestor** | Acesso multi-unidade, relatórios, gestão de efetivo |
| **Comandante** | Acesso total à unidade, inteligência e analytics |
| **Administrador** | Acesso total ao sistema, auditoria, criação de usuários |

---

## 📡 API Endpoints Principais

```
POST   /api/v1/auth/login                  → Autenticar
POST   /api/v1/auth/refresh                → Renovar token
GET    /api/v1/auth/me                     → Dados do usuário

GET    /api/v1/ocorrencias                 → Listar ocorrências
POST   /api/v1/ocorrencias                 → Registrar BO
GET    /api/v1/ocorrencias/:id             → Detalhes + histórico
PATCH  /api/v1/ocorrencias/:id/status      → Atualizar status
GET    /api/v1/ocorrencias/dashboard       → KPIs do painel

GET    /api/v1/policiais                   → Listar efetivo
GET    /api/v1/policiais/efetivo-hoje      → Em serviço agora
POST   /api/v1/policiais                   → Cadastrar PM
GET    /api/v1/escalas                     → Escalas de serviço

GET    /api/v1/viaturas                    → Frota
PATCH  /api/v1/viaturas/:id/status         → Atualizar status
POST   /api/v1/manutencoes                 → Registrar manutenção

GET    /api/v1/inteligencia/heatmap        → Dados para mapa de calor
GET    /api/v1/inteligencia/estatisticas   → Análises criminais
GET    /api/v1/inteligencia/tendencias     → Comparativo mensal
```

---

## 📊 Modelo de Dados (Principais Entidades)

```
unidades
  └── policiais (N:1)
        └── usuarios (1:1)
        └── escalas (N:N datas)
        └── ocorrencia_policiais (N:N)

viaturas
  └── rastreamento_viaturas (histórico GPS)
  └── manutencoes

ocorrencias
  ├── ocorrencia_policiais (N:N policiais)
  ├── envolvidos (vítimas/suspeitos/testemunhas)
  └── ocorrencia_historico (log de mudanças)

auditoria (log global imutável)
```

---

## 📁 Estrutura de Arquivos

```
sigpol/
├── database/
│   └── schema.sql          # Schema completo PostgreSQL
├── backend/
│   ├── src/
│   │   ├── server.js       # Entry point Express
│   │   ├── config/
│   │   │   └── database.js # Pool PostgreSQL
│   │   ├── middleware/
│   │   │   ├── auth.js     # JWT + RBAC
│   │   │   ├── auditoria.js
│   │   │   └── validar.js
│   │   ├── controllers/
│   │   │   ├── authController.js
│   │   │   ├── ocorrenciasController.js
│   │   │   ├── policiaisController.js
│   │   │   ├── viaturasController.js
│   │   │   └── inteligenciaController.js
│   │   ├── routes/
│   │   │   └── index.js    # Todas as rotas
│   │   └── utils/
│   │       └── logger.js   # Winston
│   ├── package.json
│   └── .env.example
├── frontend/               # React (próxima fase)
├── nginx/                  # Configuração Nginx
├── docker-compose.yml
└── README.md
```

---

## 🗺️ Roadmap

- [x] **Fase 1** — Schema DB + API Backend (atual)
- [ ] **Fase 2** — Frontend React + mapa Leaflet em tempo real
- [ ] **Fase 3** — WebSockets para atualizações ao vivo
- [ ] **Fase 4** — App mobile (React Native) para PMs em campo
- [ ] **Fase 5** — Integração com SSP-SP, DETRAN, Receita Federal
- [ ] **Fase 6** — IA para previsão de ocorrências (ML)

---

> Desenvolvido para uso interno exclusivo da PMESP.
> Qualquer acesso não autorizado é crime (Art. 154-A do Código Penal).

  ✅ Administrador   admin        → Admin@2026!
  ✅ Comandante      comandante   → Cmd@2026!
  ✅ Gestor          gestor       → Gestor@2026!
  ✅ Supervisor      supervisor   → Super@2026!
  ✅ Operador        operador     → Oper@2026!