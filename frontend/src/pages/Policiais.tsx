// src/pages/Policiais.tsx
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { policiaisService } from '@/services/api'
import { PageHeader, Spinner, Empty, Modal, Field } from '@/components/ui'
import { situacaoPMConfig } from '@/utils'
import type { Policial, PostoGraduacao, SituacaoPM } from '@/types'

const POSTOS: PostoGraduacao[] = [
  'Soldado','Cabo','Terceiro Sargento','Segundo Sargento',
  'Primeiro Sargento','Subtenente','Aspirante a Oficial',
  'Segundo Tenente','Primeiro Tenente','Capitão',
  'Major','Tenente Coronel','Coronel',
]

interface PMForm {
  rg_pm: string
  cpf: string
  nome_completo: string
  nome_guerra: string
  posto_graduacao: PostoGraduacao
  situacao: SituacaoPM
  sexo: 'M' | 'F'
  email_corporativo: string
  telefone_funcional: string
}

export default function Policiais() {
  const qc = useQueryClient()
  const [busca, setBusca] = useState('')
  const [situacao, setSituacao] = useState('')
  const [page, setPage] = useState(1)
  const [modalOpen, setModalOpen] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['policiais', busca, situacao, page],
    queryFn: () =>
      policiaisService.listar({ busca: busca || undefined, situacao: situacao || undefined, page, limit: 30 })
        .then(r => r.data),
  })

  const { register, handleSubmit, reset, formState: { errors } } =
    useForm<PMForm>({ defaultValues: { situacao: 'Ativo', sexo: 'M', posto_graduacao: 'Soldado' } })

  const mutation = useMutation({
    mutationFn: (d: Record<string, unknown>) => policiaisService.criar(d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['policiais'] })
      setModalOpen(false)
      reset()
    },
  })

  return (
    <div>
      <PageHeader title="EFETIVO" accent="· POLICIAIS"
                  subtitle="Gestão de recursos humanos e pessoal">
        <button className="btn btn-primary" onClick={() => setModalOpen(true)}>
          + Cadastrar PM
        </button>
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

      {/* Modal Cadastrar PM */}
      <Modal open={modalOpen} onClose={() => { setModalOpen(false); reset() }}
             title="CADASTRAR POLICIAL MILITAR" size="lg">
        <form onSubmit={handleSubmit(d => mutation.mutate(d as Record<string, unknown>))}
              className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="RG PM *" error={errors.rg_pm?.message}>
              <input {...register('rg_pm', { required: 'Obrigatório' })} className="input font-mono"
                     placeholder="Ex: 123456" />
            </Field>
            <Field label="CPF *" error={errors.cpf?.message}>
              <input {...register('cpf', { required: 'Obrigatório' })} className="input font-mono"
                     placeholder="000.000.000-00" />
            </Field>
            <div className="col-span-2">
              <Field label="Nome Completo *" error={errors.nome_completo?.message}>
                <input {...register('nome_completo', { required: 'Obrigatório' })} className="input"
                       placeholder="Nome completo conforme registro" />
              </Field>
            </div>
            <Field label="Nome de Guerra *" error={errors.nome_guerra?.message}>
              <input {...register('nome_guerra', { required: 'Obrigatório' })} className="input"
                     placeholder="Ex: SILVA" />
            </Field>
            <Field label="Sexo">
              <select {...register('sexo')} className="input">
                <option value="M">Masculino</option>
                <option value="F">Feminino</option>
              </select>
            </Field>
            <Field label="Posto/Graduação *" error={errors.posto_graduacao?.message}>
              <select {...register('posto_graduacao', { required: 'Obrigatório' })} className="input">
                {POSTOS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </Field>
            <Field label="Situação">
              <select {...register('situacao')} className="input">
                {['Ativo','Férias','Licença Médica','Afastado','Inativo','Reserva'].map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </Field>
            <Field label="E-mail Corporativo">
              <input type="email" {...register('email_corporativo')} className="input"
                     placeholder="pm@policiamilitar.sp.gov.br" />
            </Field>
            <Field label="Telefone Funcional">
              <input {...register('telefone_funcional')} className="input font-mono"
                     placeholder="(11) 0000-0000" />
            </Field>
          </div>

          {mutation.isError && (
            <p className="text-red-400 text-sm">
              {(mutation.error as { response?: { data?: { erro?: string } } })?.response?.data?.erro ?? 'Erro ao cadastrar policial'}
            </p>
          )}

          <div className="flex gap-3 justify-end">
            <button type="button" className="btn btn-outline"
                    onClick={() => { setModalOpen(false); reset() }}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={mutation.isPending}>
              {mutation.isPending ? <Spinner size="sm" /> : '✓ Cadastrar PM'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
