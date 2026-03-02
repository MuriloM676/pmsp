// src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
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
                  <Route path="/viaturas"                element={<Viaturas />} />
                  <Route path="/policiais"               element={<Policiais />} />
                  <Route path="/escalas"                 element={<Escalas />} />
                  <Route path="/manutencoes"             element={<Manutencoes />} />
                  <Route path="/inteligencia/mapa"       element={<IntelMapa />} />
                  <Route path="/inteligencia/stats"      element={<IntelStats />} />
                  <Route path="/auditoria"               element={<Auditoria />} />
                  <Route path="/configuracoes"           element={<Configuracoes />} />
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
