-- =============================================================
--  SIGPOL — Sistema Integrado de Gestão Policial · PMESP
--  Schema PostgreSQL v1.0
--  Módulos: Ocorrências, Efetivo/RH, Viaturas, Inteligência
-- =============================================================

-- Extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";        -- geolocalização
CREATE EXTENSION IF NOT EXISTS "pgcrypto";       -- criptografia

-- =============================================================
--  ENUMS
-- =============================================================

CREATE TYPE posto_graduacao AS ENUM (
  'Soldado', 'Cabo', 'Terceiro Sargento', 'Segundo Sargento',
  'Primeiro Sargento', 'Subtenente', 'Aspirante a Oficial',
  'Segundo Tenente', 'Primeiro Tenente', 'Capitão',
  'Major', 'Tenente Coronel', 'Coronel'
);

CREATE TYPE situacao_pm AS ENUM (
  'Ativo', 'Férias', 'Licença Médica', 'Licença Especial',
  'Afastado', 'Suspenso', 'Inativo', 'Reserva'
);

CREATE TYPE turno AS ENUM ('Manhã', 'Tarde', 'Noite', 'Folga', 'Plantão 24h');

CREATE TYPE prioridade_ocorrencia AS ENUM ('P1', 'P2', 'P3', 'P4');

CREATE TYPE status_ocorrencia AS ENUM (
  'Aberta', 'Despachada', 'Em Atendimento',
  'Aguardando DP', 'Encerrada', 'Cancelada'
);

CREATE TYPE natureza_ocorrencia AS ENUM (
  'Homicídio', 'Tentativa de Homicídio', 'Roubo', 'Furto',
  'Roubo de Veículo', 'Furto de Veículo', 'Tráfico de Drogas',
  'Lesão Corporal', 'Ameaça', 'Perturbação do Sossego',
  'Acidente de Trânsito', 'Sequestro', 'Latrocínio',
  'Violência Doméstica', 'Estupro', 'Estelionato', 'Outros'
);

CREATE TYPE status_viatura AS ENUM (
  'Disponível', 'Em Patrulha', 'Em Ocorrência',
  'Manutenção', 'Sinistro', 'Desativada'
);

CREATE TYPE tipo_viatura AS ENUM (
  'Viatura Operacional', 'Moto', 'Caminhonete',
  'Van', 'Ônibus', 'Helicóptero', 'Embarcação'
);

CREATE TYPE perfil_usuario AS ENUM (
  'Operador', 'Supervisor', 'Gestor', 'Comandante', 'Administrador'
);

CREATE TYPE sexo AS ENUM ('M', 'F');

-- =============================================================
--  UNIDADES POLICIAIS
-- =============================================================

