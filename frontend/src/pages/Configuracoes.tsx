// src/pages/Configuracoes.tsx
import { useState } from 'react'
import { useAuthStore } from '@/store/authStore'
import { PageHeader } from '@/components/ui'

interface Secao {
  id: string
  label: string
  icon: string
}

const SECOES: Secao[] = [
  { id: 'perfil',     label: 'Perfil e Acesso',     icon: '👤' },
  { id: 'sistema',    label: 'Parâmetros do Sistema', icon: '⚙️' },
  { id: 'alerts',     label: 'Alertas e Notificações', icon: '🔔' },
  { id: 'integracao', label: 'Integrações',           icon: '🔗' },
]

export default function Configuracoes() {
  const { usuario } = useAuthStore()
  const [secao, setSecao] = useState('perfil')
  const [senhaAtual, setSenhaAtual] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [saved, setSaved] = useState(false)

  const handleSalvar = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div className="max-w-4xl">
      <PageHeader title="CONFIGURAÇÕES" accent="· SISTEMA"
                  subtitle="Preferências e parâmetros do sistema" />

      <div className="flex gap-4">
        {/* Sidebar Seções */}
        <div className="w-52 shrink-0">
          <div className="panel">
            {SECOES.map(s => (
              <button key={s.id} onClick={() => setSecao(s.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-left text-[13px]
                                  border-l-2 transition-all
                                  ${secao === s.id
                                    ? 'border-l-[var(--blue)] bg-[rgba(0,150,255,0.08)] text-[var(--blue2)]'
                                    : 'border-l-transparent text-[var(--text2)] hover:bg-[rgba(0,150,255,0.04)]'}`}>
                <span>{s.icon}</span>
                <span>{s.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Conteúdo */}
        <div className="flex-1">

          {secao === 'perfil' && (
            <div className="panel">
              <div className="panel-header">
                <span className="panel-title"><span className="dot" /> PERFIL E ACESSO</span>
              </div>
              <div className="p-5 space-y-5">
                {/* Dados do usuário */}
                <div className="bg-[var(--navy3)] border border-[var(--border)] rounded-lg p-4 space-y-2">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-[#0d2340] border border-[var(--blue)]
                                    flex items-center justify-center text-sm font-bold text-[var(--blue2)]">
                      {usuario?.nome_guerra?.slice(0, 2).toUpperCase() ?? '??'}
                    </div>
                    <div>
                      <div className="font-semibold text-white">{usuario?.nome_guerra ?? '—'}</div>
                      <div className="text-[11px] text-[var(--text3)] uppercase tracking-wider">
                        {usuario?.posto_graduacao} · {usuario?.perfil}
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[12px]">
                    <div><span className="text-[var(--text3)]">Login:</span> <span className="font-mono text-[var(--blue2)]">{usuario?.login}</span></div>
                    <div><span className="text-[var(--text3)]">RG PM:</span> <span className="font-mono">{usuario?.rg_pm}</span></div>
                  </div>
                </div>

                {/* Alterar Senha */}
                <div>
                  <h3 className="text-[12px] font-semibold text-[var(--text2)] uppercase tracking-widest mb-3 pb-2 border-b border-[var(--border)]">
                    Alterar Senha
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <label className="label">Senha Atual</label>
                      <input type="password" className="input" value={senhaAtual}
                             onChange={e => setSenhaAtual(e.target.value)}
                             placeholder="••••••••" />
                    </div>
                    <div>
                      <label className="label">Nova Senha</label>
                      <input type="password" className="input" value={novaSenha}
                             onChange={e => setNovaSenha(e.target.value)}
                             placeholder="Mínimo 8 caracteres" />
                    </div>
                    <div>
                      <label className="label">Confirmar Nova Senha</label>
                      <input type="password" className="input" value={confirmar}
                             onChange={e => setConfirmar(e.target.value)}
                             placeholder="Repita a nova senha" />
                    </div>
                    {novaSenha && confirmar && novaSenha !== confirmar && (
                      <p className="text-red-400 text-[12px]">As senhas não coincidem.</p>
                    )}
                    <button
                      className="btn btn-primary"
                      disabled={!senhaAtual || !novaSenha || novaSenha !== confirmar}
                      onClick={handleSalvar}
                    >
                      {saved ? '✓ Alterado!' : 'Salvar Nova Senha'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {secao === 'sistema' && (
            <div className="panel">
              <div className="panel-header">
                <span className="panel-title"><span className="dot" /> PARÂMETROS DO SISTEMA</span>
              </div>
              <div className="p-5 space-y-4">
                {[
                  { label: 'Intervalo de atualização automática (segundos)', valor: '15', unidade: 's' },
                  { label: 'Limite de sessão inativa (minutos)', valor: '60', unidade: 'min' },
                  { label: 'Número máximo de registros por página', valor: '25', unidade: 'regs' },
                  { label: 'Tempo limite de alerta P1 sem resposta (minutos)', valor: '10', unidade: 'min' },
                ].map(p => (
                  <div key={p.label} className="flex items-center justify-between gap-4">
                    <label className="text-[12px] text-[var(--text2)] flex-1">{p.label}</label>
                    <div className="flex items-center gap-2">
                      <input type="number" defaultValue={p.valor}
                             className="input w-20 text-center font-mono" />
                      <span className="text-[11px] text-[var(--text3)]">{p.unidade}</span>
                    </div>
                  </div>
                ))}
                <div className="pt-2">
                  <button className="btn btn-primary" onClick={handleSalvar}>
                    {saved ? '✓ Salvo!' : 'Salvar Parâmetros'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {secao === 'alerts' && (
            <div className="panel">
              <div className="panel-header">
                <span className="panel-title"><span className="dot" /> ALERTAS E NOTIFICAÇÕES</span>
              </div>
              <div className="p-5 space-y-3">
                {[
                  { label: 'Alerta de ocorrência P1 sem despacho em 5 minutos', ativo: true },
                  { label: 'Notificação de nova ocorrência P1 ou P2', ativo: true },
                  { label: 'Alerta de viatura sem atualização de posição (> 30 min)', ativo: false },
                  { label: 'Aviso de vencimento de revisão de viatura', ativo: true },
                  { label: 'Alerta de efetivo abaixo do mínimo operacional', ativo: false },
                  { label: 'Notificação de login de novo usuário', ativo: false },
                ].map(a => (
                  <label key={a.label}
                         className="flex items-center justify-between gap-4 p-3 bg-[var(--navy3)]
                                    border border-[var(--border)] rounded-lg cursor-pointer
                                    hover:border-[var(--blue)] transition-colors">
                    <span className="text-[12px] text-[var(--text2)]">{a.label}</span>
                    <input type="checkbox" defaultChecked={a.ativo}
                           className="w-4 h-4 accent-[var(--blue)]" />
                  </label>
                ))}
                <div className="pt-1">
                  <button className="btn btn-primary" onClick={handleSalvar}>
                    {saved ? '✓ Salvo!' : 'Salvar Preferências'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {secao === 'integracao' && (
            <div className="panel">
              <div className="panel-header">
                <span className="panel-title"><span className="dot" /> INTEGRAÇÕES</span>
              </div>
              <div className="p-5 space-y-4">
                {[
                  { nome: 'COPOM Web', status: 'Ativo', cor: 'text-green-400', desc: 'Centro de Operações da PM — troca de dados de ocorrências' },
                  { nome: 'SINESP', status: 'Ativo', cor: 'text-green-400', desc: 'Consulta de veículos e pessoas' },
                  { nome: 'DETRAN-SP', status: 'Inativo', cor: 'text-slate-500', desc: 'Licenciamento e habilitação' },
                  { nome: 'INFOCRIM', status: 'Ativo', cor: 'text-green-400', desc: 'Sistema de informações criminais' },
                ].map(i => (
                  <div key={i.nome}
                       className="flex items-center justify-between p-4 bg-[var(--navy3)]
                                  border border-[var(--border)] rounded-lg">
                    <div>
                      <div className="font-semibold text-[var(--text)] text-[13px]">{i.nome}</div>
                      <div className="text-[11px] text-[var(--text3)] mt-0.5">{i.desc}</div>
                    </div>
                    <span className={`text-[11px] font-mono font-bold ${i.cor}`}>● {i.status}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
