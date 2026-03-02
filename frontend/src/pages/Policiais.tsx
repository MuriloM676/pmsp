// src/pages/Policiais.tsx
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { policiaisService } from '@/services/api'
import { PageHeader, Spinner, Empty } from '@/components/ui'
import { situacaoPMConfig } from '@/utils'
import type { Policial } from '@/types'

export default function Policiais() {
  const [busca, setBusca] = useState('')
  const [situacao, setSituacao] = useState('')
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['policiais', busca, situacao, page],
    queryFn: () => policiaisService.listar({ busca: busca || undefined, situacao: situacao || undefined, page, limit: 30 }).then(r => r.data),
  })

  return (
    <div>
      <PageHeader title="EFETIVO" accent="· POLICIAIS"
                  subtitle="Gestão de recursos humanos e pessoal">
        <button className="btn btn-primary">+ Cadastrar PM</button>
      </PageHeader>

      {/* Filtros */}
      <div className="panel mb-4 p-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <label className="label">Buscar</label>
            <input className="input" placeholder="Nome, nome de guerra ou RG PM..."
                   value={busca} onChange={e => { setBusca(e.target.value); setPage(1) }} />
          </div>
          <div>
            <label className="label">Situação</label>
            <select className="input" value={situacao}
                    onChange={e => { setSituacao(e.target.value); setPage(1) }}>
              <option value="">Todas</option>
              {['Ativo','Férias','Licença Médica','Afastado','Inativo','Reserva'].map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">
          <span className="panel-title">
            <span className="dot" />
            {data?.paginacao ? `${data.paginacao.total} policiais` : 'Carregando...'}
          </span>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : !data?.dados?.length ? (
          <Empty label="Nenhum policial encontrado" />
        ) : (
          <>
            <div className="table-container">
              <table>
                <thead><tr>
                  <th>RG PM</th><th>Nome de Guerra</th><th>Posto/Graduação</th>
                  <th>Unidade</th><th>Situação</th><th>Contato</th>
                </tr></thead>
                <tbody>
                  {data.dados.map((p: Policial) => {
                    const sc = situacaoPMConfig[p.situacao] ?? { bg: 'bg-slate-500/10', text: 'text-slate-400' }
                    return (
                      <tr key={p.id}>
                        <td><span className="font-mono text-[11px] text-[var(--blue2)]">{p.rg_pm}</span></td>
                        <td>
                          <div className="font-medium text-[var(--text)]">{p.nome_guerra}</div>
                          <div className="text-[10px] text-[var(--text3)]">{p.nome_completo}</div>
                        </td>
                        <td className="text-[var(--text)]">{p.posto_graduacao}</td>
                        <td><span className="font-mono text-[11px] text-[var(--blue2)]">{p.unidade_codigo}</span></td>
                        <td>
                          <span className={`badge ${sc.bg} ${sc.text}`}>{p.situacao}</span>
                        </td>
                        <td className="text-[11px]">{p.telefone_funcional ?? '—'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

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
