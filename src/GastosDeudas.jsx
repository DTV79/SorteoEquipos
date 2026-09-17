import { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { supabaseCampeonato } from './lib/supabaseCampeonato'
import './GastosDeudas.css'

const numero = (v) => {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

const euros = (v) =>
  Number(v || 0).toLocaleString('es-ES', {
    style: 'currency',
    currency: 'EUR',
  })

function asistenciaDe(persona, idActividad) {
  return (
    persona.asistencias?.find(
      (a) => numero(a.id_actividad) === numero(idActividad)
    ) || null
  )
}

function repartirIgual(total, personas) {
  const ids = [...personas]
    .map((p) => numero(p.id_persona))
    .sort((a, b) => a - b)
  const resultado = new Map()
  if (!ids.length) return resultado

  const parte = Math.round((numero(total) / ids.length) * 100) / 100
  ids.forEach((id) => resultado.set(id, parte))
  return resultado
}

export default function GastosDeudas({ codigo }) {
  const [datos, setDatos] = useState(null)
  const [destinos, setDestinos] = useState([])
  const [hostMasivo, setHostMasivo] = useState(null)
  const [guardandoPago, setGuardandoPago] = useState('')

  const cargar = useCallback(async () => {
    const { data } = await supabaseCampeonato.rpc('admin_obtener_economia', {
      p_codigo: codigo,
    })
    if (data?.ok) {
      setDatos(data)
      return data
    }
    return null
  }, [codigo])

  const calcular = useCallback((data) => {
    if (!data?.ok) return { porPersona: new Map(), actividades: [] }

    const personas = (data.personas || []).filter((p) => p.activo)
    const actividades = [...(data.actividades || [])]
      .filter((a) => a.activo)
      .sort(
        (a, b) =>
          numero(a.orden) - numero(b.orden) ||
          numero(a.id_actividad) - numero(b.id_actividad)
      )
    const campeonato = actividades.find((a) => a.codigo === 'CAMPEONATO')
    const porPersona = new Map(
      personas.map((p) => [
        numero(p.id_persona),
        { total: 0, pagado: 0, pendiente: 0, actividades: new Map(), general: 0 },
      ])
    )

    personas.forEach((persona) => {
      const item = porPersona.get(numero(persona.id_persona))
      actividades.forEach((actividad) => {
        const asis = asistenciaDe(persona, actividad.id_actividad)
        item.actividades.set(numero(actividad.id_actividad), {
          cuota: 0,
          reparto: 0,
          total: 0,
          pagadoRegistrado: numero(asis?.pagado),
          pagado: 0,
          pendiente: 0,
          asis,
        })
      })
    })

    const gruposReparto = new Map()

    ;(data.movimientos || [])
      .filter((m) => m.tipo === 'gasto' && m.modo_reparto !== 'no_repartir')
      .forEach((mov) => {
        let elegibles = []
        if (mov.modo_reparto === 'jugadores') {
          elegibles = personas.filter((p) => p.tipo === 'jugador')
        } else if (mov.modo_reparto === 'actividad' && mov.id_actividad) {
          elegibles = personas.filter(
            (p) => asistenciaDe(p, mov.id_actividad)?.asiste
          )
        } else if (mov.modo_reparto === 'manual') {
          const ids = new Set((mov.reparto_personas || []).map(numero))
          elegibles = personas.filter((p) => ids.has(numero(p.id_persona)))
        }

        if (!elegibles.length) return

        const idActividad = numero(
          mov.id_actividad || campeonato?.id_actividad || 0
        )
        const ids = elegibles
          .map((p) => numero(p.id_persona))
          .sort((a, b) => a - b)
        const clave = `${idActividad}|${ids.join(',')}`
        const existente = gruposReparto.get(clave)

        if (existente) {
          existente.total += numero(mov.importe)
        } else {
          gruposReparto.set(clave, {
            idActividad,
            elegibles,
            total: numero(mov.importe),
          })
        }
      })

    gruposReparto.forEach(({ idActividad, elegibles, total }) => {
      const reparto = repartirIgual(total, elegibles)

      elegibles.forEach((persona) => {
        const id = numero(persona.id_persona)
        const parte = numero(reparto.get(id))
        const item = porPersona.get(id)
        if (!item || !parte) return

        if (idActividad && item.actividades.has(idActividad)) {
          const act = item.actividades.get(idActividad)
          act.reparto += parte
          act.total += parte
        } else {
          item.general += parte
        }
      })
    })

    personas.forEach((persona) => {
      const item = porPersona.get(numero(persona.id_persona))
      item.total = numero(item.general)
      item.pagado = 0

      item.actividades.forEach((act) => {
        const total = Math.max(numero(act.total), 0)
        const pagado = Math.min(Math.max(numero(act.pagadoRegistrado), 0), total)
        act.total = total
        act.pagado = pagado
        act.pendiente = Math.max(total - pagado, 0)
        item.total += total
        item.pagado += pagado
      })

      item.pendiente = Math.max(item.total - item.pagado, 0)
    })

    return { porPersona, actividades, personas }
  }, [])

  const calculo = useMemo(() => calcular(datos), [calcular, datos])

  const localizar = useCallback(async () => {
    const fresco = await cargar()
    if (!fresco) return

    const personasFrescas = (fresco.personas || []).filter((p) => p.activo)
    const actividadesFrescas = [...(fresco.actividades || [])]
      .filter((a) => a.activo)
      .sort(
        (a, b) =>
          numero(a.orden) - numero(b.orden) ||
          numero(a.id_actividad) - numero(b.id_actividad)
      )
    const campeonato = actividadesFrescas.find((a) => a.codigo === 'CAMPEONATO')

    if (campeonato) {
      const faltan = personasFrescas.filter(
        (p) =>
          p.tipo === 'jugador' &&
          !asistenciaDe(p, campeonato.id_actividad)?.asiste
      )
      if (faltan.length) {
        const filas = faltan.map((persona) => {
          const asis = asistenciaDe(persona, campeonato.id_actividad)
          return {
            id_persona: persona.id_persona,
            id_actividad: campeonato.id_actividad,
            asiste: true,
            importe: null,
            pagado: Math.max(numero(asis?.pagado), 0),
            menu: asis?.menu || '',
            observaciones: asis?.observaciones || '',
          }
        })
        await supabaseCampeonato.rpc('admin_economia_guardar_asistencias', {
          p_codigo: codigo,
          p_datos: filas,
        })
      }
    }

    window.setTimeout(() => {
      const bloqueAsistencia = [...document.querySelectorAll('.gastos-campeonato .bloque-economia')]
        .find((bloque) => bloque.querySelector('h3')?.textContent?.trim() === 'Asistencia y cobros')
      const textoAyuda = bloqueAsistencia?.querySelector('.titulo-bloque-economia p')
      if (textoAyuda) {
        textoAyuda.textContent = 'Campeonato queda marcado automáticamente para los jugadores. Usa los checks solo para cena, sorteo u otras actividades.'
      }

      let host = bloqueAsistencia?.querySelector(':scope > .host-asistencia-masiva')
      if (bloqueAsistencia && !host) {
        host = document.createElement('div')
        host.className = 'host-asistencia-masiva'
        const titulo = bloqueAsistencia.querySelector(':scope > .titulo-bloque-economia')
        titulo?.insertAdjacentElement('afterend', host)
      }
      setHostMasivo(host || null)

      const tarjetas = [
        ...document.querySelectorAll(
          '.gastos-campeonato .lista-personas-economia .persona-economia'
        ),
      ]
      const personas = personasFrescas
      const actividades = actividadesFrescas
      const nuevos = []

      tarjetas.forEach((tarjeta, i) => {
        const persona = personas[i]
        if (!persona) return

        const header = tarjeta.querySelector(':scope > header')
        let hostPersona = header?.querySelector(
          ':scope > .host-resumen-deuda-persona'
        )
        if (header && !hostPersona) {
          hostPersona = document.createElement('div')
          hostPersona.className = 'host-resumen-deuda-persona'
          header.appendChild(hostPersona)
        }

        const actividadesDom = [...tarjeta.querySelectorAll('.actividad-persona')]
        const hostsActividad = []

        actividadesDom.forEach((seccion, j) => {
          const actividad = actividades[j]
          if (!actividad) return

          seccion.classList.add('actividad-con-deuda')
          seccion.dataset.actividadCodigo = actividad.codigo || ''

          const checkbox = seccion.querySelector('.check-asistencia input[type="checkbox"]')
          if (
            checkbox &&
            persona.tipo === 'jugador' &&
            actividad.codigo === 'CAMPEONATO'
          ) {
            if (!checkbox.checked) checkbox.click()
            checkbox.disabled = true
            seccion.classList.add('actividad-campeonato-fija')
            const label = seccion.querySelector('.check-asistencia')
            if (label) label.title = 'Los jugadores inscritos participan automáticamente en el campeonato.'
          }

          let hostActividad = seccion.querySelector(':scope > .host-deuda-actividad')
          if (!hostActividad) {
            hostActividad = document.createElement('div')
            hostActividad.className = 'host-deuda-actividad'
            seccion.appendChild(hostActividad)
          }
          hostsActividad.push({ host: hostActividad, actividad, seccion })
        })

        nuevos.push({ persona, hostPersona, hostsActividad })
      })

      setDestinos(nuevos)
    }, 40)
  }, [cargar, codigo])

  useEffect(() => {
    const click = (e) => {
      const botonGuardar = e.target.closest(
        '.gastos-campeonato .titulo-bloque-economia .boton-principal'
      )
      if (botonGuardar && botonGuardar.textContent?.includes('Guardar')) {
        ;[250, 600, 1100].forEach((ms) =>
          window.setTimeout(() => localizar(), ms)
        )
        return
      }

      const tab = e.target.closest('.gastos-pestanas button')
      if (!tab) return

      if (tab.textContent?.includes('Asistencia y cobros')) {
        window.setTimeout(localizar, 0)
        window.setTimeout(localizar, 120)
      } else {
        setDestinos([])
        setHostMasivo(null)
      }
    }

    document.addEventListener('click', click)
    return () => document.removeEventListener('click', click)
  }, [localizar])

  function aplicarAsistenciaMasiva(marcar) {
    document
      .querySelectorAll('.gastos-campeonato .lista-personas-economia .persona-economia')
      .forEach((tarjeta) => {
        const tipo = tarjeta.querySelector(':scope > header span')?.textContent || ''
        if (!tipo.toLowerCase().includes('jugador')) return

        tarjeta.querySelectorAll('.actividad-persona').forEach((seccion) => {
          if (seccion.dataset.actividadCodigo === 'CAMPEONATO') return
          const checkbox = seccion.querySelector('.check-asistencia input[type="checkbox"]')
          if (!checkbox || checkbox.disabled) return
          if (Boolean(checkbox.checked) !== Boolean(marcar)) checkbox.click()
        })
      })
  }

  async function guardarPago(persona, actividad, seccion, importePagado, accion) {
    const clave = `${accion}-${persona.id_persona}-${actividad.id_actividad}`
    setGuardandoPago(clave)

    const asis = asistenciaDe(persona, actividad.id_actividad)
    const esCampeonatoJugador =
      persona.tipo === 'jugador' && actividad.codigo === 'CAMPEONATO'

    const checkbox = seccion?.querySelector('.check-asistencia input[type="checkbox"]')
    const campoMenu = seccion?.querySelector('.menu-persona input')
    const asisteActual = esCampeonatoJugador ||
      (checkbox ? Boolean(checkbox.checked) : Boolean(asis?.asiste))
    const menuActual = campoMenu ? campoMenu.value : (asis?.menu || '')

    const fila = {
      id_persona: persona.id_persona,
      id_actividad: actividad.id_actividad,
      asiste: asisteActual,
      importe: null,
      pagado: Math.max(numero(importePagado), 0),
      menu: menuActual,
      observaciones: asis?.observaciones || '',
    }

    const { data, error } = await supabaseCampeonato.rpc(
      'admin_economia_guardar_asistencias',
      { p_codigo: codigo, p_datos: [fila] }
    )

    setGuardandoPago('')
    if (error || data?.ok !== true) return
    await cargar()
  }

  if (!datos) return null

  return <>
    {hostMasivo && createPortal(
      <div className="asistencia-masiva">
        <div>
          <strong>Asistencia de jugadores</strong>
          <small>Campeonato está siempre marcado. Estos botones afectan a cena, sorteo y demás actividades.</small>
        </div>
        <div className="asistencia-masiva-botones">
          <button type="button" className="marcar" onClick={() => aplicarAsistenciaMasiva(true)}>
            ✓ Marcar todos
          </button>
          <button type="button" className="desmarcar" onClick={() => aplicarAsistenciaMasiva(false)}>
            Desmarcar todos
          </button>
        </div>
      </div>,
      hostMasivo
    )}

    {destinos.map(({ persona, hostPersona, hostsActividad }) => {
      const p = calculo.porPersona.get(numero(persona.id_persona)) || {
        total: 0,
        pagado: 0,
        pendiente: 0,
        actividades: new Map(),
      }

      return <span key={persona.id_persona}>
        {hostPersona && createPortal(
          <div className="resumen-deuda-persona">
            <span>Total <strong>{euros(p.total)}</strong></span>
            <span>Pagado <strong>{euros(p.pagado)}</strong></span>
            <span className={p.pendiente > 0 ? 'pendiente' : ''}>
              Pendiente <strong>{euros(p.pendiente)}</strong>
            </span>
          </div>,
          hostPersona
        )}

        {hostsActividad.map(({ host, actividad, seccion }) => {
          const d = p.actividades.get(numero(actividad.id_actividad)) || {
            cuota: 0,
            reparto: 0,
            total: 0,
            pagado: 0,
            pendiente: 0,
          }
          const clavePagar = `pagar-${persona.id_persona}-${actividad.id_actividad}`
          const claveAnular = `anular-${persona.id_persona}-${actividad.id_actividad}`
          const ocupado = guardandoPago === clavePagar || guardandoPago === claveAnular

          return createPortal(
            <div className="deuda-actividad-resumen" key={actividad.id_actividad}>
              <div className="deuda-actividad-datos">
                <span>
                  <small>Su parte de gastos</small>
                  <b>{euros(d.reparto)}</b>
                </span>
                <span className="total">
                  <small>Total</small>
                  <b>{euros(d.total)}</b>
                </span>
                <span className="pagado">
                  <small>Pagado</small>
                  <b>{euros(d.pagado)}</b>
                </span>
                <span className={d.pendiente > 0 ? 'pendiente' : 'sin-pendiente'}>
                  <small>Pendiente</small>
                  <b>{euros(d.pendiente)}</b>
                </span>
              </div>

              {(d.total > 0 || d.pagado > 0) && (
                <div className="deuda-actividad-acciones">
                  {d.pagado > 0 ? (
                    <button
                      type="button"
                      className="boton-anular-pago"
                      disabled={ocupado}
                      onClick={() =>
                        guardarPago(persona, actividad, seccion, 0, 'anular')
                      }
                    >
                      {guardandoPago === claveAnular ? 'Anulando…' : 'Anular pago'}
                    </button>
                  ) : d.pendiente > 0 ? (
                    <button
                      type="button"
                      className="boton-pagar-deuda"
                      disabled={ocupado}
                      onClick={() =>
                        guardarPago(persona, actividad, seccion, d.total, 'pagar')
                      }
                    >
                      {guardandoPago === clavePagar ? 'Guardando…' : 'Pagar'}
                    </button>
                  ) : null}
                </div>
              )}
            </div>,
            host
          )
        })}
      </span>
    })}
  </>
}
