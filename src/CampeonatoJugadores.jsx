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

  const cargar = useCallback(async () => {
    setCargando(true)
    const [listado, bandeja] = await Promise.all([
      supabaseCampeonato.rpc('admin_listar_inscripciones', { p_codigo: codigo }),
      supabaseCampeonato.rpc('admin_listar_solicitudes', { p_codigo: codigo }),
    ])
    if (listado.error || listado.data?.ok !== true || bandeja.error || bandeja.data?.ok !== true) {
      setMensaje({ tipo: 'error', texto: listado.error?.message || listado.data?.error || bandeja.error?.message || bandeja.data?.error || 'No se pudieron cargar las inscripciones.' })
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

  const totales = useMemo(() => ({
    inscritos: inscripciones.filter((fila) => fila.estado === 'inscrito').length,
    reservas: inscripciones.filter((fila) => fila.estado === 'reserva').length,
    bajas: inscripciones.filter((fila) => fila.estado === 'baja').length,
  }), [inscripciones])

  async function inscribirExistente(evento) {
    evento.preventDefault()
    if (!jugadorExistente) return
    setGuardando('existente')
    const { error } = await supabaseCampeonato.rpc('admin_guardar_inscripcion', {
      p_codigo: codigo, p_id_jugador: jugadorExistente,
      p_estado: estadoExistente, p_observaciones: null,
    })
    setGuardando('')
    if (error) return setMensaje({ tipo: 'error', texto: error.message })
    setMensaje({ tipo: 'correcto', texto: 'Jugador añadido al campeonato.' })
    await cargar()
  }

  async function crearJugador(evento) {
    evento.preventDefault()
    setGuardando('nuevo')
    const { data, error } = await supabaseCampeonato.rpc('admin_crear_jugador_inscrito', {
      p_codigo: codigo, p_nombre: nuevo.nombre,
      p_alias: nuevo.alias, p_estado: nuevo.estado,
    })
    setGuardando('')
    if (error || data?.ok !== true) return setMensaje({ tipo: 'error', texto: error?.message || data?.error })
    setNuevo({ nombre: '', alias: '', estado: 'inscrito' })
    setMensaje({ tipo: 'correcto', texto: `Jugador creado con el código ${data.id_jugador}.` })
    await cargar()
  }

  function cambiarResolucion(id, campo, valor) {
    setResoluciones((actual) => ({ ...actual, [id]: { ...actual[id], [campo]: valor } }))
  }

  async function resolverSolicitud(solicitud, accion) {
    const edicion = resoluciones[solicitud.id_inscripcion] ?? {}
    const alias = (edicion.alias ?? solicitud.nombre_publico ?? '').trim()
    if (accion !== 'rechazar' && !alias) return setMensaje({ tipo: 'error', texto: 'Indica el alias del jugador.' })
    setGuardando(solicitud.id_inscripcion)
    const { data, error } = await supabaseCampeonato.rpc('admin_resolver_solicitud', {
      p_id_inscripcion: solicitud.id_inscripcion, p_accion: accion,
      p_id_jugador: edicion.id_jugador || null, p_alias: alias || null,
    })
    setGuardando('')
    if (error || data?.ok !== true) return setMensaje({ tipo: 'error', texto: error?.message || data?.error || 'No se pudo resolver la solicitud.' })
    setMensaje({ tipo: 'correcto', texto: accion === 'rechazar' ? 'Solicitud marcada como rechazada.' : `Solicitud tramitada con el código ${data.id_jugador}.` })
    await cargar()
  }

  async function guardarFila(evento, fila) {
    evento.preventDefault()
    const datos = new FormData(evento.currentTarget)
    setGuardando(fila.id_jugador)
    const jugador = await supabaseCampeonato.rpc('admin_actualizar_jugador', {
      p_id_jugador: fila.id_jugador,
      p_nombre: datos.get('nombre'), p_alias: datos.get('alias'),
      p_activo: datos.get('activo') === 'on',
    })
    if (jugador.error) {
      setGuardando('')
      return setMensaje({ tipo: 'error', texto: jugador.error.message })
    }
    const inscripcion = await supabaseCampeonato.rpc('admin_guardar_inscripcion', {
      p_codigo: codigo, p_id_jugador: fila.id_jugador,
      p_estado: datos.get('estado'), p_observaciones: datos.get('observaciones'),
    })
    setGuardando('')
    if (inscripcion.error) return setMensaje({ tipo: 'error', texto: inscripcion.error.message })
    setMensaje({ tipo: 'correcto', texto: `${datos.get('alias')} actualizado.` })
    await cargar()
  }

  return (
    <main className="app app-admin app-jugadores-campeonato">
      <section className="panel-admin panel-jugadores-campeonato">
        <header className="cabecera-admin cabecera-jugadores-campeonato">
          <div><p className="etiqueta">CAMPEONATO</p><h2>Jugadores e inscripciones</h2><p className="descripcion-admin">{codigo}</p></div>
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
          <div className="titulo-bandeja"><div><h3>Solicitudes del formulario</h3><p>Vincula a un jugador existente o crea automáticamente el siguiente código Jxxx.</p></div><strong>{solicitudes.filter((fila) => fila.estado_gestion === 'pendiente').length} pendientes</strong></div>
          {solicitudes.filter((fila) => fila.estado_gestion === 'pendiente').length === 0 ? <p className="estado-sin-solicitudes">No hay solicitudes pendientes.</p> : solicitudes.filter((fila) => fila.estado_gestion === 'pendiente').map((fila) => {
            const edicion = resoluciones[fila.id_inscripcion] ?? {}
            return <article className="solicitud-inscripcion" key={fila.id_inscripcion}>
              <div className="datos-solicitud"><strong>{fila.nombre_completo}</strong><span>{fila.telefono || 'Sin teléfono'} · {fila.estado_origen || 'Sin estado'}{fila.posicion ? ` · Posición ${fila.posicion}` : ''}</span>{fila.observaciones && <small>{fila.observaciones}</small>}</div>
              <label><span>Alias</span><input value={edicion.alias ?? fila.nombre_publico ?? ''} onChange={(e) => cambiarResolucion(fila.id_inscripcion, 'alias', e.target.value)} /></label>
              <label><span>Jugador</span><select value={edicion.id_jugador ?? ''} onChange={(e) => cambiarResolucion(fila.id_inscripcion, 'id_jugador', e.target.value)}><option value="">Crear jugador nuevo (Jxxx)</option>{[...inscripciones, ...disponibles].sort((a, b) => a.id_jugador.localeCompare(b.id_jugador)).map((jugador) => <option key={jugador.id_jugador} value={jugador.id_jugador}>{jugador.id_jugador} · {jugador.alias} · {jugador.nombre_oficial}</option>)}</select></label>
              <div className="acciones-solicitud"><button type="button" className="boton boton-principal" disabled={guardando === fila.id_inscripcion} onClick={() => resolverSolicitud(fila, 'admitir')}>Admitir</button><button type="button" className="boton boton-secundario" disabled={guardando === fila.id_inscripcion} onClick={() => resolverSolicitud(fila, 'reserva')}>Reserva</button><button type="button" className="boton boton-peligro" disabled={guardando === fila.id_inscripcion} onClick={() => resolverSolicitud(fila, 'rechazar')}>Rechazar</button></div>
            </article>
          })}
        </section>

        <div className="altas-inscripciones">
          <form onSubmit={inscribirExistente}>
            <h3>Inscribir jugador existente</h3>
            <select value={jugadorExistente} onChange={(e) => setJugadorExistente(e.target.value)} required>
              <option value="">Selecciona un jugador</option>
              {disponibles.map((fila) => <option key={fila.id_jugador} value={fila.id_jugador}>{fila.alias} · {fila.nombre_oficial}</option>)}
            </select>
            <select value={estadoExistente} onChange={(e) => setEstadoExistente(e.target.value)}><option value="inscrito">Inscrito</option><option value="reserva">Reserva</option></select>
            <button className="boton boton-principal" disabled={guardando === 'existente'}>{guardando === 'existente' ? 'Añadiendo…' : 'Añadir'}</button>
          </form>

          <form onSubmit={crearJugador}>
            <h3>Crear jugador nuevo</h3>
            <input placeholder="Nombre oficial" value={nuevo.nombre} onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })} required />
            <input placeholder="Alias visible" value={nuevo.alias} onChange={(e) => setNuevo({ ...nuevo, alias: e.target.value })} required />
            <select value={nuevo.estado} onChange={(e) => setNuevo({ ...nuevo, estado: e.target.value })}><option value="inscrito">Inscrito</option><option value="reserva">Reserva</option></select>
            <button className="boton boton-principal" disabled={guardando === 'nuevo'}>{guardando === 'nuevo' ? 'Creando…' : 'Crear jugador'}</button>
          </form>
        </div>

        {mensaje && <p className={`mensaje-configuracion ${mensaje.tipo}`}>{mensaje.texto}</p>}
        <div className="barra-listado-jugadores"><strong>{inscripciones.length} jugadores en el campeonato</strong><input type="search" value={filtro} onChange={(e) => setFiltro(e.target.value)} placeholder="Buscar jugador" /></div>
        {cargando ? <p className="estado">Cargando jugadores…</p> : (
          <div className="lista-inscripciones">
            {visibles.map((fila) => (
              <form className={`fila-inscripcion estado-${fila.estado}`} key={fila.id_jugador} onSubmit={(e) => guardarFila(e, fila)}>
                <div className="identidad-inscripcion"><b>{fila.id_jugador}</b><span>{fila.alias}</span></div>
                <label><span>Nombre oficial</span><input name="nombre" defaultValue={fila.nombre_oficial} required /></label>
                <label><span>Alias</span><input name="alias" defaultValue={fila.alias} required /></label>
                <label><span>Estado en este campeonato</span><select name="estado" defaultValue={fila.estado}><option value="inscrito">Inscrito</option><option value="reserva">Reserva</option><option value="baja">Baja</option></select></label>
                <label><span>Observaciones</span><input name="observaciones" defaultValue={fila.observaciones ?? ''} /></label>
                <label className="jugador-activo"><input type="checkbox" name="activo" defaultChecked={fila.jugador_activo} /><span>Activo en el histórico general</span></label>
                <button className="boton boton-secundario" disabled={guardando === fila.id_jugador}>{guardando === fila.id_jugador ? 'Guardando…' : 'Guardar cambios'}</button>
              </form>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
