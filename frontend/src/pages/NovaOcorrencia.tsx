// src/pages/NovaOcorrencia.tsx
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { ocorrenciasService, viaturasService } from '@/services/api'
import { PageHeader, Spinner, Field } from '@/components/ui'
import type { NaturezaOcorrencia, PrioridadeOcorrencia } from '@/types'

interface Form {
  natureza: NaturezaOcorrencia
  descricao: string
  prioridade: PrioridadeOcorrencia
  logradouro: string
  numero: string
  bairro: string
  cep: string
  ponto_referencia: string
  data_hora_fato: string
  id_viatura: string
  envolve_menor: boolean
  morte_no_local: boolean
  uso_de_arma: boolean
  observacoes: string
}

const NATUREZAS: NaturezaOcorrencia[] = [
  'Homicídio','Tentativa de Homicídio','Roubo','Furto','Roubo de Veículo',
  'Furto de Veículo','Tráfico de Drogas','Lesão Corporal','Ameaça',
  'Perturbação do Sossego','Acidente de Trânsito','Sequestro','Latrocínio',
  'Violência Doméstica','Estupro','Estelionato','Outros',
]

const PRIORIDADES: { val: PrioridadeOcorrencia; desc: string; cor: string }[] = [
  { val: 'P1', desc: 'Crime em andamento / Risco de vida', cor: 'border-red-500/50 bg-red-500/10 text-red-400' },
  { val: 'P2', desc: 'Crime recente / Urgente',            cor: 'border-amber-500/50 bg-amber-500/10 text-amber-400' },
  { val: 'P3', desc: 'Ocorrência normal',                  cor: 'border-blue-500/50 bg-blue-500/10 text-blue-300' },
  { val: 'P4', desc: 'Baixa urgência / Administrativo',    cor: 'border-slate-500/50 bg-slate-500/10 text-slate-400' },
]

