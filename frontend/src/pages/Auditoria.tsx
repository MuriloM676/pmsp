// src/pages/Auditoria.tsx
import { useQuery } from '@tanstack/react-query'
import { auditoriaService } from '@/services/api'
import { PageHeader, Spinner, Empty } from '@/components/ui'

interface LogAuditoria {
  id: string
  acao: string
  recurso: string
  id_recurso?: string
  id_usuario?: string
  login?: string
  ip?: string
  user_agent?: string
  detalhes?: Record<string, unknown>
  registrado_em: string
}

const acaoCor: Record<string, string> = {
  CRIAR_OCORRENCIA: 'text-blue-300 bg-blue-500/10 border-blue-500/20',
  ATUALIZAR_STATUS_OCORRENCIA: 'text-cyan-300 bg-cyan-500/10 border-cyan-500/20',
  CRIAR_POLICIAL: 'text-green-400 bg-green-500/10 border-green-500/20',
  ATUALIZAR_POLICIAL: 'text-lime-400 bg-lime-500/10 border-lime-500/20',
  CRIAR_VIATURA: 'text-violet-400 bg-violet-500/10 border-violet-500/20',
  ATUALIZAR_STATUS_VIATURA: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
  CRIAR_MANUTENCAO: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  CONCLUIR_MANUTENCAO: 'text-amber-300 bg-amber-500/10 border-amber-500/20',
  CRIAR_ESCALA: 'text-teal-400 bg-teal-500/10 border-teal-500/20',
  CRIAR_LICENCA: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
}

export default function Auditoria() {
  const { data, isLoading, dataUpdatedAt, refetch } = useQuery({
    queryKey: ['auditoria'],
    queryFn: () => auditoriaService.listar().then(r => r.data as LogAuditoria[]),
    refetchInterval: 30_000,
  })

  const logs: LogAuditoria[] = Array.isArray(data) ? data : []

  const fmtTs = (ts: string) => {
    const d = new Date(ts)
    return d.toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    })
  }

  return (
    <div>
      <PageHeader title="AUDITORIA" accent="· SISTEMA"
                  subtitle="Registro de ações e acessos ao sistema">
        <div className="flex items-center gap-3">
          {dataUpdatedAt > 0 && (
            <span className="text-[10px] text-[var(--text3)] font-mono">
              Atualizado: {new Date(dataUpdatedAt).toLocaleTimeString('pt-BR')}
            </span>
          )}
          <button className="btn btn-outline text-[11px] py-1.5 px-3" onClick={() => refetch()}>
            ↻ Atualizar
          </button>
        </div>
      </PageHeader>

      <div className="panel">
        <div className="panel-header">
          <span className="panel-title">
            <span className="dot" />
            ÚLTIMOS 100 EVENTOS
          </span>
          <span className="text-[10px] text-[var(--text3)] font-mono">Atualização automática · 30s</span>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : logs.length === 0 ? (
          <Empty label="Nenhum registro de auditoria encontrado" />
        ) : (
          <div className="table-container">
            <table>
              <thead><tr>
                <th>Data/Hora</th>
                <th>Ação</th>
                <th>Recurso</th>
                <th>Usuário</th>
                <th>IP</th>
              </tr></thead>
              <tbody>
                {logs.map(log => (
                  <tr key={log.id}>
                    <td className="font-mono text-[11px] text-[var(--text3)] whitespace-nowrap">
                      {fmtTs(log.registrado_em)}
                    </td>
                    <td>
                      <span className={`px-2 py-0.5 rounded border text-[9px] font-mono tracking-wider ${
                        acaoCor[log.acao] ?? 'text-[var(--text3)] bg-[var(--navy3)] border-[var(--border)]'
                      }`}>
                        {log.acao.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="text-[11px] text-[var(--text2)]">
                      {log.recurso}
                      {log.id_recurso && (
                        <span className="block text-[10px] font-mono text-[var(--text3)]">
                          {log.id_recurso.slice(0, 8)}...
                        </span>
                      )}
                    </td>
                    <td className="font-mono text-[11px] text-[var(--blue2)]">
                      {log.login ?? log.id_usuario ?? '—'}
                    </td>
                    <td className="font-mono text-[11px] text-[var(--text3)]">
                      {log.ip ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
