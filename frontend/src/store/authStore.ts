// src/store/authStore.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Usuario } from '@/types'

interface AuthState {
  usuario: Usuario | null
  token: string | null
  isAuthenticated: boolean
  setAuth: (usuario: Usuario, token: string) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      usuario: null,
      token: null,
      isAuthenticated: false,

      setAuth: (usuario, token) => {
        localStorage.setItem('sigpol_token', token)
        set({ usuario, token, isAuthenticated: true })
      },

      logout: () => {
        localStorage.removeItem('sigpol_token')
        set({ usuario: null, token: null, isAuthenticated: false })
      },
    }),
    { name: 'sigpol_auth', partialize: (s) => ({ usuario: s.usuario, token: s.token, isAuthenticated: s.isAuthenticated }) }
  )
)
