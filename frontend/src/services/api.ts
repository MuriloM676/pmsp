// src/services/api.ts
import axios from 'axios'

const api = axios.create({
  baseURL: '/api/v1',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
})

// Injeta token em todas as requisições
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('sigpol_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Renova token automaticamente se expirado
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config
    if (err.response?.status === 401 && !original._retry) {
      original._retry = true
      const refresh = localStorage.getItem('sigpol_refresh')
      if (refresh) {
        try {
          const { data } = await axios.post('/api/v1/auth/refresh', { refresh_token: refresh })
          localStorage.setItem('sigpol_token', data.token)
          original.headers.Authorization = `Bearer ${data.token}`
          return api(original)
        } catch {
          localStorage.clear()
          window.location.href = '/login'
        }
      } else {
        localStorage.clear()
        window.location.href = '/login'
      }
    }
    return Promise.reject(err)
  }
)

export default api

// ── Helpers por domínio ──────────────────────────────────────

export const authService = {
  login: (login: string, senha: string) =>
    api.post('/auth/login', { login, senha }),
  me: () => api.get('/auth/me'),
}

export const ocorrenciasService = {
  dashboard: () => api.get('/ocorrencias/dashboard'),
  listar: (params?: Record<string, unknown>) =>
    api.get('/ocorrencias', { params }),
  buscar: (id: string) => api.get(`/ocorrencias/${id}`),
  criar: (data: Record<string, unknown>) => api.post('/ocorrencias', data),
  atualizarStatus: (id: string, status: string, detalhes?: string) =>
    api.patch(`/ocorrencias/${id}/status`, { status, detalhes }),
}

export const policiaisService = {
  listar: (params?: Record<string, unknown>) =>
    api.get('/policiais', { params }),
  efeitoHoje: () => api.get('/policiais/efetivo-hoje'),
  buscar: (id: string) => api.get(`/policiais/${id}`),
  criar: (data: Record<string, unknown>) => api.post('/policiais', data),
  atualizar: (id: string, data: Record<string, unknown>) =>
    api.put(`/policiais/${id}`, data),
  listarEscalas: (params?: Record<string, unknown>) =>
    api.get('/escalas', { params }),
  criarEscala: (data: Record<string, unknown>) => api.post('/escalas', data),
}

export const viaturasService = {
  listar: (params?: Record<string, unknown>) =>
    api.get('/viaturas', { params }),
  buscar: (id: string) => api.get(`/viaturas/${id}`),
  atualizarStatus: (id: string, status: string) =>
    api.patch(`/viaturas/${id}/status`, { status }),
  listarManutencoes: (params?: Record<string, unknown>) =>
    api.get('/manutencoes', { params }),
  criarManutencao: (data: Record<string, unknown>) =>
    api.post('/manutencoes', data),
  concluirManutencao: (id: string, data: Record<string, unknown>) =>
    api.patch(`/manutencoes/${id}/concluir`, data),
}

export const inteligenciaService = {
  heatmap: (params?: Record<string, unknown>) =>
    api.get('/inteligencia/heatmap', { params }),
  estatisticas: (params?: Record<string, unknown>) =>
    api.get('/inteligencia/estatisticas', { params }),
  tendencias: () => api.get('/inteligencia/tendencias'),
}

export const auditoriaService = {
  listar: () => api.get('/auditoria'),
}
