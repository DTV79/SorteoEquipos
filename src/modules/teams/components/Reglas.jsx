import { useEffect, useState } from 'react'
import {
  guardarReglasTeams,
  marcarReglasRevisadasTeams,
  obtenerDetalleTeams
} from '../teamsApi'

function Info({ texto }) {
  return (
    <span className="teams-info" tabIndex="0" aria-label={texto}>
      i
      <span className="teams-info-popover">{texto}</span>
    </span>
  )
}

const FORMACION_INFO = {
  manual: 'Todos se apuntan a una bolsa común. Después el administrador reparte los jugadores entre los dos equipos.',
  draft: 'Todos se apuntan a una bolsa común. Se eligen dos capitanes y estos seleccionan jugadores según el tipo de draft.',
  sorteo: 'Todos se apuntan a una bolsa común y los equipos se forman mediante sorteo.',
  predeterminado: 'Los equipos existen antes de la convocatoria. Cada jugador queda vinculado a uno de los dos lados.'
}

export default function Reglas({ teams, onCambio }) {
  const [f,setF] = useState(null)
  const [guardado,setGuardado] = useState(true)
  const [revisadas,setRevisadas] = useState(false)
  const [guardando,setGuardando] = useState(false)
  const [mensaje,setMensaje] = useState('')

  useEffect(() => {
    ;(async () => {
      try {
        const d = await obtenerDetalleTeams(teams.id)
        const t = d.teams
        const ea = (d.equipos || []).find(e => e.lado === 'A')
        const eb = (d.equipos || []).find(e => e.lado === 'B')

        setF({
          ...t,
          ...(t.configuracion || {}),
          nombre_equipo_a: ea?.nombre || t.configuracion?.nombre_equipo_a || 'Equipo A',
          nombre_equipo_b: eb?.nombre || t.configuracion?.nombre_equipo_b || 'Equipo B',
          color_equipo_a: ea?.color || t.configuracion?.color_equipo_a || '#22c55e',
          color_equipo_b: eb?.color || t.configuracion?.color_equipo_b || '#3b82f6',
          asignacion_predeterminada:
            t.configuracion?.asignacion_predeterminada || 'admin',
          modo_designacion_capitanes:
            t.configuracion?.modo_designacion_capitanes || 'administrador',
          modo_inicio_teams:
            t.configuracion?.modo_inicio_teams || 'administrador',
          inicio_programado_at:
            t.configuracion?.inicio_programado_at || ''
        })

        setRevisadas(Boolean(t.reglas_revisadas))
      } catch (e) {
        setMensaje('Error: ' + e.message)
      }
    })()
  }, [teams.id])

  function set(k,v) {
    setF(x => ({...x,[k]:v}))
    setGuardado(false)
    setRevisadas(false)
    setMensaje('')
  }

  function errorViabilidad() {
    const j = Number(f.jugadores_por_equipo) || 0
    const p = Number(f.numero_partidos) || 0

    if (j < 2) return 'Cada equipo necesita al menos 2 jugadores.'

    let max = Infinity

    if (f.repetir_jugadores === 'no') {
      max = Math.floor(j / 2)
    }

    if (f.repetir_jugadores === 'maximo') {
      const x = Number(f.max_partidos_jugador) || 0
      if (!x) return 'Indica el máximo de partidos por jugador.'
      max = Math.floor(j * x / 2)
    }

    if (!f.repetir_pareja) {
      max = Math.min(max,j*(j-1)/2)
    }

    if (
      f.metodo_formacion === 'predeterminado' &&
      (!String(f.nombre_equipo_a || '').trim() || !String(f.nombre_equipo_b || '').trim())
    ) {
      return 'Escribe el nombre de los dos equipos predeterminados.'
    }

    if (
      f.metodo_formacion === 'draft' &&
      ['eleccion_equipo','sorteo'].includes(f.modo_designacion_capitanes)
    ) {
      return 'En un Draft los capitanes deben estar definidos antes de formar los equipos. Usa Administrador o Definidos de antemano.'
    }

    if (
      f.modo_inicio_teams === 'programado' &&
      !String(f.inicio_programado_at || '').trim()
    ) {
      return 'Indica la fecha y hora del inicio programado.'
    }

    return p > max
      ? 'Con estas reglas solo son posibles ' + max + ' partidos por equipo y hay ' + p + ' configurados. Modifica el número de partidos o las reglas de participación.'
      : ''
  }

  async function guardar() {
    const ev = errorViabilidad()
    if (ev) return setMensaje('Error: ' + ev)

    setGuardando(true)
    setMensaje('')

    try {
      await guardarReglasTeams(teams.id,f)
      setGuardado(true)
      setMensaje('Reglas guardadas correctamente.')
      onCambio?.()
    } catch (e) {
      setMensaje('Error: ' + e.message)
    } finally {
      setGuardando(false)
    }
  }

  async function revisar() {
    const ev = errorViabilidad()
    if (ev) return setMensaje('Error: ' + ev)
    if (!guardado) return setMensaje('Error: Guarda primero los cambios.')

    setGuardando(true)

    try {
      await marcarReglasRevisadasTeams(teams.id,true)
      setRevisadas(true)
      setMensaje('Reglas revisadas ✓')
      onCambio?.()
    } catch (e) {
      setMensaje('Error: ' + e.message)
    } finally {
      setGuardando(false)
    }
  }

  if (!f) {
    return (
      <section className="teams-convocatoria">
        <div className="teams-vacio">Cargando reglas…</div>
      </section>
    )
  }

  return (
    <section className="teams-convocatoria">
      <div className="teams-seccion-cab">
        <div>
          <p className="etiqueta">REGLAS</p>
          <h2>Configuración del Teams</h2>
          <p>Revisa la formación y las reglas antes de iniciar. Mientras no haya comenzado puedes modificarlas.</p>
        </div>
        {revisadas && <span className="teams-reglas-ok">✓ Revisadas</span>}
      </div>

      <div className="teams-reglas-grid">
        <div className="teams-regla-bloque">
          <h3>
            Formación
            <Info texto="Define cómo se construyen los dos equipos a partir de la convocatoria." />
          </h3>

          <label>
            Método
            <select value={f.metodo_formacion} onChange={e=>set('metodo_formacion',e.target.value)}>
              <option value="manual">Manual</option>
              <option value="draft">Draft de capitanes</option>
              <option value="sorteo">Sorteo</option>
              <option value="predeterminado">Equipos predeterminados</option>
            </select>
          </label>

          <div className="teams-ayuda-contextual compacta">
            <span>{FORMACION_INFO[f.metodo_formacion]}</span>
          </div>

          <label>
            <span className="teams-label-info">
              Designación de capitanes
              <Info texto="Administrador: los eliges tú. Definidos de antemano: se fijan expresamente antes de comenzar. Elección del equipo: cada jugador vota desde Mi Zona y, si hay empate, decide el administrador. Sorteo: el sistema elige un capitán al azar dentro de cada equipo." />
            </span>
            <select
              value={f.modo_designacion_capitanes || 'administrador'}
              onChange={e=>set('modo_designacion_capitanes',e.target.value)}
            >
              <option value="administrador">Los elige el administrador</option>
              <option value="predefinidos">Definidos de antemano</option>
              <option value="eleccion_equipo" disabled={f.metodo_formacion === 'draft'}>Los elige cada equipo</option>
              <option value="sorteo" disabled={f.metodo_formacion === 'draft'}>Sorteo entre los jugadores del equipo</option>
            </select>
          </label>

          {f.metodo_formacion === 'draft' && (
            <label>
              <span className="teams-label-info">
                Tipo de draft
                <Info texto="Alterno: A-B-A-B. Serpiente: A-B-B-A. Secreto por rondas: cada capitán elige sin conocer la elección rival. Conjunto: selección coordinada." />
              </span>
              <select value={f.tipo_draft || 'alterno'} onChange={e=>set('tipo_draft',e.target.value)}>
                <option value="alterno">Alterno · A-B-A-B</option>
                <option value="serpiente">Serpiente · A-B-B-A</option>
                <option value="secreto_rondas">Secreto por rondas</option>
                <option value="conjunto">Selección conjunta</option>
              </select>
            </label>
          )}

          {f.metodo_formacion === 'predeterminado' && (
            <>
              <label>
                <span className="teams-label-info">
                  Asignación del equipo
                  <Info texto="Administrador: el jugador ya tiene su equipo fijado y no puede cambiarlo. Jugador: al apuntarse elige a qué equipo pertenece." />
                </span>
                <select
                  value={f.asignacion_predeterminada || 'admin'}
                  onChange={e=>set('asignacion_predeterminada',e.target.value)}
                >
                  <option value="admin">La hace el administrador</option>
                  <option value="jugador">La elige el jugador</option>
                </select>
              </label>

              <label>
                Equipo A
                <input value={f.nombre_equipo_a || ''} onChange={e=>set('nombre_equipo_a',e.target.value)} />
              </label>

              <label>
                Equipo B
                <input value={f.nombre_equipo_b || ''} onChange={e=>set('nombre_equipo_b',e.target.value)} />
              </label>
            </>
          )}
        </div>

        <div className="teams-regla-bloque">
          <h3>
            Serie
            <Info texto="Configura cómo se decide el enfrentamiento general entre los dos equipos." />
          </h3>

          <label>
            Formato
            <select value={f.modalidad} onChange={e=>set('modalidad',e.target.value)}>
              <option value="numero_fijo">Número fijo</option>
              <option value="mejor_de">Al mejor de X</option>
              <option value="mejor_de_jugar_todos">Al mejor de X, jugar todos</option>
              <option value="numero_fijo_desempate">Número fijo + desempate</option>
            </select>
          </label>

          <label>
            N.º de partidos
            <input type="number" min="1" value={f.numero_partidos} onChange={e=>set('numero_partidos',Number(e.target.value))}/>
          </label>

          <label>
            Puntos por victoria
            <input type="number" min="0" step=".5" value={f.puntos_por_victoria} onChange={e=>set('puntos_por_victoria',Number(e.target.value))}/>
          </label>
        </div>

        <div className="teams-regla-bloque">
          <h3>
            Participación
            <Info texto="Controla cuántas veces puede jugar cada persona y si una pareja puede repetirse durante la serie." />
          </h3>

          <label>
            Repetir jugadores
            <select value={f.repetir_jugadores} onChange={e=>set('repetir_jugadores',e.target.value)}>
              <option value="no">No</option>
              <option value="si">Sí</option>
              <option value="maximo">Sí, máximo X</option>
            </select>
          </label>

          {f.repetir_jugadores === 'maximo' && (
            <label>
              Máximo partidos/jugador
              <input type="number" min="1" value={f.max_partidos_jugador || ''} onChange={e=>set('max_partidos_jugador',Number(e.target.value)||null)}/>
            </label>
          )}

          <label className="teams-check">
            <input type="checkbox" checked={!!f.repetir_pareja} onChange={e=>set('repetir_pareja',e.target.checked)}/>
            Permitir repetir pareja
          </label>

          <label className="teams-check">
            <input type="checkbox" checked={!!f.todos_antes_repetir} onChange={e=>set('todos_antes_repetir',e.target.checked)}/>
            Todos juegan antes de repetir
            <Info texto="No se podrá volver a utilizar a un jugador mientras quede alguien de su equipo que todavía no haya disputado ningún partido." />
          </label>
        </div>

        <div className="teams-regla-bloque">
          <h3>
            Elección de parejas
            <Info texto="Define cuándo y en qué orden presentan los capitanes la pareja que disputará cada partido." />
          </h3>

          <label>
            Sistema
            <select value={f.sistema_eleccion_parejas} onChange={e=>set('sistema_eleccion_parejas',e.target.value)}>
              <option value="secreto">Secreto / simultáneo</option>
              <option value="alterno">Alterno</option>
              <option value="ganador_primero">Ganador anterior primero</option>
            </select>
          </label>

          {f.sistema_eleccion_parejas !== 'secreto' && (
            <>
              <label>
                Primer presentador
                <select value={f.primer_presentador} onChange={e=>set('primer_presentador',e.target.value)}>
                  <option value="sorteo">Sorteo</option>
                  <option value="equipo_a">Equipo A</option>
                  <option value="equipo_b">Equipo B</option>
                </select>
              </label>

              <label className="teams-check">
                <input type="checkbox" checked={!!f.segundo_ve_pareja} onChange={e=>set('segundo_ve_pareja',e.target.checked)}/>
                El segundo ve la primera pareja
                <Info texto="El equipo que presenta segundo conoce la pareja rival antes de seleccionar la suya." />
              </label>
            </>
          )}

          <label>
            Plazo para presentar (h)
            <input type="number" min="1" value={f.plazo_presentar_horas || ''} onChange={e=>set('plazo_presentar_horas',Number(e.target.value)||null)}/>
          </label>
        </div>

        <div className="teams-regla-bloque">
          <h3>
            Publicación y plazos
            <Info texto="Controla cuándo se hacen públicas las parejas y cuánto tiempo hay para acordar y disputar cada partido." />
          </h3>

          <label>
            Publicar parejas
            <select value={f.modo_publicacion} onChange={e=>set('modo_publicacion',e.target.value)}>
              <option value="inmediata">Al confirmar ambos</option>
              <option value="programada">Programada</option>
              <option value="manual">Manual administrador</option>
            </select>
          </label>

          <label>
            Plazo para acordar (días)
            <input type="number" min="1" value={f.plazo_acordar_dias || ''} onChange={e=>set('plazo_acordar_dias',Number(e.target.value)||null)}/>
          </label>

          <label>
            Plazo para jugar (días)
            <input type="number" min="1" value={f.plazo_jugar_dias || ''} onChange={e=>set('plazo_jugar_dias',Number(e.target.value)||null)}/>
          </label>

          <label>
            Partido no finalizado
            <select value={f.tratamiento_no_finalizado} onChange={e=>set('tratamiento_no_finalizado',e.target.value)}>
              <option value="reanudar">Debe reanudarse</option>
              <option value="administrador">Decide administrador</option>
            </select>
          </label>

          <label>
            <span className="teams-label-info">
              Inicio del Teams
              <Info texto="Administrador: tú das la salida. Capitanes preparados: cada capitán confirma desde Mi Zona y al hacerlo ambos se crea automáticamente el Partido 1. Programado: el sistema inicia el Teams en la fecha y hora indicadas, siempre que plantillas y reglas estén listas." />
            </span>
            <select value={f.modo_inicio_teams || 'administrador'} onChange={e=>set('modo_inicio_teams',e.target.value)}>
              <option value="administrador">Lo inicia el administrador</option>
              <option value="capitanes">Cuando ambos capitanes estén preparados</option>
              <option value="programado">Inicio programado</option>
            </select>
          </label>

          {f.modo_inicio_teams === 'programado' && (
            <label>
              Fecha y hora de inicio
              <input
                type="datetime-local"
                value={String(f.inicio_programado_at || '').slice(0,16)}
                onChange={e=>set('inicio_programado_at',e.target.value)}
              />
            </label>
          )}
        </div>
      </div>

      {mensaje && (
        <p className={mensaje.startsWith('Error:') ? 'teams-error' : 'teams-ok'}>
          {mensaje}
        </p>
      )}

      <footer className="teams-reglas-acciones">
        <button
          type="button"
          className="boton boton-secundario"
          disabled={guardando || guardado}
          onClick={guardar}
        >
          {guardando ? 'Guardando…' : guardado ? 'Guardado ✓' : 'Guardar cambios'}
        </button>

        <button
          type="button"
          className="boton boton-principal"
          disabled={guardando || !guardado || revisadas}
          onClick={revisar}
        >
          {revisadas ? 'Reglas revisadas ✓' : 'Confirmar reglas revisadas'}
        </button>
      </footer>
    </section>
  )
}