CREATE TABLE unidades (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  codigo        VARCHAR(20) UNIQUE NOT NULL,  -- ex: 1BPM
  nome          VARCHAR(100) NOT NULL,
  tipo          VARCHAR(50) NOT NULL,          -- Batalhão, Companhia, Pelotão
  id_unidade_pai UUID REFERENCES unidades(id),
  endereco      TEXT,
  telefone      VARCHAR(20),
  localizacao   GEOGRAPHY(POINT, 4326),
  ativa         BOOLEAN DEFAULT TRUE,
  criado_em     TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================
--  POLICIAIS MILITARES
-- =============================================================

CREATE TABLE policiais (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rg_pm            VARCHAR(20) UNIQUE NOT NULL,
  cpf              VARCHAR(14) UNIQUE NOT NULL,  -- armazenado criptografado
  nome_completo    VARCHAR(150) NOT NULL,
  nome_guerra      VARCHAR(50) NOT NULL,
  sexo             sexo NOT NULL,
  data_nascimento  DATE NOT NULL,
  data_ingresso    DATE NOT NULL,
  posto_graduacao  posto_graduacao NOT NULL,
  id_unidade       UUID NOT NULL REFERENCES unidades(id),
  situacao         situacao_pm DEFAULT 'Ativo',
  email_corporativo VARCHAR(150) UNIQUE,
  telefone_funcional VARCHAR(20),
  -- dados da foto armazenados externamente (S3 / MinIO)
  foto_url         TEXT,
  observacoes      TEXT,
  criado_em        TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_policiais_unidade ON policiais(id_unidade);
CREATE INDEX idx_policiais_situacao ON policiais(situacao);

-- =============================================================
--  USUÁRIOS DO SISTEMA
-- =============================================================

CREATE TABLE usuarios (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  id_policial     UUID UNIQUE REFERENCES policiais(id),
  login           VARCHAR(50) UNIQUE NOT NULL,
  senha_hash      TEXT NOT NULL,               -- bcrypt
  perfil          perfil_usuario NOT NULL,
  ativo           BOOLEAN DEFAULT TRUE,
  ultimo_acesso   TIMESTAMPTZ,
  ip_ultimo_acesso INET,
  tentativas_falha SMALLINT DEFAULT 0,
  bloqueado_ate   TIMESTAMPTZ,
  criado_em       TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================
--  ESCALAS DE SERVIÇO
-- =============================================================

CREATE TABLE escalas (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  id_policial  UUID NOT NULL REFERENCES policiais(id),
  id_unidade   UUID NOT NULL REFERENCES unidades(id),
  data_servico DATE NOT NULL,
  turno        turno NOT NULL,
  hora_entrada TIME NOT NULL,
  hora_saida   TIME NOT NULL,
  funcao       VARCHAR(100),             -- ex: Comandante de Equipe, Rádio-operador
  observacao   TEXT,
  criado_por   UUID REFERENCES usuarios(id),
  criado_em    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (id_policial, data_servico, turno)
);

CREATE INDEX idx_escalas_data ON escalas(data_servico);
CREATE INDEX idx_escalas_policial ON escalas(id_policial);

-- =============================================================
--  LICENÇAS E AFASTAMENTOS
-- =============================================================

CREATE TABLE licencas (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  id_policial  UUID NOT NULL REFERENCES policiais(id),
  tipo         VARCHAR(80) NOT NULL,     -- Médica, Férias, Premio, etc.
  data_inicio  DATE NOT NULL,
  data_fim     DATE NOT NULL,
  dias_total   INT GENERATED ALWAYS AS (data_fim - data_inicio + 1) STORED,
  cid          VARCHAR(10),             -- para licença médica
  descricao    TEXT,
  aprovado_por UUID REFERENCES usuarios(id),
  aprovado_em  TIMESTAMPTZ,
  criado_em    TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================
--  VIATURAS
-- =============================================================

CREATE TABLE viaturas (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  prefixo          VARCHAR(20) UNIQUE NOT NULL,   -- ex: M-4721
  placa            VARCHAR(10) UNIQUE NOT NULL,
  tipo             tipo_viatura NOT NULL,
  marca            VARCHAR(50),
  modelo           VARCHAR(80),
  ano_fabricacao   SMALLINT,
  cor              VARCHAR(30),
  id_unidade       UUID NOT NULL REFERENCES unidades(id),
  status           status_viatura DEFAULT 'Disponível',
  km_atual         INT DEFAULT 0,
  ultima_revisao   DATE,
  proxima_revisao  DATE,
  observacoes      TEXT,
  criado_em        TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_viaturas_status ON viaturas(status);
CREATE INDEX idx_viaturas_unidade ON viaturas(id_unidade);

-- =============================================================
--  RASTREAMENTO DE VIATURAS (histórico GPS)
-- =============================================================

CREATE TABLE rastreamento_viaturas (
  id            BIGSERIAL PRIMARY KEY,
  id_viatura    UUID NOT NULL REFERENCES viaturas(id),
  localizacao   GEOGRAPHY(POINT, 4326) NOT NULL,
  velocidade    SMALLINT,
  direcao       SMALLINT,
  registrado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_rastr_viatura_tempo ON rastreamento_viaturas(id_viatura, registrado_em DESC);

-- =============================================================
--  MANUTENÇÃO DE VIATURAS
-- =============================================================

CREATE TABLE manutencoes (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  id_viatura     UUID NOT NULL REFERENCES viaturas(id),
  tipo           VARCHAR(80) NOT NULL,  -- Preventiva, Corretiva, Sinistro
  descricao      TEXT NOT NULL,
  km_entrada     INT,
  data_entrada   DATE NOT NULL,
  data_prevista  DATE,
  data_saida     DATE,
  custo          NUMERIC(10,2),
  fornecedor     VARCHAR(150),
  nota_fiscal    VARCHAR(50),
  resolvido      BOOLEAN DEFAULT FALSE,
  criado_por     UUID REFERENCES usuarios(id),
  criado_em      TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================
--  OCORRÊNCIAS (BOLETIM DE OCORRÊNCIA)
-- =============================================================

CREATE TABLE ocorrencias (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  numero_bo        VARCHAR(30) UNIQUE NOT NULL,  -- ex: BO-2026-04821
  natureza         natureza_ocorrencia NOT NULL,
  descricao        TEXT,
  prioridade       prioridade_ocorrencia NOT NULL DEFAULT 'P3',
  status           status_ocorrencia DEFAULT 'Aberta',
  
  -- Local
  logradouro       VARCHAR(200),
  numero           VARCHAR(20),
  bairro           VARCHAR(100),
  cidade           VARCHAR(100) DEFAULT 'São Paulo',
  cep              VARCHAR(10),
  localizacao      GEOGRAPHY(POINT, 4326),
  ponto_referencia TEXT,

  -- Datas
  data_hora_fato   TIMESTAMPTZ NOT NULL,
  data_hora_abertura TIMESTAMPTZ DEFAULT NOW(),
  data_hora_despacho TIMESTAMPTZ,
  data_hora_chegada TIMESTAMPTZ,
  data_hora_encerramento TIMESTAMPTZ,

  -- Relações
  id_unidade       UUID NOT NULL REFERENCES unidades(id),
  id_viatura       UUID REFERENCES viaturas(id),
  registrado_por   UUID REFERENCES usuarios(id),
  supervisor_id    UUID REFERENCES usuarios(id),

  -- Flags
  envolve_menor    BOOLEAN DEFAULT FALSE,
  morte_no_local   BOOLEAN DEFAULT FALSE,
  uso_de_arma      BOOLEAN DEFAULT FALSE,

  observacoes      TEXT,
  criado_em        TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ocorrencias_status ON ocorrencias(status);
CREATE INDEX idx_ocorrencias_prioridade ON ocorrencias(prioridade);
CREATE INDEX idx_ocorrencias_data ON ocorrencias(data_hora_fato DESC);
CREATE INDEX idx_ocorrencias_unidade ON ocorrencias(id_unidade);
CREATE INDEX idx_ocorrencias_localizacao ON ocorrencias USING GIST(localizacao);

-- Geração automática do número do BO
CREATE SEQUENCE bo_seq START 1;
CREATE OR REPLACE FUNCTION gerar_numero_bo()
RETURNS TRIGGER AS $$
BEGIN
  NEW.numero_bo := 'BO-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(nextval('bo_seq')::TEXT, 5, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_numero_bo
  BEFORE INSERT ON ocorrencias
  FOR EACH ROW WHEN (NEW.numero_bo IS NULL OR NEW.numero_bo = '')
  EXECUTE FUNCTION gerar_numero_bo();

-- =============================================================
--  POLICIAIS EM OCORRÊNCIA (N:N)
-- =============================================================

CREATE TABLE ocorrencia_policiais (
  id_ocorrencia UUID REFERENCES ocorrencias(id) ON DELETE CASCADE,
  id_policial   UUID REFERENCES policiais(id),
  funcao        VARCHAR(80),            -- ex: Primeiro Respondente, Apoio
  PRIMARY KEY (id_ocorrencia, id_policial)
);

-- =============================================================
--  ENVOLVIDOS NA OCORRÊNCIA (vítimas / suspeitos / testemunhas)
-- =============================================================

CREATE TYPE papel_envolvido AS ENUM ('Vítima', 'Suspeito', 'Testemunha', 'Condutor', 'Passageiro');

CREATE TABLE envolvidos (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  id_ocorrencia UUID NOT NULL REFERENCES ocorrencias(id) ON DELETE CASCADE,
  papel         papel_envolvido NOT NULL,
  nome          VARCHAR(150),
  cpf           TEXT,                   -- criptografado em app
  rg            TEXT,
  data_nascimento DATE,
  sexo          sexo,
  telefone      VARCHAR(20),
  endereco      TEXT,
  descricao     TEXT,                   -- características físicas / veículo
  preso         BOOLEAN DEFAULT FALSE,
  obito         BOOLEAN DEFAULT FALSE,
  criado_em     TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================
--  HISTÓRICO / LOG DE OCORRÊNCIA
-- =============================================================

CREATE TABLE ocorrencia_historico (
  id            BIGSERIAL PRIMARY KEY,
  id_ocorrencia UUID NOT NULL REFERENCES ocorrencias(id),
  id_usuario    UUID REFERENCES usuarios(id),
  acao          VARCHAR(100) NOT NULL,
  detalhes      TEXT,
  registrado_em TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================
--  PATRIMÔNIO / ARMAMENTO
-- =============================================================

CREATE TABLE patrimonio (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  codigo_tombamento VARCHAR(30) UNIQUE NOT NULL,
  descricao       VARCHAR(200) NOT NULL,
  categoria       VARCHAR(80),           -- Armamento, Equipamento, Eletrônico, etc.
  marca           VARCHAR(80),
  modelo          VARCHAR(80),
  numero_serie    VARCHAR(80),
  id_unidade      UUID REFERENCES unidades(id),
  id_responsavel  UUID REFERENCES policiais(id),
  status          VARCHAR(50) DEFAULT 'Ativo',
  data_aquisicao  DATE,
  valor           NUMERIC(12,2),
  localizacao     VARCHAR(200),
  observacoes     TEXT,
  criado_em       TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================
--  LOG DE AUDITORIA (imutável)
-- =============================================================

CREATE TABLE auditoria (
  id           BIGSERIAL PRIMARY KEY,
  id_usuario   UUID REFERENCES usuarios(id),
  login        VARCHAR(50),
  ip           INET,
  acao         VARCHAR(100) NOT NULL,   -- INSERT, UPDATE, DELETE, LOGIN, etc.
  tabela       VARCHAR(100),
  registro_id  TEXT,
  dados_antes  JSONB,
  dados_depois JSONB,
  registrado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Função de auditoria automática
CREATE OR REPLACE FUNCTION fn_auditoria()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO auditoria(acao, tabela, registro_id, dados_antes, dados_depois)
  VALUES (
    TG_OP,
    TG_TABLE_NAME,
    COALESCE(NEW.id::TEXT, OLD.id::TEXT),
    CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT','UPDATE') THEN to_jsonb(NEW) ELSE NULL END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar auditoria nas tabelas sensíveis
CREATE TRIGGER aud_ocorrencias AFTER INSERT OR UPDATE OR DELETE ON ocorrencias
  FOR EACH ROW EXECUTE FUNCTION fn_auditoria();
CREATE TRIGGER aud_policiais AFTER INSERT OR UPDATE OR DELETE ON policiais
  FOR EACH ROW EXECUTE FUNCTION fn_auditoria();
CREATE TRIGGER aud_viaturas AFTER INSERT OR UPDATE OR DELETE ON viaturas
  FOR EACH ROW EXECUTE FUNCTION fn_auditoria();

-- =============================================================
--  VIEWS ÚTEIS
-- =============================================================

-- Dashboard: resumo do dia por unidade
CREATE VIEW vw_resumo_diario AS
SELECT
  u.codigo AS unidade,
  COUNT(o.id) FILTER (WHERE o.status != 'Encerrada' AND o.status != 'Cancelada') AS ocorrencias_abertas,
  COUNT(o.id) FILTER (WHERE o.prioridade = 'P1') AS p1_total,
  COUNT(o.id) FILTER (WHERE DATE(o.data_hora_fato) = CURRENT_DATE) AS hoje,
  COUNT(v.id) FILTER (WHERE v.status = 'Disponível') AS viaturas_disponiveis,
  COUNT(v.id) FILTER (WHERE v.status = 'Em Ocorrência') AS viaturas_em_ocorrencia,
  COUNT(p.id) FILTER (WHERE p.situacao = 'Ativo') AS efetivo_ativo
FROM unidades u
LEFT JOIN ocorrencias o ON o.id_unidade = u.id
LEFT JOIN viaturas v ON v.id_unidade = u.id
LEFT JOIN policiais p ON p.id_unidade = u.id
GROUP BY u.id, u.codigo;

-- Ocorrências com dados completos
CREATE VIEW vw_ocorrencias_completa AS
SELECT
  o.*,
  u.nome AS unidade_nome,
  v.prefixo AS viatura_prefixo,
  v.placa AS viatura_placa,
  EXTRACT(EPOCH FROM (o.data_hora_chegada - o.data_hora_despacho))/60 AS tempo_resposta_min
FROM ocorrencias o
LEFT JOIN unidades u ON u.id = o.id_unidade
LEFT JOIN viaturas v ON v.id = o.id_viatura;

-- Efetivo de serviço hoje
CREATE VIEW vw_efetivo_hoje AS
SELECT
  p.rg_pm, p.nome_guerra, p.posto_graduacao,
  e.turno, e.hora_entrada, e.hora_saida, e.funcao,
  u.codigo AS unidade
FROM escalas e
JOIN policiais p ON p.id = e.id_policial
JOIN unidades u ON u.id = e.id_unidade
WHERE e.data_servico = CURRENT_DATE
  AND p.situacao = 'Ativo'
ORDER BY e.turno, p.posto_graduacao;

-- =============================================================
--  DADOS INICIAIS (SEED)
-- =============================================================

INSERT INTO unidades (codigo, nome, tipo) VALUES
  ('PMESP',  'Polícia Militar do Estado de São Paulo', 'Comando Geral'),
  ('1BPM',   '1º Batalhão de Polícia Militar',         'Batalhão'),
  ('2BPM',   '2º Batalhão de Polícia Militar',         'Batalhão'),
  ('ROTA',   'Rondas Ostensivas Tobias de Aguiar',     'Batalhão Especial'),
  ('BAEP',   'Batalhão de Ações Especiais de Polícia', 'Batalhão Especial');
