import { useMemo, useState } from 'react'
import { crearTeams } from '../teamsApi'

const PASOS = ['General','Formación','Participación','Parejas','Publicación','Revisión']

const inicial = {
  nombre:'',
  fecha_inicio:'',
  fecha_fin:'',
  modalidad:'mejor_de',
  numero_partidos:7,
  puntos_por_victoria:1,
  metodo_formacion:'manual',
  jugadores_por_equipo:8,
  reservas_por_equipo:0,
  tipo_draft:'alterno',
  asignacion_predeterminada:'admin',
  nombre_equipo_a:'Equipo A',
  nombre_equipo_b:'Equipo B',
  color_equipo_a:'#22c55e',
  color_equipo_b:'#3b82f6',
  computa_estadisticas:true,
  computa_ranking:false,
  computa_isp:false,
  repetir_jugadores:'si',
  max_partidos_jugador:'',
  repetir_pareja:false,
  todos_antes_repetir:false,
  sistema_eleccion_parejas:'secreto',
  primer_presentador:'sorteo',
  segundo_ve_pareja:false,
  plazo_presentar_horas:48,
  modo_publicacion:'inmediata',
  publicar_at:'',
  plazo_acordar_dias:3,
  plazo_jugar_dias:7,
  tratamiento_no_finalizado:'reanudar',
  modo_designacion_capitanes:'administrador',
  modo_inicio_teams:'administrador',
  inicio_programado_at:''
}

function Info({ texto }) {
  return (
    <span className="teams-info" tabIndex="0" aria-label={texto}>
      i
      <span className="teams-info-popover">{texto}</span>
    </span>
  )
}

const FORMACION_INFO = {
  manual: 'Todos se apuntan a una bolsa común. Después el administrador reparte manualmente a los jugadores entre los dos equipos y elige los capitanes.',
  draft: 'Todos se apuntan a una bolsa común. Se eligen dos capitanes y estos van seleccionando jugadores según el tipo de draft configurado.',
  sorteo: 'Todos se apuntan a una bolsa común. Al cerrar la convocatoria los equipos se forman mediante sorteo.',
  predeterminado: 'Los dos equipos existen desde antes de la convocatoria, por ejemplo Centro Urbano contra Rural. Cada jugador queda vinculado a uno de los dos lados.'
}

