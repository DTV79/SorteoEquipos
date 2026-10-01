import { useEffect, useMemo, useState } from 'react'
import { solicitudesAltaTeams } from './teamsApi'
import './TeamsAccessRequestsAlert.css'

export default function TeamsAccessRequestsAlert({ onAbrirTeams }) {
  const [solicitudes, setSolicitudes] = useState([])

  useEffect(() => {
    let activo = true
    let intervalo

    async function cargar() {
      try {
        const data = await solicitudesAltaTeams()
        if (activo) {
          setSolicitudes(Array.isArray(data) ? data : [])
        }
      } catch {
        // El aviso no debe bloquear el panel principal.
      }
    }

    cargar()
    intervalo = window.setInterval(cargar, 15000)

    const refrescarAlVolver = () => {
      if (!document.hidden) cargar()
    }

    document.addEventListener('visibilitychange', refrescarAlVolver)
    window.addEventListener('focus', cargar)

    return () => {
      activo = false
      if (intervalo) window.clearInterval(intervalo)
      document.removeEventListener('visibilitychange', refrescarAlVolver)
      window.removeEventListener('focus', cargar)
    }
  }, [])

  const resumen = useMemo(() => {
    if (!solicitudes.length) return ''

    const nombres = solicitudes
      .slice(0, 2)
      .map(s => s.alias || s.nombre_oficial)
      .filter(Boolean)

    const restantes = solicitudes.length - nombres.length

    return [
      nombres.join(' · '),
      restantes > 0 ? `+${restantes} más` : '',
    ].filter(Boolean).join(' · ')
  }, [solicitudes])

  if (!solicitudes.length) return null

  return (
    <button
      type="button"
      className="teams-access-alert"
      onClick={onAbrirTeams}
      aria-label={`${solicitudes.length} solicitudes de acceso a Mi Zona pendientes. Abrir Teams.`}
    >
      <span className="teams-access-alert-icono">🔐</span>

      <span className="teams-access-alert-texto">
        <strong>
          {solicitudes.length === 1
            ? '1 solicitud de acceso a Mi Zona'
            : `${solicitudes.length} solicitudes de acceso a Mi Zona`}
        </strong>
        <small>{resumen}</small>
      </span>

      <span className="teams-access-alert-accion">
        Revisar en Teams →
      </span>

      <span className="teams-access-alert-contador" aria-hidden="true">
        {solicitudes.length}
      </span>
    </button>
  )
}
