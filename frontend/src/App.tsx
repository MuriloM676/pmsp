// src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import { temPermissao } from '@/utils'
import AppLayout from '@/components/layout/AppLayout'
import Login from '@/pages/Login'
import Dashboard from '@/pages/Dashboard'
import Ocorrencias from '@/pages/Ocorrencias'
import OcorrenciaDetalhe from '@/pages/OcorrenciaDetalhe'
import NovaOcorrencia from '@/pages/NovaOcorrencia'
import Viaturas from '@/pages/Viaturas'
import Policiais from '@/pages/Policiais'
import Escalas from '@/pages/Escalas'
import Manutencoes from '@/pages/Manutencoes'
import IntelMapa from '@/pages/IntelMapa'
import IntelStats from '@/pages/IntelStats'
import Auditoria from '@/pages/Auditoria'
import Configuracoes from '@/pages/Configuracoes'

const qc = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 10_000, retry: 1 },
  },
})

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore()
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />
}

/** Protege rotas que exigem perfil mínimo — redireciona para / se insuficiente */
function RoleRoute({ children, minPerfil }: { children: React.ReactNode; minPerfil: string }) {
  const { usuario } = useAuthStore()
  if (!usuario || !temPermissao(usuario.perfil, minPerfil)) {
    return <Navigate to="/" replace />
  }
  return <>{children}</>
}

function App() {
  return (
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/*" element={
            <PrivateRoute>
              <AppLayout>
                <Routes>
                  <Route path="/"                       element={<Dashboard />} />
                  <Route path="/ocorrencias"             element={<Ocorrencias />} />
                  <Route path="/ocorrencias/novo"        element={<NovaOcorrencia />} />
                  <Route path="/ocorrencias/:id"         element={<OcorrenciaDetalhe />} />
                  <Route path="/viaturas"                element={<RoleRoute minPerfil="Supervisor"><Viaturas /></RoleRoute>} />
                  <Route path="/policiais"               element={<RoleRoute minPerfil="Supervisor"><Policiais /></RoleRoute>} />
                  <Route path="/escalas"                 element={<RoleRoute minPerfil="Supervisor"><Escalas /></RoleRoute>} />
                  <Route path="/manutencoes"             element={<RoleRoute minPerfil="Supervisor"><Manutencoes /></RoleRoute>} />
                  <Route path="/inteligencia/mapa"       element={<RoleRoute minPerfil="Supervisor"><IntelMapa /></RoleRoute>} />
                  <Route path="/inteligencia/stats"      element={<RoleRoute minPerfil="Supervisor"><IntelStats /></RoleRoute>} />
                  <Route path="/auditoria"               element={<RoleRoute minPerfil="Administrador"><Auditoria /></RoleRoute>} />
                  <Route path="/configuracoes"           element={<RoleRoute minPerfil="Administrador"><Configuracoes /></RoleRoute>} />
                  <Route path="*" element={
                    <div className="flex flex-col items-center justify-center py-20">
                      <div className="font-rajdhani text-6xl text-[var(--text3)] font-bold">404</div>
                      <div className="text-[var(--text2)] mt-2 tracking-widest">PÁGINA NÃO ENCONTRADA</div>
                    </div>
                  } />
                </Routes>
              </AppLayout>
            </PrivateRoute>
          } />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
