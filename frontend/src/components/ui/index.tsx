// src/components/ui/index.tsx
import React from 'react'

// ── Spinner ─────────────────────────────────────────────────
export const Spinner = ({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) => {
  const s = { sm: 'w-4 h-4', md: 'w-8 h-8', lg: 'w-12 h-12' }[size]
  return (
    <div className={`${s} border-2 border-[var(--border)] border-t-[var(--blue)] rounded-full animate-spin`} />
  )
}

// ── Empty state ──────────────────────────────────────────────
export const Empty = ({ label = 'Nenhum registro encontrado' }: { label?: string }) => (
  <div className="flex flex-col items-center justify-center py-16 text-[var(--text3)]">
    <span className="text-4xl mb-3 opacity-30">◫</span>
    <p className="text-sm tracking-widest uppercase">{label}</p>
  </div>
)

// ── KPI Card ─────────────────────────────────────────────────
interface KpiProps {
  icon: string
  value: string | number
  label: string
  sub?: string
  accentColor?: string
  trend?: 'up' | 'down' | 'neutral'
}
export const KpiCard = ({ icon, value, label, sub, accentColor = 'var(--blue)', trend }: KpiProps) => (
  <div
    className="panel p-5 relative overflow-hidden cursor-default
               transition-all duration-200 hover:-translate-y-0.5 hover:border-[rgba(0,150,255,0.3)]
               animate-fade-up"
    style={{ '--accent': accentColor } as React.CSSProperties}
  >
    <div
      className="absolute top-0 left-0 right-0 h-0.5"
      style={{ background: accentColor, boxShadow: `0 0 10px ${accentColor}` }}
    />
    <div className="text-3xl mb-3 opacity-90">{icon}</div>
    <div className="font-rajdhani text-4xl font-bold text-white leading-none mb-1">{value}</div>
    <div className="text-[11px] text-[var(--text2)] uppercase tracking-widest mb-2">{label}</div>
    {sub && (
      <div className={`text-[11px] font-mono ${
        trend === 'up' ? 'text-green-400' : trend === 'down' ? 'text-red-400' : 'text-[var(--text3)]'
      }`}>{sub}</div>
    )}
  </div>
)

// ── Alert banner ─────────────────────────────────────────────
export const AlertBanner = ({ message, onView }: { message: string; onView?: () => void }) => (
  <div className="flex items-center gap-3 px-4 py-2.5 mb-5
                  bg-red-500/10 border border-red-500/30 border-l-4 border-l-red-500 rounded-lg
                  animate-pulse-slow">
    <span className="bg-red-500 text-white text-[9px] font-bold px-2 py-0.5 rounded tracking-widest shrink-0">
      ALERTA
    </span>
    <span className="text-sm text-[var(--text)] flex-1">{message}</span>
    {onView && (
      <button className="btn btn-outline text-[10px] py-1 px-2.5 shrink-0" onClick={onView}>
        Ver
      </button>
    )}
  </div>
)

// ── Page header ──────────────────────────────────────────────
export const PageHeader = ({
  title, accent, subtitle, children,
}: {
  title: string; accent?: string; subtitle?: string; children?: React.ReactNode
}) => (
  <div className="flex items-start justify-between mb-6">
    <div>
      <h1 className="font-rajdhani text-2xl font-bold text-white tracking-[0.15em] uppercase">
        {title} {accent && <span className="text-[var(--blue2)]">{accent}</span>}
      </h1>
      {subtitle && <p className="text-[11px] text-[var(--text2)] tracking-widest mt-0.5">{subtitle}</p>}
    </div>
    {children && <div className="flex gap-2 items-center">{children}</div>}
  </div>
)

// ── Stat block ───────────────────────────────────────────────
export const StatBlock = ({
  value, label, color = 'text-white',
}: {
  value: string | number; label: string; color?: string
}) => (
  <div className="bg-[var(--navy3)] border border-[rgba(0,150,255,0.08)] rounded-lg p-4 text-center">
    <div className={`font-rajdhani text-3xl font-bold leading-none mb-1 ${color}`}>{value}</div>
    <div className="text-[10px] text-[var(--text3)] uppercase tracking-[0.2em]">{label}</div>
  </div>
)

// ── Progress bar ─────────────────────────────────────────────
export const ProgressBar = ({ label, value, max, color = 'var(--blue)' }: {
  label: string; value: number; max: number; color?: string
}) => {
  const pct = Math.min(100, Math.round((value / max) * 100))
  return (
    <div className="mb-2.5">
      <div className="flex justify-between text-[11px] text-[var(--text2)] mb-1.5">
        <span>{label}</span>
        <span style={{ color }}>{value}</span>
      </div>
      <div className="h-1 bg-[var(--navy3)] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-1000"
          style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${color}, ${color}88)`, boxShadow: `0 0 6px ${color}66` }}
        />
      </div>
    </div>
  )
}

// ── Modal ────────────────────────────────────────────────────
export const Modal = ({
  open, onClose, title, children, size = 'md',
}: {
  open: boolean; onClose: () => void; title: string
  children: React.ReactNode; size?: 'sm' | 'md' | 'lg' | 'xl'
}) => {
  if (!open) return null
  const widths = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' }
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(5,13,26,0.85)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className={`panel w-full ${widths[size]} animate-fade-up`}>
        <div className="panel-header">
          <span className="panel-title"><span className="dot" /> {title}</span>
          <button
            onClick={onClose}
            className="text-[var(--text3)] hover:text-[var(--text)] transition-colors text-lg leading-none"
          >×</button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

// ── Input/Select/Textarea wrappers ────────────────────────────
export const Field = ({
  label, error, children,
}: {
  label: string; error?: string; children: React.ReactNode
}) => (
  <div>
    <label className="label">{label}</label>
    {children}
    {error && <p className="text-red-400 text-[10px] mt-1">{error}</p>}
  </div>
)
