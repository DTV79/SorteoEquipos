import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabaseCampeonato } from './lib/supabaseCampeonato'
import CampeonatoConfiguracion from './CampeonatoConfiguracion'
import CampeonatoJugadores from './CampeonatoJugadores'
import SelectorCampeonatos from './SelectorCampeonatos'
import EquiposCampeonato from './EquiposCampeonato'
import './CampeonatoAdmin.css'

function tituloFase(partido) {
  const fase = {
    GR: 'Grupos',
    RG: 'Regrupos',
    MM: 'Mata-Mata',
    PP: 'Palas de playa',
  }[partido.codigo_fase] ?? partido.codigo_fase

  const detalle =
    partido.codigo_grupo ||
    partido.codigo_ronda ||
    (partido.jornada
      ? `Jornada ${partido.jornada}`
      : '')

  return [fase, detalle].filter(Boolean).join(' · ')
}

function valorSet(partido, numero, campo) {
  return partido.sets?.find(
    (set) => Number(set.numero_set) === numero
  )?.[campo] ?? ''
}

export default function CampeonatoAdmin({ onVolver, onAbrirSorteo, onCrearSorteo }) {
  const [codigo, setCodigo] = useState(() => window.sessionStorage.getItem('sprint-padel-campeonato-seleccionado') || '')
  const [partidos, setPartidos] = useState([])
  const [seccion, setSeccion] = useState(() => {
    const guardada = window.sessionStorage.getItem(
      'sprint-padel-seccion-campeonato'
    )
    return ['campeonatos', 'menu', 'resultados', 'configuracion', 'jugadores', 'equipos'].includes(guardada)
      ? guardada
      : 'campeonatos'
  })
  const [jugadores, setJugadores] = useState([])
  const [filtro, setFiltro] = useState('')
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState('')
  const [mensajes, setMensajes] = useState({})
  const [puntosMaximos, setPuntosMaximos] = useState(15)
  const [partidoAAnular, setPartidoAAnular] = useState(null)

  useEffect(() => {
    window.sessionStorage.setItem(
      'sprint-padel-seccion-campeonato',
      seccion
    )
  }, [seccion])

  function volverPanelPrincipal() {
    window.sessionStorage.setItem(
      'sprint-padel-seccion-campeonato',
      'menu'
    )
    setSeccion('menu')
    onVolver()
  }

  async function seleccionarCampeonato(codigoElegido, destino = 'menu') {
    setCodigo(codigoElegido)
    window.sessionStorage.setItem('sprint-padel-campeonato-seleccionado', codigoElegido)
    setSeccion(destino)
    const [, configuracion] = await Promise.all([
      cargarPartidos(codigoElegido),
      supabaseCampeonato.rpc('admin_obtener_configuracion', { p_codigo: codigoElegido }),
    ])
    const maximo = Number(configuracion.data?.configuracion?.puntos_maximos_por_set)
    if (Number.isFinite(maximo) && maximo > 0) setPuntosMaximos(maximo)
  }

  const cargarPartidos = useCallback(async (codigoElegido) => {
    setCargando(true)
    setError('')

    const { data, error: errorConsulta } =
      await supabaseCampeonato.rpc(
        'admin_listar_partidos',
        { p_codigo: codigoElegido }
      )

    if (errorConsulta) {
      setError(errorConsulta.message)
      setCargando(false)
      return
    }

    if (data?.ok !== true) {
      setError(
        data?.error ||
        'Este usuario no tiene acceso al campeonato.'
      )
      setCargando(false)
      return
    }

    setPartidos(data.partidos ?? [])
    setJugadores(data.jugadores ?? [])
    setCargando(false)
  }, [])

  const partidosVisibles = useMemo(() => {
    const texto = filtro.trim().toLowerCase()
    if (!texto) return partidos

    return partidos.filter((partido) =>
      [
        partido.id_partido,
        partido.equipo_1,
        partido.equipo_2,
        partido.codigo_fase,
        partido.codigo_grupo,
        partido.codigo_ronda,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(texto)
    )
  }, [filtro, partidos])

  async function guardarResultado(evento, partido) {
    evento.preventDefault()
    const formulario = new FormData(evento.currentTarget)

    const sets = [1, 2, 3]
      .map((numero) => {
        const juegosEquipo1 = formulario.get(`set${numero}_1`)
        const juegosEquipo2 = formulario.get(`set${numero}_2`)

        if (juegosEquipo1 === '' && juegosEquipo2 === '') {
          return null
        }

        return {
          juegos_equipo_1: juegosEquipo1,
          juegos_equipo_2: juegosEquipo2,
        }
      })
      .filter(Boolean)

    if (
      sets.some(
        (set) =>
          set.juegos_equipo_1 === '' ||
          set.juegos_equipo_2 === ''
      )
    ) {
      setMensajes((actual) => ({
        ...actual,
        [partido.id_partido]: {
          tipo: 'error',
          texto: 'Completa los dos marcadores de cada set utilizado.',
        },
      }))
      return
    }

    setGuardando(partido.id_partido)
    setMensajes((actual) => ({
      ...actual,
      [partido.id_partido]: {
        tipo: '',
        texto: 'Guardando…',
      },
    }))

    const pista = formulario.get('pista')
    const duracion = formulario.get('duracion')

    const { error: errorGuardado } =
      await supabaseCampeonato.rpc(
        'admin_guardar_resultado',
        {
          p_id_partido: partido.id_partido,
          p_sets: sets,
          p_pista: pista ? Number(pista) : null,
          p_duracion_min: duracion
            ? Number(duracion)
            : null,
        }
      )

    if (errorGuardado) {
      setMensajes((actual) => ({
        ...actual,
        [partido.id_partido]: {
          tipo: 'error',
          texto: errorGuardado.message,
        },
      }))
      setGuardando('')
      return
    }

    setMensajes((actual) => ({
      ...actual,
      [partido.id_partido]: {
        tipo: 'correcto',
        texto: 'Resultado guardado.',
      },
    }))
    setGuardando('')
    await cargarPartidos(codigo)
  }

  async function anularResultado(partido) {
    const claveGuardando = `anular-${partido.id_partido}`
    setGuardando(claveGuardando)
    setMensajes((actual) => ({
      ...actual,
      [partido.id_partido]: {
        tipo: '',
        texto: 'Anulando resultado…',
      },
    }))

    const { data, error: errorAnulacion } =
      await supabaseCampeonato.rpc(
        'admin_anular_resultado',
        { p_id_partido: partido.id_partido }
      )

    if (errorAnulacion || data?.ok !== true) {
      setMensajes((actual) => ({
        ...actual,
        [partido.id_partido]: {
          tipo: 'error',
          texto:
            errorAnulacion?.message ||
            data?.error ||
            'No se pudo anular el resultado.',
        },
      }))
      setGuardando('')
      return
    }

    await cargarPartidos(codigo)
    setPartidoAAnular(null)
    setMensajes((actual) => ({
      ...actual,
      [partido.id_partido]: {
        tipo: 'correcto',
        texto: 'Resultado anulado. El partido vuelve a estar pendiente.',
      },
    }))
    setGuardando('')
  }

  function validarPuntuacion(evento, partido) {
    const valor = Number(evento.currentTarget.value)
    if (evento.currentTarget.value === '' || valor <= puntosMaximos) return

    evento.currentTarget.value = ''
    setMensajes((actual) => ({
      ...actual,
      [partido.id_partido]: {
        tipo: 'error',
        texto: `El número no puede ser mayor que ${puntosMaximos}. Se ha borrado el valor.`,
      },
    }))
  }

  async function guardarSustituciones(evento, partido) {
    const formulario = evento.currentTarget.closest('form')
    const datos = new FormData(formulario)
    const participantes = (partido.participantes ?? []).map(
      (participante) => ({
        lado: participante.lado,
        posicion: participante.posicion,
        id_jugador_real: datos.get(
          `jugador_${participante.lado}_${participante.posicion}`
        ),
        tipo: datos.get(
          `tipo_${participante.lado}_${participante.posicion}`
        ),
        computa_ranking: datos.has(
          `ranking_${participante.lado}_${participante.posicion}`
        ),
        computa_isp: datos.has(
          `isp_${participante.lado}_${participante.posicion}`
        ),
      })
    )

    setGuardando(`${partido.id_partido}-sustituciones`)
    const { error: errorGuardado } = await supabaseCampeonato.rpc(
      'admin_guardar_sustituciones',
      {
        p_id_partido: partido.id_partido,
        p_participantes: participantes,
      }
    )

    if (errorGuardado) {
      setMensajes((actual) => ({
        ...actual,
        [partido.id_partido]: {
          tipo: 'error',
          texto: errorGuardado.message,
        },
      }))
      setGuardando('')
      return
    }

    setMensajes((actual) => ({
      ...actual,
      [partido.id_partido]: {
        tipo: 'correcto',
        texto: 'Sustituciones guardadas.',
      },
    }))
    setGuardando('')
    await cargarPartidos(codigo)
  }

  function cambiarTipoSustitucion(evento) {
    const cedido = evento.currentTarget.value === 'cedido'
    const fila = evento.currentTarget.closest('.fila-sustitucion')
    const checks = fila.querySelectorAll(
      '.checks-sustitucion input[type="checkbox"]'
    )

    checks.forEach((check) => {
      if (cedido) check.checked = false
      check.disabled = cedido
    })
  }

  async function crearJugador(evento, partido) {
    const formulario = evento.currentTarget.closest('form')
    const datos = new FormData(formulario)
    const nombre = datos.get('nuevo_jugador_nombre')?.trim()
    const alias = datos.get('nuevo_jugador_alias')?.trim()

    if (!nombre || !alias) {
      setMensajes((actual) => ({
        ...actual,
        [partido.id_partido]: {
          tipo: 'error',
          texto: 'Indica el nombre y el alias del nuevo jugador.',
        },
      }))
      return
    }

    setGuardando(`${partido.id_partido}-jugador`)
    const { error: errorGuardado } = await supabaseCampeonato.rpc(
      'admin_crear_jugador',
      { p_codigo: codigo, p_nombre: nombre, p_alias: alias }
    )

    if (errorGuardado) {
      setMensajes((actual) => ({
        ...actual,
        [partido.id_partido]: {
          tipo: 'error',
          texto: errorGuardado.message,
        },
      }))
      setGuardando('')
      return
    }

    setMensajes((actual) => ({
      ...actual,
      [partido.id_partido]: {
        tipo: 'correcto',
        texto: 'Jugador dado de alta. Ya puedes seleccionarlo.',
      },
    }))
    setGuardando('')
    await cargarPartidos(codigo)
  }

  if (seccion === 'campeonatos' || !codigo) {
    return <SelectorCampeonatos onSeleccionar={seleccionarCampeonato} onVolver={volverPanelPrincipal} />
  }

  if (seccion === 'configuracion') {
    return (
      <CampeonatoConfiguracion
        codigo={codigo}
        onVolver={() => setSeccion('menu')}
        onResultados={() => setSeccion('resultados')}
        onPanelPrincipal={volverPanelPrincipal}
        onCampeonatoEliminado={() => {
          window.sessionStorage.removeItem('sprint-padel-campeonato-seleccionado')
          setCodigo('')
          setSeccion('campeonatos')
        }}
      />
    )
  }

  if (seccion === 'jugadores') {
    return (
      <CampeonatoJugadores
        codigo={codigo}
        onVolver={() => setSeccion('menu')}
        onPanelPrincipal={volverPanelPrincipal}
        onCrearSorteo={onCrearSorteo}
      />
    )
  }

  if (seccion === 'equipos') {
    return (
      <EquiposCampeonato
        codigo={codigo}
        onVolver={() => setSeccion('menu')}
        onPanelPrincipal={volverPanelPrincipal}
        onAbrirSorteo={onAbrirSorteo}
      />
    )
  }

  if (seccion === 'menu') {
    return (
      <main className="app app-admin app-campeonato">
        <section className="panel-admin panel-campeonato panel-inicio-campeonato">
          <header className="cabecera-admin cabecera-campeonato">
            <div>
              <p className="etiqueta">CAMPEONATO</p>
              <h2>Gestión del campeonato</h2>
              <p className="descripcion-admin">{codigo}</p>
            </div>
            <div className="acciones-cabecera-configuracion"><button type="button" className="boton boton-secundario" onClick={() => setSeccion('campeonatos')}>← Campeonatos</button><button type="button" className="boton boton-secundario" onClick={volverPanelPrincipal}>Panel principal</button></div>
          </header>

          <div className="modulos-campeonato">
            <button type="button" className="modulo-campeonato activo" onClick={() => setSeccion('configuracion')}>
              <span>⚙️</span><strong>Configuración del torneo</strong>
              <small>Formato, fases, puntuación y contenido de la web</small>
            </button>
            <button type="button" className="modulo-campeonato activo" onClick={() => setSeccion('resultados')}>
              <span>🎾</span><strong>Partidos y resultados</strong>
              <small>Marcadores, pistas, duración y sustituciones</small>
            </button>
            <button type="button" className="modulo-campeonato activo" onClick={() => setSeccion('jugadores')}>
              <span>👤</span><strong>Jugadores e inscripciones</strong>
              <small>Altas, reservas, bajas y datos personales</small>
            </button>
            <button type="button" className="modulo-campeonato activo" onClick={() => setSeccion('equipos')}>
              <span>👥</span><strong>Equipos y sorteo</strong>
              <small>Vincular sorteo, importar equipos o crearlos manualmente</small>
            </button>
            <button type="button" className="modulo-campeonato" disabled>
              <span>📊</span><strong>Clasificaciones</strong>
              <small>Próximamente</small>
            </button>
            <button type="button" className="modulo-campeonato" disabled>
              <span>🏆</span><strong>Fases y cruces</strong>
              <small>Próximamente</small>
            </button>
          </div>
        </section>
      </main>
    )
  }

  return (
    <main className="app app-admin app-campeonato">
      <section className="panel-admin panel-campeonato">
        <header className="cabecera-admin cabecera-campeonato">
          <div>
            <p className="etiqueta">CAMPEONATO</p>
            <h2>Resultados</h2>
            <p className="descripcion-admin">
              {codigo}
            </p>
          </div>

          <div className="acciones-cabecera-configuracion">
            <button type="button" className="boton boton-secundario" onClick={() => setSeccion('configuracion')}>⚙ Configuración</button>
            <button type="button" className="boton boton-secundario" onClick={() => setSeccion('menu')}>← Gestión</button>
            <button type="button" className="boton boton-secundario" onClick={volverPanelPrincipal}>← Panel principal</button>
          </div>
        </header>

        <div className="barra-campeonato">
          <div>
            <strong>{partidos.length} partidos</strong>
            <span>Introduce el marcador y guarda el partido.</span>
          </div>

          <input
            type="search"
            value={filtro}
            onChange={(evento) =>
              setFiltro(evento.target.value)
            }
            placeholder="Buscar equipo, grupo o partido"
            aria-label="Buscar partido"
          />
        </div>

        {cargando && (
          <p className="estado">Cargando partidos…</p>
        )}

        {error && (
          <p className="mensaje-login">Error: {error}</p>
        )}

        {!cargando && !error && partidosVisibles.length === 0 && (
          <p className="estado tarjeta-partido-campeonato">
            No hay partidos que coincidan.
          </p>
        )}

        <div className="lista-partidos-campeonato">
          {partidosVisibles.map((partido) => {
            const mensaje = mensajes[partido.id_partido]

            return (
              <form
                className="tarjeta-partido-campeonato"
                key={`${partido.id_partido}-${partido.estado}-${partido.sets?.length ?? 0}`}
                onSubmit={(evento) =>
                  guardarResultado(evento, partido)
                }
              >
                <div className="partido-cabecera-campeonato">
                  <span>
                    {tituloFase(partido)} · {partido.id_partido}
                  </span>
                  <b className={`badge-partido ${partido.estado}`}>
                    {partido.estado === 'jugado'
                      ? 'Jugado'
                      : 'Pendiente'}
                  </b>
                </div>

                <div className="equipos-campeonato">
                  <strong>{partido.equipo_1}</strong>
                  <span>VS</span>
                  <strong>{partido.equipo_2}</strong>
                </div>

                {(partido.participantes ?? []).some(
                  (participante) => participante.es_sustitucion
                ) && (
                  <div className="resumen-sustituciones">
                    {(partido.participantes ?? [])
                      .filter((participante) => participante.es_sustitucion)
                      .map((participante) => (
                        <span key={`${participante.lado}_${participante.posicion}`}>
                          {participante.jugador_real} sustituye a {participante.titular}
                        </span>
                      ))}
                  </div>
                )}

                <details className="sustituciones-campeonato">
                  <summary>
                    <span>Sustituciones</span>
                    <small>
                      {(partido.participantes ?? []).some(
                        (participante) => participante.es_sustitucion
                      )
                        ? 'Hay cambios'
                        : 'Sin cambios'}
                    </small>
                  </summary>

                  <div className="lista-sustituciones">
                    {[1, 2].map((lado) => (
                      <section
                        className={`equipo-sustituciones equipo-${lado}`}
                        key={lado}
                      >
                        <h3>
                          Equipo {lado}
                          <small>{lado === 1 ? partido.equipo_1 : partido.equipo_2}</small>
                        </h3>

                        {(partido.participantes ?? [])
                          .filter((participante) => participante.lado === lado)
                          .map((participante) => {
                            const clave = `${participante.lado}_${participante.posicion}`
                            const sustituido = participante.es_sustitucion
                            const cedido = participante.tipo_sustitucion === 'cedido'

                            return (
                              <fieldset key={clave} className="fila-sustitucion">
                          <legend>
                            Titular: {participante.titular}
                          </legend>

                          <label>
                            <span>Jugador que disputa el partido</span>
                            <select
                              name={`jugador_${clave}`}
                              defaultValue={participante.id_jugador_real}
                            >
                              {jugadores.map((jugador) => (
                                <option
                                  key={jugador.id_jugador}
                                  value={jugador.id_jugador}
                                >
                                  {jugador.alias}
                                </option>
                              ))}
                            </select>
                          </label>

                          <label>
                            <span>Tipo si se sustituye</span>
                            <select
                              name={`tipo_${clave}`}
                              defaultValue={participante.tipo_sustitucion ?? 'libre'}
                              onChange={cambiarTipoSustitucion}
                            >
                              <option value="libre">Libre</option>
                              <option value="cedido">Cedido por otro equipo</option>
                            </select>
                          </label>

                          <div className="checks-sustitucion">
                            <label>
                              <input
                                type="checkbox"
                                name={`ranking_${clave}`}
                                defaultChecked={
                                  sustituido
                                    ? participante.computa_ranking_historico
                                    : true
                                }
                                disabled={cedido}
                              />
                              Ranking Histórico
                            </label>
                            <label>
                              <input
                                type="checkbox"
                                name={`isp_${clave}`}
                                defaultChecked={
                                  sustituido ? participante.computa_isp : true
                                }
                                disabled={cedido}
                              />
                              ISP
                            </label>
                          </div>
                              </fieldset>
                            )
                          })}
                      </section>
                    ))}
                  </div>

                  <div className="alta-sustituto">
                    <strong>¿No aparece el sustituto?</strong>
                    <div>
                      <input
                        type="text"
                        name="nuevo_jugador_nombre"
                        placeholder="Nombre oficial"
                      />
                      <input
                        type="text"
                        name="nuevo_jugador_alias"
                        placeholder="Alias visible"
                      />
                      <button
                        type="button"
                        className="boton boton-secundario"
                        disabled={guardando === `${partido.id_partido}-jugador`}
                        onClick={(evento) => crearJugador(evento, partido)}
                      >
                        {guardando === `${partido.id_partido}-jugador`
                          ? 'Dando de alta…'
                          : 'Dar de alta'}
                      </button>
                    </div>
                  </div>

                  <p className="ayuda-sustituciones">
                    Si eliges “Cedido”, no computará individualmente para Ranking ni ISP.
                  </p>
                  <button
                    type="button"
                    className="boton boton-secundario boton-guardar-sustituciones"
                    disabled={guardando === `${partido.id_partido}-sustituciones`}
                    onClick={(evento) => guardarSustituciones(evento, partido)}
                  >
                    {guardando === `${partido.id_partido}-sustituciones`
                      ? 'Guardando…'
                      : 'Guardar sustituciones'}
                  </button>
                </details>

                <div className="sets-campeonato">
                  {[1, 2, 3].map((numero) => (
                    <label key={numero}>
                      <span>SET {numero}</span>
                      <div>
                        <input
                          type="number"
                          inputMode="numeric"
                          min="0"
                          max={puntosMaximos}
                          name={`set${numero}_1`}
                          onChange={(evento) => validarPuntuacion(evento, partido)}
                          defaultValue={valorSet(
                            partido,
                            numero,
                            'juegos_equipo_1'
                          )}
                        />
                        <b>–</b>
                        <input
                          type="number"
                          inputMode="numeric"
                          min="0"
                          max={puntosMaximos}
                          name={`set${numero}_2`}
                          onChange={(evento) => validarPuntuacion(evento, partido)}
                          defaultValue={valorSet(
                            partido,
                            numero,
                            'juegos_equipo_2'
                          )}
                        />
                      </div>
                    </label>
                  ))}
                </div>

                <div className="datos-partido-campeonato">
                  <label>
                    <span>Pista</span>
                    <input
                      type="number"
                      min="1"
                      name="pista"
                      defaultValue={partido.pista ?? ''}
                    />
                  </label>

                  <label>
                    <span>Duración (min)</span>
                    <input
                      type="number"
                      min="1"
                      name="duracion"
                      defaultValue={partido.duracion_min ?? ''}
                    />
                  </label>

                  <div className="acciones-resultado-campeonato">
                    {partido.estado === 'jugado' && (
                      <button
                        className="boton boton-peligro"
                        type="button"
                        disabled={Boolean(guardando)}
                        onClick={() => setPartidoAAnular(partido)}
                      >
                        {guardando === `anular-${partido.id_partido}`
                          ? 'Anulando…'
                          : 'Anular resultado'}
                      </button>
                    )}
                    <button
                      className="boton boton-principal"
                      type="submit"
                      disabled={Boolean(guardando)}
                    >
                      {guardando === partido.id_partido
                        ? 'Guardando…'
                        : 'Guardar'}
                    </button>
                  </div>
                </div>

                {mensaje && (
                  <p className={`mensaje-partido ${mensaje.tipo}`}>
                    {mensaje.texto}
                  </p>
                )}
              </form>
            )
          })}
        </div>

        {partidoAAnular && (
          <div className="modal-fondo" role="presentation" onMouseDown={() => setPartidoAAnular(null)}>
            <div className="modal-confirmacion modal-anular-resultado" role="dialog" aria-modal="true" aria-labelledby="titulo-anular-resultado" onMouseDown={(evento) => evento.stopPropagation()}>
              <span className="icono-modal-anular">↩</span>
              <h3 id="titulo-anular-resultado">¿Anular este resultado?</h3>
              <p><strong>{partidoAAnular.equipo_1}</strong> contra <strong>{partidoAAnular.equipo_2}</strong></p>
              <p>El partido volverá a Pendiente. Se borrarán automáticamente el marcador, la pista y la duración.</p>
              <p className="nota-modal-anular">Las sustituciones se conservarán.</p>
              <div className="modal-acciones">
                <button type="button" className="boton boton-secundario" onClick={() => setPartidoAAnular(null)}>Cancelar</button>
                <button type="button" className="boton boton-peligro" disabled={Boolean(guardando)} onClick={() => anularResultado(partidoAAnular)}>{guardando ? 'Anulando…' : 'Sí, anular resultado'}</button>
              </div>
            </div>
          </div>
        )}
      </section>
    </main>
  )
}
