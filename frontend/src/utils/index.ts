// src/utils/index.ts
import { format, formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { PrioridadeOcorrencia, StatusOcorrencia, StatusViatura, SituacaoPM } from '@/types'

export const fmtData = (d: string) =>
  format(new Date(d), "dd/MM/yyyy HH:mm", { locale: ptBR })

export const fmtDataCurta = (d: string) =>
  format(new Date(d), "dd/MM HH:mm", { locale: ptBR })

export const fmtRelativo = (d: string) =>
  formatDistanceToNow(new Date(d), { locale: ptBR, addSuffix: true })

export const fmtMinutos = (min: number | null) =>
  min == null ? '—' : `${Math.round(min)} min`

// Prioridade
export const prioridadeCor: Record<PrioridadeOcorrencia, string> = {
  P1: 'badge-p1',
  P2: 'badge-p2',
  P3: 'badge-p3',
  P4: 'badge-p4',
}

export const prioridadeDot: Record<PrioridadeOcorrencia, string> = {
  P1: 'bg-red-500 shadow-[0_0_6px_#ff3b3b]',
  P2: 'bg-amber-400 shadow-[0_0_6px_#f5a623]',
  P3: 'bg-blue-400 shadow-[0_0_6px_#0096ff]',
  P4: 'bg-slate-500',
}

// Status ocorrência
export const statusOcorrenciaConfig: Record<StatusOcorrencia, { label: string; dot: string; text: string }> = {
  'Aberta':         { label: 'Aberta',          dot: 'bg-slate-400',  text: 'text-slate-400' },
  'Despachada':     { label: 'Despachada',       dot: 'bg-blue-400 shadow-[0_0_4px_#00c3ff]',   text: 'text-blue-300' },
  'Em Atendimento': { label: 'Em Atendimento',   dot: 'bg-red-500 shadow-[0_0_4px_#ff3b3b] animate-pulse',    text: 'text-red-400' },
  'Aguardando DP':  { label: 'Aguardando DP',    dot: 'bg-amber-400 shadow-[0_0_4px_#f5a623]',  text: 'text-amber-400' },
  'Encerrada':      { label: 'Encerrada',        dot: 'bg-green-400 shadow-[0_0_4px_#00e676]',  text: 'text-green-400' },
  'Cancelada':      { label: 'Cancelada',        dot: 'bg-slate-600',  text: 'text-slate-500' },
}

// Status viatura
export const statusViaturaConfig: Record<StatusViatura, { label: string; bg: string; text: string }> = {
  'Disponível':    { label: 'Disponível',    bg: 'bg-green-500/10  border border-green-500/20', text: 'text-green-400' },
  'Em Patrulha':   { label: 'Em Patrulha',   bg: 'bg-blue-500/10   border border-blue-500/20',  text: 'text-blue-300' },
  'Em Ocorrência': { label: 'Em Ocorrência', bg: 'bg-red-500/10    border border-red-500/20',   text: 'text-red-400' },
  'Manutenção':    { label: 'Manutenção',    bg: 'bg-amber-500/10  border border-amber-500/20', text: 'text-amber-400' },
  'Sinistro':      { label: 'Sinistro',      bg: 'bg-orange-500/10 border border-orange-500/20',text: 'text-orange-400' },
  'Desativada':    { label: 'Desativada',    bg: 'bg-slate-500/10  border border-slate-500/20', text: 'text-slate-500' },
}

// Situação PM
export const situacaoPMConfig: Record<SituacaoPM, { bg: string; text: string }> = {
  'Ativo':          { bg: 'bg-green-500/10', text: 'text-green-400' },
  'Férias':         { bg: 'bg-blue-500/10',  text: 'text-blue-300' },
  'Licença Médica': { bg: 'bg-amber-500/10', text: 'text-amber-400' },
  'Afastado':       { bg: 'bg-red-500/10',   text: 'text-red-400' },
  'Inativo':        { bg: 'bg-slate-500/10', text: 'text-slate-500' },
  'Reserva':        { bg: 'bg-purple-500/10',text: 'text-purple-400' },
}

// Verifica se o usuário tem permissão
export const temPermissao = (perfil: string, minimo: string): boolean => {
  const hierarquia = ['Operador', 'Supervisor', 'Gestor', 'Comandante', 'Administrador']
  return hierarquia.indexOf(perfil) >= hierarquia.indexOf(minimo)
}
