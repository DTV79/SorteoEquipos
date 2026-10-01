import { useEffect, useState } from 'react'
import './TeamsAdmin.css'
import CrearTeams from './components/CrearTeams'
import GestionTeams from './components/GestionTeams'
import { listarTeams } from './teamsApi'

const etiquetaMetodo = metodo => ({
  manual:'Manual',
  draft:'Draft de capitanes',
  sorteo:'Sorteo',
  predeterminado:'Equipos predeterminados',
}[metodo] || metodo)

export default function TeamsAdmin({ onVolver }) {
  const [lista, setLista] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [pantalla, setPantalla] = useState('inicio')
  const [teamsActivo, setTeamsActivo] = useState(null)

  async function cargar() {
    setCargando(true); setError('')
    try { setLista(await listarTeams()) } catch (e) { setError(e.message) }
    finally { setCargando(false) }
  }
  useEffect(() => { void cargar() }, [])

  if (pantalla === 'crear') return <CrearTeams onCancelar={() => setPantalla('inicio')} onCreado={async () => { setPantalla('inicio'); await cargar() }} />
  if (pantalla === 'gestionar' && teamsActivo) return <GestionTeams teams={teamsActivo} onVolver={() => { setTeamsActivo(null); setPantalla('inicio') }} />

  return <main className="teams-admin">
    <header className="teams-cabecera">
      <button className="boton-volver" onClick={onVolver}>← Panel principal</button>
      <div><p className="etiqueta">SPRINT PÁDEL · ADMINISTRACIÓN</p><h1>Teams</h1><p>Copa por equipos</p></div>
      <button className="boton boton-principal" onClick={() => setPantalla('crear')}>＋ Crear Teams</button>
    </header>
    {error && <p className="teams-error">{error}</p>}
    <section className="teams-listado">
      {cargando ? <div className="teams-vacio">Cargando Teams…</div> : lista.length === 0 ? <div className="teams-vacio"><strong>Todavía no hay ningún Teams</strong><span>Crea la primera edición para preparar convocatoria, equipos y reglas.</span></div> : lista.map(t => <article className="teams-tarjeta teams-tarjeta-resumen" key={t.id}><div className="teams-tarjeta-principal"><span className={'teams-estado estado-' + t.estado}>{t.estado.replaceAll('_', ' ')}</span><h2>{t.nombre}</h2><p>{etiquetaMetodo(t.metodo_formacion)} · {t.modalidad} · {t.numero_partidos} partidos</p><div className="teams-resumen-listado"><span><b>Fechas:</b> {t.fecha_inicio||'Sin inicio'} → {t.fecha_fin||'Sin fecha fin'}</span><span><b>Plantilla:</b> {t.jugadores_por_equipo} jugadores + {t.reservas_por_equipo||0} reservas/equipo</span><span><b>Participación:</b> {t.repetir_jugadores==='no'?'sin repetir jugadores':t.repetir_jugadores==='maximo'?'máx. '+t.max_partidos_jugador+' partidos/jugador':'se pueden repetir jugadores'} · {t.repetir_pareja?'parejas repetibles':'sin repetir pareja'} · {t.todos_antes_repetir?'todos juegan antes de repetir':'sin obligación de rotación previa'}</span><span><b>Parejas:</b> {t.sistema_eleccion_parejas} · publicación {t.modo_publicacion}</span><span><b>Computa:</b> Estadísticas {t.computa_estadisticas?'Sí':'No'} · Ranking {t.computa_ranking?'Sí':'No'} · ISP {t.computa_isp?'Sí':'No'}</span></div></div><div className="teams-tarjeta-acciones"><button className="boton boton-principal" onClick={() => { setTeamsActivo(t); setPantalla('gestionar') }}>Revisar / modificar</button></div></article>)}
    </section>
  </main>
}
