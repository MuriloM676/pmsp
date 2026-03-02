// src/pages/Manutencoes.tsx
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { viaturasService } from '@/services/api'
import { PageHeader, Spinner, Empty, Modal, Field } from '@/components/ui'
import type { Viatura } from '@/types'

interface ManutencaoForm {
  id_viatura: string
  tipo: string
  descricao: string
  km_entrada: string
  data_entrada: string
  data_prevista: string
  fornecedor: string
}

interface Manutencao {
  id: string
  id_viatura: string
  prefixo: string
  placa: string
  tipo_viatura: string
  tipo: string
  descricao: string
  km_entrada?: number
  data_entrada: string
  data_prevista?: string
  data_saida?: string
  custo?: number
  fornecedor?: string
  resolvido: boolean
  criado_em: string
}

export default function Manutencoes() {
  const qc = useQueryClient()
  const [modalNova, setModalNova] = useState(false)
  const [modalConcluir, setModalConcluir] = useState<Manutencao | null>(null)
  const [filtroResolvido, setFiltroResolvido] = useState<'false' | 'true' | ''>('false')
  const [custo, setCusto] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['manutencoes', filtroResolvido],
    queryFn: () =>
      viaturasService.listarManutencoes(
        filtroResolvido !== '' ? { resolvido: filtroResolvido } : undefined
      ).then(r => r.data),
    refetchInterval: 60_000,
  })

  const { data: viaturas } = useQuery({
    queryKey: ['viaturas-todas'],
    queryFn: () => viaturasService.listar({ limit: 200 }).then(r => r.data),
    enabled: modalNova,
  })

  const { register, handleSubmit, reset, formState: { errors } } =
    useForm<ManutencaoForm>({
      defaultValues: { data_entrada: new Date().toISOString().slice(0, 10) },
    })

  const mutCriar = useMutation({
    mutationFn: (d: Record<string, unknown>) => viaturasService.criarManutencao(d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['manutencoes'] })
      qc.invalidateQueries({ queryKey: ['viaturas'] })
      setModalNova(false)
      reset()
    },
  })

  const mutConcluir = useMutation({
    mutationFn: ({ id }: { id: string }) =>
      viaturasService.concluirManutencao(id, { custo: custo ? Number(custo) : undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['manutencoes'] })
      qc.invalidateQueries({ queryKey: ['viaturas'] })
      setModalConcluir(null)
      setCusto('')
    },
  })

  const lista: Manutencao[] = data?.dados ?? []

  return (
    <div>
      <PageHeader title="MANUTENÇÃO" accent="· FROTA"
                  subtitle="Registro e acompanhamento de manutenções de viaturas">
        <button className="btn btn-primary" onClick={() => setModalNova(true)}>
          + Registrar Manutenção
        </button>
      </PageHeader>

      {/* Filtro */}
      <div className="panel mb-4 p-4 flex items-center gap-4">
        <div>
          <label className="label">Situação</label>
          <select className="input" value={filtroResolvido}
                  onChange={e => setFiltroResolvido(e.target.value as typeof filtroResolvido)}>
            <option value="false">Em Andamento</option>
            <option value="true">Concluídas</option>
            <option value="">Todas</option>
          </select>
        </div>
        <div className="ml-auto text-[11px] text-[var(--text3)] font-mono">
          {lista.length} registro(s)
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">
          <span className="panel-title"><span className="dot" /> REGISTROS DE MANUTENÇÃO</span>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : lista.length === 0 ? (
          <Empty label="Nenhuma manutenção encontrada" />
        ) : (
          <div className="table-container">
            <table>
              <thead><tr>
                <th>Viatura</th>
                <th>Tipo</th>
                <th>Descrição</th>
                <th>Entrada</th>
                <th>Previsão</th>
                <th>Fornecedor</th>
                <th>Situação</th>
                <th>Ação</th>
              </tr></thead>
              <tbody>
                {lista.map(m => (
                  <tr key={m.id}>
                    <td>
                      <div className="font-mono text-[11px] text-[var(--blue2)]">{m.prefixo}</div>
                      <div className="text-[10px] text-[var(--text3)]">{m.placa}</div>
                    </td>
                    <td>
                      <span className={`px-2 py-0.5 rounded border text-[10px] font-mono ${
                        m.tipo === 'Preventiva' ? 'text-blue-300 bg-blue-500/10 border-blue-500/20' :
                        m.tipo === 'Corretiva'  ? 'text-amber-400 bg-amber-500/10 border-amber-500/20' :
                        'text-red-400 bg-red-500/10 border-red-500/20'
                      }`}>
                        {m.tipo}
                      </span>
                    </td>
                    <td className="max-w-[200px]">
                      <div className="truncate text-[var(--text)] text-[12px]">{m.descricao}</div>
                    </td>
                    <td className="font-mono text-[11px]">
                      {new Date(m.data_entrada).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="font-mono text-[11px]">
                      {m.data_prevista ? new Date(m.data_prevista).toLocaleDateString('pt-BR') : '—'}
                    </td>
                    <td className="text-[12px] text-[var(--text2)]">{m.fornecedor ?? '—'}</td>
                    <td>
                      {m.resolvido ? (
                        <span className="flex items-center gap-1 text-green-400 text-[11px]">
                          <span className="status-dot bg-green-400" /> Concluída
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-amber-400 text-[11px]">
                          <span className="status-dot bg-amber-400 animate-pulse" /> Em Andamento
                        </span>
                      )}
                    </td>
                    <td>
                      {!m.resolvido && (
                        <button
                          className="text-[10px] btn btn-outline py-1 px-2"
                          onClick={() => setModalConcluir(m)}
                        >
                          Concluir
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Nova Manutenção */}
      <Modal open={modalNova} onClose={() => setModalNova(false)} title="REGISTRAR MANUTENÇÃO" size="md">
        <form
          onSubmit={handleSubmit(d =>
            mutCriar.mutate({
              ...d,
              km_entrada: d.km_entrada ? Number(d.km_entrada) : undefined,
            })
          )}
          className="space-y-4"
        >
          <Field label="Viatura *" error={errors.id_viatura?.message}>
            <select {...register('id_viatura', { required: 'Obrigatório' })} className="input">
              <option value="">Selecione a viatura...</option>
              {viaturas?.dados?.map((v: Viatura) => (
                <option key={v.id} value={v.id}>{v.prefixo} · {v.placa} ({v.status})</option>
              ))}
            </select>
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Tipo *" error={errors.tipo?.message}>
              <select {...register('tipo', { required: 'Obrigatório' })} className="input">
                <option value="">Selecione...</option>
                <option value="Preventiva">Preventiva</option>
                <option value="Corretiva">Corretiva</option>
                <option value="Sinistro">Sinistro</option>
              </select>
            </Field>
            <Field label="KM de Entrada">
              <input type="number" {...register('km_entrada')} className="input font-mono" placeholder="Ex: 45000" />
            </Field>
            <Field label="Data de Entrada *" error={errors.data_entrada?.message}>
              <input type="date" {...register('data_entrada', { required: 'Obrigatório' })} className="input" />
            </Field>
            <Field label="Previsão de Saída">
              <input type="date" {...register('data_prevista')} className="input" />
            </Field>
          </div>

          <Field label="Descrição *" error={errors.descricao?.message}>
            <textarea
              {...register('descricao', { required: 'Obrigatório' })}
              rows={3} className="input resize-none"
              placeholder="Descreva o problema ou serviço a ser realizado..."
            />
          </Field>

          <Field label="Fornecedor / Oficina">
            <input {...register('fornecedor')} className="input" placeholder="Nome da oficina ou empresa" />
          </Field>

          {mutCriar.isError && (
            <p className="text-red-400 text-sm">
              {(mutCriar.error as { response?: { data?: { erro?: string } } })?.response?.data?.erro ?? 'Erro ao registrar manutenção'}
            </p>
          )}

          <div className="flex gap-3 justify-end">
            <button type="button" className="btn btn-outline" onClick={() => setModalNova(false)}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={mutCriar.isPending}>
              {mutCriar.isPending ? <Spinner size="sm" /> : '✓ Registrar'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Concluir */}
      <Modal
        open={!!modalConcluir}
        onClose={() => setModalConcluir(null)}
        title="CONCLUIR MANUTENÇÃO"
        size="sm"
      >
        {modalConcluir && (
          <div className="space-y-4">
            <div className="bg-[var(--navy3)] rounded-lg p-3 text-sm space-y-1">
              <div><span className="text-[var(--text3)]">Viatura:</span> <span className="font-mono text-[var(--blue2)]">{modalConcluir.prefixo}</span></div>
              <div><span className="text-[var(--text3)]">Tipo:</span> <span className="text-[var(--text)]">{modalConcluir.tipo}</span></div>
              <div><span className="text-[var(--text3)]">Descrição:</span> <span className="text-[var(--text2)]">{modalConcluir.descricao}</span></div>
            </div>
            <div>
              <label className="label">Custo Total (R$)</label>
              <input type="number" step="0.01" className="input font-mono" placeholder="0,00"
                     value={custo} onChange={e => setCusto(e.target.value)} />
            </div>
            <p className="text-[11px] text-[var(--text3)]">
              A viatura voltará automaticamente ao status <strong className="text-green-400">Disponível</strong>.
            </p>
            {mutConcluir.isError && (
              <p className="text-red-400 text-sm">Erro ao concluir manutenção</p>
            )}
            <div className="flex gap-3 justify-end">
              <button className="btn btn-outline" onClick={() => setModalConcluir(null)}>Cancelar</button>
              <button
                className="btn btn-primary"
                disabled={mutConcluir.isPending}
                onClick={() => mutConcluir.mutate({ id: modalConcluir.id })}
              >
                {mutConcluir.isPending ? <Spinner size="sm" /> : '✓ Concluir'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
