import { useEffect, useState } from 'react'
import './TeamsAdmin.css'
import CrearTeams from './components/CrearTeams'
import { listarTeams } from './teamsApi'

export default function TeamsAdmin({ onVolver }) {
  const [lista, setLista] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [pantalla, setPantalla] = useState('inicio')

  async function cargar() {
    setCargando(true); setError('')
    try { setLista(await listarTeams()) } catch (e) { setError(e.message) }
    finally { setCargando(false) }
  }
  useEffect(() => { void cargar() }, [])

  if (pantalla === 'crear') return <CrearTeams onCancelar={() => setPantalla('inicio')} onCreado={async () => { setPantalla('inicio'); await cargar() }} />

  return <main className="teams-admin">
    <header className="teams-cabecera">
      <button className="boton-volver" onClick={onVolver}>← Panel principal</button>
      <div><p className="etiqueta">SPRINT PÁDEL · ADMINISTRACIÓN</p><h1>Teams</h1><p>Copa por equipos</p></div>
      <button className="boton boton-principal" onClick={() => setPantalla('crear')}>＋ Crear Teams</button>
    </header>
    {error && <p className="teams-error">{error}</p>}
    <section className="teams-listado">
      {cargando ? <div className="teams-vacio">Cargando Teams…</div> : lista.length === 0 ? <div className="teams-vacio"><strong>Todavía no hay ningún Teams</strong><span>Crea la primera edición para preparar convocatoria, equipos y reglas.</span></div> : lista.map(t => <article className="teams-tarjeta" key={t.id}><div><span className={'teams-estado estado-' + t.estado}>{t.estado.replaceAll('_', ' ')}</span><h2>{t.nombre}</h2><p>{t.metodo_formacion} · {t.modalidad} · {t.numero_partidos} partidos</p></div><button className="boton boton-secundario" disabled>Gestionar</button></article>)}
    </section>
  </main>
}