export default function CrearTeams({ onCancelar, onCreado }) {
  const [paso,setPaso] = useState(0)
  const [form,setForm] = useState(inicial)
  const [error,setError] = useState('')
  const [guardando,setGuardando] = useState(false)

  const set = (k,v) => setForm(a => {
    const siguiente = {...a,[k]:v}
    if (
      k === 'metodo_formacion' &&
      v === 'draft' &&
      ['eleccion_equipo','sorteo'].includes(a.modo_designacion_capitanes)
    ) {
      siguiente.modo_designacion_capitanes = 'administrador'
    }
    return siguiente
  })

  const viabilidad = useMemo(() => {
    const j = Number(form.jugadores_por_equipo) || 0
    const p = Number(form.numero_partidos) || 0

    if (j < 2) return 'Cada equipo necesita al menos 2 jugadores.'

    let max = Infinity

    if (form.repetir_jugadores === 'no') max = Math.floor(j / 2)

    if (form.repetir_jugadores === 'maximo') {
      const x = Number(form.max_partidos_jugador) || 0
      if (!x) return 'Indica el máximo de partidos por jugador.'
      max = Math.floor(j * x / 2)
    }

    if (!form.repetir_pareja) max = Math.min(max, j * (j - 1) / 2)

    return p > max
      ? `Con estas reglas solo son posibles ${max} partidos por equipo y has configurado ${p}. Aumenta jugadores, permite más repeticiones o reduce el número de partidos.`
      : ''
  }, [
    form.jugadores_por_equipo,
    form.numero_partidos,
    form.repetir_jugadores,
    form.max_partidos_jugador,
    form.repetir_pareja
  ])

  const resumen = useMemo(() => ({
    formato: {
      numero_fijo:'Número fijo',
      mejor_de:'Al mejor de X',
      mejor_de_jugar_todos:'Al mejor de X · jugar todos',
      numero_fijo_desempate:'Número fijo + desempate'
    }[form.modalidad],
    formacion: {
      manual:'Manual',
      draft:'Draft de capitanes',
      sorteo:'Sorteo',
      predeterminado:'Equipos predeterminados'
    }[form.metodo_formacion]
  }), [form])

  async function guardar(e) {
    e.preventDefault()

    if (!form.nombre.trim()) return setError('El nombre del Teams es obligatorio.')
    if (viabilidad) return setError(viabilidad)

    if (
      form.metodo_formacion === 'predeterminado' &&
      (!form.nombre_equipo_a.trim() || !form.nombre_equipo_b.trim())
    ) {
      return setError('Escribe el nombre de los dos equipos predeterminados.')
    }

    if (
      form.metodo_formacion === 'draft' &&
      ['eleccion_equipo','sorteo'].includes(form.modo_designacion_capitanes)
    ) {
      return setError('En un Draft los capitanes deben estar definidos antes de formar los equipos.')
    }

    if (
      form.modo_inicio_teams === 'programado' &&
      !form.inicio_programado_at
    ) {
      return setError('Indica la fecha y hora del inicio programado.')
    }

    setGuardando(true)
    setError('')

    try {
      await crearTeams(form)
      await onCreado()
    } catch (e) {
      setError(e.message)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <main className="teams-admin">
      <form className="teams-asistente" onSubmit={guardar}>
        <div className="teams-asistente-cab">
          <div>
            <p className="etiqueta">NUEVO TEAMS</p>
            <h2>{paso + 1}. {PASOS[paso]}</h2>
          </div>
          <button type="button" className="boton boton-secundario" onClick={onCancelar}>
            Cerrar
          </button>
        </div>

        {error && <p className="teams-error">{error}</p>}

        <div className="teams-pasos">
          {PASOS.map((x,i) => (
            <span key={x} className={i <= paso ? 'activo' : ''}>{i + 1}</span>
          ))}
        </div>

        {paso === 0 && (
          <div className="teams-campos">
            <label>
              Nombre
              <input
                value={form.nombre}
                onChange={e => set('nombre',e.target.value)}
                placeholder="Teams Octubre 2026"
                required
              />
            </label>

            <div className="teams-grid">
              <label>
                Fecha inicio
                <input
                  type="date"
                  value={form.fecha_inicio}
                  onChange={e => set('fecha_inicio',e.target.value)}
                />
              </label>
              <label>
                Fecha fin <small>(opcional)</small>
                <input
                  type="date"
                  value={form.fecha_fin}
                  onChange={e => set('fecha_fin',e.target.value)}
                />
              </label>
            </div>

            <label>
              <span className="teams-label-info">
                Formato
                <Info texto="Define cómo se decide la serie: número fijo, al mejor de X, jugar todos los partidos aunque ya haya ganador, o añadir un desempate." />
              </span>
              <select value={form.modalidad} onChange={e => set('modalidad',e.target.value)}>
                <option value="numero_fijo">Número fijo de partidos</option>
                <option value="mejor_de">Al mejor de X</option>
                <option value="mejor_de_jugar_todos">Al mejor de X, jugando todos</option>
                <option value="numero_fijo_desempate">Número fijo + desempate</option>
              </select>
            </label>

            <div className="teams-grid">
              <label>
                N.º partidos
                <input
                  type="number"
                  min="1"
                  value={form.numero_partidos}
                  onChange={e => set('numero_partidos',e.target.value)}
                />
              </label>
              <label>
                Puntos por victoria
                <input
                  type="number"
                  min="0"
                  step=".5"
                  value={form.puntos_por_victoria}
                  onChange={e => set('puntos_por_victoria',e.target.value)}
                />
              </label>
            </div>

            <div className="teams-checks">
              <label><input type="checkbox" checked={form.computa_estadisticas} onChange={e=>set('computa_estadisticas',e.target.checked)}/> Estadísticas Teams</label>
              <label><input type="checkbox" checked={form.computa_ranking} onChange={e=>set('computa_ranking',e.target.checked)}/> Ranking</label>
              <label><input type="checkbox" checked={form.computa_isp} onChange={e=>set('computa_isp',e.target.checked)}/> ISP</label>
            </div>
          </div>
        )}

        {paso === 1 && (
          <div className="teams-campos">
            <label>
              <span className="teams-label-info">
                Formación de los equipos
                <Info texto="Manual: reparte el administrador. Draft: eligen los capitanes. Sorteo: reparto aleatorio. Predeterminados: cada jugador pertenece a un lado desde la convocatoria." />
              </span>
              <select value={form.metodo_formacion} onChange={e => set('metodo_formacion',e.target.value)}>
                <option value="manual">Manual</option>
                <option value="draft">Draft de capitanes</option>
                <option value="sorteo">Sorteo</option>
                <option value="predeterminado">Equipos predeterminados</option>
              </select>
            </label>

            <div className="teams-ayuda-contextual">
              <b>{resumen.formacion}</b>
              <span>{FORMACION_INFO[form.metodo_formacion]}</span>
            </div>

            <label>
              <span className="teams-label-info">
                Designación de capitanes
                <Info texto="Administrador: los eliges tú. Definidos de antemano: quedan fijados expresamente antes de empezar. Elección del equipo: los jugadores votan desde Mi Zona y el administrador resuelve un posible empate. Sorteo: el sistema elige un capitán al azar dentro de cada equipo." />
              </span>
              <select
                value={form.modo_designacion_capitanes}
                onChange={e=>set('modo_designacion_capitanes',e.target.value)}
              >
                <option value="administrador">Los elige el administrador</option>
                <option value="predefinidos">Definidos de antemano</option>
                <option value="eleccion_equipo" disabled={form.metodo_formacion === 'draft'}>Los elige cada equipo</option>
                <option value="sorteo" disabled={form.metodo_formacion === 'draft'}>Sorteo entre los jugadores del equipo</option>
              </select>
            </label>

            <div className="teams-grid">
              <label>
                Jugadores por equipo
                <input type="number" min="1" value={form.jugadores_por_equipo} onChange={e=>set('jugadores_por_equipo',e.target.value)}/>
              </label>
              <label>
                Reservas por equipo
                <input type="number" min="0" value={form.reservas_por_equipo} onChange={e=>set('reservas_por_equipo',e.target.value)}/>
              </label>
            </div>

            {form.metodo_formacion === 'draft' && (
              <label>
                <span className="teams-label-info">
                  Tipo de draft
                  <Info texto="Alterno: A-B-A-B. Serpiente: A-B-B-A. Secreto por rondas: cada capitán elige sin conocer la elección rival. Conjunto: selección coordinada por la organización." />
                </span>
                <select value={form.tipo_draft} onChange={e=>set('tipo_draft',e.target.value)}>
                  <option value="alterno">Alterno · A-B-A-B</option>
                  <option value="serpiente">Serpiente · A-B-B-A</option>
                  <option value="secreto_rondas">Secreto por rondas</option>
                  <option value="conjunto">Selección conjunta</option>
                </select>
              </label>
            )}

            {form.metodo_formacion === 'predeterminado' && (
              <>
                <label>
                  <span className="teams-label-info">
                    ¿Quién decide el equipo?
                    <Info texto="Administrador: cada jugador tiene asignado su lado antes de apuntarse y no puede cambiarlo. Jugador: al apuntarse elige con qué equipo participa." />
                  </span>
                  <select
                    value={form.asignacion_predeterminada}
                    onChange={e=>set('asignacion_predeterminada',e.target.value)}
                  >
                    <option value="admin">Lo asigna el administrador</option>
                    <option value="jugador">Lo elige el jugador al apuntarse</option>
                  </select>
                </label>

                <div className="teams-grid">
                  <label>
                    Nombre Equipo A
                    <input value={form.nombre_equipo_a} onChange={e=>set('nombre_equipo_a',e.target.value)} placeholder="Centro Urbano"/>
                  </label>
                  <label>
                    Nombre Equipo B
                    <input value={form.nombre_equipo_b} onChange={e=>set('nombre_equipo_b',e.target.value)} placeholder="Rural"/>
                  </label>
                </div>

                <div className="teams-grid">
                  <label>
                    Color Equipo A
                    <input type="color" value={form.color_equipo_a} onChange={e=>set('color_equipo_a',e.target.value)}/>
                  </label>
                  <label>
                    Color Equipo B
                    <input type="color" value={form.color_equipo_b} onChange={e=>set('color_equipo_b',e.target.value)}/>
                  </label>
                </div>
              </>
            )}
          </div>
        )}

        {paso === 2 && (
          <div className="teams-campos">
            <label>
              <span className="teams-label-info">
                Repetir jugadores
                <Info texto="Controla si un mismo jugador puede disputar más de un partido de la serie. Con 'máximo X' puedes fijar el límite individual." />
              </span>
              <select value={form.repetir_jugadores} onChange={e=>set('repetir_jugadores',e.target.value)}>
                <option value="no">No</option>
                <option value="si">Sí</option>
                <option value="maximo">Sí, máximo X partidos</option>
              </select>
            </label>

            {form.repetir_jugadores === 'maximo' && (
              <label>
                Máximo por jugador
                <input type="number" min="1" value={form.max_partidos_jugador} onChange={e=>set('max_partidos_jugador',e.target.value)}/>
              </label>
            )}

            <div className="teams-checks">
              <label>
                <input type="checkbox" checked={form.repetir_pareja} onChange={e=>set('repetir_pareja',e.target.checked)}/>
                Permitir repetir pareja
              </label>
              <label>
                <input type="checkbox" checked={form.todos_antes_repetir} onChange={e=>set('todos_antes_repetir',e.target.checked)}/>
                Todos deben jugar antes de repetir
                <Info texto="Mientras haya jugadores del equipo que todavía no hayan disputado ningún partido, no se podrá volver a utilizar a uno que ya haya jugado." />
              </label>
            </div>
          </div>
        )}

        {paso === 3 && (
          <div className="teams-campos">
            <label>
              <span className="teams-label-info">
                Sistema de parejas
                <Info texto="Secreto: ambos equipos presentan sin ver al rival. Alterno: uno presenta y después el otro. Ganador anterior primero: el orden del siguiente partido depende del resultado anterior." />
              </span>
              <select value={form.sistema_eleccion_parejas} onChange={e=>set('sistema_eleccion_parejas',e.target.value)}>
                <option value="secreto">Secreto / simultáneo</option>
                <option value="alterno">Alterno</option>
                <option value="ganador_primero">Ganador anterior presenta primero</option>
              </select>
            </label>

            {form.sistema_eleccion_parejas !== 'secreto' && (
              <>
                <label>
                  Primer presentador
                  <select value={form.primer_presentador} onChange={e=>set('primer_presentador',e.target.value)}>
                    <option value="sorteo">Sorteo</option>
                    <option value="equipo_a">Equipo A</option>
                    <option value="equipo_b">Equipo B</option>
                  </select>
                </label>
                <label className="teams-check">
                  <input type="checkbox" checked={form.segundo_ve_pareja} onChange={e=>set('segundo_ve_pareja',e.target.checked)}/>
                  El segundo capitán ve la primera pareja
                  <Info texto="Si está activado, el equipo que presenta segundo conoce qué pareja ha presentado el primero antes de elegir la suya." />
                </label>
              </>
            )}

            <label>
              Plazo para presentar (horas)
              <input type="number" min="1" value={form.plazo_presentar_horas} onChange={e=>set('plazo_presentar_horas',e.target.value)}/>
            </label>
          </div>
        )}

        {paso === 4 && (
          <div className="teams-campos">
            <label>
              <span className="teams-label-info">
                Publicar parejas
                <Info texto="Inmediata: se muestran cuando ambas están confirmadas. Programada: se revelan en una fecha/hora. Manual: el administrador decide cuándo hacerlas públicas." />
              </span>
              <select value={form.modo_publicacion} onChange={e=>set('modo_publicacion',e.target.value)}>
                <option value="inmediata">Al confirmar ambos</option>
                <option value="programada">Fecha/hora programada</option>
                <option value="manual">Manual por administrador</option>
              </select>
            </label>

            {form.modo_publicacion === 'programada' && (
              <label>
                Fecha/hora
                <input type="datetime-local" value={form.publicar_at} onChange={e=>set('publicar_at',e.target.value)}/>
              </label>
            )}

            <div className="teams-grid">
              <label>
                Plazo para acordar fecha (días)
                <input type="number" min="1" value={form.plazo_acordar_dias} onChange={e=>set('plazo_acordar_dias',e.target.value)}/>
              </label>
              <label>
                Plazo para jugar (días)
                <input type="number" min="1" value={form.plazo_jugar_dias} onChange={e=>set('plazo_jugar_dias',e.target.value)}/>
              </label>
            </div>

            <label>
              <span className="teams-label-info">
                Si no termina
                <Info texto="Reanudar: el partido queda pendiente para continuar más adelante. Decide administrador: se genera una incidencia para que la organización determine cómo resolverlo." />
              </span>
              <select value={form.tratamiento_no_finalizado} onChange={e=>set('tratamiento_no_finalizado',e.target.value)}>
                <option value="reanudar">Debe reanudarse</option>
                <option value="administrador">Decide administrador</option>
              </select>
            </label>

            <label>
              <span className="teams-label-info">
                Inicio del Teams
                <Info texto="Administrador: tú das la salida. Capitanes preparados: cada capitán confirma desde Mi Zona y al hacerlo ambos se crea el Partido 1. Programado: el sistema lo inicia a la fecha y hora indicadas si todo está preparado." />
              </span>
              <select value={form.modo_inicio_teams} onChange={e=>set('modo_inicio_teams',e.target.value)}>
                <option value="administrador">Lo inicia el administrador</option>
                <option value="capitanes">Cuando ambos capitanes estén preparados</option>
                <option value="programado">Inicio programado</option>
              </select>
            </label>

            {form.modo_inicio_teams === 'programado' && (
              <label>
                Fecha y hora de inicio
                <input type="datetime-local" value={form.inicio_programado_at} onChange={e=>set('inicio_programado_at',e.target.value)}/>
              </label>
            )}
          </div>
        )}

        {paso === 5 && (
          <div className="teams-resumen">
            {viabilidad && <p className="teams-error">{viabilidad}</p>}
            <h3>{form.nombre || 'Teams sin nombre'}</h3>
            <p><b>Formato:</b> {resumen.formato} · {form.numero_partidos} partidos</p>
            <p>
              <b>Formación:</b> {resumen.formacion}
              {form.metodo_formacion === 'draft' ? ' · ' + form.tipo_draft : ''}
            </p>
            {form.metodo_formacion === 'predeterminado' && (
              <p>
                <b>Equipos:</b> {form.nombre_equipo_a} vs {form.nombre_equipo_b} · {
                  form.asignacion_predeterminada === 'admin'
                    ? 'asignación previa por administrador'
                    : 'elección del jugador'
                }
              </p>
            )}
            <p><b>Capitanes:</b> {{
              administrador:'Los elige el administrador',
              predefinidos:'Definidos de antemano',
              eleccion_equipo:'Elección de cada equipo',
              sorteo:'Sorteo'
            }[form.modo_designacion_capitanes]}</p>
            <p><b>Inicio:</b> {{
              administrador:'Administrador',
              capitanes:'Ambos capitanes preparados',
              programado:'Programado'
            }[form.modo_inicio_teams]}{form.modo_inicio_teams==='programado' && form.inicio_programado_at ? ' · '+form.inicio_programado_at.replace('T',' ') : ''}</p>
            <p><b>Plantillas:</b> {form.jugadores_por_equipo} jugadores · {form.reservas_por_equipo} reservas/equipo</p>
            <p><b>Parejas:</b> {form.sistema_eleccion_parejas} · plazo {form.plazo_presentar_horas} h</p>
            <p><b>Computa:</b> Estadísticas {form.computa_estadisticas?'Sí':'No'} · Ranking {form.computa_ranking?'Sí':'No'} · ISP {form.computa_isp?'Sí':'No'}</p>
            <div className="teams-aviso">
              Se creará en estado <b>Preparación</b>. Después se abrirá la convocatoria y se completará la formación según el método elegido.
            </div>
          </div>
        )}

        <footer className="teams-acciones">
          {paso > 0
            ? <button type="button" className="boton boton-secundario" onClick={()=>setPaso(p=>p-1)}>← Anterior</button>
            : <span/>
          }

          {paso < 5
            ? (
              <button
                type="button"
                className="boton boton-principal"
                onClick={() => {
                  if (paso === 0 && !form.nombre.trim()) {
                    setError('Escribe el nombre del Teams.')
                    return
                  }
                  if ((paso === 1 || paso === 2) && viabilidad) {
                    setError(viabilidad)
                    return
                  }
                  if (
                    paso === 1 &&
                    form.metodo_formacion === 'predeterminado' &&
                    (!form.nombre_equipo_a.trim() || !form.nombre_equipo_b.trim())
                  ) {
                    setError('Escribe el nombre de los dos equipos.')
                    return
                  }
                  setError('')
                  setPaso(p=>p+1)
                }}
              >
                Siguiente →
              </button>
            )
            : (
              <button className="boton boton-principal" disabled={guardando}>
                {guardando ? 'Creando…' : 'Crear Teams'}
              </button>
            )
          }
        </footer>
      </form>
    </main>
  )
}
