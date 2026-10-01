import { useEffect, useState } from 'react'
import {
  cerrarPlantillasTeams,
  configurarEquiposTeams,
  guardarDraftTeams,
  guardarFormacionManualTeams,
  guardarPreasignacionesTeams,
  obtenerDetalleTeams,
  preasignacionesTeams,
  reabrirPlantillasTeams,
  sortearFormacionTeams,
} from '../teamsApi'

const METODOS = {
  manual: 'Manual',
  draft: 'Draft de capitanes',
  sorteo: 'Sorteo',
  predeterminado: 'Equipos predeterminados',
}

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

  const metodo = detalle?.teams?.metodo_formacion || teams.metodo_formacion || 'manual'
  const objetivoPorEquipo = Number(
    detalle?.teams?.jugadores_por_equipo || teams.jugadores_por_equipo || 0
  )

  async function cargar() {
    const tareas = [obtenerDetalleTeams(teams.id)]
    if ((teams.metodo_formacion || metodo) === 'predeterminado') {
      tareas.push(preasignacionesTeams(teams.id))
    }

    const [d, pre = []] = await Promise.all(tareas)
    setDetalle(d)

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
    setMensaje('')
    campo(valor)
  }

  function asignar(id,lado) {
    if (cerradas) return
    setAsignaciones(x => ({...x,[id]:lado}))
    setPlantillaGuardada(false)
    setMensaje('')
  }

  async function guardar() {
    if (!ca || !cb) {
      return setMensaje('Error: Debes elegir los dos capitanes.')
    }

    if (ca === cb) {
      return setMensaje('Error: Los capitanes deben ser jugadores distintos.')
    }

    setGuardando(true)
    setMensaje('')

    try {
      await configurarEquiposTeams(teams.id,a,ca,b,cb,colorA,colorB)
      setMensaje('Equipos y capitanes guardados correctamente.')
      setGuardado(true)
      await cargar()
    } catch (e) {
      setMensaje('Error: ' + e.message)
    } finally {
      setGuardando(false)
    }
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
      await guardarDraftTeams(
        teams.id,
        Object.entries(as)
          .filter(([,lado]) => lado)
          .map(([id_jugador,lado]) => ({id_jugador,lado}))
      )
      setAsignaciones(as)
      setPlantillaGuardada(true)
      setMensaje('Draft guardado correctamente.')
      await cargar()
    } catch (e) {
      setMensaje('Error: ' + e.message)
    } finally {
      setGuardando(false)
    }
  }

  async function guardarPlantilla() {
    if (!ca || !cb) {
      return setMensaje('Error: Guarda primero los capitanes.')
    }

    const idsElegibles = new Set(elegibles.map(j => j.id_jugador))
    const as = Object.fromEntries(
      Object.entries({...asignaciones,[ca]:'A',[cb]:'B'})
        .filter(([id]) => idsElegibles.has(id))
    )
    const totalA = Object.values(as).filter(x => x === 'A').length
    const totalB = Object.values(as).filter(x => x === 'B').length

    if (totalA !== objetivoPorEquipo || totalB !== objetivoPorEquipo) {
      return setMensaje(
        'Error: Debe haber exactamente ' +
        objetivoPorEquipo +
        ' jugadores en cada equipo. Ahora hay ' +
        totalA +
        ' en ' +
        a +
        ' y ' +
        totalB +
        ' en ' +
        b +
        '.'
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
          Object.entries(as)
            .filter(([,lado]) => lado)
            .map(([id_jugador,lado]) => ({
              id_jugador,
              equipo_id: lado === 'A' ? equipoA?.id : equipoB?.id,
            }))
        )
      }

      await guardarFormacionManualTeams(
        teams.id,
        Object.entries(as)
          .filter(([,lado]) => lado)
          .map(([id_jugador,lado]) => ({
            id_jugador,
            lado,
            es_reserva:false,
          }))
      )
      setAsignaciones(as)
      setPlantillaGuardada(true)
      setMensaje(
        metodo === 'predeterminado'
          ? 'Plantillas predeterminadas guardadas correctamente.'
          : 'Plantillas guardadas correctamente.'
      )
      await cargar()
    } catch (e) {
      setMensaje('Error: ' + e.message)
    } finally {
      setGuardando(false)
    }
  }

  async function sortear() {
    if (!ca || !cb) {
      return setMensaje('Error: Guarda primero los dos capitanes.')
    }

    if (!guardado) {
      return setMensaje('Error: Guarda primero los equipos y capitanes.')
    }

    const esperado = objetivoPorEquipo * 2
    if (elegibles.length !== esperado) {
      return setMensaje(
        'Error: Para sortear hacen falta exactamente ' +
        esperado +
        ' jugadores apuntados. Ahora hay ' +
        elegibles.length +
        '.'
      )
    }

    const ok = window.confirm(
      'Se sortearán los jugadores entre ' + a + ' y ' + b +
      ', manteniendo a cada capitán en su equipo. ¿Continuar?'
    )
    if (!ok) return

    setGuardando(true)
    setMensaje('')

    try {
      await sortearFormacionTeams(teams.id)
      await cargar()
      setPlantillaGuardada(true)
      setMensaje('Sorteo realizado y plantillas guardadas.')
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

  const candidatosA =
    metodo === 'predeterminado'
      ? elegibles.filter(x => asignaciones[x.id_jugador] === 'A' && x.id_jugador !== cb)
      : elegibles.filter(x => x.id_jugador !== cb)

  const candidatosB =
    metodo === 'predeterminado'
      ? elegibles.filter(x => asignaciones[x.id_jugador] === 'B' && x.id_jugador !== ca)
      : elegibles.filter(x => x.id_jugador !== ca)

  return (
    <section className="teams-convocatoria">
      <div className="teams-seccion-cab">
        <div>
          <p className="etiqueta">FORMACIÓN</p>
          <h2>Equipos y capitanes</h2>
          <p>Los capitanes deben estar entre los jugadores apuntados en la convocatoria.</p>
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
            Capitán
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
            Capitán
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

      {metodo === 'draft' && ca && cb && (
        <div className="teams-reparto">
          <div className="teams-reparto-cab">
            <div>
              <h3>Draft de jugadores</h3>
              <p>Elige los jugadores por turnos. Los capitanes ya están incluidos en sus equipos.</p>
            </div>
            <span>Turno: <b>{turnoDraft() === 'A' ? a : b}</b></span>
          </div>

          <div className="teams-draft-tablero">
            <div>
              <h4>{a}</h4>
              {[ca,...Object.entries(asignaciones).filter(([,x])=>x==='A').map(([id])=>id)]
                .filter((x,i,v)=>x&&v.indexOf(x)===i)
                .map(id => {
                  const j=elegibles.find(x=>x.id_jugador===id)
                  return <span key={id}>{j?.alias||j?.nombre||id}{id===ca?' · Capitán':''}</span>
                })}
            </div>

            <div>
              <h4>{b}</h4>
              {[cb,...Object.entries(asignaciones).filter(([,x])=>x==='B').map(([id])=>id)]
                .filter((x,i,v)=>x&&v.indexOf(x)===i)
                .map(id => {
                  const j=elegibles.find(x=>x.id_jugador===id)
                  return <span key={id}>{j?.alias||j?.nombre||id}{id===cb?' · Capitán':''}</span>
                })}
            </div>
          </div>

          <h4>Jugadores disponibles</h4>
          <div className="teams-draft-disponibles">
            {elegibles
              .filter(j =>
                j.id_jugador !== ca &&
                j.id_jugador !== cb &&
                !asignaciones[j.id_jugador]
              )
              .map(j => (
                <button
                  type="button"
                  key={j.id_jugador}
                  disabled={cerradas}
                  onClick={()=>elegirDraft(j.id_jugador)}
                >
                  {j.alias || j.nombre}
                </button>
              ))}
          </div>

          <div className="teams-reparto-acciones">
            <span>
              {elegibles.filter(j =>
                j.id_jugador !== ca &&
                j.id_jugador !== cb &&
                !asignaciones[j.id_jugador]
              ).length} por elegir
            </span>

            <button
              type="button"
              className="boton boton-principal"
              disabled={
                guardando ||
                plantillaGuardada ||
                cerradas ||
                elegibles.filter(j =>
                  j.id_jugador !== ca &&
                  j.id_jugador !== cb &&
                  !asignaciones[j.id_jugador]
                ).length > 0
              }
              onClick={guardarDraft}
            >
              {guardando ? 'Guardando…' : plantillaGuardada ? 'Draft guardado ✓' : 'Guardar draft'}
            </button>
          </div>
        </div>
      )}

      {metodo === 'manual' && ca && cb && (
        <div className="teams-reparto">
          <div className="teams-reparto-cab">
            <div>
              <h3>Reparto manual</h3>
              <p>Asigna cada jugador a uno de los dos equipos. Los capitanes quedan fijados automáticamente.</p>
            </div>
            <span>
              {asignadosA.size} / {objetivoPorEquipo || '—'} · {asignadosB.size} / {objetivoPorEquipo || '—'}
            </span>
          </div>

          <div className="teams-reparto-lista">
            {elegibles.map(j => {
              const id = j.id_jugador
              const esA = id === ca
              const esB = id === cb
              const lado = esA ? 'A' : esB ? 'B' : asignaciones[id] || ''

              return (
                <div className="teams-reparto-jugador" key={id}>
                  <b>{j.alias || j.nombre}</b>
                  <div>
                    <button
                      type="button"
                      className={lado === 'A' ? 'activo' : ''}
                      disabled={esB || cerradas}
                      onClick={()=>!esA&&asignar(id,lado==='A'?'':'A')}
                    >
                      {a}{esA ? ' · Capitán' : ''}
                    </button>
                    <button
                      type="button"
                      className={lado === 'B' ? 'activo' : ''}
                      disabled={esA || cerradas}
                      onClick={()=>!esB&&asignar(id,lado==='B'?'':'B')}
                    >
                      {b}{esB ? ' · Capitán' : ''}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="teams-reparto-acciones">
            <span>
              {elegibles.length - asignadosA.size - asignadosB.size} sin asignar
            </span>
            <button
              type="button"
              className="boton boton-principal"
              disabled={guardando || plantillaGuardada || cerradas}
              onClick={guardarPlantilla}
            >
              {guardando ? 'Guardando…' : plantillaGuardada ? 'Plantillas guardadas ✓' : 'Guardar plantillas'}
            </button>
          </div>
        </div>
      )}

      {metodo === 'predeterminado' && (
        <div className="teams-reparto">
          <div className="teams-reparto-cab">
            <div>
              <h3>Equipos predeterminados</h3>
              <p>
                La asignación puede venir de la convocatoria, pero el administrador
                siempre puede corregir o completar los equipos antes de cerrarlos.
              </p>
            </div>
            <span>
              {elegibles.filter(j=>asignaciones[j.id_jugador]==='A').length} / {objetivoPorEquipo || '—'} ·{' '}
              {elegibles.filter(j=>asignaciones[j.id_jugador]==='B').length} / {objetivoPorEquipo || '—'}
            </span>
          </div>

          <div className="teams-reparto-lista">
            {elegibles.map(j => {
              const id = j.id_jugador
              const lado = asignaciones[id] || ''
              const esCapA = id === ca
              const esCapB = id === cb

              return (
                <div className="teams-reparto-jugador" key={id}>
                  <b>{j.alias || j.nombre}</b>
                  <div>
                    <button
                      type="button"
                      className={lado === 'A' ? 'activo' : ''}
                      disabled={cerradas || esCapB}
                      onClick={() => !esCapA && asignar(id, lado === 'A' ? '' : 'A')}
                    >
                      {a}{esCapA ? ' · Capitán' : ''}
                    </button>
                    <button
                      type="button"
                      className={lado === 'B' ? 'activo' : ''}
                      disabled={cerradas || esCapA}
                      onClick={() => !esCapB && asignar(id, lado === 'B' ? '' : 'B')}
                    >
                      {b}{esCapB ? ' · Capitán' : ''}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="teams-reparto-acciones">
            <span>
              {elegibles.filter(j=>!asignaciones[j.id_jugador]).length} sin equipo
            </span>
            <button
              type="button"
              className="boton boton-principal"
              disabled={
                guardando ||
                plantillaGuardada ||
                cerradas ||
                !ca ||
                !cb ||
                elegibles.some(j=>!asignaciones[j.id_jugador])
              }
              onClick={guardarPlantilla}
            >
              {guardando
                ? 'Guardando…'
                : plantillaGuardada
                  ? 'Plantillas guardadas ✓'
                  : 'Confirmar plantillas'}
            </button>
          </div>
        </div>
      )}

      {metodo === 'sorteo' && ca && cb && (
        <div className="teams-reparto teams-sorteo-formacion">
          <div className="teams-reparto-cab">
            <div>
              <h3>Sorteo de equipos</h3>
              <p>
                Se mantendrá a cada capitán en su lado y el resto de los jugadores
                apuntados se repartirán aleatoriamente.
              </p>
            </div>
            <span>{elegibles.length} / {objetivoPorEquipo * 2 || '—'} jugadores</span>
          </div>

          <button
            type="button"
            className="boton boton-principal"
            onClick={sortear}
            disabled={guardando || cerradas || !guardado}
          >
            🎲 {plantillaGuardada ? 'Repetir sorteo' : 'Sortear equipos'}
          </button>
        </div>
      )}

      {mensaje && (
        <p className={mensaje.startsWith('Error:') ? 'teams-error' : 'teams-ok'}>
          {mensaje}
        </p>
      )}

      {!cerradas && !guardado && (
        <footer className="teams-convocatoria-acciones">
          <button
            type="button"
            className="boton boton-principal"
            onClick={guardar}
            disabled={guardando || !detalle}
          >
            {guardando ? 'Guardando…' : 'Guardar equipos y capitanes'}
          </button>
        </footer>
      )}

      <div className={'teams-cierre ' + (cerradas ? 'cerrado' : '')}>
        <div>
          <b>{cerradas ? '🔒 Plantillas cerradas' : 'Cerrar plantillas'}</b>
          <span>
            {cerradas
              ? 'La composición queda bloqueada hasta que un administrador la reabra.'
              : 'Cuando el reparto sea definitivo, ciérralo para pasar a la preparación de los partidos.'}
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
              disabled={guardando || !plantillaGuardada}
            >
              Cerrar plantillas
            </button>
          )}
      </div>
    </section>
  )
}
