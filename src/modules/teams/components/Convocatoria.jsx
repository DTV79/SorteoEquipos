import { useEffect, useMemo, useState } from 'react'
import {
  activarAccesosPruebaTeams,
  catalogoJugadoresTeams,
  estadoAccesosTeams,
  generarCodigoAltaTeams,
  guardarConvocatoriaTeams,
  guardarPreasignacionesTeams,
  obtenerDetalleTeams,
  preasignacionesTeams,
  solicitudesAltaTeams,
} from '../teamsApi'

const OPCIONES = [
  ['elegible', 'Me apunto'],
  ['no_disponible', 'No puedo'],
  ['pendiente', 'Todavía no sé'],
]

function fechaHora(valor) {
  if (!valor) return ''
  const d = new Date(valor)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function Convocatoria({ teams }) {
  const [jugadores, setJugadores] = useState([])
  const [estados, setEstados] = useState({})
  const [origenes, setOrigenes] = useState({})
  const [accesos, setAccesos] = useState({})
  const [solicitudes, setSolicitudes] = useState([])
  const [codigos, setCodigos] = useState({})
  const [equipos, setEquipos] = useState([])
  const [preasignaciones, setPreasignaciones] = useState({})
  const [preOrigenes, setPreOrigenes] = useState({})
  const [buscar, setBuscar] = useState('')
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [activandoPruebas, setActivandoPruebas] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [guardado, setGuardado] = useState(false)
  const [sucio, setSucio] = useState(false)

  const metodo = teams?.metodo_formacion || 'manual'
  const modoPredeterminado =
    teams?.configuracion?.asignacion_predeterminada || 'admin'
  const usaPredeterminados = metodo === 'predeterminado'

  function aplicarPreasignaciones(lista = []) {
    const mapa = {}
    const origenMapa = {}
    for (const item of lista) {
      mapa[item.id_jugador] = item.equipo_id
      origenMapa[item.id_jugador] = item.origen
    }
    setPreasignaciones(mapa)
    setPreOrigenes(origenMapa)
  }

  useEffect(() => {
    let vivo = true
    let intervalo

    async function cargarSolicitudes() {
      try {
        const data = await solicitudesAltaTeams()
        if (vivo) setSolicitudes(data ?? [])
      } catch {
        // El resto de la convocatoria debe seguir funcionando aunque falle el aviso.
      }
    }

    ;(async () => {
      try {
        const tareas = [
          catalogoJugadoresTeams(),
          obtenerDetalleTeams(teams.id),
          estadoAccesosTeams(),
          solicitudesAltaTeams(),
        ]

        if (usaPredeterminados) {
          tareas.push(preasignacionesTeams(teams.id))
        }

        const [cat, det, accesosData, solicitudesData, preData = []] =
          await Promise.all(tareas)

        if (!vivo) return

        setJugadores(cat.filter(j => j.activo))
        setEquipos((det?.equipos || []).slice().sort((a,b) => String(a.lado).localeCompare(String(b.lado))))

        const es = {}
        const os = {}
        for (const e of det?.elegibles ?? []) {
          es[e.id_jugador] = e.estado
          os[e.id_jugador] = e.origen
        }

        setEstados(es)
        setOrigenes(os)
        setGuardado((det?.elegibles ?? []).length > 0)
        setSucio(false)

        if (usaPredeterminados) {
          aplicarPreasignaciones(preData)
        }

        const mapaAccesos = {}
        for (const acceso of accesosData ?? []) {
          mapaAccesos[acceso.id_jugador] = acceso
        }
        setAccesos(mapaAccesos)
        setSolicitudes(solicitudesData ?? [])

        intervalo = window.setInterval(cargarSolicitudes, 15000)
      } catch (e) {
        if (vivo) setMensaje('Error: ' + e.message)
      } finally {
        if (vivo) setCargando(false)
      }
    })()

    return () => {
      vivo = false
      if (intervalo) window.clearInterval(intervalo)
    }
  }, [teams.id, usaPredeterminados])

  useEffect(() => {
    if (sucio) return undefined

    let activo = true

    async function refrescarRespuestasWeb() {
      try {
        const tareas = [obtenerDetalleTeams(teams.id)]
        if (usaPredeterminados) tareas.push(preasignacionesTeams(teams.id))

        const [det, preData = []] = await Promise.all(tareas)
        if (!activo) return

        const es = {}
        const os = {}
        for (const e of det?.elegibles ?? []) {
          es[e.id_jugador] = e.estado
          os[e.id_jugador] = e.origen
        }

        setEstados(es)
        setOrigenes(os)
        setEquipos((det?.equipos || []).slice().sort((a,b) => String(a.lado).localeCompare(String(b.lado))))
        setGuardado((det?.elegibles ?? []).length > 0)

        if (usaPredeterminados) {
          aplicarPreasignaciones(preData)
        }
      } catch {
        // La actualización en segundo plano no debe bloquear la pantalla.
      }
    }

    const intervalo = window.setInterval(refrescarRespuestasWeb, 15000)

    const alVolver = () => {
      if (!document.hidden) refrescarRespuestasWeb()
    }

    document.addEventListener('visibilitychange', alVolver)
    window.addEventListener('focus', refrescarRespuestasWeb)

    return () => {
      activo = false
      window.clearInterval(intervalo)
      document.removeEventListener('visibilitychange', alVolver)
      window.removeEventListener('focus', refrescarRespuestasWeb)
    }
  }, [teams.id, sucio, usaPredeterminados])

  const filtrados = useMemo(() => {
    const q = buscar.trim().toLowerCase()
    return !q
      ? jugadores
      : jugadores.filter(j =>
          (j.alias || '').toLowerCase().includes(q) ||
          (j.nombre_oficial || '').toLowerCase().includes(q)
        )
  }, [jugadores, buscar])

  const totalElegibles = Object.values(estados).filter(x => x === 'elegible').length
  const pendientes = Object.values(estados).filter(x => x === 'pendiente').length
  const plazas =
    (Number(teams.jugadores_por_equipo) || 0) * 2 +
    (Number(teams.reservas_por_equipo) || 0) * 2

  const equipoA = equipos.find(e => e.lado === 'A')
  const equipoB = equipos.find(e => e.lado === 'B')

  function cambiar(id, estado) {
    setGuardado(false)
    setSucio(true)
    setMensaje('')
    setEstados(s => ({ ...s, [id]: estado }))
    setOrigenes(s => ({ ...s, [id]: 'admin' }))
  }

  function cambiarEquipo(id, equipoId) {
    setGuardado(false)
    setSucio(true)
    setMensaje('')
    setPreasignaciones(s => ({ ...s, [id]: equipoId }))
    setPreOrigenes(s => ({ ...s, [id]: 'admin' }))
  }

  async function activarTodosPrueba() {
    const activos = jugadores.filter(j => j.activo)
    const ok = window.confirm(
      'Se activará Mi Zona para los ' + activos.length +
      ' jugadores activos con el PIN temporal 0609. ' +
      'Los PIN actuales también se sustituirán. ¿Continuar?'
    )
    if (!ok) return

    setActivandoPruebas(true)
    setMensaje('')

    try {
      await activarAccesosPruebaTeams(activos, '0609')

      const accesosData = await estadoAccesosTeams()
      const mapaAccesos = {}
      for (const acceso of accesosData ?? []) {
        mapaAccesos[acceso.id_jugador] = acceso
      }
      setAccesos(mapaAccesos)

      setMensaje(
        'Accesos de prueba activados para ' +
        activos.length +
        ' jugadores. PIN temporal: 0609.'
      )
    } catch (e) {
      setMensaje('Error: ' + e.message)
    } finally {
      setActivandoPruebas(false)
    }
  }

  async function generarCodigo(j) {
    const nombre = j.alias || j.nombre_oficial
    const acceso = accesos[j.id_jugador]

    if (acceso?.acceso_creado) {
      const ok = window.confirm(
        'Vas a restablecer el acceso de ' + nombre +
        '. Su PIN actual dejará de funcionar y tendrá que crear uno nuevo con el código que se genere. ¿Continuar?'
      )
      if (!ok) return
    }

    setMensaje('')

    try {
      const data = await generarCodigoAltaTeams(j.id_jugador)
      setCodigos(c => ({ ...c, [j.id_jugador]: data.codigo }))
      setAccesos(a => ({
        ...a,
        [j.id_jugador]: {
          ...(a[j.id_jugador] || {}),
          acceso_creado: acceso?.acceso_creado || false,
          tiene_acceso: false,
          codigo_pendiente: true,
          codigo_expira_at: data.expira_at,
        },
      }))
      setSolicitudes(s => s.map(item =>
        item.id_jugador === j.id_jugador
          ? { ...item, codigo_pendiente: true, codigo_expira_at: data.expira_at }
          : item
      ))
      setMensaje(
        (data.tipo === 'restablecimiento' ? 'Acceso restablecido. ' : 'Código de acceso generado. ') +
        'Envía el código a ' + nombre + '.'
      )
    } catch (e) {
      setMensaje('Error: ' + e.message)
    }
  }

  async function generarCodigoSolicitud(solicitud) {
    setMensaje('')
    try {
      const data = await generarCodigoAltaTeams(solicitud.id_jugador)
      setCodigos(c => ({ ...c, [solicitud.id_jugador]: data.codigo }))
      setSolicitudes(s => s.map(item =>
        item.id_jugador === solicitud.id_jugador
          ? { ...item, codigo_pendiente: true, codigo_expira_at: data.expira_at }
          : item
      ))
      setMensaje('Código generado para ' + solicitud.alias + '.')
    } catch (e) {
      setMensaje('Error: ' + e.message)
    }
  }

  async function copiarCodigo(codigo) {
    try {
      await navigator.clipboard.writeText(codigo)
      setMensaje('Código copiado al portapapeles.')
    } catch {
      setMensaje('Código: ' + codigo)
    }
  }

  async function guardar() {
    if (usaPredeterminados && modoPredeterminado === 'admin') {
      const sinEquipo = jugadores.filter(j =>
        estados[j.id_jugador] === 'elegible' &&
        !preasignaciones[j.id_jugador]
      )

      if (sinEquipo.length) {
        setMensaje(
          'Error: Hay jugadores apuntados sin equipo asignado: ' +
          sinEquipo.slice(0,4).map(j => j.alias || j.nombre_oficial).join(', ') +
          (sinEquipo.length > 4 ? '…' : '')
        )
        return
      }
    }

    setGuardando(true)
    setMensaje('')

    try {
      if (usaPredeterminados) {
        const asignaciones = jugadores
          .filter(j => preasignaciones[j.id_jugador])
          .map(j => ({
            id_jugador: j.id_jugador,
            equipo_id: preasignaciones[j.id_jugador],
          }))

        await guardarPreasignacionesTeams(teams.id, asignaciones)
      }

      const datos = jugadores
        .filter(j => estados[j.id_jugador])
        .map(j => ({
          id_jugador: j.id_jugador,
          estado: estados[j.id_jugador],
        }))

      await guardarConvocatoriaTeams(teams.id, datos)
      setMensaje('Convocatoria guardada correctamente.')
      setGuardado(true)
      setSucio(false)
    } catch (e) {
      setMensaje('Error: ' + e.message)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <section className="teams-convocatoria">
      {solicitudes.length > 0 && (
        <section className="teams-solicitudes-alta">
          <div className="teams-solicitudes-cab">
            <div>
              <p className="etiqueta">MI ZONA</p>
              <h3>Solicitudes de acceso</h3>
              <p>
                Estos jugadores ya han elegido su PIN y están esperando el código
                de acceso del administrador.
              </p>
            </div>
            <strong>{solicitudes.length}</strong>
          </div>

          <div className="teams-solicitudes-lista">
            {solicitudes.map(s => {
              const codigo = codigos[s.id_jugador]
              return (
                <article className="teams-solicitud-alta" key={s.id_jugador}>
                  <div>
                    <b>{s.alias}</b>
                    <span>{s.nombre_oficial}</span>
                    <small>Solicitado: {fechaHora(s.solicitado_at)}</small>
                  </div>

                  <div className="teams-solicitud-acciones">
                    {codigo ? (
                      <div className="teams-codigo-solicitud">
                        <strong>{codigo}</strong>
                        <button type="button" onClick={() => copiarCodigo(codigo)}>
                          Copiar
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="boton boton-principal"
                        onClick={() => generarCodigoSolicitud(s)}
                      >
                        {s.codigo_pendiente ? 'Generar un código nuevo' : 'Generar código'}
                      </button>
                    )}
                    <small>
                      {codigo
                        ? 'Código de un solo uso · 48 h'
                        : s.codigo_pendiente
                          ? 'Ya existe un código pendiente, pero por seguridad no se vuelve a mostrar.'
                          : 'El jugador está esperando tu código.'}
                    </small>
                  </div>
                </article>
              )
            })}
          </div>
        </section>
      )}

      <div className="teams-seccion-cab">
        <div>
          <p className="etiqueta">CONVOCATORIA</p>
          <h2>Disponibilidad de jugadores</h2>
          <p>
            El jugador puede responder desde Mi Zona. El administrador también puede
            registrar respuestas recibidas por WhatsApp u otros medios.
          </p>
          {usaPredeterminados && (
            <p className="teams-convocatoria-modo">
              <b>Equipos predeterminados:</b>{' '}
              {modoPredeterminado === 'admin'
                ? 'el administrador asigna el equipo antes o durante la convocatoria.'
                : 'cada jugador puede elegir su equipo al apuntarse; el administrador puede corregirlo.'}
            </p>
          )}
        </div>

        <div className={'teams-contador ' + (plazas && totalElegibles < plazas ? 'faltan' : '')}>
          <strong>{totalElegibles}</strong>
          <span>{plazas ? 'apuntados · ' + plazas + ' plazas previstas' : 'apuntados'}</span>
          {pendientes > 0 && <small>{pendientes} pendientes</small>}
        </div>
      </div>

      {usaPredeterminados && (
        <div className="teams-equipos-convocatoria-resumen">
          <span>
            <i style={{backgroundColor: equipoA?.color || '#22c55e'}} />
            {equipoA?.nombre || 'Equipo A'}:
            <b>{Object.values(preasignaciones).filter(id => id === equipoA?.id).length}</b>
          </span>
          <span>
            <i style={{backgroundColor: equipoB?.color || '#3b82f6'}} />
            {equipoB?.nombre || 'Equipo B'}:
            <b>{Object.values(preasignaciones).filter(id => id === equipoB?.id).length}</b>
          </span>
        </div>
      )}

      <div className="teams-convocatoria-tools">
        <input
          type="search"
          placeholder="Buscar jugador…"
          value={buscar}
          onChange={e => setBuscar(e.target.value)}
        />
        <button
          className="boton boton-secundario"
          type="button"
          onClick={() => {
            const n = { ...estados }
            jugadores.forEach(j => { n[j.id_jugador] = 'elegible' })
            setEstados(n)
            setGuardado(false)
            setSucio(true)
            setMensaje('')
          }}
        >
          Todos: Me apunto
        </button>
        <button
          className="boton boton-secundario teams-pin-pruebas"
          type="button"
          disabled={activandoPruebas || cargando}
          onClick={activarTodosPrueba}
          title="Solo para pruebas: activa Mi Zona para todos los jugadores activos con PIN 0609"
        >
          {activandoPruebas
            ? 'Activando accesos…'
            : '🧪 Accesos de prueba · PIN 0609'}
        </button>
      </div>

      {cargando ? (
        <div className="teams-vacio">Cargando catálogo…</div>
      ) : (
        <div className="teams-jugadores teams-jugadores-estados">
          {filtrados.map(j => {
            const estado = estados[j.id_jugador] || ''
            const acceso = accesos[j.id_jugador] || {}
            const codigo = codigos[j.id_jugador]
            const equipoId = preasignaciones[j.id_jugador] || ''
            const origenEquipo = preOrigenes[j.id_jugador]

            return (
              <article
                key={j.id_jugador}
                className={'teams-jugador-estado ' + (estado || 'sin-respuesta')}
              >
                <div className="teams-jugador-identidad">
                  <span className="teams-avatar">
                    {(j.alias || j.nombre_oficial || '?').trim().charAt(0).toUpperCase()}
                  </span>
                  <span>
                    <b>{j.alias || j.nombre_oficial}</b>
                    {j.alias && j.nombre_oficial !== j.alias && (
                      <small>{j.nombre_oficial}</small>
                    )}
                  </span>
                </div>

                {usaPredeterminados && (
                  <div className="teams-equipo-convocatoria">
                    <label>
                      Equipo
                      <select
                        value={equipoId}
                        onChange={e => cambiarEquipo(j.id_jugador,e.target.value)}
                      >
                        <option value="">Sin asignar</option>
                        {equipos.map(e => (
                          <option key={e.id} value={e.id}>
                            {e.nombre}
                          </option>
                        ))}
                      </select>
                    </label>
                    {equipoId && (
                      <small>
                        {origenEquipo === 'web'
                          ? 'Elegido por el jugador'
                          : 'Asignado por administrador'}
                      </small>
                    )}
                  </div>
                )}

                <div className="teams-estado-opciones">
                  {OPCIONES.map(([v, t]) => (
                    <button
                      type="button"
                      key={v}
                      className={estado === v ? 'activo ' + v : ''}
                      onClick={() => cambiar(j.id_jugador, v)}
                    >
                      {t}
                    </button>
                  ))}
                </div>

                <div className="teams-jugador-pie">
                  <small className="teams-origen">
                    {origenes[j.id_jugador] === 'web'
                      ? 'Respondido en web'
                      : estado
                        ? 'Marcado por administrador'
                        : 'Sin respuesta'}
                  </small>

                  <div className="teams-acceso-jugador">
                    <span className={
                      'teams-acceso-estado ' +
                      (acceso.tiene_acceso ? 'activo' : acceso.codigo_pendiente ? 'pendiente' : '')
                    }>
                      {acceso.tiene_acceso
                        ? 'Mi Zona activa'
                        : acceso.codigo_pendiente
                          ? 'Código pendiente'
                          : 'Sin acceso'}
                    </span>
                    <button
                      type="button"
                      className="teams-pin-btn"
                      onClick={() => generarCodigo(j)}
                    >
                      {acceso.acceso_creado ? '🔁 Restablecer acceso' : '🔐 Código manual'}
                    </button>
                  </div>
                </div>

                {codigo && (
                  <div className="teams-codigo-alta">
                    <span>Código de un solo uso</span>
                    <strong>{codigo}</strong>
                    <button type="button" onClick={() => copiarCodigo(codigo)}>
                      Copiar
                    </button>
                    <small>Válido durante 48 horas</small>
                  </div>
                )}
              </article>
            )
          })}
        </div>
      )}

      {mensaje && (
        <p className={mensaje.startsWith('Error:') ? 'teams-error' : 'teams-ok'}>
          {mensaje}
        </p>
      )}

      <footer className="teams-convocatoria-acciones">
        <span>
          {plazas && totalElegibles < plazas
            ? 'Faltan ' + (plazas - totalElegibles) + ' apuntados para cubrir las plazas previstas.'
            : plazas && totalElegibles > plazas
              ? (totalElegibles - plazas) + ' jugadores podrán quedar sin seleccionar o como reservas generales.'
              : ' '}
        </span>

        <button
          type="button"
          className="boton boton-principal"
          disabled={guardando || cargando || guardado}
          onClick={guardar}
        >
          {guardando ? 'Guardando…' : guardado ? 'Guardado ✓' : 'Guardar cambios'}
        </button>
      </footer>
    </section>
  )
}
