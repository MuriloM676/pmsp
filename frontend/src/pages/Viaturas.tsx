// src/pages/Viaturas.tsx
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { viaturasService } from '@/services/api'
import { PageHeader, Spinner, Empty } from '@/components/ui'
import { statusViaturaConfig } from '@/utils'
import type { Viatura } from '@/types'

export default function Viaturas() {
  const [filtroStatus, setFiltroStatus] = useState('')

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['viaturas', filtroStatus],
    queryFn: () => viaturasService.listar(filtroStatus ? { status: filtroStatus } : {}).then(r => r.data),
    refetchInterval: 20_000,
  })

  const s = data?.sumario

  return (
    <div>
      <PageHeader title="VIATURAS" accent="· FROTA"
                  subtitle="Controle e monitoramento da frota operacional">
        <button className="btn btn-outline" onClick={() => refetch()}>↺ Atualizar</button>
      </PageHeader>

      {/* Sumário */}
      {s && (
        <div className="grid grid-cols-5 gap-3 mb-5">
          {[
            { label: 'Disponíveis',    val: s.disponiveis,    col: 'text-green-400' },
            { label: 'Em Patrulha',    val: s.em_patrulha,    col: 'text-blue-300' },
            { label: 'Em Ocorrência',  val: s.em_ocorrencia,  col: 'text-red-400' },
            { label: 'Manutenção',     val: s.manutencao,     col: 'text-amber-400' },
            { label: 'Total',          val: s.total,          col: 'text-white' },
          ].map(item => (
            <div key={item.label}
                 className="panel p-4 text-center cursor-pointer hover:border-[rgba(0,150,255,0.3)] transition-colors"
                 onClick={() => setFiltroStatus(item.label === 'Total' ? '' : item.label)}>
              <div className={`font-rajdhani text-3xl font-bold ${item.col}`}>{item.val ?? 0}</div>
              <div className="text-[9px] text-[var(--text3)] uppercase tracking-widest mt-1">{item.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filtro rápido */}
      <div className="flex gap-2 mb-4">
        {['', 'Disponível', 'Em Patrulha', 'Em Ocorrência', 'Manutenção'].map(st => (
          <button key={st}
                  className={`btn text-[10px] py-1.5 px-3 ${filtroStatus === st ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => setFiltroStatus(st)}>
            {st || 'Todas'}
          </button>
        ))}
      </div>

      {/* Grid de viaturas */}
      {isLoading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : !data?.dados?.length ? (
        <Empty label="Nenhuma viatura encontrada" />
      ) : (
        <div className="grid grid-cols-3 gap-3">
          {data.dados.map((v: Viatura) => {
            const sc = statusViaturaConfig[v.status]
            return (
              <div key={v.id}
                   className="panel p-4 hover:border-[rgba(0,150,255,0.3)] transition-all hover:-translate-y-0.5 cursor-default">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="font-mono font-bold text-[var(--blue2)] text-lg">{v.prefixo}</div>
                    <div className="text-[10px] text-[var(--text3)] tracking-widest">{v.placa}</div>
                  </div>
                  <span className={`badge ${sc.bg} ${sc.text}`}>{sc.label}</span>
                </div>
                <div className="text-[11px] text-[var(--text2)] mb-1">
                  {v.modelo ? `${v.marca} ${v.modelo}` : v.tipo}
                  {v.ano_fabricacao && <span className="text-[var(--text3)]"> · {v.ano_fabricacao}</span>}
                </div>
                {v.ocorrencia_ativa && (
                  <div className="mt-2 px-2 py-1 bg-red-500/10 border border-red-500/20 rounded text-[10px] text-red-400 truncate">
                    🚨 {v.ocorrencia_natureza ?? v.ocorrencia_ativa}
                  </div>
                )}
                {v.revisao_vencida && (
                  <div className="mt-2 text-[10px] text-amber-400">⚠ Revisão vencida</div>
                )}
                <div className="mt-3 pt-3 border-t border-[rgba(0,150,255,0.08)] flex justify-between text-[10px] text-[var(--text3)]">
                  <span>Km: <span className="text-[var(--text2)]">{v.km_atual?.toLocaleString('pt-BR')}</span></span>
                  <span>{v.unidade_codigo}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
