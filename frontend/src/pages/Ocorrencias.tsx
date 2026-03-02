// src/pages/Ocorrencias.tsx
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { ocorrenciasService } from '@/services/api'
import { PageHeader, Spinner, Empty } from '@/components/ui'
import { fmtDataCurta, statusOcorrenciaConfig, prioridadeCor } from '@/utils'
import type { Ocorrencia, NaturezaOcorrencia, StatusOcorrencia, PrioridadeOcorrencia } from '@/types'

const STATUS_OPTIONS: StatusOcorrencia[] = ['Aberta','Despachada','Em Atendimento','Aguardando DP','Encerrada','Cancelada']
const PRIORIDADE_OPTIONS: PrioridadeOcorrencia[] = ['P1','P2','P3','P4']
const NATUREZA_OPTIONS: NaturezaOcorrencia[] = [
  'Homicídio','Tentativa de Homicídio','Roubo','Furto','Roubo de Veículo',
  'Furto de Veículo','Tráfico de Drogas','Lesão Corporal','Ameaça',
  'Perturbação do Sossego','Acidente de Trânsito','Violência Doméstica','Outros',
]

export default function Ocorrencias() {
  const navigate = useNavigate()
  const [filters, setFilters] = useState<Record<string, string>>({})
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['ocorrencias', filters, page],
    queryFn: () => ocorrenciasService.listar({ ...filters, page, limit: 25 }).then(r => r.data),
    refetchInterval: 15_000,
  })

  const setFilter = (k: string, v: string) => {
    setPage(1)
    setFilters(f => v ? { ...f, [k]: v } : Object.fromEntries(Object.entries(f).filter(([key]) => key !== k)))
  }

  return (
    <div>
      <PageHeader title="OCORRÊNCIAS" subtitle="Registro e acompanhamento de boletins">
        <button className="btn btn-primary" onClick={() => navigate('/ocorrencias/novo')}>
          + Registrar BO
        </button>
      </PageHeader>

      {/* Filtros */}
      <div className="panel mb-4">
        <div className="p-4 grid grid-cols-5 gap-3">
          <div>
            <label className="label">Status</label>
            <select className="input" onChange={e => setFilter('status', e.target.value)}>
              <option value="">Todos</option>
              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Prioridade</label>
            <select className="input" onChange={e => setFilter('prioridade', e.target.value)}>
              <option value="">Todas</option>
              {PRIORIDADE_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Natureza</label>
            <select className="input" onChange={e => setFilter('natureza', e.target.value)}>
              <option value="">Todas</option>
              {NATUREZA_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Data Início</label>
            <input type="date" className="input" onChange={e => setFilter('data_inicio', e.target.value)} />
          </div>
          <div>
            <label className="label">Data Fim</label>
            <input type="date" className="input" onChange={e => setFilter('data_fim', e.target.value)} />
          </div>
        </div>
      </div>

      {/* Tabela */}
      <div className="panel">
        <div className="panel-header">
          <span className="panel-title">
            <span className="dot" />
            {data?.paginacao ? `${data.paginacao.total} registros` : 'Carregando...'}
          </span>
          <span className="text-[10px] text-[var(--text3)] font-mono">Atualização automática · 15s</span>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : !data?.dados?.length ? (
          <Empty label="Nenhuma ocorrência encontrada" />
        ) : (
          <>
            <div className="table-container">
              <table>
                <thead><tr>
                  <th>Nº BO</th><th>Natureza</th><th>Localização</th>
                  <th>Data/Hora</th><th>Prior.</th><th>Viatura</th>
                  <th>T. Resposta</th><th>Status</th>
                </tr></thead>
                <tbody>
                  {data.dados.map((o: Ocorrencia) => {
                    const sc = statusOcorrenciaConfig[o.status]
                    return (
                      <tr key={o.id} className="cursor-pointer"
                          onClick={() => navigate(`/ocorrencias/${o.id}`)}>
                        <td><span className="font-mono text-[11px] text-[var(--blue2)]">{o.numero_bo}</span></td>
                        <td className="font-medium text-[var(--text)]">{o.natureza}</td>
                        <td className="max-w-[180px]">
                          <div className="text-[var(--text)] truncate">{o.logradouro}</div>
                          {o.bairro && <div className="text-[10px] text-[var(--text3)]">{o.bairro}</div>}
                        </td>
                        <td className="font-mono text-[11px]">{fmtDataCurta(o.data_hora_fato)}</td>
                        <td><span className={`badge ${prioridadeCor[o.prioridade]}`}>{o.prioridade}</span></td>
                        <td><span className="font-mono text-[11px] text-[var(--blue2)]">{o.viatura_prefixo ?? '—'}</span></td>
                        <td className="font-mono text-[11px]">
                          {o.tempo_resposta_min ? `${Math.round(o.tempo_resposta_min)}min` : '—'}
                        </td>
                        <td>
                          <span className={`flex items-center gap-1.5 text-[11px] ${sc.text}`}>
                            <span className={`status-dot ${sc.dot}`} />
                            {sc.label}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Paginação */}
            {data.paginacao && data.paginacao.paginas > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-[rgba(0,150,255,0.08)]">
                <span className="text-[11px] text-[var(--text3)]">
                  Página {data.paginacao.pagina} de {data.paginacao.paginas}
                </span>
                <div className="flex gap-2">
                  <button className="btn btn-outline py-1 px-3 text-[10px]"
                          disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Ant.</button>
                  <button className="btn btn-outline py-1 px-3 text-[10px]"
                          disabled={page === data.paginacao.paginas} onClick={() => setPage(p => p + 1)}>Próx. →</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
