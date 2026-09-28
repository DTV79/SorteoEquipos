import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabaseCampeonato } from './lib/supabaseCampeonato'
import './FasesCrucesCampeonato.css'

const FORMATO_ESPECIAL = 'Campeones de ReGrupo directos a semifinales'

const ORDEN_RONDAS_CHAMPIONS = ['PREV', 'DF', 'OF', 'CF', 'SF', 'F']
const NOMBRES_RONDAS_CHAMPIONS = {
  PREV: 'Ronda previa',
  DF: 'Dieciseisavos',
  OF: 'Octavos',
  CF: 'Cuartos de final',
  SF: 'Semifinales',
  F: 'Gran final',
}
const ORDEN_RONDAS_PALAS = ['OCT', 'CUA', 'SEM', 'FIN']
const NOMBRES_RONDAS_PALAS = {
  OCT: 'Octavos',
  CUA: 'Cuartos de final',
  SEM: 'Semifinales',
  FIN: 'Final Palas de Playa',
}

function Equipo({ equipo, pendiente }) {
  return (
    <div className={`equipo-cruce${pendiente ? ' pendiente' : ''}`}>
      <strong>{equipo?.equipo || pendiente}</strong>
      {equipo?.id_equipo && <small>{equipo.id_equipo}</small>}
    </div>
  )
}

function Partido({ titulo, equipo1, equipo2, pendiente1, pendiente2, tono = '' }) {
  return (
    <article className={`partido-cuadro ${tono}`}>
      <span>{titulo}</span>
      <Equipo equipo={equipo1} pendiente={pendiente1} />
      <b>VS</b>
      <Equipo equipo={equipo2} pendiente={pendiente2} />
    </article>
  )
}

function DescansoCuadro({ equipo }) {
  return (
    <article className="partido-cuadro palas descanso-cuadro">
      <span>DESCANSO</span>
      <Equipo equipo={equipo} />
      <b>→</b>
      <Equipo pendiente="Pasa directamente" />
    </article>
  )
}

function equipoPartido(partido, lado) {
  return {
    id_equipo: partido?.[`id_equipo_${lado}`] || '',
    equipo: partido?.[`equipo_${lado}`] || '',
  }
}

