// src/pages/Escalas.tsx
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { policiaisService } from '@/services/api'
import { PageHeader, Spinner, Empty, Modal, Field } from '@/components/ui'
import { fmtData } from '@/utils'
import type { Escala, Turno } from '@/types'

const TURNOS: Turno[] = ['Manhã', 'Tarde', 'Noite', 'Folga', 'Plantão 24h']

const turnoCor: Record<Turno, string> = {
  'Manhã':       'text-amber-300 bg-amber-500/10 border-amber-500/20',
  'Tarde':       'text-orange-300 bg-orange-500/10 border-orange-500/20',
  'Noite':       'text-blue-300 bg-blue-500/10 border-blue-500/20',
  'Folga':       'text-slate-400 bg-slate-500/10 border-slate-500/20',
  'Plantão 24h': 'text-red-400 bg-red-500/10 border-red-500/20',
}

interface EscalaForm {
  id_policial: string
  data_servico: string
  turno: Turno
  hora_entrada: string
  hora_saida: string
  funcao: string
}

export default function Escalas() {
  const qc = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [filtroDia, setFiltroDia] = useState(new Date().toISOString().slice(0, 10))

  const { data, isLoading } = useQuery({
    queryKey: ['escalas', filtroDia],
    queryFn: () =>
      policiaisService.listarEscalas({ data_inicio: filtroDia, data_fim: filtroDia, limit: 100 })
        .then(r => r.data),
    refetchInterval: 30_000,
  })

  const { data: policiais } = useQuery({
    queryKey: ['policiais-ativos'],
    queryFn: () =>
      policiaisService.listar({ situacao: 'Ativo', limit: 200 })
        .then(r => r.data),
  })

  const { register, handleSubmit, reset, formState: { errors } } =
    useForm<EscalaForm>({
      defaultValues: {
        data_servico: filtroDia,
        turno: 'Manhã',
        hora_entrada: '06:00',
        hora_saida: '14:00',
      },
    })

  const mutation = useMutation({
    mutationFn: (d: Record<string, unknown>) => policiaisService.criarEscala(d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['escalas'] })
      setModalOpen(false)
      reset()
    },
  })

  const escalaList: Escala[] = data?.dados ?? []

  return (
    <div>
      <PageHeader title="ESCALAS" accent="· SERVIÇO"
                  subtitle="Gestão de escalas e turnos de serviço">
        <button className="btn btn-primary" onClick={() => setModalOpen(true)}>
          + Inserir Escala
        </button>
      </PageHeader>

      {/* Filtro de dia */}
      <div className="panel mb-4 p-4 flex items-center gap-4">
        <div>
          <label className="label">Data de Serviço</label>
          <input type="date" className="input" value={filtroDia}
                 onChange={e => setFiltroDia(e.target.value)} />
        </div>
        <div className="ml-auto text-[11px] text-[var(--text3)] font-mono">
          {escalaList.length} PM(s) escalados
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">
          <span className="panel-title"><span className="dot" /> EFETIVO ESCALADO</span>
          <span className="text-[10px] text-[var(--text3)] font-mono">Atualização · 30s</span>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : escalaList.length === 0 ? (
          <Empty label="Nenhuma escala registrada para este dia" />
        ) : (
          <div className="table-container">
            <table>
              <thead><tr>
                <th>RG PM</th>
                <th>Nome de Guerra</th>
                <th>Posto/Grad.</th>
                <th>Turno</th>
                <th>Entrada</th>
                <th>Saída</th>
                <th>Função</th>
                <th>Unidade</th>
              </tr></thead>
              <tbody>
                {escalaList.map(e => (
                  <tr key={e.id}>
                    <td><span className="font-mono text-[11px] text-[var(--blue2)]">{e.rg_pm}</span></td>
                    <td className="font-medium text-[var(--text)]">{e.nome_guerra}</td>
                    <td className="text-[11px] text-[var(--text2)]">{e.posto_graduacao}</td>
                    <td>
                      <span className={`px-2 py-0.5 rounded border text-[10px] font-mono ${turnoCor[e.turno]}`}>
                        {e.turno}
                      </span>
                    </td>
                    <td className="font-mono text-[11px]">{e.hora_entrada}</td>
                    <td className="font-mono text-[11px]">{e.hora_saida}</td>
                    <td className="text-[11px] text-[var(--text2)]">{e.funcao ?? '—'}</td>
                    <td className="font-mono text-[11px] text-[var(--blue2)]">{e.unidade_codigo}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Nova Escala */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="INSERIR ESCALA" size="md">
        <form onSubmit={handleSubmit(d => mutation.mutate(d as unknown as Record<string, unknown>))}
              className="space-y-4">
          <Field label="Policial *" error={errors.id_policial?.message}>
            <select {...register('id_policial', { required: 'Obrigatório' })} className="input">
              <option value="">Selecione o PM...</option>
              {policiais?.dados?.map((p: { id: string; nome_guerra: string; rg_pm: string }) => (
                <option key={p.id} value={p.id}>{p.nome_guerra} · {p.rg_pm}</option>
              ))}
            </select>
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Data de Serviço *" error={errors.data_servico?.message}>
              <input type="date" {...register('data_servico', { required: 'Obrigatório' })} className="input" />
            </Field>
            <Field label="Turno *" error={errors.turno?.message}>
              <select {...register('turno', { required: 'Obrigatório' })} className="input">
                {TURNOS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Hora Entrada">
              <input type="time" {...register('hora_entrada')} className="input font-mono" />
            </Field>
            <Field label="Hora Saída">
              <input type="time" {...register('hora_saida')} className="input font-mono" />
            </Field>
          </div>

          <Field label="Função">
            <input {...register('funcao')} className="input" placeholder="Condutor, Patrulheiro, Supervisor..." />
          </Field>

          {mutation.isError && (
            <p className="text-red-400 text-sm">
              {(mutation.error as { response?: { data?: { erro?: string } } })?.response?.data?.erro ?? 'Erro ao salvar escala'}
            </p>
          )}

          <div className="flex gap-3 justify-end">
            <button type="button" className="btn btn-outline" onClick={() => setModalOpen(false)}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={mutation.isPending}>
              {mutation.isPending ? <Spinner size="sm" /> : '✓ Salvar Escala'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
