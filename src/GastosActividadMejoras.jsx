import { useEffect } from 'react'
import { supabaseCampeonato } from './lib/supabaseCampeonato'

export default function GastosActividadMejoras({ codigo }) {
  useEffect(() => {
    function mejorar() {
      document.querySelectorAll('.gastos-campeonato .config-actividad').forEach((form) => {
        const cabecera = form.querySelector(':scope > header')
        const codigoEl = cabecera?.querySelector('span')
        const codigoActividad = codigoEl?.textContent?.trim() || ''
        if (codigoActividad.startsWith('ACT-')) codigoEl.textContent = 'OTRA ACTIVIDAD'
        if (!codigoActividad.startsWith('ACT-') || cabecera?.querySelector('.boton-borrar-actividad')) return
        const boton = document.createElement('button')
        boton.type = 'button'
        boton.className = 'boton-borrar-actividad'
        boton.textContent = 'Eliminar actividad'
        boton.addEventListener('click', async () => {
          const nombre = form.querySelector('input[name="nombre"]')?.value || 'esta actividad'
          if (!window.confirm(`¿Eliminar “${nombre}”?`)) return
          boton.disabled = true
          boton.textContent = 'Eliminando…'
          const id = form.querySelector('button[type="submit"]')?.dataset?.actividadId
          let idActividad = id
          if (!idActividad) {
            const { data } = await supabaseCampeonato.rpc('admin_obtener_economia', { p_codigo: codigo })
            idActividad = data?.actividades?.find(a => a.codigo === codigoActividad)?.id_actividad
          }
          if (!idActividad) { alert('No se pudo identificar la actividad.'); boton.disabled=false; boton.textContent='Eliminar actividad'; return }
          const { data, error } = await supabaseCampeonato.rpc('admin_economia_eliminar_actividad', { p_codigo: codigo, p_id_actividad: idActividad })
          if (error || !data?.ok) { alert(error?.message || data?.error || 'No se pudo eliminar la actividad.'); boton.disabled=false; boton.textContent='Eliminar actividad'; return }
          form.remove()
        })
        cabecera?.appendChild(boton)
      })
    }
    mejorar()
    const obs = new MutationObserver(mejorar)
    obs.observe(document.body, { childList: true, subtree: true })
    return () => obs.disconnect()
  }, [codigo])
  return null
}
