import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabaseCampeonato } from './lib/supabaseCampeonato'
import './CampeonatoJugadores.css'

export default function CampeonatoJugadores({ codigo, onVolver, onPanelPrincipal }) {
  const [inscripciones, setInscripciones] = useState([])
  const [disponibles, setDisponibles] = useState([])
  const [solicitudes, setSolicitudes] = useState([])
  const [resoluciones, setResoluciones] = useState({})
  const [filtro, setFiltro] = useState('')
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState('')
  const [mensaje, setMensaje] = useState(null)
  const [jugadorExistente, setJugadorExistente] = useState('')
  const [estadoExistente, setEstadoExistente] = useState('inscrito')
  const [nuevo, setNuevo] = useState({ nombre: '', alias: '', estado: 'inscrito' })
  const [confirmacion, setConfirmacion] = useState(null)

  const cargar = useCallback(async () => {
    setCargando(true)
    const [listado, bandeja] = await Promise.all([
      supabaseCampeonato.rpc('admin_listar_inscripciones', { p_codigo: codigo }),
      supabaseCampeonato.rpc('admin_listar_solicitudes', { p_codigo: codigo }),
    ])

    if (
      listado.error || listado.data?.ok !== true ||
      bandeja.error || bandeja.data?.ok !== true
    ) {
      setMensaje({
        tipo: 'error',
        texto:
          listado.error?.message || listado.data?.error ||
          bandeja.error?.message || bandeja.data?.error ||
          'No se pudieron cargar las inscripciones.',
      })
    } else {
      setInscripciones(listado.data.inscripciones ?? [])
      setDisponibles(listado.data.disponibles ?? [])
      setSolicitudes(bandeja.data.solicitudes ?? [])
      setJugadorExistente('')
    }

    setCargando(false)
  }, [codigo])

  useEffect(() => {
    const temporizador = window.setTimeout(() => cargar(), 0)
    return () => window.clearTimeout(temporizador)
  }, [cargar])

  const visibles = useMemo(() => {
    const texto = filtro.trim().toLowerCase()
    if (!texto) return inscripciones
    return inscripciones.filter((fila) =>
      `${fila.id_jugador} ${fila.nombre_oficial} ${fila.alias} ${fila.estado}`
        .toLowerCase().includes(texto)
    )
  }, [filtro, inscripciones])

  const participantesVisibles = useMemo(
    () => visibles.filter((fila) => fila.estado !== 'baja'),
    [visibles]
  )

  const bajasVisibles = useMemo(
    () => visibles.filter((fila) => fila.estado === 'baja'),
    [visibles]
  )

  const totales = useMemo(() => ({
    inscritos: inscripciones.filter((fila) => fila.estado === 'inscrito').length,
    reservas: inscripciones.filter((fila) => fila.estado === 'reserva').length,
    bajas: inscripciones.filter((fila) => fila.estado === 'baja').length,
  }), [inscripciones])

  const solicitudesPendientes = useMemo(
    () => solicitudes.filter((fila) => fila.estado_gestion === 'pendiente'),
    [solicitudes]
  )

  const solicitudesGestionadas = useMemo(
    () => solicitudes.filter((fila) => fila.estado_gestion !== 'pendiente'),
    [solicitudes]
  )

  async function inscribirExistente(evento) {
    evento.preventDefault()
    if (!jugadorExistente) return

    setGuardando('existente')
    const { data, error } = await supabaseCampeonato.rpc('admin_guardar_inscripcion', {
      p_codigo: codigo,
      p_id_jugador: jugadorExistente,
      p_estado: estadoExistente,
      p_observaciones: null,
    })
    setGuardando('')

    if (error || data?.ok === false) {
      return setMensaje({
        tipo: 'error',
        texto: error?.message || data?.error || 'No se pudo añadir el jugador.',
      })
    }

    setMensaje({ tipo: 'correcto', texto: 'Jugador añadido al campeonato.' })
    await cargar()
  }

  async function crearJugador(evento) {
    evento.preventDefault()
    setGuardando('nuevo')

    const { data, error } = await supabaseCampeonato.rpc('admin_crear_jugador_inscrito', {
      p_codigo: codigo,
      p_nombre: nuevo.nombre,
      p_alias: nuevo.alias,
      p_estado: nuevo.estado,
    })
    setGuardando('')

    if (error || data?.ok !== true) {
      return setMensaje({ tipo: 'error', texto: error?.message || data?.error })
    }

    setNuevo({ nombre: '', alias: '', estado: 'inscrito' })
    setMensaje({ tipo: 'correcto', texto: `Jugador creado con el código ${data.id_jugador}.` })
    await cargar()
  }

  function cambiarResolucion(id, campo, valor) {
    setResoluciones((actual) => ({
      ...actual,
      [id]: { ...actual[id], [campo]: valor },
    }))
  }

  async function resolverSolicitud(solicitud, accion) {
    const edicion = resoluciones[solicitud.id_inscripcion] ?? {}
    const alias = (edicion.alias ?? solicitud.nombre_publico ?? '').trim()

    if (accion !== 'rechazar' && !alias) {
      setMensaje({ tipo: 'error', texto: 'Indica el alias del jugador.' })
      return
    }

    setGuardando(solicitud.id_inscripcion)
    setMensaje(null)

    try {
      if (accion === 'rechazar') {
        const resolucion = await supabaseCampeonato.rpc('admin_resolver_solicitud', {
          p_id_inscripcion: solicitud.id_inscripcion,
          p_accion: 'rechazar',
          p_id_jugador: null,
          p_alias: null,
        })

        if (resolucion.error || resolucion.data?.ok !== true) {
          throw new Error(
            resolucion.error?.message ||
            resolucion.data?.error ||
            'No se pudo rechazar la solicitud.'
          )
        }

        setMensaje({ tipo: 'correcto', texto: 'Solicitud rechazada.' })
        await cargar()
        return
      }

      const estadoCampeonato = accion === 'reserva' ? 'reserva' : 'inscrito'
      let idJugador = edicion.id_jugador || null

      // Primero incorporamos al jugador al campeonato. La solicitud NO se cierra
      // hasta que este paso haya terminado correctamente.
      if (idJugador) {
        const inscripcion = await supabaseCampeonato.rpc('admin_guardar_inscripcion', {
          p_codigo: codigo,
          p_id_jugador: idJugador,
          p_estado: estadoCampeonato,
          p_observaciones: solicitud.observaciones ?? null,
        })

        if (inscripcion.error || inscripcion.data?.ok === false) {
          throw new Error(
            inscripcion.error?.message ||
            inscripcion.data?.error ||
            'No se pudo añadir el jugador al campeonato.'
          )
        }
      } else {
        const alta = await supabaseCampeonato.rpc('admin_crear_jugador_inscrito', {
          p_codigo: codigo,
          p_nombre: solicitud.nombre_completo,
          p_alias: alias,
          p_estado: estadoCampeonato,
        })

        if (alta.error || alta.data?.ok !== true || !alta.data?.id_jugador) {
          throw new Error(
            alta.error?.message ||
            alta.data?.error ||
            'No se pudo crear e inscribir al jugador.'
          )
        }

        idJugador = alta.data.id_jugador
        cambiarResolucion(solicitud.id_inscripcion, 'id_jugador', idJugador)
      }

      // Solo después de estar ya dentro del campeonato cerramos la solicitud.
      const resolucion = await supabaseCampeonato.rpc('admin_resolver_solicitud', {
        p_id_inscripcion: solicitud.id_inscripcion,
        p_accion: accion,
        p_id_jugador: idJugador,
        p_alias: alias,
      })

      if (resolucion.error || resolucion.data?.ok !== true) {
        throw new Error(
          `El jugador ya está añadido al campeonato, pero no se pudo cerrar la solicitud: ${
            resolucion.error?.message ||
            resolucion.data?.error ||
            'error desconocido'
          }`
        )
      }

      setResoluciones((actual) => {
        const copia = { ...actual }
        delete copia[solicitud.id_inscripcion]
        return copia
      })

      setMensaje({
        tipo: 'correcto',
        texto: accion === 'reserva'
          ? `Jugador ${idJugador} añadido como reserva.`
          : `Jugador ${idJugador} admitido e inscrito.`,
      })

      await cargar()
    } catch (error) {
      setMensaje({ tipo: 'error', texto: error.message })
      await cargar()
    } finally {
      setGuardando('')
    }
  }

  async function volverSolicitudAPendientes(solicitud) {
    setGuardando(`solicitud-${solicitud.id_inscripcion}`)
    setMensaje(null)

    const respuesta = await supabaseCampeonato.rpc('admin_deshacer_admision', {
      p_id_inscripcion: solicitud.id_inscripcion,
      p_eliminar_jugador: false,
    })

    setGuardando('')

    if (respuesta.error || respuesta.data?.ok === false) {
      setMensaje({
        tipo: 'error',
        texto:
          respuesta.error?.message ||
          respuesta.data?.error ||
          'No se pudo devolver la solicitud a pendientes.',
      })
      return
    }

    setMensaje({ tipo: 'correcto', texto: 'Solicitud devuelta a pendientes.' })
    await cargar()
  }

  async function guardarFila(evento, fila) {
    evento.preventDefault()
    const datos = new FormData(evento.currentTarget)
    setGuardando(fila.id_jugador)

    const jugador = await supabaseCampeonato.rpc('admin_actualizar_jugador', {
      p_id_jugador: fila.id_jugador,
      p_nombre: datos.get('nombre'),
      p_alias: datos.get('alias'),
      p_activo: datos.get('activo') === 'on',
    })

    if (jugador.error) {
      setGuardando('')
      return setMensaje({ tipo: 'error', texto: jugador.error.message })
    }

    const inscripcion = await supabaseCampeonato.rpc('admin_guardar_inscripcion', {
      p_codigo: codigo,
      p_id_jugador: fila.id_jugador,
      p_estado: datos.get('estado'),
      p_observaciones: datos.get('observaciones'),
    })
    setGuardando('')

    if (inscripcion.error || inscripcion.data?.ok === false) {
      return setMensaje({
        tipo: 'error',
        texto: inscripcion.error?.message || inscripcion.data?.error,
      })
    }

    setMensaje({ tipo: 'correcto', texto: `${datos.get('alias')} actualizado.` })
    await cargar()
  }

  async function ejecutarCorreccion() {
    if (!confirmacion) return

    const { tipo, fila, solicitud } = confirmacion
    setGuardando(`corregir-${fila.id_jugador}`)
    let respuesta

    if (tipo === 'baja' || tipo === 'reactivar') {
      respuesta = await supabaseCampeonato.rpc('admin_guardar_inscripcion', {
        p_codigo: codigo,
        p_id_jugador: fila.id_jugador,
        p_estado: tipo === 'baja' ? 'baja' : 'inscrito',
        p_observaciones: fila.observaciones,
      })
    } else if (tipo === 'quitar') {
      respuesta = await supabaseCampeonato.rpc('admin_quitar_jugador_campeonato', {
        p_codigo: codigo,
        p_id_jugador: fila.id_jugador,
      })
    } else {
      respuesta = await supabaseCampeonato.rpc('admin_deshacer_admision', {
        p_id_inscripcion: solicitud.id_inscripcion,
        p_eliminar_jugador: tipo === 'eliminar',
      })
    }

    setGuardando('')

    if (respuesta.error || respuesta.data?.ok === false) {
      setMensaje({
        tipo: 'error',
        texto:
          respuesta.error?.message ||
          respuesta.data?.error ||
          'No se pudo realizar la corrección.',
      })
      return
    }

    setConfirmacion(null)
    setMensaje({
      tipo: 'correcto',
      texto:
        tipo === 'baja'
          ? `${fila.alias} queda de baja en este campeonato.`
          : tipo === 'reactivar'
            ? `${fila.alias} vuelve a estar inscrito.`
            : tipo === 'quitar'
              ? (respuesta.data?.solicitud_recuperada
                  ? 'Jugador retirado y solicitud devuelta a pendientes.'
                  : 'Jugador retirado del campeonato.')
              : tipo === 'eliminar'
                ? 'Alta deshecha y jugador creado por error eliminado.'
                : 'Admisión deshecha. La solicitud vuelve a pendientes.',
    })
    await cargar()
  }

  function pintarJugador(fila) {
    return (
      <form
        className={`fila-inscripcion estado-${fila.estado}`}
        key={fila.id_jugador}
        onSubmit={(e) => guardarFila(e, fila)}
      >
        <div className="identidad-inscripcion">
          <b>{fila.id_jugador}</b>
          <span>{fila.alias}</span>
        </div>

        <label><span>Nombre oficial</span><input name="nombre" defaultValue={fila.nombre_oficial} required /></label>
        <label><span>Alias</span><input name="alias" defaultValue={fila.alias} required /></label>
        <label>
          <span>Estado en este campeonato</span>
          <select name="estado" defaultValue={fila.estado}>
            <option value="inscrito">Inscrito</option>
            <option value="reserva">Reserva</option>
            <option value="baja">Baja</option>
          </select>
        </label>
        <label><span>Observaciones</span><input name="observaciones" defaultValue={fila.observaciones ?? ''} /></label>
        <label className="jugador-activo">
          <input type="checkbox" name="activo" defaultChecked={fila.jugador_activo} />
          <span>Activo en el histórico general</span>
        </label>

        <div className="acciones-fila-jugador">
          <button className="boton boton-secundario" disabled={guardando === fila.id_jugador}>
            {guardando === fila.id_jugador ? 'Guardando…' : 'Guardar cambios'}
          </button>
          {fila.estado === 'baja' ? (
            <button type="button" className="boton boton-principal" onClick={() => setConfirmacion({ tipo: 'reactivar', fila })}>Reactivar</button>
          ) : (
            <button type="button" className="boton boton-peligro" onClick={() => setConfirmacion({ tipo: 'baja', fila })}>Dar de baja</button>
          )}
          <button type="button" className="boton boton-peligro" onClick={() => setConfirmacion({ tipo: 'quitar', fila })}>Quitar del campeonato</button>
        </div>
      </form>
    )
  }

  function textoEstadoGestion(estado) {
    if (estado === 'admitido' || estado === 'admitida') return 'Admitida'
    if (estado === 'reserva') return 'Reserva'
    if (estado === 'rechazado' || estado === 'rechazada') return 'Rechazada'
    return estado || 'Gestionada'
  }

  return (
    <main className="app app-admin app-jugadores-campeonato">
      <section className="panel-admin panel-jugadores-campeonato">
        <header className="cabecera-admin cabecera-jugadores-campeonato">
          <div>
            <p className="etiqueta">CAMPEONATO</p>
            <h2>Jugadores e inscripciones</h2>
            <p className="descripcion-admin">{codigo}</p>
          </div>
          <div className="acciones-cabecera-configuracion">
            <button type="button" className="boton boton-secundario" onClick={onVolver}>← Gestión</button>
            <button type="button" className="boton boton-secundario" onClick={onPanelPrincipal}>Panel principal</button>
          </div>
        </header>

        <div className="resumen-inscripciones">
          <div><strong>{totales.inscritos}</strong><span>Inscritos</span></div>
          <div><strong>{totales.reservas}</strong><span>Reservas</span></div>
          <div><strong>{totales.bajas}</strong><span>Bajas</span></div>
        </div>

        <section className="bandeja-solicitudes">
          <div className="titulo-bandeja">
            <div>
              <h3>Solicitudes del formulario</h3>
              <p>Primero se añade el jugador al campeonato y solo después se cierra la solicitud.</p>
            </div>
            <strong>{solicitudesPendientes.length} pendientes</strong>
          </div>

          {solicitudesPendientes.length === 0 ? (
            <p className="estado-sin-solicitudes">No hay solicitudes pendientes.</p>
          ) : solicitudesPendientes.map((fila) => {
            const edicion = resoluciones[fila.id_inscripcion] ?? {}
            return (
              <article className="solicitud-inscripcion" key={fila.id_inscripcion}>
                <div className="datos-solicitud">
                  <strong>{fila.nombre_completo}</strong>
                  <span>Tel. {fila.telefono || 'Sin teléfono'}{fila.posicion ? ` · Solicitud nº ${fila.posicion}` : ''}</span>
                  {fila.observaciones && <small>{fila.observaciones}</small>}
                </div>

                <label>
                  <span>Alias</span>
                  <input
                    value={edicion.alias ?? fila.nombre_publico ?? ''}
                    onChange={(e) => cambiarResolucion(fila.id_inscripcion, 'alias', e.target.value)}
                  />
                </label>

                <label>
                  <span>Jugador</span>
                  <select
                    value={edicion.id_jugador ?? ''}
                    onChange={(e) => cambiarResolucion(fila.id_inscripcion, 'id_jugador', e.target.value)}
                  >
                    <option value="">Crear jugador nuevo (Jxxx)</option>
                    {[...inscripciones, ...disponibles]
                      .sort((a, b) => a.id_jugador.localeCompare(b.id_jugador))
                      .map((jugador) => (
                        <option key={jugador.id_jugador} value={jugador.id_jugador}>
                          {jugador.id_jugador} · {jugador.alias} · {jugador.nombre_oficial}
                        </option>
                      ))}
                  </select>
                </label>

                <div className="acciones-solicitud">
                  <button type="button" className="boton boton-principal" disabled={guardando === fila.id_inscripcion} onClick={() => resolverSolicitud(fila, 'admitir')}>
                    {guardando === fila.id_inscripcion ? 'Procesando…' : 'Admitir'}
                  </button>
                  <button type="button" className="boton boton-secundario" disabled={guardando === fila.id_inscripcion} onClick={() => resolverSolicitud(fila, 'reserva')}>Reserva</button>
                  <button type="button" className="boton boton-peligro" disabled={guardando === fila.id_inscripcion} onClick={() => resolverSolicitud(fila, 'rechazar')}>Rechazar</button>
                </div>
              </article>
            )
          })}

          {solicitudesGestionadas.length > 0 && (
            <div className="solicitudes-gestionadas">
              <div className="titulo-gestionadas">
                <h4>Solicitudes ya gestionadas</h4>
                <span>{solicitudesGestionadas.length}</span>
              </div>
              {solicitudesGestionadas.map((fila) => (
                <article className="solicitud-gestionada" key={`gestionada-${fila.id_inscripcion}`}>
                  <div>
                    <strong>{fila.nombre_completo}</strong>
                    <span>
                      {fila.posicion ? `Solicitud nº ${fila.posicion} · ` : ''}
                      {textoEstadoGestion(fila.estado_gestion)}
                      {fila.id_jugador ? ` · ${fila.id_jugador}` : ''}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="boton boton-secundario"
                    disabled={guardando === `solicitud-${fila.id_inscripcion}`}
                    onClick={() => volverSolicitudAPendientes(fila)}
                  >
                    {guardando === `solicitud-${fila.id_inscripcion}` ? 'Recuperando…' : 'Volver a pendientes'}
                  </button>
                </article>
              ))}
            </div>
          )}
        </section>

        <div className="altas-inscripciones">
          <form onSubmit={inscribirExistente}>
            <h3>Inscribir jugador existente</h3>
            <select value={jugadorExistente} onChange={(e) => setJugadorExistente(e.target.value)} required>
              <option value="">Selecciona un jugador</option>
              {disponibles.map((fila) => <option key={fila.id_jugador} value={fila.id_jugador}>{fila.alias} · {fila.nombre_oficial}</option>)}
            </select>
            <select value={estadoExistente} onChange={(e) => setEstadoExistente(e.target.value)}>
              <option value="inscrito">Inscrito</option>
              <option value="reserva">Reserva</option>
            </select>
            <button className="boton boton-principal" disabled={guardando === 'existente'}>{guardando === 'existente' ? 'Añadiendo…' : 'Añadir'}</button>
          </form>

          <form onSubmit={crearJugador}>
            <h3>Crear jugador nuevo</h3>
            <input placeholder="Nombre oficial" value={nuevo.nombre} onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })} required />
            <input placeholder="Alias visible" value={nuevo.alias} onChange={(e) => setNuevo({ ...nuevo, alias: e.target.value })} required />
            <select value={nuevo.estado} onChange={(e) => setNuevo({ ...nuevo, estado: e.target.value })}>
              <option value="inscrito">Inscrito</option>
              <option value="reserva">Reserva</option>
            </select>
            <button className="boton boton-principal" disabled={guardando === 'nuevo'}>{guardando === 'nuevo' ? 'Creando…' : 'Crear jugador'}</button>
          </form>
        </div>

        {mensaje && <p className={`mensaje-configuracion ${mensaje.tipo}`}>{mensaje.texto}</p>}

        <div className="barra-listado-jugadores">
          <strong>{inscripciones.length} jugadores en el campeonato</strong>
          <input type="search" value={filtro} onChange={(e) => setFiltro(e.target.value)} placeholder="Buscar jugador" />
        </div>

        {cargando ? (
          <p className="estado">Cargando jugadores…</p>
        ) : (
          <div className="bloques-jugadores">
            <section>
              <div className="titulo-listado-estado"><h3>Participantes y reservas</h3><strong>{participantesVisibles.length}</strong></div>
              <div className="lista-inscripciones">
                {participantesVisibles.length ? participantesVisibles.map(pintarJugador) : <p className="estado-sin-solicitudes">No hay participantes que coincidan.</p>}
              </div>
            </section>
            <section className="bloque-bajas">
              <div className="titulo-listado-estado"><h3>Bajas</h3><strong>{bajasVisibles.length}</strong></div>
              <div className="lista-inscripciones">
                {bajasVisibles.length ? bajasVisibles.map(pintarJugador) : <p className="estado-sin-solicitudes">No hay bajas que coincidan.</p>}
              </div>
            </section>
          </div>
        )}
      </section>

      {confirmacion && (
        <div className="fondo-modal-jugador" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) setConfirmacion(null) }}>
          <section className="modal-jugador" role="dialog" aria-modal="true" aria-labelledby="titulo-confirmacion-jugador">
            <h3 id="titulo-confirmacion-jugador">
              {confirmacion.tipo === 'baja' ? 'Dar de baja' : confirmacion.tipo === 'reactivar' ? 'Reactivar jugador' : confirmacion.tipo === 'quitar' ? 'Quitar del campeonato' : confirmacion.tipo === 'eliminar' ? 'Eliminar alta equivocada' : 'Deshacer admisión'}
            </h3>
            <p>
              {confirmacion.tipo === 'baja'
                ? `${confirmacion.fila.alias} dejará de participar en este campeonato, pero conservará su código y su histórico.`
                : confirmacion.tipo === 'reactivar'
                  ? `${confirmacion.fila.alias} volverá a figurar como inscrito en este campeonato.`
                  : confirmacion.tipo === 'quitar'
                    ? `${confirmacion.fila.alias} se quitará de este campeonato. Si llegó desde el formulario, su solicitud volverá a pendientes; si llegó desde Excel o manualmente, quedará como jugador general no inscrito.`
                    : confirmacion.tipo === 'eliminar'
                      ? `Se devolverá la solicitud de ${confirmacion.fila.alias} a pendientes y se eliminará su código porque fue creado por error. Solo se permitirá si todavía no tiene datos relacionados.`
                      : `La solicitud de ${confirmacion.fila.alias} volverá a pendientes. Su código de jugador se conservará.`}
            </p>
            <div>
              <button type="button" className="boton boton-secundario" onClick={() => setConfirmacion(null)}>Cancelar</button>
              <button type="button" className={`boton ${['deshacer', 'reactivar'].includes(confirmacion.tipo) ? 'boton-principal' : 'boton-peligro'}`} onClick={ejecutarCorreccion} disabled={guardando.startsWith('corregir-')}>
                {guardando.startsWith('corregir-') ? 'Procesando…' : 'Confirmar'}
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  )
}
