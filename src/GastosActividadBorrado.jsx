import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { supabaseCampeonato } from './lib/supabaseCampeonato'

export default function GastosActividadBorrado({ codigo }) {
  const [destinos, setDestinos] = useState([])
  const [eliminando, setEliminando] = useState(null)

  const localizar = useCallback(() => {
    const encontrados = [...document.querySelectorAll('.gastos-campeonato .config-actividad')]
      .map((form) => {
        const header = form.querySelector(':scope > header')
        const codigoActividad = header?.querySelector('span')?.textContent?.trim() || ''
        const botonGuardar = form.querySelector('button[type="submit"]')
        if (!header || !codigoActividad.startsWith('ACT-')) return null
        return { header, form, codigoActividad, botonGuardar }
      })
      .filter(Boolean)
    setDestinos(encontrados)
  }, [])

  useEffect(() => {
    localizar()
    const alPulsar = (evento) => {
      const boton = evento.target.closest('.gastos-pestanas button')
      if (!boton) return
      if (boton.textContent?.includes('Configuración')) {
        window.setTimeout(localizar, 0)
        window.setTimeout(localizar, 80)
      } else {
        setDestinos([])
      }
    }
    document.addEventListener('click', alPulsar)
    return () => document.removeEventListener('click', alPulsar)
  }, [localizar])

  async function eliminar(item) {
    const nombre = item.form.querySelector('input[name="nombre"]')?.value?.trim() || 'esta actividad'
    if (!window.confirm(`¿Eliminar “${nombre}”?`)) return

    setEliminando(item.codigoActividad)
    const { data: economia, error: errorEconomia } = await supabaseCampeonato.rpc(
      'admin_obtener_economia',
      { p_codigo: codigo }
    )
    if (errorEconomia || economia?.ok !== true) {
      alert(errorEconomia?.message || economia?.error || 'No se pudo comprobar la actividad.')
      setEliminando(null)
      return
    }

    const actividad = economia.actividades?.find((a) => a.codigo === item.codigoActividad)
    if (!actividad?.id_actividad) {
      alert('No se pudo identificar la actividad.')
      setEliminando(null)
      return
    }

    const { data, error } = await supabaseCampeonato.rpc('admin_economia_eliminar_actividad', {
      p_codigo: codigo,
      p_id_actividad: actividad.id_actividad,
    })

    if (error || data?.ok !== true) {
      alert(error?.message || data?.error || 'No se pudo eliminar la actividad.')
      setEliminando(null)
      return
    }

    item.form.remove()
    setDestinos((actual) => actual.filter((x) => x.codigoActividad !== item.codigoActividad))
    setEliminando(null)
  }

  return destinos.map((item) => createPortal(
    <button
      key={item.codigoActividad}
      type="button"
      className="boton-borrar-actividad"
      disabled={eliminando === item.codigoActividad}
      onClick={() => eliminar(item)}
    >
      {eliminando === item.codigoActividad ? 'Eliminando…' : 'Eliminar actividad'}
    </button>,
    item.header
  ))
}
