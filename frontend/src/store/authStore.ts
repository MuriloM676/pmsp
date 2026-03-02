// src/store/authStore.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Usuario } from '@/types'

interface AuthState {
  usuario: Usuario | null
  token: string | null
  isAuthenticated: boolean
  setAuth: (usuario: Usuario, token: string, refresh: string) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      usuario: null,
      token: null,
      isAuthenticated: false,

      setAuth: (usuario, token, refresh) => {
        localStorage.setItem('sigpol_token', token)
        localStorage.setItem('sigpol_refresh', refresh)
        set({ usuario, token, isAuthenticated: true })
      },

      logout: () => {
        localStorage.removeItem('sigpol_token')
        localStorage.removeItem('sigpol_refresh')
        set({ usuario: null, token: null, isAuthenticated: false })
      },
    }),
    { name: 'sigpol_auth', partialize: (s) => ({ usuario: s.usuario, token: s.token, isAuthenticated: s.isAuthenticated }) }
  )
)
