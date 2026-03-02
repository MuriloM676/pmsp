// src/pages/OcorrenciaDetalhe.tsx
import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ocorrenciasService } from '@/services/api'
import { PageHeader, Spinner, Modal } from '@/components/ui'
import { fmtData, statusOcorrenciaConfig, prioridadeCor, fmtMinutos } from '@/utils'
import type { Ocorrencia, StatusOcorrencia, PrioridadeOcorrencia } from '@/types'

const STATUS_VALIDOS: StatusOcorrencia[] = [
  'Despachada', 'Em Atendimento', 'Aguardando DP', 'Encerrada', 'Cancelada',
]

export default function OcorrenciaDetalhe() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [modalStatus, setModalStatus] = useState(false)
  const [novoStatus, setNovoStatus] = useState<StatusOcorrencia>('Despachada')
  const [detalhes, setDetalhes] = useState('')

  const { data: oc, isLoading } = useQuery({
    queryKey: ['ocorrencia', id],
    queryFn: () => ocorrenciasService.buscar(id!).then(r => r.data as Ocorrencia),
    enabled: !!id,
  })

  const mutStatus = useMutation({
    mutationFn: () => ocorrenciasService.atualizarStatus(id!, novoStatus, detalhes || undefined),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ocorrencia', id] })
      qc.invalidateQueries({ queryKey: ['ocorrencias'] })
      setModalStatus(false)
      setDetalhes('')
    },
  })

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!oc) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="font-rajdhani text-6xl text-[var(--text3)] font-bold">404</div>
        <div className="text-[var(--text2)] mt-2 tracking-widest">OCORRÊNCIA NÃO ENCONTRADA</div>
        <button className="btn btn-outline mt-6" onClick={() => navigate('/ocorrencias')}>← Voltar</button>
      </div>
    )
  }

  const sc = statusOcorrenciaConfig[oc.status]

  return (
    <div className="max-w-4xl">
      <PageHeader
        title={oc.numero_bo}
        accent={`· ${oc.natureza}`}
        subtitle={`Detalhes da ocorrência · Cadastrado em ${fmtData(oc.data_hora_abertura)}`}
      >
        <button className="btn btn-outline" onClick={() => navigate('/ocorrencias')}>← Voltar</button>
        {oc.status !== 'Encerrada' && oc.status !== 'Cancelada' && (
          <button className="btn btn-primary" onClick={() => setModalStatus(true)}>
            Atualizar Status
          </button>
        )}
      </PageHeader>

      {/* Status Banner */}
      <div className={`panel mb-4 p-4 flex items-center gap-4 border-l-4 ${
        oc.status === 'Em Atendimento' ? 'border-l-red-500 bg-red-500/5' :
        oc.status === 'Encerrada'      ? 'border-l-green-500 bg-green-500/5' :
        oc.status === 'Cancelada'      ? 'border-l-slate-600 bg-slate-500/5' :
        'border-l-[var(--blue)] bg-[rgba(0,150,255,0.03)]'
      }`}>
        <span className={`status-dot w-3 h-3 ${sc.dot}`} />
        <span className={`font-rajdhani font-bold text-xl tracking-widest ${sc.text}`}>{sc.label}</span>
        <span className={`ml-auto badge ${prioridadeCor[oc.prioridade as PrioridadeOcorrencia]}`}>
          Prioridade {oc.prioridade}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Dados da Ocorrência */}
        <div className="panel">
          <div className="panel-header">
            <span className="panel-title"><span className="dot" /> DADOS DA OCORRÊNCIA</span>
          </div>
          <div className="p-4 space-y-3">
            <Row label="Natureza"       value={oc.natureza} />
            <Row label="Data do Fato"   value={fmtData(oc.data_hora_fato)} />
            <Row label="Abertura"       value={fmtData(oc.data_hora_abertura)} />
            {oc.data_hora_despacho  && <Row label="Despacho"    value={fmtData(oc.data_hora_despacho)} />}
            {oc.data_hora_chegada   && <Row label="Chegada"     value={fmtData(oc.data_hora_chegada)} />}
            {oc.data_hora_encerramento && <Row label="Encerramento" value={fmtData(oc.data_hora_encerramento)} />}
            <Row label="T. Resposta"   value={fmtMinutos(oc.tempo_resposta_min ?? null)} />
            {oc.viatura_prefixo    && <Row label="Viatura"     value={oc.viatura_prefixo} mono />}
            {oc.unidade_nome       && <Row label="Unidade"     value={oc.unidade_nome} />}
          </div>
        </div>

        {/* Localização */}
        <div className="panel">
          <div className="panel-header">
            <span className="panel-title"><span className="dot" /> LOCALIZAÇÃO</span>
          </div>
          <div className="p-4 space-y-3">
            {oc.logradouro && <Row label="Logradouro" value={`${oc.logradouro}${oc.numero ? `, ${oc.numero}` : ''}`} />}
            {oc.bairro     && <Row label="Bairro"     value={oc.bairro} />}
            <Row label="Cidade"      value={oc.cidade ?? 'São Paulo'} />
            {(oc.lat && oc.lng) && <Row label="Coords" value={`${oc.lat.toFixed(5)}, ${oc.lng.toFixed(5)}`} mono />}
          </div>
        </div>

        {/* Informações Adicionais */}
        <div className="panel">
          <div className="panel-header">
            <span className="panel-title"><span className="dot" /> INFORMAÇÕES ADICIONAIS</span>
          </div>
          <div className="p-4 space-y-3">
            <FlagRow label="Envolve Menor de Idade" value={oc.envolve_menor} />
            <FlagRow label="Morte no Local"          value={oc.morte_no_local} />
            <FlagRow label="Uso de Arma de Fogo"     value={oc.uso_de_arma} />
          </div>
        </div>

        {/* Descrição / Observações */}
        {(oc.descricao || oc.observacoes) && (
          <div className="panel">
            <div className="panel-header">
              <span className="panel-title"><span className="dot" /> DESCRIÇÃO</span>
            </div>
            <div className="p-4 space-y-3">
              {oc.descricao   && <p className="text-sm text-[var(--text2)] leading-relaxed">{oc.descricao}</p>}
              {oc.observacoes && <p className="text-sm text-[var(--text3)] leading-relaxed">{oc.observacoes}</p>}
            </div>
          </div>
        )}
      </div>

      {/* Modal Atualizar Status */}
      <Modal open={modalStatus} onClose={() => setModalStatus(false)} title="ATUALIZAR STATUS" size="sm">
        <div className="space-y-4">
          <div>
            <label className="label">Novo Status</label>
            <select className="input" value={novoStatus}
                    onChange={e => setNovoStatus(e.target.value as StatusOcorrencia)}>
              {STATUS_VALIDOS.filter(s => s !== oc.status).map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Detalhes / Observação</label>
            <textarea className="input resize-none" rows={3}
                      placeholder="Informações adicionais sobre a atualização..."
                      value={detalhes} onChange={e => setDetalhes(e.target.value)} />
          </div>
          {mutStatus.isError && (
            <p className="text-red-400 text-sm">
              {(mutStatus.error as { response?: { data?: { erro?: string } } })?.response?.data?.erro ?? 'Erro ao atualizar status'}
            </p>
          )}
          <div className="flex gap-3 justify-end">
            <button className="btn btn-outline" onClick={() => setModalStatus(false)}>Cancelar</button>
            <button className="btn btn-primary" disabled={mutStatus.isPending} onClick={() => mutStatus.mutate()}>
              {mutStatus.isPending ? <Spinner size="sm" /> : 'Confirmar'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

function Row({ label, value, mono }: { label: string; value: string | number; mono?: boolean }) {
  return (
    <div className="flex justify-between items-start gap-4 text-sm border-b border-[rgba(0,150,255,0.06)] pb-2 last:border-0 last:pb-0">
      <span className="text-[var(--text3)] text-[11px] uppercase tracking-widest shrink-0">{label}</span>
      <span className={`text-[var(--text)] text-right ${mono ? 'font-mono text-[var(--blue2)]' : ''}`}>{value}</span>
    </div>
  )
}

function FlagRow({ label, value }: { label: string; value: boolean }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-[var(--text2)] text-[12px]">{label}</span>
      <span className={`text-[11px] font-mono font-bold ${value ? 'text-red-400' : 'text-slate-600'}`}>
        {value ? 'SIM' : 'NÃO'}
      </span>
    </div>
  )
}
