// src/pages/IntelStats.tsx
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { inteligenciaService } from '@/services/api'
import { PageHeader, Spinner, ProgressBar, StatBlock } from '@/components/ui'

interface Estatisticas {
  periodo: { inicio: string; fim: string; dias: number; total: number }
  por_prioridade: { prioridade: string; total: number; pct: number }[]
  por_status: { status: string; total: number; pct: number }[]
  por_natureza: { natureza: string; total: number; pct: number }[]
  por_turno: { turno: string; total: number; pct: number }[]
  por_dia_semana: { dia: number; label: string; total: number }[]
  metricas: {
    tempo_resposta_medio: number | null
    taxa_encerramento: number | null
    ocorrencias_com_morte: number
    ocorrencias_envolvendo_menor: number
    ocorrencias_uso_arma: number
    p1_p2_pct: number | null
  }
}

interface Tendencias {
  ultimas_semanas: { semana: string; total: number; media_resposta: number | null }[]
  por_natureza_trend: { natureza: string; esta_semana: number; semana_anterior: number; variacao_pct: number }[]
  alertas: { tipo: string; mensagem: string; severidade: string }[]
}

const prioridadeCores: Record<string, string> = {
  P1: '#ff3b3b',
  P2: '#f5a623',
  P3: '#0096ff',
  P4: '#6b7280',
}

export default function IntelStats() {
  const [periodo, setPeriodo] = useState('30')

  const { data: stats, isLoading: loadStats } = useQuery({
    queryKey: ['intel-stats', periodo],
    queryFn: () =>
      inteligenciaService.estatisticas({ dias: periodo }).then(r => r.data as Estatisticas),
    refetchInterval: 60_000,
  })

  const { data: tend, isLoading: loadTend } = useQuery({
    queryKey: ['intel-tend'],
    queryFn: () => inteligenciaService.tendencias().then(r => r.data as Tendencias),
    refetchInterval: 60_000,
  })

  const isLoading = loadStats || loadTend

  const maxNatureza = Math.max(...(stats?.por_natureza?.map(n => n.total) ?? [1]), 1)

  return (
    <div>
      <PageHeader title="INTELIGÊNCIA" accent="· ESTATÍSTICAS"
                  subtitle="Análise estatística de ocorrências e indicadores">
        <div className="flex items-center gap-2">
          <label className="label mb-0 text-[11px]">Período:</label>
          <select className="input py-1 text-[12px]" value={periodo}
                  onChange={e => setPeriodo(e.target.value)}>
            <option value="7">Últimos 7 dias</option>
            <option value="30">Últimos 30 dias</option>
            <option value="90">Últimos 90 dias</option>
          </select>
        </div>
      </PageHeader>

      {isLoading ? (
        <div className="flex justify-center py-20"><Spinner size="lg" /></div>
      ) : (
        <div className="space-y-4">

          {/* Métricas rápidas */}
          {stats?.metricas && (
            <div className="grid grid-cols-4 gap-3">
              <StatBlock
                value={stats.periodo?.total ?? 0}
                label="Total no Período"
                color="text-white"
              />
              <StatBlock
                value={stats.metricas.tempo_resposta_medio != null
                  ? `${Math.round(stats.metricas.tempo_resposta_medio)} min`
                  : '—'}
                label="Tempo Médio Resposta"
                color="text-[var(--cyan)]"
              />
              <StatBlock
                value={stats.metricas.taxa_encerramento != null
                  ? `${stats.metricas.taxa_encerramento.toFixed(1)}%`
                  : '—'}
                label="Taxa Encerramento"
                color="text-green-400"
              />
              <StatBlock
                value={stats.metricas.p1_p2_pct != null
                  ? `${stats.metricas.p1_p2_pct.toFixed(1)}%`
                  : '—'}
                label="P1+P2 (alta prior.)"
                color="text-red-400"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">

            {/* Por Prioridade */}
            <div className="panel">
              <div className="panel-header">
                <span className="panel-title"><span className="dot" /> POR PRIORIDADE</span>
              </div>
              <div className="p-4">
                {stats?.por_prioridade?.map(p => (
                  <ProgressBar
                    key={p.prioridade}
                    label={`${p.prioridade} — ${p.pct?.toFixed(1) ?? 0}%`}
                    value={p.total}
                    max={stats.periodo?.total || 1}
                    color={prioridadeCores[p.prioridade] ?? 'var(--blue)'}
                  />
                ))}
              </div>
            </div>

            {/* Por Status */}
            <div className="panel">
              <div className="panel-header">
                <span className="panel-title"><span className="dot" /> POR STATUS</span>
              </div>
              <div className="p-4">
                {stats?.por_status?.map(s => (
                  <ProgressBar
                    key={s.status}
                    label={`${s.status} — ${s.pct?.toFixed(1) ?? 0}%`}
                    value={s.total}
                    max={stats.periodo?.total || 1}
                  />
                ))}
              </div>
            </div>

            {/* Por Natureza */}
            <div className="panel col-span-2">
              <div className="panel-header">
                <span className="panel-title"><span className="dot" /> POR NATUREZA (TOP 10)</span>
              </div>
              <div className="p-4 grid grid-cols-2 gap-x-8">
                {stats?.por_natureza?.slice(0, 10).map(n => (
                  <ProgressBar
                    key={n.natureza}
                    label={`${n.natureza} (${n.total})`}
                    value={n.total}
                    max={maxNatureza}
                    color="var(--cyan)"
                  />
                ))}
              </div>
            </div>

          </div>

          {/* Alertas de Tendências */}
          {tend?.alertas && tend.alertas.length > 0 && (
            <div className="panel">
              <div className="panel-header">
                <span className="panel-title"><span className="dot" /> ALERTAS DE TENDÊNCIA</span>
              </div>
              <div className="p-4 space-y-2">
                {tend.alertas.map((a, i) => (
                  <div key={i} className={`flex items-start gap-3 p-3 rounded-lg border ${
                    a.severidade === 'alta'
                      ? 'bg-red-500/10 border-red-500/30 text-red-400'
                      : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                  }`}>
                    <span className="text-lg shrink-0">
                      {a.severidade === 'alta' ? '🚨' : '⚠️'}
                    </span>
                    <div>
                      <div className="text-[11px] font-bold uppercase tracking-widest mb-0.5">{a.tipo}</div>
                      <div className="text-[12px] opacity-90">{a.mensagem}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Variação por natureza */}
          {tend?.por_natureza_trend && tend.por_natureza_trend.length > 0 && (
            <div className="panel">
              <div className="panel-header">
                <span className="panel-title"><span className="dot" /> VARIAÇÃO ESTA SEMANA</span>
              </div>
              <div className="table-container">
                <table>
                  <thead><tr>
                    <th>Natureza</th>
                    <th>Esta Semana</th>
                    <th>Semana Anterior</th>
                    <th>Variação</th>
                  </tr></thead>
                  <tbody>
                    {tend.por_natureza_trend.map(t => (
                      <tr key={t.natureza}>
                        <td className="text-[var(--text)]">{t.natureza}</td>
                        <td className="font-mono text-center">{t.esta_semana}</td>
                        <td className="font-mono text-center text-[var(--text3)]">{t.semana_anterior}</td>
                        <td className="font-mono text-center">
                          <span className={t.variacao_pct > 0 ? 'text-red-400' : t.variacao_pct < 0 ? 'text-green-400' : 'text-[var(--text3)]'}>
                            {t.variacao_pct > 0 ? '+' : ''}{t.variacao_pct.toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  )
}
