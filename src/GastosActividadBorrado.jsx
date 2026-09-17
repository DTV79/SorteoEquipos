import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { supabaseCampeonato } from './lib/supabaseCampeonato'

function numero(valor) {
  const n = Number(valor)
  return Number.isFinite(n) ? n : 0
}

export default function GastosActividadBorrado({ codigo, onCambio }) {
  const [destinos, setDestinos] = useState([])
  const [confirmacion, setConfirmacion] = useState(null)
  const [eliminando, setEliminando] = useState(false)
  const [errorBorrado, setErrorBorrado] = useState('')
  const [aviso, setAviso] = useState(null)
  const altaEnCurso = useRef(false)

  const localizar = useCallback(() => {
    const encontrados = [...document.querySelectorAll('.gastos-campeonato .config-actividad')]
      .map((form) => {
        const header = form.querySelector(':scope > header')
        const codigoActividad = header?.querySelector('span')?.textContent?.trim() || ''
        if (!header || !codigoActividad.startsWith('ACT-')) return null
        const nombre = form.querySelector('input[name="nombre"]')?.value?.trim() || 'esta actividad'
        return { header, form, codigoActividad, nombre }
      })
      .filter(Boolean)
    setDestinos(encontrados)
  }, [])

  const volverAConfiguracion = useCallback(() => {
    ;[120, 350, 700].forEach((espera) => {
      window.setTimeout(() => {
        const boton = [...document.querySelectorAll('.gastos-pestanas button')]
          .find((item) => item.textContent?.includes('Configuración'))
        if (boton && !boton.classList.contains('activo')) boton.click()
        window.setTimeout(localizar, 40)
      }, espera)
    })
  }, [localizar])

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

    const alEnviar = async (evento) => {
      const form = evento.target.closest?.('.gastos-campeonato form.nueva-actividad')
      if (!form) return

      evento.preventDefault()
      evento.stopPropagation()
      evento.stopImmediatePropagation()
      if (altaEnCurso.current) return

      const formulario = new FormData(form)
      const nombre = String(formulario.get('nombre') || '').trim()
      if (!nombre) {
        setAviso({ tipo: 'error', texto: 'Indica el nombre de la actividad.' })
        return
      }

      altaEnCurso.current = true
      const boton = form.querySelector('button[type="submit"]')
      const textoOriginal = boton?.textContent || 'Añadir actividad'
      if (boton) {
        boton.disabled = true
        boton.textContent = 'Añadiendo…'
      }
      setAviso(null)

      const { data, error } = await supabaseCampeonato.rpc('admin_economia_guardar_actividad', {
        p_codigo: codigo,
        p_id_actividad: null,
        p_nombre: nombre,
        p_tipo: formulario.get('tipo') || 'otro',
        p_fecha: formulario.get('fecha') || null,
        p_cobrable: formulario.has('cobrable'),
        p_precio_persona: numero(formulario.get('precio_persona')),
        p_activo: formulario.has('activo'),
        p_orden: numero(formulario.get('orden')) || 100,
      })

      altaEnCurso.current = false
      if (boton) {
        boton.disabled = false
        boton.textContent = textoOriginal
      }

      if (error || data?.ok !== true) {
        setAviso({
          tipo: 'error',
          texto: error?.message || data?.error || 'No se pudo añadir la actividad.',
        })
        return
      }

      form.reset()
      setAviso({ tipo: 'correcto', texto: `Actividad “${nombre}” añadida.` })
      onCambio?.()
      volverAConfiguracion()
    }

    document.addEventListener('click', alPulsar)
    document.addEventListener('submit', alEnviar, true)
    return () => {
      document.removeEventListener('click', alPulsar)
      document.removeEventListener('submit', alEnviar, true)
    }
  }, [codigo, localizar, onCambio, volverAConfiguracion])

  function pedirBorrado(item) {
    setErrorBorrado('')
    setConfirmacion(item)
  }

  async function confirmarBorrado() {
    if (!confirmacion || eliminando) return
    setEliminando(true)
    setErrorBorrado('')

    const { data: economia, error: errorEconomia } = await supabaseCampeonato.rpc(
      'admin_obtener_economia',
      { p_codigo: codigo }
    )
    if (errorEconomia || economia?.ok !== true) {
      setErrorBorrado(errorEconomia?.message || economia?.error || 'No se pudo comprobar la actividad.')
      setEliminando(false)
      return
    }

    const actividad = economia.actividades?.find((a) => a.codigo === confirmacion.codigoActividad)
    if (!actividad?.id_actividad) {
      setErrorBorrado('No se pudo identificar la actividad.')
      setEliminando(false)
      return
    }

    const { data, error } = await supabaseCampeonato.rpc('admin_economia_eliminar_actividad', {
      p_codigo: codigo,
      p_id_actividad: actividad.id_actividad,
    })

    if (error || data?.ok !== true) {
      setErrorBorrado(error?.message || data?.error || 'No se pudo eliminar la actividad.')
      setEliminando(false)
      return
    }

    const nombre = confirmacion.nombre
    setConfirmacion(null)
    setEliminando(false)
    setAviso({ tipo: 'correcto', texto: `Actividad “${nombre}” eliminada.` })
    onCambio?.()
    volverAConfiguracion()
  }

  return <>
    {destinos.map((item) => createPortal(
      <button
        key={item.codigoActividad}
        type="button"
        className="boton-borrar-actividad"
        onClick={() => pedirBorrado(item)}
      >
        Eliminar actividad
      </button>,
      item.header
    ))}

    {confirmacion && createPortal(
      <div className="economia-modal-fondo" role="presentation" onMouseDown={(evento) => {
        if (evento.target === evento.currentTarget && !eliminando) setConfirmacion(null)
      }}>
        <section className="economia-modal-confirmacion" role="dialog" aria-modal="true" aria-labelledby="titulo-eliminar-actividad">
          <div className="economia-modal-icono">🗑️</div>
          <h3 id="titulo-eliminar-actividad">Eliminar actividad</h3>
          <p>Vas a eliminar <strong>“{confirmacion.nombre}”</strong>.</p>
          <p className="economia-modal-ayuda">Si ya tiene asistentes, cobros o gastos asociados, se conservará y te indicaremos que la desactives en su lugar.</p>
          {errorBorrado && <p className="economia-modal-error">{errorBorrado}</p>}
          <div className="economia-modal-acciones">
            <button type="button" className="economia-modal-cancelar" disabled={eliminando} onClick={() => setConfirmacion(null)}>Cancelar</button>
            <button type="button" className="economia-modal-eliminar" disabled={eliminando} onClick={confirmarBorrado}>{eliminando ? 'Eliminando…' : 'Sí, eliminar'}</button>
          </div>
        </section>
      </div>,
      document.body
    )}

    {aviso && createPortal(
      <div className={`economia-aviso-flotante ${aviso.tipo}`}>
        <span>{aviso.texto}</span>
        <button type="button" onClick={() => setAviso(null)} aria-label="Cerrar">×</button>
      </div>,
      document.body
    )}
  </>
}
