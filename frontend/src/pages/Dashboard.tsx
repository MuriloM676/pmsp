// src/pages/Dashboard.tsx
import { useQuery } from '@tanstack/react-query'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts'
import { ocorrenciasService, viaturasService, policiaisService } from '@/services/api'
import { KpiCard, AlertBanner, PageHeader, ProgressBar, Spinner, Empty } from '@/components/ui'
import { fmtDataCurta, statusOcorrenciaConfig, prioridadeCor } from '@/utils'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { Ocorrencia } from '@/types'
import { useNavigate } from 'react-router-dom'

const toastTip = {
  contentStyle: { background: '#0e1e33', border: '1px solid rgba(0,150,255,0.2)', borderRadius: 8, fontSize: 11 },
  labelStyle: { color: '#7aaacf' },
  itemStyle: { color: '#cce4ff' },
  cursor: { fill: 'rgba(0,150,255,0.05)' },
}

export default function Dashboard() {
  const navigate = useNavigate()
  const today = format(new Date(), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR }).toUpperCase()

  const { data: dash, isLoading: loadDash } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => ocorrenciasService.dashboard().then(r => r.data),
    refetchInterval: 30_000,
  })

  const { data: ocs } = useQuery({
    queryKey: ['ocorrencias', { limit: 6 }],
    queryFn: () => ocorrenciasService.listar({ limit: 6 }).then(r => r.data),
    refetchInterval: 15_000,
  })

  const { data: viaturas } = useQuery({
    queryKey: ['viaturas', { limit: 6 }],
    queryFn: () => viaturasService.listar({ limit: 6 }).then(r => r.data),
    refetchInterval: 20_000,
  })

  const { data: efetivo } = useQuery({
    queryKey: ['efetivo-hoje'],
    queryFn: () => policiaisService.efeitoHoje().then(r => r.data),
    refetchInterval: 60_000,
  })

  const p1Aberta = ocs?.dados?.find((o: Ocorrencia) => o.prioridade === 'P1' && o.status === 'Em Atendimento')

  return (
    <div>
      {p1Aberta && (
        <AlertBanner
          message={`Ocorrência P1 em andamento · ${p1Aberta.natureza} · ${p1Aberta.logradouro ?? ''}${p1Aberta.bairro ? ', ' + p1Aberta.bairro : ''} · ${p1Aberta.viatura_prefixo ?? 'Sem viatura'}`}
          onView={() => navigate(`/ocorrencias/${p1Aberta.id}`)}
        />
      )}

      <PageHeader
        title="PAINEL" accent="OPERACIONAL"
        subtitle={`1º BATALHÃO DE POLÍCIA MILITAR · ${today}`}
      >
        <button className="btn btn-outline">⬇ Exportar</button>
        <button className="btn btn-primary" onClick={() => navigate('/ocorrencias/novo')}>
          + Nova Ocorrência
        </button>
      </PageHeader>

      {/* KPIs */}
      {loadDash ? (
        <div className="flex justify-center py-8"><Spinner /></div>
      ) : (
        <div className="grid grid-cols-4 gap-4 mb-6">
          <KpiCard icon="🚨" value={dash?.resumo?.hoje ?? 0}
            label="Ocorrências Hoje" accentColor="var(--red)"
            sub={`${dash?.resumo?.p1_abertas ?? 0} P1 abertas`}
            trend={dash?.resumo?.p1_abertas > 0 ? 'down' : 'neutral'} />
          <KpiCard icon="👮" value={efetivo?.total ?? '—'}
            label="Efetivo em Serviço" accentColor="var(--blue)"
            sub={`${efetivo?.em_ocorrencia ?? 0} em ocorrência`} />
          <KpiCard icon="🚓"
            value={viaturas?.sumario?.disponiveis ?? '—'}
            label="Viaturas Disponíveis" accentColor="var(--green)"
            sub={`${viaturas?.sumario?.em_ocorrencia ?? 0} em ocorrência`}
            trend="up" />
          <KpiCard icon="⏱"
            value={dash?.tempo_resposta_medio ? `${dash.tempo_resposta_medio}min` : '—'}
            label="Tempo Médio Resposta" accentColor="var(--gold)"
            sub="Meta: < 10 min" trend="up" />
        </div>
      )}

      {/* Main grid */}
      <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 1fr 320px' }}>

        {/* Ocorrências recentes */}
        <div className="panel" style={{ gridColumn: '1 / 3' }}>
          <div className="panel-header">
            <span className="panel-title"><span className="dot" /> OCORRÊNCIAS RECENTES</span>
            <button className="btn btn-outline text-[10px] py-1 px-2.5"
                    onClick={() => navigate('/ocorrencias')}>Ver todas</button>
          </div>
          {!ocs?.dados ? (
            <div className="flex justify-center py-8"><Spinner /></div>
          ) : ocs.dados.length === 0 ? (
            <Empty label="Nenhuma ocorrência" />
          ) : (
            <div className="table-container">
              <table>
                <thead><tr>
                  <th>Nº BO</th><th>Tipo</th><th>Local</th>
                  <th>Hora</th><th>Prior.</th><th>Viatura</th><th>Status</th>
                </tr></thead>
                <tbody>
                  {ocs.dados.map((o: Ocorrencia) => {
                    const sc = statusOcorrenciaConfig[o.status]
                    return (
                      <tr key={o.id} className="cursor-pointer"
                          onClick={() => navigate(`/ocorrencias/${o.id}`)}>
                        <td><span className="font-mono text-[11px] text-[var(--blue2)]">{o.numero_bo}</span></td>
                        <td>{o.natureza}</td>
                        <td className="max-w-[140px] truncate">{o.logradouro}{o.bairro ? `, ${o.bairro}` : ''}</td>
                        <td className="font-mono text-[11px]">{fmtDataCurta(o.data_hora_fato)}</td>
                        <td><span className={`badge ${prioridadeCor[o.prioridade]}`}>{o.prioridade}</span></td>
                        <td><span className="font-mono text-[11px] text-[var(--blue2)]">{o.viatura_prefixo ?? '—'}</span></td>
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
          )}
        </div>

        {/* Efetivo por turno */}
        <div className="panel">
          <div className="panel-header">
            <span className="panel-title"><span className="dot" /> EFETIVO / TURNO</span>
          </div>
          <div className="p-4">
            {efetivo ? (
              <>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-[var(--navy3)] border border-[rgba(0,150,255,0.08)] rounded-lg p-3 text-center">
                    <div className="font-rajdhani text-3xl font-bold text-green-400">{efetivo.total}</div>
                    <div className="text-[9px] text-[var(--text3)] uppercase tracking-widest">Em Serviço</div>
                  </div>
                  <div className="bg-[var(--navy3)] border border-[rgba(0,150,255,0.08)] rounded-lg p-3 text-center">
                    <div className="font-rajdhani text-3xl font-bold text-red-400">{efetivo.em_ocorrencia}</div>
                    <div className="text-[9px] text-[var(--text3)] uppercase tracking-widest">Ocorrência</div>
                  </div>
                </div>
                {Object.entries(efetivo.por_turno ?? {}).map(([turno, pms]: [string, unknown]) => (
                  <ProgressBar key={turno} label={turno}
                    value={(pms as unknown[]).length}
                    max={efetivo.total || 1} />
                ))}
              </>
            ) : <div className="flex justify-center py-4"><Spinner /></div>}
          </div>
        </div>

        {/* Viaturas */}
        <div className="panel">
          <div className="panel-header">
            <span className="panel-title"><span className="dot" /> FROTA · STATUS</span>
            <button className="btn btn-outline text-[10px] py-1 px-2"
                    onClick={() => navigate('/viaturas')}>Frota</button>
          </div>
          <div className="p-4 space-y-2">
            {viaturas?.dados?.map((v: { id: string; prefixo: string; status: string; ocorrencia_natureza?: string; bairro?: string }) => {
              const colors: Record<string, string> = {
                'Disponível':    'text-green-400',
                'Em Patrulha':   'text-blue-300',
                'Em Ocorrência': 'text-red-400',
                'Manutenção':    'text-amber-400',
              }
              return (
                <div key={v.id}
                     className="flex items-center gap-3 px-3 py-2.5 bg-[var(--navy3)]
                                border border-[rgba(0,150,255,0.08)] rounded-lg
                                hover:border-[var(--border)] transition-colors cursor-pointer"
                     onClick={() => navigate(`/viaturas`)}>
                  <span className="font-mono text-[12px] text-[var(--blue2)] min-w-[64px]">{v.prefixo}</span>
                  <span className="text-[11px] text-[var(--text2)] flex-1 truncate">
                    {v.ocorrencia_natureza ?? (v.status === 'Em Patrulha' ? 'Patrulhando' : v.status)}
                  </span>
                  <span className={`text-[10px] font-bold ${colors[v.status] ?? 'text-[var(--text3)]'}`}>
                    {v.status === 'Disponível' ? '●' : v.status === 'Em Ocorrência' ? '◉' : '○'}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Crime stats */}
        <div className="panel" style={{ gridColumn: '1 / 3' }}>
          <div className="panel-header">
            <span className="panel-title"><span className="dot" /> OCORRÊNCIAS POR TIPO · 30 DIAS</span>
          </div>
          <div className="p-4">
            {dash?.por_natureza ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={dash.por_natureza.slice(0, 8)} barSize={18}>
                  <XAxis dataKey="natureza" tick={{ fill: '#3d6a8a', fontSize: 9 }}
                         tickFormatter={v => v.length > 12 ? v.slice(0,12)+'…' : v} />
                  <YAxis tick={{ fill: '#3d6a8a', fontSize: 9 }} />
                  <Tooltip {...toastTip} />
                  <Bar dataKey="total" fill="url(#blueGrad)" radius={[3,3,0,0]} />
                  <defs>
                    <linearGradient id="blueGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#00c3ff" />
                      <stop offset="100%" stopColor="#0096ff55" />
                    </linearGradient>
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            ) : <div className="flex justify-center py-8"><Spinner /></div>}
          </div>
        </div>

      </div>
    </div>
  )
}
