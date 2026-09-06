import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from './lib/supabase'
import { supabaseCampeonato } from './lib/supabaseCampeonato'
import './EquiposCampeonato.css'

function nombreSeparado(nombreOficial) {
  const partes = String(nombreOficial || '').trim().split(/\s+/)
  return { nombre: partes.shift() || 'Jugador', apellidos: partes.join(' ') || null }
}

export default function EquiposCampeonato({ codigo, onVolver, onPanelPrincipal, onAbrirSorteo }) {
  const [datos, setDatos] = useState({ equipos: [], inscritos: [], vinculo: {}, tiene_partidos: false })
  const [sorteos, setSorteos] = useState([])
  const [sorteoId, setSorteoId] = useState('')
  const [bombos, setBombos] = useState([])
  const [asignaciones, setAsignaciones] = useState({})
  const [yaParticipan, setYaParticipan] = useState({})
  const [manual, setManual] = useState({ j1: '', j2: '' })
  const [cargando, setCargando] = useState(true)
  const [procesando, setProcesando] = useState('')
  const [mensaje, setMensaje] = useState(null)

  const cargarCampeonato = useCallback(async () => {
    const { data, error } = await supabaseCampeonato.rpc('admin_obtener_equipos_campeonato', { p_codigo: codigo })
    if (error || data?.ok !== true) throw new Error(error?.message || data?.error || 'No se pudieron cargar los equipos.')
    setDatos(data)
    if (data.vinculo?.sorteo_id) setSorteoId(data.vinculo.sorteo_id)
    return data
  }, [codigo])

  useEffect(() => {
    let cancelado = false
    async function iniciar() {
      try {
        const [, consultaSorteos] = await Promise.all([
          cargarCampeonato(),
          supabase.from('sorteos').select('id,nombre,fecha_evento,estado').order('creado_en', { ascending: false }),
        ])
        if (cancelado) return
        if (consultaSorteos.error) throw consultaSorteos.error
        setSorteos(consultaSorteos.data ?? [])
      } catch (error) {
        if (!cancelado) setMensaje({ tipo: 'error', texto: error.message })
      } finally {
        if (!cancelado) setCargando(false)
      }
    }
    iniciar()
    return () => { cancelado = true }
  }, [cargarCampeonato])

  const sorteo = sorteos.find((item) => String(item.id) === String(sorteoId))
  const jugadoresOcupados = useMemo(() => new Set(datos.equipos.flatMap((e) => [e.id_jugador_1, e.id_jugador_2])), [datos.equipos])
  const disponibles = datos.inscritos.filter((j) => !jugadoresOcupados.has(j.id_jugador))

  async function vincular() {
    if (!sorteo) return
    setProcesando('vincular')
    const { data, error } = await supabaseCampeonato.rpc('admin_vincular_sorteo', { p_codigo: codigo, p_sorteo_id: String(sorteo.id), p_sorteo_nombre: sorteo.nombre })
    setProcesando('')
    if (error || data?.ok !== true) { setMensaje({ tipo: 'error', texto: error?.message || data?.error }); return }
    setDatos((actual) => ({ ...actual, vinculo: { sorteo_id: String(sorteo.id), sorteo_nombre: sorteo.nombre } }))
    setMensaje({ tipo: 'correcto', texto: `Sorteo «${sorteo.nombre}» vinculado.` })
  }

  async function cargarParticipantesSorteo() {
    if (!sorteoId) return
    setProcesando('preparar')
    setMensaje(null)
    try {
      const codigos = datos.inscritos.map((j) => j.id_jugador)
      const [consultaBombos, consultaJugadores] = await Promise.all([
        supabase.from('bombos').select('id,codigo,nombre,orden').eq('sorteo_id', sorteoId).order('orden'),
        codigos.length ? supabase.from('jugadores').select('id,codigo_jugador').in('codigo_jugador', codigos) : Promise.resolve({ data: [], error: null }),
      ])
      if (consultaBombos.error) throw consultaBombos.error
      if (consultaJugadores.error) throw consultaJugadores.error
      const jugadoresSorteo = consultaJugadores.data ?? []
      const ids = jugadoresSorteo.map((j) => j.id)
      const consultaParticipantes = ids.length
        ? await supabase.from('participantes_sorteo').select('jugador_id,bombo_id').eq('sorteo_id', sorteoId).in('jugador_id', ids)
        : { data: [], error: null }
      if (consultaParticipantes.error) throw consultaParticipantes.error
      const codigoPorId = Object.fromEntries(jugadoresSorteo.map((j) => [j.id, j.codigo_jugador]))
      const existentes = {}
      const mapa = {}
      for (const participante of consultaParticipantes.data ?? []) {
        const codigoJugador = codigoPorId[participante.jugador_id]
        if (codigoJugador) { existentes[codigoJugador] = true; mapa[codigoJugador] = participante.bombo_id || '' }
      }
      setBombos(consultaBombos.data ?? [])
      setYaParticipan(existentes)
      setAsignaciones(mapa)
      setMensaje({ tipo: 'correcto', texto: 'Participantes preparados. Asigna un bombo a quienes todavía no estén en el sorteo.' })
    } catch (error) {
      setMensaje({ tipo: 'error', texto: error.message })
    } finally { setProcesando('') }
  }

  async function importarInscritos() {
    const pendientes = datos.inscritos.filter((j) => !yaParticipan[j.id_jugador])
    if (pendientes.some((j) => !asignaciones[j.id_jugador])) {
      setMensaje({ tipo: 'error', texto: 'Selecciona el bombo de todos los jugadores pendientes.' })
      return
    }
    setProcesando('importar')
    try {
      for (const jugador of datos.inscritos) {
        let { data: ficha, error: errorFicha } = await supabase.from('jugadores').select('id').eq('codigo_jugador', jugador.id_jugador).maybeSingle()
        if (errorFicha) throw errorFicha
        if (!ficha) {
          const nombre = nombreSeparado(jugador.nombre_oficial)
          const alta = await supabase.from('jugadores').insert({ codigo_jugador: jugador.id_jugador, nombre: nombre.nombre, apellidos: nombre.apellidos, alias: jugador.alias, activo: true }).select('id').single()
          if (alta.error) throw alta.error
          ficha = alta.data
        }
        const { data: participacion, error: errorBusqueda } = await supabase.from('participantes_sorteo').select('id').eq('sorteo_id', sorteoId).eq('jugador_id', ficha.id).maybeSingle()
        if (errorBusqueda) throw errorBusqueda
        if (!participacion) {
          const altaParticipante = await supabase.from('participantes_sorteo').insert({ sorteo_id: sorteoId, jugador_id: ficha.id, bombo_id: asignaciones[jugador.id_jugador], estado: 'incluido' })
          if (altaParticipante.error) throw altaParticipante.error
        }
      }
      setYaParticipan(Object.fromEntries(datos.inscritos.map((j) => [j.id_jugador, true])))
      setMensaje({ tipo: 'correcto', texto: `${datos.inscritos.length} inscritos disponibles en el sorteo. Los que ya estaban no se han duplicado.` })
    } catch (error) { setMensaje({ tipo: 'error', texto: error.message }) }
    finally { setProcesando('') }
  }

  async function enviarEquiposSorteo() {
    setProcesando('equipos-sorteo')
    try {
      const ejecucion = await supabase.from('ejecuciones_sorteo').select('id,numero_ejecucion').eq('sorteo_id', sorteoId).eq('es_oficial', true).order('numero_ejecucion', { ascending: false }).limit(1).maybeSingle()
      if (ejecucion.error) throw ejecucion.error
      if (!ejecucion.data) throw new Error('El sorteo todavía no tiene una ejecución marcada como oficial.')
      const consultaEquipos = await supabase.from('v_equipos_sorteados').select('equipo_id,miembros').eq('ejecucion_id', ejecucion.data.id).order('numero_equipo')
      if (consultaEquipos.error) throw consultaEquipos.error
      const equipos = (consultaEquipos.data ?? []).map((equipo) => {
        const miembros = Array.isArray(equipo.miembros) ? equipo.miembros : []
        if (miembros.length !== 2) throw new Error('Todos los equipos oficiales deben estar formados exactamente por dos jugadores.')
        return { id_jugador_1: miembros[0]?.codigo_jugador, id_jugador_2: miembros[1]?.codigo_jugador }
      })
      const respuesta = await supabaseCampeonato.rpc('admin_reemplazar_equipos_campeonato', { p_codigo: codigo, p_origen: 'Sorteo', p_sorteo_id: String(sorteoId), p_sorteo_nombre: sorteo?.nombre || datos.vinculo?.sorteo_nombre || '', p_ejecucion_id: String(ejecucion.data.id), p_equipos: equipos })
      if (respuesta.error || respuesta.data?.ok !== true) throw new Error(respuesta.error?.message || respuesta.data?.error || 'No se pudieron guardar los equipos.')
      await cargarCampeonato()
      setMensaje({ tipo: 'correcto', texto: `${equipos.length} equipos enviados al campeonato desde la ejecución oficial.` })
    } catch (error) { setMensaje({ tipo: 'error', texto: error.message }) }
    finally { setProcesando('') }
  }

  async function crearManual(evento) {
    evento.preventDefault()
    if (!manual.j1 || !manual.j2 || manual.j1 === manual.j2) return
    setProcesando('manual')
    const equipos = [...datos.equipos.map((e) => ({ id_jugador_1: e.id_jugador_1, id_jugador_2: e.id_jugador_2 })), { id_jugador_1: manual.j1, id_jugador_2: manual.j2 }]
    const respuesta = await supabaseCampeonato.rpc('admin_reemplazar_equipos_campeonato', { p_codigo: codigo, p_origen: 'Manual', p_sorteo_id: datos.vinculo?.sorteo_id || null, p_sorteo_nombre: datos.vinculo?.sorteo_nombre || null, p_ejecucion_id: datos.vinculo?.ejecucion_id || null, p_equipos: equipos })
    setProcesando('')
    if (respuesta.error || respuesta.data?.ok !== true) { setMensaje({ tipo: 'error', texto: respuesta.error?.message || respuesta.data?.error }); return }
    setManual({ j1: '', j2: '' }); await cargarCampeonato(); setMensaje({ tipo: 'correcto', texto: 'Equipo creado manualmente.' })
  }

  async function eliminarEquipo(equipo) {
    setProcesando(equipo.id_equipo)
    const respuesta = await supabaseCampeonato.rpc('admin_eliminar_equipo_campeonato', { p_codigo: codigo, p_id_equipo: equipo.id_equipo })
    setProcesando('')
    if (respuesta.error || respuesta.data?.ok !== true) { setMensaje({ tipo: 'error', texto: respuesta.error?.message || respuesta.data?.error }); return }
    await cargarCampeonato(); setMensaje({ tipo: 'correcto', texto: 'Equipo eliminado.' })
  }

  return <main className="app app-admin"><section className="panel-admin panel-equipos-campeonato">
    <header className="cabecera-admin"><div><p className="etiqueta">CAMPEONATO</p><h2>Equipos y sorteo</h2><p className="descripcion-admin">{codigo}</p></div><div className="acciones-cabecera-configuracion"><button className="boton boton-secundario" onClick={onVolver}>← Gestión</button><button className="boton boton-secundario" onClick={onPanelPrincipal}>Panel principal</button></div></header>
    {mensaje && <p className={`mensaje-configuracion ${mensaje.tipo}`}>{mensaje.texto}</p>}
    {cargando ? <p className="estado">Cargando…</p> : <>
      <section className="bloque-equipos"><h3>Sorteo vinculado</h3><p>Elige el sorteo que formará los equipos de este campeonato.</p><div className="fila-vinculo-sorteo"><select value={sorteoId} onChange={(e) => setSorteoId(e.target.value)}><option value="">Selecciona un sorteo</option>{sorteos.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}</select><button className="boton boton-secundario" disabled={!sorteo || Boolean(procesando)} onClick={vincular}>{procesando === 'vincular' ? 'Vinculando…' : 'Vincular'}</button></div>
      {datos.vinculo?.sorteo_id === String(sorteoId) && <div className="acciones-sorteo-vinculado"><button className="boton boton-secundario" onClick={cargarParticipantesSorteo} disabled={Boolean(procesando)}>Preparar inscritos para el sorteo</button><button className="boton boton-secundario" onClick={() => onAbrirSorteo(sorteo)} disabled={!sorteo}>Abrir sorteo</button><button className="boton boton-principal" onClick={enviarEquiposSorteo} disabled={Boolean(procesando) || datos.tiene_partidos}>{procesando === 'equipos-sorteo' ? 'Enviando…' : 'Enviar equipos oficiales al campeonato'}</button></div>}</section>
      {bombos.length > 0 && <section className="bloque-equipos"><h3>Inscritos que se enviarán al sorteo</h3><div className="lista-asignacion-bombos">{datos.inscritos.map((j) => <label key={j.id_jugador}><span><b>{j.alias}</b><small>{j.id_jugador}</small></span>{yaParticipan[j.id_jugador] ? <strong>Ya participa</strong> : <select value={asignaciones[j.id_jugador] || ''} onChange={(e) => setAsignaciones({ ...asignaciones, [j.id_jugador]: e.target.value })}><option value="">Selecciona bombo</option>{bombos.map((b) => <option key={b.id} value={b.id}>{b.codigo} · {b.nombre}</option>)}</select>}</label>)}</div><button className="boton boton-principal" onClick={importarInscritos} disabled={Boolean(procesando)}>{procesando === 'importar' ? 'Importando…' : 'Importar inscritos al sorteo'}</button></section>}
      <section className="bloque-equipos"><div className="titulo-equipos-actuales"><div><h3>Equipos del campeonato</h3><p>{datos.equipos.length} equipos · Origen: {datos.vinculo?.origen_ultima_carga || 'Manual/sin definir'}</p></div>{datos.tiene_partidos && <b>Bloqueados porque ya existen partidos</b>}</div><div className="lista-equipos-campeonato">{datos.equipos.map((e, i) => <article key={e.id_equipo}><span>Equipo {i + 1}</span><strong>{e.jugador_1} / {e.jugador_2}</strong><small>{e.id_jugador_1} + {e.id_jugador_2}</small><button className="boton boton-peligro" disabled={datos.tiene_partidos || Boolean(procesando)} onClick={() => eliminarEquipo(e)}>{procesando === e.id_equipo ? 'Eliminando…' : 'Eliminar'}</button></article>)}</div>{datos.equipos.length === 0 && <p className="estado">Todavía no hay equipos.</p>}</section>
      <form className="bloque-equipos alta-equipo-manual" onSubmit={crearManual}><h3>Crear equipo manualmente</h3><p>Alternativa para campeonatos en los que no se utilice sorteo.</p><div><select required value={manual.j1} onChange={(e) => setManual({ ...manual, j1: e.target.value })}><option value="">Primer jugador</option>{disponibles.map((j) => <option key={j.id_jugador} value={j.id_jugador}>{j.alias} · {j.id_jugador}</option>)}</select><select required value={manual.j2} onChange={(e) => setManual({ ...manual, j2: e.target.value })}><option value="">Segundo jugador</option>{disponibles.filter((j) => j.id_jugador !== manual.j1).map((j) => <option key={j.id_jugador} value={j.id_jugador}>{j.alias} · {j.id_jugador}</option>)}</select><button className="boton boton-principal" disabled={datos.tiene_partidos || Boolean(procesando)}>{procesando === 'manual' ? 'Creando…' : 'Crear equipo'}</button></div></form>
    </>}
  </section></main>
}