export default function FasesCrucesCampeonato({ codigo, onVolver, onConfiguracion, onResultados, onPanelPrincipal }) {
  const [config, setConfig] = useState({})
  const [clasificacion, setClasificacion] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [generando, setGenerando] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [previaChampions, setPreviaChampions] = useState(null)
  const [partidosChampions, setPartidosChampions] = useState([])
  const [descansosPalasChampions, setDescansosPalasChampions] = useState([])

  const cargar = useCallback(async () => {
    setCargando(true)
    setError('')
    const consultaConfig = await supabaseCampeonato.rpc(
      'admin_obtener_configuracion',
      { p_codigo: codigo }
    )

    if (consultaConfig.error || consultaConfig.data?.ok !== true) {
      setError(consultaConfig.error?.message || consultaConfig.data?.error || 'No se pudo cargar la configuración.')
    } else {
      const configuracion = consultaConfig.data.configuracion ?? {}
      const esChampionsConfig = String(configuracion.tipo_campeonato || configuracion.estructura_primera_fase || '').toLowerCase().includes('champions')
      const faseClasificacion = esChampionsConfig ? 'CH' : (configuracion.hay_regrupos ? 'RG' : 'GR')
      const consultaClasificacion = await supabaseCampeonato.rpc(
        'admin_listar_clasificaciones',
        { p_codigo: codigo, p_fase: faseClasificacion }
      )
      if (consultaClasificacion.error || consultaClasificacion.data?.ok !== true) {
        setError(consultaClasificacion.error?.message || consultaClasificacion.data?.error || 'No se pudo cargar la clasificación.')
      } else {
        setConfig(configuracion)
        setClasificacion(consultaClasificacion.data.clasificacion ?? [])
        if (esChampionsConfig) {
          const [previa, partidos, descansos] = await Promise.all([
            supabaseCampeonato.rpc('admin_previsualizar_eliminatorias_champions', { p_codigo: codigo }),
            supabaseCampeonato.rpc('admin_listar_partidos', { p_codigo: codigo }),
            supabaseCampeonato.rpc('admin_listar_descansos', { p_codigo: codigo }),
          ])

          if (previa.error || previa.data?.ok !== true) {
            setError(previa.error?.message || previa.data?.error || 'No se pudo preparar la eliminatoria Champions.')
          } else if (partidos.error || partidos.data?.ok !== true) {
            setError(partidos.error?.message || partidos.data?.error || 'No se pudieron cargar los partidos del cuadro Champions.')
          } else if (descansos.error || descansos.data?.ok !== true) {
            setError(descansos.error?.message || descansos.data?.error || 'No se pudieron cargar los descansos de Palas de Playa.')
          } else {
            setPreviaChampions(previa.data)
            setPartidosChampions((partidos.data.partidos ?? []).filter((p) => p.codigo_fase === 'MM' || p.codigo_fase === 'PP'))
            setDescansosPalasChampions((descansos.data.descansos ?? []).filter((d) => d.codigo_fase === 'PP'))
          }
        } else {
          setPreviaChampions(null)
          setPartidosChampions([])
          setDescansosPalasChampions([])
        }
      }
    }
    setCargando(false)
  }, [codigo])

  useEffect(() => { cargar() }, [cargar])

  const grupos = useMemo(() => {
    const mapa = new Map()
    clasificacion.forEach((fila) => {
      const clave = fila.codigo_grupo || 'SIN-GRUPO'
      if (!mapa.has(clave)) mapa.set(clave, [])
      mapa.get(clave).push(fila)
    })
    return [...mapa.entries()]
      .map(([codigoGrupo, filas]) => [codigoGrupo, filas.sort((a, b) => Number(a.posicion) - Number(b.posicion))])
      .sort(([grupoA], [grupoB]) => String(grupoA).localeCompare(String(grupoB)))
  }, [clasificacion])

  const especial = config.formato_acceso_eliminatorias === FORMATO_ESPECIAL
  const esLiguilla = config.tipo_campeonato === 'Liguilla'
  const esChampions = String(config.tipo_campeonato || config.estructura_primera_fase || '').toLowerCase().includes('champions')
  const posicionInicioPalas = Math.max(1, Number(config.posicion_inicio_palas_playa) || 1)
  const participantesPalasLiguilla = esLiguilla
    ? clasificacion.filter((fila) => Number(fila.posicion) >= posicionInicioPalas)
    : []
  const grupoA = grupos[0]?.[1] ?? []
  const grupoB = grupos[1]?.[1] ?? []
  const cuadroCompleto = especial && grupos.length === 2 && grupoA.length >= 4 && grupoB.length >= 4
  const equiposNecesarios = {
    Octavos: 16,
    Cuartos: 8,
    Semifinales: 4,
    Final: 2,
  }[config.ronda_inicial_eliminatorias] ?? 0
  const clasificadosPorGrupo = Number(config.equipos_pasan_a_cruces_por_grupo) || 0
  const clasificadosNormales = esLiguilla
    ? clasificacion.filter((fila) => Number(fila.posicion) <= equiposNecesarios)
    : clasificacion.filter((fila) => Number(fila.posicion) <= clasificadosPorGrupo)
  const cuadroNormalCompleto = !especial && equiposNecesarios > 0 && clasificadosNormales.length === equiposNecesarios

  const rondasTituloChampions = useMemo(() => {
    return ORDEN_RONDAS_CHAMPIONS
      .map((codigoRonda) => ({
        codigoRonda,
        nombre: NOMBRES_RONDAS_CHAMPIONS[codigoRonda] || codigoRonda,
        partidos: partidosChampions
          .filter((p) => p.codigo_fase === 'MM' && p.codigo_ronda === codigoRonda)
          .sort((a, b) => Number(a.orden) - Number(b.orden)),
      }))
      .filter((ronda) => ronda.partidos.length > 0)
  }, [partidosChampions])

  const rondasPalasChampions = useMemo(() => {
    return ORDEN_RONDAS_PALAS
      .map((codigoRonda) => ({
        codigoRonda,
        nombre: NOMBRES_RONDAS_PALAS[codigoRonda] || codigoRonda,
        partidos: partidosChampions
          .filter((p) => p.codigo_fase === 'PP' && p.codigo_ronda === codigoRonda)
          .sort((a, b) => Number(a.orden) - Number(b.orden)),
        descansos: descansosPalasChampions.filter((d) => d.codigo_ronda === codigoRonda),
      }))
      .filter((ronda) => ronda.partidos.length > 0 || ronda.descansos.length > 0)
  }, [partidosChampions, descansosPalasChampions])

  async function generarCuadro() {
    setGenerando(true)
    setError('')
    setMensaje('')
    const { data, error: errorGeneracion } = await supabaseCampeonato.rpc(
      esChampions ? 'admin_generar_eliminatorias_champions' : (especial ? 'admin_generar_cuadro_especial' : 'admin_generar_cuadro_normal'),
      { p_codigo: codigo }
    )
    if (errorGeneracion || data?.ok !== true) {
      setError(errorGeneracion?.message || data?.error || 'No se pudo generar el cuadro.')
    } else {
      const jornadasRetiradas = Number(data.jornadas_pendientes_retiradas) || 0
      setMensaje(esChampions ? (data.mensaje || `Eliminatoria Champions creada correctamente: ${data.partidos_creados || 0} partido(s).`) : `Cuadro creado correctamente: ${data.partidos_creados} partidos de ${especial ? 'cuartos' : (data.ronda_inicial || 'la ronda inicial').toLowerCase()}.${data.copa_palas ? ' La Copa Palas de Playa también queda preparada.' : ''}${jornadasRetiradas ? ` Se retiraron ${jornadasRetiradas} jornadas completamente pendientes.` : ''} Las siguientes rondas aparecerán al guardar los resultados.`)
      await cargar()
    }
    setGenerando(false)
  }

  return (
    <main className="app app-admin app-campeonato">
      <section className="panel-admin panel-campeonato panel-fases-cruces">
        <header className="cabecera-admin cabecera-campeonato">
          <div><p className="etiqueta">CAMPEONATO</p><h2>Fases y cruces</h2><p className="descripcion-admin">{codigo}</p></div>
          <div className="acciones-cabecera-configuracion">
            <button type="button" className="boton boton-secundario" onClick={onConfiguracion}>⚙ Configuración</button>
            <button type="button" className="boton boton-secundario" onClick={onResultados}>🎾 Partidos</button>
            <button type="button" className="boton boton-secundario" onClick={onVolver}>← Gestión</button>
            <button type="button" className="boton boton-secundario" onClick={onPanelPrincipal}>← Panel principal</button>
          </div>
        </header>

        {cargando && <p className="estado">Preparando el cuadro…</p>}
        {error && <p className="mensaje-login">Error: {error}</p>}

        {!cargando && !error && (
          <>
            <section className="resumen-formato-cuadro">
              <div><small>FORMATO SELECCIONADO</small><strong>{esChampions ? 'Champions' : (config.formato_acceso_eliminatorias || 'Cruces normales')}</strong></div>
              <span>{esChampions
                ? 'Cuadro por el título con reseeding según la clasificación Champions.'
                : especial
                  ? 'Los campeones de ReGrupo esperan directamente en semifinales.'
                  : `El cuadro comenzará en ${config.ronda_inicial_eliminatorias || 'la ronda configurada'}.`}</span>
              <button type="button" className="boton boton-secundario" onClick={cargar}>↻ Actualizar clasificación</button>
            </section>

            {esChampions && (
              <>
                <section className="aviso-cuadro-normal">
                  <strong>Champions · cuadro por el título</strong>
                  <p>{previaChampions?.mensaje_eliminatorias || 'Preparando la clasificación final Champions.'}</p>
                  {!previaChampions?.ya_generadas && previaChampions?.ronda_a_generar && <p>Ronda inicial: <b>{previaChampions.ronda_a_generar}</b>.</p>}
                  {!previaChampions?.ya_generadas && (previaChampions?.cruces || []).map((x) => <p key={x.orden}><b>{x.equipo_1?.posicion}.º {x.equipo_1?.equipo}</b> vs <b>{x.equipo_2?.posicion}.º {x.equipo_2?.equipo}</b></p>)}
                  {!previaChampions?.ya_generadas && (previaChampions?.exentos || []).length > 0 && <>
                    <p><b>Exentos:</b></p>
                    {(previaChampions.exentos || []).map((x) => <p key={x.id_equipo || x.posicion}>· {x.posicion}.º {x.equipo}</p>)}
                  </>}
                  {config.hay_copa_palas_playa && <p>🏖️ Palas de Playa utiliza el módulo común del campeonato.</p>}
                </section>

                {previaChampions?.ya_generadas ? (
                  <>
                    {rondasTituloChampions.length > 0 && (
                      <section className="cuadro-eliminatorias cuadro-eliminatorias-champions">
                        {rondasTituloChampions.map((ronda, indice) => (
                          <div
                            className={`columna-cuadro${ronda.codigoRonda === 'F' ? ' final' : ronda.codigoRonda === 'SF' ? ' destacada' : ''}`}
                            key={ronda.codigoRonda}
                          >
                            <header>
                              <small>{indice === 0 ? 'RONDA INICIAL' : ronda.codigoRonda === 'F' ? 'TÍTULO' : 'CUADRO PRINCIPAL'}</small>
                              <h3>{ronda.nombre}</h3>
                            </header>
                            {ronda.partidos.map((partido, partidoIndice) => (
                              <Partido
                                key={partido.id_partido}
                                titulo={`${ronda.nombre === 'Gran final' ? 'Final del campeonato' : `${ronda.nombre} ${partidoIndice + 1}`}`}
                                equipo1={equipoPartido(partido, 1)}
                                equipo2={equipoPartido(partido, 2)}
                                tono={ronda.codigoRonda === 'F' ? 'final' : ''}
                              />
                            ))}
                          </div>
                        ))}
                      </section>
                    )}

                    {config.hay_copa_palas_playa && rondasPalasChampions.length > 0 && (
                      <section className="copa-palas-cuadro">
                        <header>
                          <div><small>CUADRO DE CONSOLACIÓN</small><h3>🏖️ Copa Palas de Playa</h3></div>
                          <span>En Palas de Playa continúan los perdedores</span>
                        </header>
                        <div className="cuadro-palas-champions">
                          {rondasPalasChampions.map((ronda) => (
                            <div className="columna-cuadro columna-palas-champions" key={ronda.codigoRonda}>
                              <header><small>PALAS DE PLAYA</small><h3>{ronda.nombre}</h3></header>
                              {ronda.descansos.map((descanso) => (
                                <DescansoCuadro
                                  key={descanso.id_partido || `${ronda.codigoRonda}-${descanso.equipo_1}`}
                                  equipo={{ id_equipo: descanso.id_equipo || '', equipo: descanso.equipo_1 || descanso.equipo || '' }}
                                />
                              ))}
                              {ronda.partidos.map((partido, partidoIndice) => (
                                <Partido
                                  key={partido.id_partido}
                                  titulo={ronda.codigoRonda === 'FIN' ? 'Final Palas de Playa' : `${ronda.nombre} ${partidoIndice + 1}`}
                                  equipo1={equipoPartido(partido, 1)}
                                  equipo2={equipoPartido(partido, 2)}
                                  tono={`palas${ronda.codigoRonda === 'FIN' ? ' final' : ''}`}
                                />
                              ))}
                            </div>
                          ))}
                        </div>
                      </section>
                    )}

                    <section className="barra-generar-cuadro">
                      <div>
                        <strong>Eliminatorias ya generadas</strong>
                        <span>{previaChampions.partidos_existentes ?? 0} {Number(previaChampions.partidos_existentes ?? 0) === 1 ? 'partido existente' : 'partidos existentes'}. El cuadro se muestra con los cruces reales del campeonato.</span>
                      </div>
                      <button type="button" className="boton boton-principal" onClick={onResultados}>Ver eliminatorias</button>
                    </section>
                  </>
                ) : (
                  <section className="barra-generar-cuadro">
                    <div>
                      <strong>{mensaje || (previaChampions?.puede_generar_eliminatorias ? 'Clasificación Champions preparada' : 'El cuadro todavía no puede generarse')}</strong>
                      <span>{previaChampions?.puede_generar_eliminatorias ? 'Los partidos se crearán en el módulo común de Eliminatorias.' : 'Primero debe completarse la fase Champions.'}</span>
                    </div>
                    <button type="button" className="boton boton-principal" disabled={generando || !previaChampions?.puede_generar_eliminatorias} onClick={generarCuadro}>{generando ? 'Generando…' : 'Generar eliminatorias'}</button>
                  </section>
                )}
              </>
            )}

            {!esChampions && !especial && (
              <>
                <section className="aviso-cuadro-normal">
                  <strong>Cruces normales</strong>
                  <p>Los equipos clasificados comenzarán en {config.ronda_inicial_eliminatorias || 'la ronda inicial'} aplicando el criterio «{config.criterio_generar_cruces || 'Por clasificación'}».</p>
                  <p>{clasificadosNormales.length} de {equiposNecesarios || '—'} equipos preparados desde la clasificación de {esLiguilla ? 'la liguilla' : (config.hay_regrupos ? 'ReGrupos' : 'Grupos')}.</p>
                  {esLiguilla && (
                    <p>El cuadro puede generarse ahora con la clasificación actual. Solo cuentan los resultados ya jugados y las jornadas completamente pendientes se retirarán automáticamente.</p>
                  )}
                  {config.hay_copa_palas_playa && esLiguilla && (
                    <p>🏖️ La Copa Palas de Playa se creará con los {participantesPalasLiguilla.length} equipos clasificados desde la posición {posicionInicioPalas}. El ganador de cada partido se salva y el perdedor continúa.</p>
                  )}
                  {config.hay_copa_palas_playa && !esLiguilla && (
                    <p>🏖️ La Copa Palas de Playa se generará con los equipos que determine este formato. El ganador se salva y el perdedor continúa.</p>
                  )}
                  {config.hay_copa_palas_playa && <p>El criterio aplicado será «{config.criterio_palas_playa || 'Por Clasificación'}».</p>}
                </section>
                {!cuadroNormalCompleto && (
                  <p className="mensaje-login">
                    {esLiguilla
                      ? `La ronda elegida necesita ${equiposNecesarios || '—'} equipos clasificados.`
                      : 'La ronda y el número de clasificados por grupo no aportan exactamente los equipos necesarios para crear el cuadro.'}
                  </p>
                )}
                <section className="barra-generar-cuadro">
                  <div>
                    <strong>{mensaje || (cuadroNormalCompleto ? 'Clasificación preparada' : 'Configuración incompleta')}</strong>
                    <span>{esLiguilla
                      ? 'Se usará la clasificación actual y el criterio configurado para crear eliminatorias y, si está activada, Palas de Playa.'
                      : 'Se crearán los partidos reales en Supabase y las siguientes rondas avanzarán automáticamente.'}</span>
                  </div>
                  <button type="button" className="boton boton-principal" disabled={generando || !cuadroNormalCompleto} onClick={generarCuadro}>
                    {generando ? 'Generando…' : 'Generar cuadro definitivo'}
                  </button>
                </section>
              </>
            )}

            {especial && !cuadroCompleto && (
              <p className="mensaje-login">Este formato necesita exactamente dos ReGrupos con al menos cuatro equipos clasificados en cada uno.</p>
            )}

            {cuadroCompleto && (
              <>
                <section className="cuadro-eliminatorias">
                  <div className="columna-cuadro">
                    <header><small>RONDA INICIAL</small><h3>Cuartos de final</h3></header>
                    <Partido titulo="Cuartos 1 · Cruce entre ReGrupos" equipo1={grupoB[1]} equipo2={grupoA[2]} />
                    <Partido titulo="Cuartos 2 · Cruce entre ReGrupos" equipo1={grupoA[1]} equipo2={grupoB[2]} />
                  </div>
                  <div className="columna-cuadro destacada">
                    <header><small>CUADRO PRINCIPAL</small><h3>Semifinales</h3></header>
                    <Partido titulo="Semifinal 1" equipo1={grupoA[0]} pendiente2="Ganador de Cuartos 1" />
                    <Partido titulo="Semifinal 2" equipo1={grupoB[0]} pendiente2="Ganador de Cuartos 2" />
                  </div>
                  <div className="columna-cuadro final">
                    <header><small>TÍTULO</small><h3>Gran final</h3></header>
                    <Partido titulo="Final del campeonato" pendiente1="Ganador de Semifinal 1" pendiente2="Ganador de Semifinal 2" tono="final" />
                  </div>
                </section>

                {config.hay_copa_palas_playa && (
                  <section className="copa-palas-cuadro">
                    <header><div><small>CUADRO DE CONSOLACIÓN</small><h3>🏖️ Copa Palas de Playa</h3></div><span>Comienza al terminar los cuartos del cuadro principal</span></header>
                    <div className="partidos-palas">
                      <Partido titulo="Semifinal Palas 1" equipo1={grupoA[3]} pendiente2="Perdedor de Cuartos 2" tono="palas" />
                      <Partido titulo="Semifinal Palas 2" equipo1={grupoB[3]} pendiente2="Perdedor de Cuartos 1" tono="palas" />
                      <Partido titulo="Final Palas de Playa" pendiente1="Perdedor de Semifinal Palas 1" pendiente2="Perdedor de Semifinal Palas 2" tono="palas final" />
                    </div>
                  </section>
                )}

                <section className="barra-generar-cuadro">
                  <div><strong>{mensaje || 'Vista previa preparada'}</strong><span>En el cuadro principal avanzan los ganadores; en Palas de Playa continúan los perdedores.</span></div>
                  <button type="button" className="boton boton-principal" disabled={generando} onClick={generarCuadro}>{generando ? 'Generando…' : 'Generar cuadro definitivo'}</button>
                </section>
              </>
            )}
          </>
        )}
      </section>
    </main>
  )
}