export default function NovaOcorrencia() {
  const navigate = useNavigate()
  const [prioridade, setPrioridade] = useState<PrioridadeOcorrencia>('P3')
  const { register, handleSubmit, formState: { errors } } = useForm<Form>({
    defaultValues: {
      prioridade: 'P3',
      data_hora_fato: new Date().toISOString().slice(0,16),
    }
  })

  const { data: viaturas } = useQuery({
    queryKey: ['viaturas-disponiveis'],
    queryFn: () => viaturasService.listar({ status: 'Disponível', limit: 50 }).then(r => r.data),
  })

  const mutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => ocorrenciasService.criar(data),
    onSuccess: (res) => {
      navigate(`/ocorrencias/${res.data.id}`)
    },
  })

  const onSubmit = (data: Form) => {
    mutation.mutate({ ...data, prioridade })
  }

  return (
    <div className="max-w-3xl">
      <PageHeader title="REGISTRAR" accent="OCORRÊNCIA"
                  subtitle="Boletim de Ocorrência · Novo Registro">
        <button className="btn btn-outline" onClick={() => navigate(-1)}>← Voltar</button>
      </PageHeader>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

        {/* Prioridade */}
        <div className="panel">
          <div className="panel-header"><span className="panel-title"><span className="dot" /> PRIORIDADE</span></div>
          <div className="p-4 grid grid-cols-4 gap-3">
            {PRIORIDADES.map(p => (
              <button key={p.val} type="button"
                      onClick={() => setPrioridade(p.val)}
                      className={`p-3 rounded-lg border text-center transition-all ${
                        prioridade === p.val ? p.cor : 'border-[var(--border)] text-[var(--text3)] hover:border-[var(--border)]'
                      }`}>
                <div className="font-rajdhani font-bold text-xl">{p.val}</div>
                <div className="text-[9px] tracking-wide mt-0.5">{p.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Natureza e dados */}
        <div className="panel">
          <div className="panel-header"><span className="panel-title"><span className="dot" /> DADOS DA OCORRÊNCIA</span></div>
          <div className="p-4 grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Field label="Natureza da Ocorrência *" error={errors.natureza?.message}>
                <select {...register('natureza', { required: 'Obrigatório' })} className="input">
                  <option value="">Selecione...</option>
                  {NATUREZAS.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </Field>
            </div>
            <Field label="Data e Hora do Fato *" error={errors.data_hora_fato?.message}>
              <input type="datetime-local" {...register('data_hora_fato', { required: 'Obrigatório' })} className="input" />
            </Field>
            <Field label="Viatura Despachada">
              <select {...register('id_viatura')} className="input">
                <option value="">Selecionar depois</option>
                {viaturas?.dados?.map((v: { id: string; prefixo: string; placa: string }) => (
                  <option key={v.id} value={v.id}>{v.prefixo} · {v.placa}</option>
                ))}
              </select>
            </Field>
            <div className="col-span-2">
              <Field label="Descrição">
                <textarea {...register('descricao')} rows={3} className="input resize-none"
                          placeholder="Descreva a ocorrência brevemente..." />
              </Field>
            </div>
          </div>
        </div>

        {/* Localização */}
        <div className="panel">
          <div className="panel-header"><span className="panel-title"><span className="dot" /> LOCALIZAÇÃO</span></div>
          <div className="p-4 grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <Field label="Logradouro *" error={errors.logradouro?.message}>
                <input {...register('logradouro', { required: 'Obrigatório' })} className="input"
                       placeholder="Av. Paulista" />
              </Field>
            </div>
            <Field label="Número">
              <input {...register('numero')} className="input" placeholder="1500" />
            </Field>
            <Field label="Bairro">
              <input {...register('bairro')} className="input" placeholder="Bela Vista" />
            </Field>
            <Field label="CEP">
              <input {...register('cep')} className="input font-mono" placeholder="01310-100" />
            </Field>
            <div className="col-span-3">
              <Field label="Ponto de Referência">
                <input {...register('ponto_referencia')} className="input"
                       placeholder="Próximo ao metrô, em frente ao banco..." />
              </Field>
            </div>
          </div>
        </div>

        {/* Flags */}
        <div className="panel">
          <div className="panel-header"><span className="panel-title"><span className="dot" /> INFORMAÇÕES ADICIONAIS</span></div>
          <div className="p-4 grid grid-cols-3 gap-4">
            {[
              { name: 'envolve_menor', label: 'Envolve Menor de Idade' },
              { name: 'morte_no_local', label: 'Morte no Local' },
              { name: 'uso_de_arma', label: 'Uso de Arma de Fogo' },
            ].map(f => (
              <label key={f.name}
                     className="flex items-center gap-3 p-3 bg-[var(--navy3)] rounded-lg border
                                border-[var(--border)] cursor-pointer hover:border-[var(--blue)] transition-colors">
                <input type="checkbox"
                       {...register(f.name as keyof Form)}
                       className="w-4 h-4 accent-[var(--blue)]" />
                <span className="text-[12px] text-[var(--text2)]">{f.label}</span>
              </label>
            ))}
            <div className="col-span-3">
              <Field label="Observações">
                <textarea {...register('observacoes')} rows={2} className="input resize-none"
                          placeholder="Informações complementares..." />
              </Field>
            </div>
          </div>
        </div>

        {mutation.isError && (
          <div className="px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
            {(mutation.error as { response?: { data?: { erro?: string } } })?.response?.data?.erro ?? 'Erro ao registrar ocorrência'}
          </div>
        )}

        <div className="flex gap-3 justify-end">
          <button type="button" className="btn btn-outline" onClick={() => navigate(-1)}>Cancelar</button>
          <button type="submit" disabled={mutation.isPending} className="btn btn-primary px-8">
            {mutation.isPending ? <Spinner size="sm" /> : '✓ REGISTRAR OCORRÊNCIA'}
          </button>
        </div>
      </form>
    </div>
  )
}
