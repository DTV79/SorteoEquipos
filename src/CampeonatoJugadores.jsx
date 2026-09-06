import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabaseCampeonato } from './lib/supabaseCampeonato'
import './CampeonatoJugadores.css'

export default function CampeonatoJugadores({ codigo, onVolver, onPanelPrincipal }) {
  const [inscripciones, setInscripciones] = useState([])
  const [disponibles, setDisponibles] = useState([])
  const [filtro, setFiltro] = useState('')
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState('')
  const [mensaje, setMensaje] = useState(null)
  const [jugadorExistente, setJugadorExistente] = useState('')
  const [estadoExistente, setEstadoExistente] = useState('inscrito')
  const [nuevo, setNuevo] = useState({ nombre: '', alias: '', estado: 'inscrito' })

  const cargar = useCallback(async () => {
    setCargando(true)
    const { data, error } = await supabaseCampeonato.rpc(
      'admin_listar_inscripciones', { p_codigo: codigo }
    )
    if (error || data?.ok !== true) {
      setMensaje({ tipo: 'error', texto: error?.message || data?.error || 'No se pudieron cargar las inscripciones.' })
    } else {
      setInscripciones(data.inscripciones ?? [])
      setDisponibles(data.disponibles ?? [])
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
