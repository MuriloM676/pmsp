// src/pages/Login.tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { authService } from '@/services/api'
import { useAuthStore } from '@/store/authStore'
import { Spinner } from '@/components/ui'

interface Form { login: string; senha: string }

export default function Login() {
  const [erro, setErro] = useState('')
  const [loading, setLoading] = useState(false)
  const { register, handleSubmit, formState: { errors } } = useForm<Form>()
  const { setAuth } = useAuthStore()
  const navigate = useNavigate()

  const onSubmit = async (data: Form) => {
    setLoading(true); setErro('')
    try {
      const res = await authService.login(data.login, data.senha)
      setAuth(res.data.usuario, res.data.token)
      navigate('/')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { erro?: string } } })?.response?.data?.erro
      setErro(msg ?? 'Erro ao conectar com o servidor')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4"
         style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(0,150,255,0.08) 0%, #050d1a 60%)' }}>

      {/* Grid bg */}
      <div className="fixed inset-0 pointer-events-none"
           style={{ backgroundImage: 'linear-gradient(rgba(0,150,255,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(0,150,255,0.03) 1px,transparent 1px)', backgroundSize: '40px 40px' }} />

      <div className="relative w-full max-w-sm animate-fade-up">

        {/* Glow behind card */}
        <div className="absolute -inset-4 rounded-2xl opacity-20"
             style={{ background: 'radial-gradient(ellipse, rgba(0,150,255,0.4) 0%, transparent 70%)' }} />

        <div className="relative panel">
          {/* Top accent line */}
          <div className="h-0.5 w-full"
               style={{ background: 'linear-gradient(90deg,transparent,#0096ff,#00e5ff,#0096ff,transparent)' }} />

          <div className="p-8">
            {/* Logo */}
            <div className="flex flex-col items-center mb-8">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center
                              font-rajdhani font-bold text-xl text-[#050d1a] leading-tight mb-4"
                   style={{ background: 'linear-gradient(135deg,#0096ff,#00c3ff)', boxShadow: '0 0 30px rgba(0,150,255,0.5)' }}>
                PM<br/>SP
              </div>
              <h1 className="font-rajdhani font-bold text-2xl text-white tracking-[0.25em]">SIGPOL</h1>
              <p className="text-[10px] text-[var(--text2)] tracking-[0.2em] uppercase mt-1">
                Sistema Integrado de Gestão Policial
              </p>
              <p className="text-[9px] text-[var(--text3)] tracking-widest mt-0.5">PMESP · ACESSO RESTRITO</p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="label">Login / RG PM</label>
                <input
                  {...register('login', { required: 'Obrigatório' })}
                  className="input font-mono"
                  placeholder="seu.login"
                  autoComplete="username"
                />
                {errors.login && <p className="text-red-400 text-[10px] mt-1">{errors.login.message}</p>}
              </div>

              <div>
                <label className="label">Senha</label>
                <input
                  {...register('senha', { required: 'Obrigatório', minLength: { value: 6, message: 'Mínimo 6 caracteres' } })}
                  type="password"
                  className="input"
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
                {errors.senha && <p className="text-red-400 text-[10px] mt-1">{errors.senha.message}</p>}
              </div>

              {erro && (
                <div className="px-3 py-2.5 bg-red-500/10 border border-red-500/30 rounded-md
                                text-red-400 text-xs">
                  {erro}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary w-full justify-center py-2.5 mt-2"
              >
                {loading ? <Spinner size="sm" /> : '→ ACESSAR SISTEMA'}
              </button>
            </form>

            <div className="mt-6 flex items-center justify-center gap-2 text-[10px] text-[var(--text3)]">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 shadow-[0_0_4px_#00e676]" />
              TLS 1.3 · ACESSO REGISTRADO
            </div>
          </div>
        </div>

        <p className="text-center text-[9px] text-[var(--text3)] tracking-widest mt-4 uppercase">
          Uso exclusivo PMESP · Acesso não autorizado é crime
        </p>
      </div>
    </div>
  )
}
