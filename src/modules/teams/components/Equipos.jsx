import { useEffect, useState } from 'react'
import {
  aplicarVotacionCapitanesTeams,
  cerrarPlantillasTeams,
  configurarEquiposTeams,
  guardarDraftTeams,
  guardarEquiposBaseTeams,
  guardarFormacionManualTeams,
  guardarPreasignacionesTeams,
  obtenerDetalleTeams,
  preasignacionesTeams,
  reabrirPlantillasTeams,
  sortearCapitanesTeams,
  sortearFormacionTeams,
  votacionCapitanesTeams,
} from '../teamsApi'

import { METODOS } from './equipos/config'
import PanelDraft from './equipos/PanelDraft'
import PanelManual from './equipos/PanelManual'
import PanelPredeterminado from './equipos/PanelPredeterminado'
import PanelSorteo from './equipos/PanelSorteo'
import PanelCapitanesSorteo from './equipos/PanelCapitanesSorteo'
import PanelCapitanesVotacion from './equipos/PanelCapitanesVotacion'

export default function Equipos({ teams }) {
  const [detalle,setDetalle] = useState(null)
  const [a,setA] = useState('Equipo A')
  const [b,setB] = useState('Equipo B')
  const [colorA,setColorA] = useState('#22c55e')
  const [colorB,setColorB] = useState('#3b82f6')
  const [ca,setCa] = useState('')
  const [cb,setCb] = useState('')
  const [mensaje,setMensaje] = useState('')
  const [guardando,setGuardando] = useState(false)
  const [guardado,setGuardado] = useState(false)
  const [asignaciones,setAsignaciones] = useState({})
  const [plantillaGuardada,setPlantillaGuardada] = useState(false)
  const [cerradas,setCerradas] = useState(false)
  const [votacion,setVotacion] = useState({ equipos: [] })

  const metodo = detalle?.teams?.metodo_formacion || teams.metodo_formacion || 'manual'
  const objetivoPorEquipo = Number(
    detalle?.teams?.jugadores_por_equipo || teams.jugadores_por_equipo || 0
  )
  const modoCapitanes =
    detalle?.teams?.configuracion?.modo_designacion_capitanes ||
    teams?.configuracion?.modo_designacion_capitanes ||
    'administrador'
  const capitanManual = ['administrador','predefinidos'].includes(modoCapitanes)

  async function cargar() {
    const d = await obtenerDetalleTeams(teams.id)
    let pre = []
    let votos = { equipos: [] }

    if ((d.teams?.metodo_formacion || teams.metodo_formacion) === 'predeterminado') {
      pre = await preasignacionesTeams(teams.id)
    }

    const modo =
      d.teams?.configuracion?.modo_designacion_capitanes ||
      teams?.configuracion?.modo_designacion_capitanes ||
      'administrador'

    if (modo === 'eleccion_equipo') {
      votos = await votacionCapitanesTeams(teams.id)
    }

    setDetalle(d)
    setVotacion(votos)

    const ea = (d.equipos || []).find(x => x.lado === 'A')
    const eb = (d.equipos || []).find(x => x.lado === 'B')

    if (ea) {
      setA(ea.nombre || 'Equipo A')
      setColorA(ea.color || '#22c55e')
      setCa(ea.id_capitan || '')
    }

    if (eb) {
      setB(eb.nombre || 'Equipo B')
      setColorB(eb.color || '#3b82f6')
      setCb(eb.id_capitan || '')
    }

    setGuardado(Boolean(ea?.id_capitan && eb?.id_capitan))

    const as = {}
    for (const m of d.miembros || []) {
      as[m.id_jugador] =
        (d.equipos || []).find(e => e.id === m.equipo_id)?.lado || ''
    }

    if ((d.teams?.metodo_formacion || teams.metodo_formacion) === 'predeterminado') {
      for (const p of pre || []) {
        if (p.lado) as[p.id_jugador] = p.lado
      }
    }

    setAsignaciones(as)

    const miembros = d.miembros || []
    const objetivo = Number(
      d.teams?.jugadores_por_equipo || teams.jugadores_por_equipo || 0
    ) * 2

    setPlantillaGuardada(objetivo > 0 && miembros.length === objetivo)
    setCerradas(Boolean(d.teams?.plantillas_cerradas || d.plantillas_cerradas))
  }

  useEffect(() => {
    ;(async () => {
      try {
        await cargar()
      } catch (e) {
        setMensaje('Error: ' + e.message)
      }
    })()
  }, [teams.id])

  const elegibles = (detalle?.elegibles || []).filter(x => x.estado === 'elegible')

  function editar(campo,valor) {
    if (cerradas) return
    setGuardado(false)
    setPlantillaGuardada(false)
    setMensaje('')
    campo(valor)
  }

  function asignar(id,lado) {
    if (cerradas) return
    setAsignaciones(x => ({...x,[id]:lado}))
    setPlantillaGuardada(false)
    setMensaje('')
  }

  async function cerrar() {
    setGuardando(true)
    setMensaje('')

    try {
      await cerrarPlantillasTeams(teams.id)
      setCerradas(true)
      setMensaje('Plantillas cerradas correctamente.')
    } catch (e) {
      setMensaje('Error: ' + e.message)
    } finally {
      setGuardando(false)
    }
  }

  async function reabrir() {
    setGuardando(true)
    setMensaje('')

    try {
      await reabrirPlantillasTeams(teams.id)
      setCerradas(false)
      setMensaje('Plantillas reabiertas. Ya puedes modificarlas.')
    } catch (e) {
      setMensaje('Error: ' + e.message)
    } finally {
      setGuardando(false)
    }
  }

  function turnoDraft() {
    const n = Object.values(asignaciones).filter(Boolean).length
    const tipo =
      teams.tipo_draft ||
      detalle?.teams?.configuracion?.tipo_draft ||
      'alterno'

    if (tipo === 'serpiente') {
      const ciclo = ['A','B','B','A']
      return ciclo[n % 4]
    }

    return n % 2 === 0 ? 'A' : 'B'
  }

  function elegirDraft(id) {
    if (cerradas || id === ca || id === cb) return
    const lado = turnoDraft()
    setAsignaciones(x => ({...x,[id]:lado}))
    setPlantillaGuardada(false)
    setMensaje('')
  }

  async function guardarDraft() {
    const idsElegibles = new Set(elegibles.map(j => j.id_jugador))
    const as = Object.fromEntries(
      Object.entries({...asignaciones,[ca]:'A',[cb]:'B'})
        .filter(([id]) => idsElegibles.has(id))
    )
    const totalA = Object.values(as).filter(x => x === 'A').length
    const totalB = Object.values(as).filter(x => x === 'B').length

    if (totalA !== objetivoPorEquipo || totalB !== objetivoPorEquipo) {
      return setMensaje(
        'Error: El draft debe completar ' +
        objetivoPorEquipo +
        ' jugadores en cada equipo.'
      )
    }

    setGuardando(true)
    setMensaje('')

    try {
      await configurarEquiposTeams(teams.id,a,ca,b,cb,colorA,colorB)
      await guardarDraftTeams(
        teams.id,
        Object.entries(as)
          .filter(([,lado]) => lado)
          .map(([id_jugador,lado]) => ({id_jugador,lado}))
      )
      setAsignaciones(as)
      setGuardado(true)
      setPlantillaGuardada(true)
      setMensaje('Equipos y draft guardados correctamente.')
      await cargar()
    } catch (e) {
      setMensaje('Error: ' + e.message)
    } finally {
      setGuardando(false)
    }
  }

  async function guardarPlantilla() {
    if (capitanManual && (!ca || !cb)) {
      return setMensaje('Error: Debes elegir los dos capitanes.')
    }

    if (ca && cb && ca === cb) {
      return setMensaje('Error: Los capitanes deben ser jugadores distintos.')
    }

    const idsElegibles = new Set(elegibles.map(j => j.id_jugador))
    const base = {...asignaciones}
    if (ca) base[ca] = 'A'
    if (cb) base[cb] = 'B'

    const as = Object.fromEntries(
      Object.entries(base).filter(([id]) => idsElegibles.has(id))
    )
    const totalA = Object.values(as).filter(x => x === 'A').length
    const totalB = Object.values(as).filter(x => x === 'B').length

    if (totalA !== objetivoPorEquipo || totalB !== objetivoPorEquipo) {
      return setMensaje(
        'Error: Debe haber exactamente ' +
        objetivoPorEquipo +
        ' jugadores en cada equipo. Ahora hay ' +
        totalA + ' en ' + a + ' y ' +
        totalB + ' en ' + b + '.'
      )
    }

    setGuardando(true)
    setMensaje('')

    try {
      if (metodo === 'predeterminado') {
        const equipos = detalle?.equipos || []
        const equipoA = equipos.find(e => e.lado === 'A')
        const equipoB = equipos.find(e => e.lado === 'B')

        await guardarPreasignacionesTeams(
          teams.id,
          Object.entries(as).map(([id_jugador,lado]) => ({
            id_jugador,
            equipo_id: lado === 'A' ? equipoA?.id : equipoB?.id,
          }))
        )
      }

      await guardarEquiposBaseTeams(teams.id,a,b,colorA,colorB)

      await guardarFormacionManualTeams(
        teams.id,
        Object.entries(as).map(([id_jugador,lado]) => ({
          id_jugador,
          lado,
          es_reserva:false,
        }))
      )

      if ((capitanManual || (ca && cb)) && ca && cb) {
        await configurarEquiposTeams(teams.id,a,ca,b,cb,colorA,colorB)
      } else if (modoCapitanes === 'sorteo') {
        await sortearCapitanesTeams(teams.id)
      }

      setAsignaciones(as)
      setPlantillaGuardada(true)
      setGuardado(true)
      setMensaje(
        modoCapitanes === 'eleccion_equipo'
          ? 'Equipos guardados. Ya puede comenzar la votación de capitanes en Mi Zona.'
          : 'Equipos guardados correctamente.'
      )
      await cargar()
    } catch (e) {
      setMensaje('Error: ' + e.message)
    } finally {
      setGuardando(false)
    }
  }

  async function sortear() {
    if (capitanManual && (!ca || !cb)) {
      return setMensaje('Error: Debes elegir los dos capitanes.')
    }

    if (ca && cb && ca === cb) {
      return setMensaje('Error: Los capitanes deben ser jugadores distintos.')
    }

    const esperado = objetivoPorEquipo * 2
    if (elegibles.length !== esperado) {
      return setMensaje(
        'Error: Para sortear hacen falta exactamente ' +
        esperado + ' jugadores apuntados. Ahora hay ' +
        elegibles.length + '.'
      )
    }

    const ok = window.confirm(
      'Se sortearán los jugadores entre ' + a + ' y ' + b + '. ¿Continuar?'
    )
    if (!ok) return

    setGuardando(true)
    setMensaje('')

    try {
      await guardarEquiposBaseTeams(teams.id,a,b,colorA,colorB)

      if (capitanManual && ca && cb) {
        await configurarEquiposTeams(teams.id,a,ca,b,cb,colorA,colorB)
      }

      await sortearFormacionTeams(teams.id)

      if (modoCapitanes === 'sorteo') {
        await sortearCapitanesTeams(teams.id)
      }

      await cargar()
      setGuardado(true)
      setPlantillaGuardada(true)
      setMensaje(
        modoCapitanes === 'eleccion_equipo'
          ? 'Equipos sorteados. Ya puede comenzar la votación de capitanes en Mi Zona.'
          : 'Equipos sorteados y guardados correctamente.'
      )
    } catch (e) {
      setMensaje('Error: ' + e.message)
    } finally {
      setGuardando(false)
    }
  }

  async function volverASortearCapitanes() {
    setGuardando(true)
    setMensaje('')
    try {
      await sortearCapitanesTeams(teams.id)
      await cargar()
      setMensaje('Capitanes sorteados correctamente.')
    } catch (e) {
      setMensaje('Error: ' + e.message)
    } finally {
      setGuardando(false)
    }
  }

  async function aplicarVotacion() {
    setGuardando(true)
    setMensaje('')
    try {
      await aplicarVotacionCapitanesTeams(
        teams.id,
        ca || null,
        cb || null
      )
      await cargar()
      setMensaje('Capitanes asignados según la votación.')
    } catch (e) {
      setMensaje('Error: ' + e.message)
    } finally {
      setGuardando(false)
    }
  }

  const asignadosA = new Set([
    ca,
    ...Object.entries(asignaciones)
      .filter(([,x]) => x === 'A')
      .map(([id]) => id),
  ].filter(Boolean))

  const asignadosB = new Set([
    cb,
    ...Object.entries(asignaciones)
      .filter(([,x]) => x === 'B')
      .map(([id]) => id),
  ].filter(Boolean))

  const hayReparto = Object.values(asignaciones).some(Boolean)

  const candidatosA =
    metodo !== 'draft' && hayReparto
      ? elegibles.filter(x => asignaciones[x.id_jugador] === 'A' && x.id_jugador !== cb)
      : elegibles.filter(x => x.id_jugador !== cb)

  const candidatosB =
    metodo !== 'draft' && hayReparto
      ? elegibles.filter(x => asignaciones[x.id_jugador] === 'B' && x.id_jugador !== ca)
      : elegibles.filter(x => x.id_jugador !== ca)

  return (
    <section className="teams-convocatoria">
      <div className="teams-seccion-cab">
        <div>
          <p className="etiqueta">FORMACIÓN</p>
          <h2>Equipos y capitanes</h2>
          <p>Configura los equipos y aplica el sistema de designación de capitanes elegido en las reglas.</p>
        </div>
      </div>

      <div className="teams-dos-equipos">
        <div className="teams-equipo-box equipo-a">
          <span className="teams-letra">A</span>

          <label>
            Nombre del equipo
            <input value={a} onChange={e=>editar(setA,e.target.value)}/>
          </label>

          <label>
            Color del equipo
            <div className="teams-color-equipo">
              <input
                type="color"
                value={colorA}
                disabled={cerradas}
                onChange={e=>editar(setColorA,e.target.value)}
              />
              <span className="teams-color-punto" style={{backgroundColor:colorA}}/>
            </div>
          </label>

          <label>
            {capitanManual ? 'Capitán' : 'Capitán · corrección administrativa'}
            <select value={ca} onChange={e=>editar(setCa,e.target.value)}>
              <option value="">Seleccionar capitán…</option>
              {candidatosA.map(x => (
                <option key={x.id_jugador} value={x.id_jugador}>
                  {x.alias || x.nombre}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="teams-versus">VS</div>

        <div className="teams-equipo-box equipo-b">
          <span className="teams-letra">B</span>

          <label>
            Nombre del equipo
            <input value={b} onChange={e=>editar(setB,e.target.value)}/>
          </label>

          <label>
            Color del equipo
            <div className="teams-color-equipo">
              <input
                type="color"
                value={colorB}
                disabled={cerradas}
                onChange={e=>editar(setColorB,e.target.value)}
              />
              <span className="teams-color-punto" style={{backgroundColor:colorB}}/>
            </div>
          </label>

          <label>
            {capitanManual ? 'Capitán' : 'Capitán · corrección administrativa'}
            <select value={cb} onChange={e=>editar(setCb,e.target.value)}>
              <option value="">Seleccionar capitán…</option>
              {candidatosB.map(x => (
                <option key={x.id_jugador} value={x.id_jugador}>
                  {x.alias || x.nombre}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="teams-formacion-info">
        <b>Método de formación:</b> {METODOS[metodo] || metodo}
      </div>

      <div className="teams-formacion-info">
        <b>Capitanes:</b> {{
          administrador:'Los elige el administrador',
          predefinidos:'Definidos de antemano',
          eleccion_equipo:'Los elige cada equipo',
          sorteo:'Sorteo entre los jugadores'
        }[modoCapitanes] || modoCapitanes}
      </div>

      {metodo === 'draft' && ca && cb && (
        <PanelDraft
          a={a}
          b={b}
          ca={ca}
          cb={cb}
          asignaciones={asignaciones}
          elegibles={elegibles}
          cerradas={cerradas}
          elegirDraft={elegirDraft}
          turnoDraft={turnoDraft}
          guardando={guardando}
          plantillaGuardada={plantillaGuardada}
          guardarDraft={guardarDraft}
        />
      )}

      {metodo === 'manual' && (
        <PanelManual
          a={a}
          b={b}
          ca={ca}
          cb={cb}
          asignaciones={asignaciones}
          elegibles={elegibles}
          cerradas={cerradas}
          asignar={asignar}
          asignadosA={asignadosA}
          asignadosB={asignadosB}
          objetivoPorEquipo={objetivoPorEquipo}
          guardando={guardando}
          plantillaGuardada={plantillaGuardada}
          guardarPlantilla={guardarPlantilla}
        />
      )}

      {metodo === 'predeterminado' && (
        <PanelPredeterminado
          a={a}
          b={b}
          ca={ca}
          cb={cb}
          asignaciones={asignaciones}
          elegibles={elegibles}
          cerradas={cerradas}
          asignar={asignar}
          objetivoPorEquipo={objetivoPorEquipo}
          guardando={guardando}
          plantillaGuardada={plantillaGuardada}
          guardarPlantilla={guardarPlantilla}
        />
      )}

      {metodo === 'sorteo' && (
        <PanelSorteo
          elegibles={elegibles}
          objetivoPorEquipo={objetivoPorEquipo}
          sortear={sortear}
          guardando={guardando}
          cerradas={cerradas}
          plantillaGuardada={plantillaGuardada}
        />
      )}

      {modoCapitanes === 'sorteo' && plantillaGuardada && !cerradas && (
        <PanelCapitanesSorteo
          ca={ca}
          cb={cb}
          guardando={guardando}
          volverASortearCapitanes={volverASortearCapitanes}
        />
      )}

      {modoCapitanes === 'eleccion_equipo' && plantillaGuardada && !cerradas && (
        <PanelCapitanesVotacion
          votacion={votacion}
          cargar={cargar}
          guardando={guardando}
          aplicarVotacion={aplicarVotacion}
        />
      )}

      {mensaje && (
        <p className={mensaje.startsWith('Error:') ? 'teams-error' : 'teams-ok'}>
          {mensaje}
        </p>
      )}

      <div className={'teams-cierre ' + (cerradas ? 'cerrado' : '')}>
        <div>
          <b>{cerradas ? '🔒 Plantillas cerradas' : 'Cerrar plantillas'}</b>
          <span>
            {cerradas
              ? 'La composición queda bloqueada. Si detectas un error, puedes reabrirla y corregirla.'
              : !ca || !cb
                ? 'Los equipos están formados, pero todavía faltan los dos capitanes.'
                : 'Puedes guardar y corregir los equipos tantas veces como necesites. Ciérralos solo cuando sean definitivos.'}
          </span>
        </div>

        {cerradas
          ? (
            <button
              type="button"
              className="boton boton-secundario"
              onClick={reabrir}
              disabled={guardando}
            >
              Reabrir plantillas
            </button>
          )
          : (
            <button
              type="button"
              className="boton boton-principal"
              onClick={cerrar}
              disabled={guardando || !plantillaGuardada || !ca || !cb}
            >
              Cerrar plantillas
            </button>
          )}
      </div>
    </section>
  )
}
