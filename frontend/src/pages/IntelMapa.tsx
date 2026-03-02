// src/pages/IntelMapa.tsx
import { useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { inteligenciaService } from '@/services/api'
import { PageHeader, Spinner } from '@/components/ui'
import L from 'leaflet'

export default function IntelMapa() {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['heatmap'],
    queryFn: () => inteligenciaService.heatmap({ dias: 30 }).then(r => r.data),
    refetchInterval: 120_000,
  })

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return
    const map = L.map(mapRef.current, {
      center: [-23.55, -46.63],
      zoom: 12,
      zoomControl: true,
    })
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
      opacity: 0.4,
    }).addTo(map)
    mapInstanceRef.current = map
    return () => { map.remove(); mapInstanceRef.current = null }
  }, [])

  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map || !data?.pontos?.length) return

    // Limpa marcadores anteriores
    map.eachLayer(l => { if (l instanceof L.CircleMarker) map.removeLayer(l) })

    const colors: Record<string, string> = {
      P1: '#ff3b3b', P2: '#f5a623', P3: '#0096ff', P4: '#7aaacf',
    }

    data.pontos.forEach((p: { lat: number; lng: number; prioridade: string; natureza: string; peso: number }) => {
      L.circleMarker([p.lat, p.lng], {
        radius: Math.min(14, 4 + p.peso * 1.5),
        fillColor: colors[p.prioridade] ?? '#0096ff',
        fillOpacity: 0.7,
        color: 'transparent',
      })
        .bindPopup(`<b>${p.natureza}</b><br>${p.peso} ocorrência(s) · ${p.prioridade}`)
        .addTo(map)
    })
  }, [data])

  return (
    <div>
      <PageHeader title="MAPA" accent="OPERACIONAL"
                  subtitle="Distribuição geoespacial de ocorrências · 30 dias">
        <div className="flex gap-2 items-center">
          {[
            { label: 'P1', col: 'bg-red-500' },
            { label: 'P2', col: 'bg-amber-400' },
            { label: 'P3', col: 'bg-blue-500' },
          ].map(l => (
            <span key={l.label} className="flex items-center gap-1.5 text-[11px] text-[var(--text2)]">
              <span className={`w-2.5 h-2.5 rounded-full ${l.col}`} />
              {l.label}
            </span>
          ))}
          <span className="ml-2 text-[11px] text-[var(--text3)]">
            {isLoading ? '...' : `${data?.pontos?.length ?? 0} pontos`}
          </span>
        </div>
      </PageHeader>

      <div className="panel overflow-hidden">
        {isLoading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-[rgba(5,13,26,0.8)]">
            <Spinner />
          </div>
        )}
        <div ref={mapRef} style={{ height: '70vh', width: '100%', position: 'relative', zIndex: 0 }} />
      </div>

      <div className="mt-3 text-[10px] text-[var(--text3)] text-right tracking-widest">
        {data && `${data.total} pontos · período: ${data.periodo_dias} dias`}
      </div>
    </div>
  )
}
