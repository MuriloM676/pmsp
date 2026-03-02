// src/components/layout/AppLayout.tsx
import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { temPermissao } from '@/utils'

const navItems = [
  { section: 'Principal', items: [
    { icon: '📊', label: 'Dashboard',    path: '/',               min: 'Operador' },
    { icon: '🚨', label: 'Ocorrências',  path: '/ocorrencias',    min: 'Operador',  badge: 'ocorrencias' },
    { icon: '📋', label: 'Registrar BO', path: '/ocorrencias/novo', min: 'Operador' },
  ]},
  { section: 'Efetivo', items: [
    { icon: '👮', label: 'Policiais',    path: '/policiais',       min: 'Supervisor' },
    { icon: '📅', label: 'Escalas',      path: '/escalas',         min: 'Supervisor' },
  ]},
  { section: 'Frota', items: [
    { icon: '🚓', label: 'Viaturas',     path: '/viaturas',        min: 'Operador' },
    { icon: '🔧', label: 'Manutenção',   path: '/manutencoes',     min: 'Supervisor' },
  ]},
  { section: 'Inteligência', items: [
    { icon: '🗺️', label: 'Mapa de Crimes', path: '/inteligencia/mapa',   min: 'Supervisor' },
    { icon: '📈', label: 'Estatísticas',   path: '/inteligencia/stats',  min: 'Supervisor' },
  ]},
  { section: 'Sistema', items: [
    { icon: '🔒', label: 'Auditoria',    path: '/auditoria',       min: 'Administrador' },
    { icon: '⚙️', label: 'Configurações',path: '/configuracoes',   min: 'Administrador' },
  ]},
]

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [time, setTime]         = useState('')
  const [sidebarOpen, setSidebar] = useState(true)
  const { usuario, logout }     = useAuthStore()
  const location                = useLocation()
  const navigate                = useNavigate()

  useEffect(() => {
    const tick = () => {
      const n = new Date()
      setTime(`${String(n.getHours()).padStart(2,'0')}:${String(n.getMinutes()).padStart(2,'0')}:${String(n.getSeconds()).padStart(2,'0')}`)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  const handleLogout = () => { logout(); navigate('/login') }

  return (
    <div className="min-h-screen flex flex-col" style={{ fontFamily: "'Exo 2', sans-serif" }}>

      {/* ── SCANLINE TOP ── */}
      <div className="fixed top-0 left-0 right-0 h-0.5 z-50 pointer-events-none"
           style={{ background: 'linear-gradient(90deg,transparent,#0096ff,#00e5ff,#0096ff,transparent)',
                    animation: 'scan 3s ease-in-out infinite' }} />

      {/* ── HEADER ── */}
      <header className="fixed top-0 left-0 right-0 h-[60px] z-40 flex items-center justify-between px-5
                         bg-[rgba(5,13,26,0.97)] border-b border-[var(--border)] backdrop-blur-md">
        <div className="flex items-center gap-4">
          <button className="text-[var(--text3)] hover:text-[var(--blue2)] mr-1"
                  onClick={() => setSidebar(s => !s)}>☰</button>
          <div className="w-9 h-9 rounded-lg flex items-center justify-center text-[11px] font-rajdhani font-bold text-navy leading-tight"
               style={{ background: 'linear-gradient(135deg,#0096ff,#00c3ff)', boxShadow: '0 0 20px rgba(0,150,255,0.4)' }}>
            PM<br/>SP
          </div>
          <div>
            <div className="font-rajdhani font-bold text-white tracking-[0.2em] text-[17px] leading-none">SIGPOL</div>
            <div className="text-[9px] text-[var(--text2)] tracking-[0.15em] uppercase">Sistema Integrado de Gestão Policial</div>
          </div>
        </div>

        <div className="flex items-center gap-2 font-mono text-[11px] text-[var(--text2)]">
          <span className="w-2 h-2 rounded-full bg-green-400 shadow-[0_0_6px_#00e676] animate-pulse" />
          SISTEMA OPERACIONAL
        </div>

        <div className="flex items-center gap-4">
          <span className="font-mono text-[13px] text-[var(--cyan)] tracking-widest">{time}</span>
          <div className="flex items-center gap-2.5 px-3 py-1.5 bg-[var(--panel2)]
                          border border-[var(--border)] rounded-md cursor-pointer
                          hover:border-[var(--blue)] transition-colors"
               onClick={handleLogout} title="Sair">
            <div className="w-7 h-7 rounded-full bg-[#0d2340] border border-[var(--blue)]
                            flex items-center justify-center text-[11px] font-semibold text-[var(--blue2)]">
              {usuario?.nome_guerra?.slice(0,2).toUpperCase() ?? '??'}
            </div>
            <div className="leading-tight">
              <div className="text-[12px] font-semibold text-white">{usuario?.nome_guerra ?? '—'}</div>
              <div className="text-[9px] text-[var(--text2)] uppercase tracking-wider">{usuario?.perfil}</div>
            </div>
          </div>
        </div>
      </header>

      {/* ── SIDEBAR ── */}
      <nav className={`fixed top-[60px] left-0 bottom-0 z-30 overflow-y-auto py-4
                       bg-[rgba(9,21,37,0.98)] border-r border-[var(--border)]
                       transition-all duration-200 ${sidebarOpen ? 'w-[220px]' : 'w-0 opacity-0 pointer-events-none'}`}>
        {navItems.map(section => (
          <div key={section.section} className="mb-1">
            <div className="text-[9px] font-semibold tracking-[0.3em] uppercase text-[var(--text3)] px-5 py-2 mt-1">
              {section.section}
            </div>
            {section.items.map(item => {
              if (!usuario || !temPermissao(usuario.perfil, item.min)) return null
              const active = location.pathname === item.path ||
                (item.path !== '/' && location.pathname.startsWith(item.path))
              return (
                <Link key={item.path} to={item.path}
                  className={`flex items-center gap-3 px-5 py-2.5 text-[13px] font-medium
                              border-l-[3px] transition-all duration-150 relative
                              ${active
                                ? 'border-l-[var(--blue)] bg-[rgba(0,150,255,0.1)] text-[var(--blue2)]'
                                : 'border-l-transparent text-[var(--text2)] hover:bg-[rgba(0,150,255,0.05)] hover:text-[var(--text)]'}`}>
                  <span className="w-5 text-center text-base">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      {/* ── MAIN ── */}
      <main className={`flex-1 transition-all duration-200 ${sidebarOpen ? 'ml-[220px]' : 'ml-0'} mt-[60px]`}>
        <div className="relative z-10 p-6">
          {children}
        </div>
      </main>

      <style>{`
        @keyframes scan {
          0%,100% { opacity:0.4; transform:scaleX(0.5); }
          50% { opacity:1; transform:scaleX(1); }
        }
      `}</style>
    </div>
  )
}
