// src/types/index.ts

export type Perfil = 'Operador' | 'Supervisor' | 'Gestor' | 'Comandante' | 'Administrador'
export type PostoGraduacao =
  | 'Soldado' | 'Cabo' | 'Terceiro Sargento' | 'Segundo Sargento'
  | 'Primeiro Sargento' | 'Subtenente' | 'Aspirante a Oficial'
  | 'Segundo Tenente' | 'Primeiro Tenente' | 'Capitão'
  | 'Major' | 'Tenente Coronel' | 'Coronel'

export type SituacaoPM = 'Ativo' | 'Férias' | 'Licença Médica' | 'Afastado' | 'Inativo' | 'Reserva'
export type Turno = 'Manhã' | 'Tarde' | 'Noite' | 'Folga' | 'Plantão 24h'

export type PrioridadeOcorrencia = 'P1' | 'P2' | 'P3' | 'P4'
export type StatusOcorrencia =
  | 'Aberta' | 'Despachada' | 'Em Atendimento'
  | 'Aguardando DP' | 'Encerrada' | 'Cancelada'
export type NaturezaOcorrencia =
  | 'Homicídio' | 'Tentativa de Homicídio' | 'Roubo' | 'Furto'
  | 'Roubo de Veículo' | 'Furto de Veículo' | 'Tráfico de Drogas'
  | 'Lesão Corporal' | 'Ameaça' | 'Perturbação do Sossego'
  | 'Acidente de Trânsito' | 'Sequestro' | 'Latrocínio'
  | 'Violência Doméstica' | 'Estupro' | 'Estelionato' | 'Outros'

export type StatusViatura =
  | 'Disponível' | 'Em Patrulha' | 'Em Ocorrência'
  | 'Manutenção' | 'Sinistro' | 'Desativada'

export interface Usuario {
  id: string
  login: string
  perfil: Perfil
  nome_guerra: string
  posto_graduacao: PostoGraduacao
  rg_pm: string
  id_unidade: string
  foto_url?: string
}

export interface Ocorrencia {
  id: string
  numero_bo: string
  natureza: NaturezaOcorrencia
  descricao?: string
  prioridade: PrioridadeOcorrencia
  status: StatusOcorrencia
  logradouro?: string
  numero?: string
  bairro?: string
  cidade: string
  data_hora_fato: string
  data_hora_abertura: string
  data_hora_despacho?: string
  data_hora_chegada?: string
  data_hora_encerramento?: string
  unidade_codigo?: string
  unidade_nome?: string
  viatura_prefixo?: string
  tempo_resposta_min?: number
  envolve_menor: boolean
  uso_de_arma: boolean
  lat?: number
  lng?: number
}

export interface Policial {
  id: string
  rg_pm: string
  nome_completo: string
  nome_guerra: string
  posto_graduacao: PostoGraduacao
  situacao: SituacaoPM
  sexo: 'M' | 'F'
  unidade_codigo?: string
  unidade_nome?: string
  foto_url?: string
  email_corporativo?: string
  telefone_funcional?: string
}

export interface Viatura {
  id: string
  prefixo: string
  placa: string
  tipo: string
  marca?: string
  modelo?: string
  ano_fabricacao?: number
  cor?: string
  status: StatusViatura
  km_atual: number
  unidade_codigo?: string
  ocorrencia_ativa?: string
  ocorrencia_natureza?: string
  lat?: number
  lng?: number
  revisao_vencida?: boolean
}

export interface Escala {
  id: string
  data_servico: string
  turno: Turno
  hora_entrada: string
  hora_saida: string
  funcao?: string
  rg_pm: string
  nome_guerra: string
  posto_graduacao: PostoGraduacao
  unidade_codigo: string
}

export interface DashboardData {
  resumo: {
    hoje: number
    abertas: number
    p1_abertas: number
    atendidas_hoje: number
  }
  por_prioridade: { prioridade: PrioridadeOcorrencia; total: number }[]
  por_natureza: { natureza: string; total: number }[]
  tempo_resposta_medio: number | null
}

export interface Paginacao {
  total: number
  pagina: number
  limite: number
  paginas: number
}

export interface ApiResponse<T> {
  dados: T
  paginacao?: Paginacao
}
