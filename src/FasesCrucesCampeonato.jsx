import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabaseCampeonato } from './lib/supabaseCampeonato'
import './FasesCrucesCampeonato.css'

const FORMATO_ESPECIAL = 'Campeones de ReGrupo directos a semifinales'

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

export default function FasesCrucesCampeonato({ codigo, onVolver, onConfiguracion, onResultados, onPanelPrincipal }) {
  const [config, setConfig] = useState({})
  const [clasificacion, setClasificacion] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [generando, setGenerando] = useState(false)
  const [mensaje, setMensaje] = useState('')

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
      const faseClasificacion = configuracion.hay_regrupos ? 'RG' : 'GR'
      const consultaClasificacion = await supabaseCampeonato.rpc(
        'admin_listar_clasificaciones',
        { p_codigo: codigo, p_fase: faseClasificacion }
      )
      if (consultaClasificacion.error || consultaClasificacion.data?.ok !== true) {
        setError(consultaClasificacion.error?.message || consultaClasificacion.data?.error || 'No se pudo cargar la clasificación.')
      } else {
        setConfig(configuracion)
        setClasificacion(consultaClasificacion.data.clasificacion ?? [])
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

  async function generarCuadro() {
    setGenerando(true)
    setError('')
    setMensaje('')
    const { data, error: errorGeneracion } = await supabaseCampeonato.rpc(
      especial ? 'admin_generar_cuadro_especial' : 'admin_generar_cuadro_normal',
      { p_codigo: codigo }
    )
    if (errorGeneracion || data?.ok !== true) {
      setError(errorGeneracion?.message || data?.error || 'No se pudo generar el cuadro.')
    } else {
      setMensaje(`Cuadro creado correctamente: ${data.partidos_creados} partidos de ${especial ? 'cuartos' : (data.ronda_inicial || 'la ronda inicial').toLowerCase()}.${data.copa_palas ? ' La Copa Palas de Playa también queda preparada.' : ''} Las siguientes rondas aparecerán al guardar los resultados.`)
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
              <div><small>FORMATO SELECCIONADO</small><strong>{config.formato_acceso_eliminatorias || 'Cruces normales'}</strong></div>
              <span>{especial ? 'Los campeones de ReGrupo esperan directamente en semifinales.' : `El cuadro comenzará en ${config.ronda_inicial_eliminatorias || 'la ronda configurada'}.`}</span>
              <button type="button" className="boton boton-secundario" onClick={cargar}>↻ Actualizar clasificación</button>
            </section>

            {!especial && (
              <>
                <section className="aviso-cuadro-normal">
                  <strong>Cruces normales</strong>
                  <p>Los equipos clasificados comenzarán en {config.ronda_inicial_eliminatorias || 'la ronda inicial'} aplicando el criterio «{config.criterio_generar_cruces || 'Por clasificación'}».</p>
                  <p>{clasificadosNormales.length} de {equiposNecesarios || '—'} equipos preparados desde la clasificación de {esLiguilla ? 'la liguilla' : (config.hay_regrupos ? 'ReGrupos' : 'Grupos')}.</p>
                  {esLiguilla && (
                    <p>El cuadro puede generarse ahora con la clasificación actual. Solo cuentan los resultados ya jugados; no es necesario completar las jornadas pendientes.</p>
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
                      ? 'Se usará la clasificación actual para crear eliminatorias y, si está activada, Palas de Playa.'
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
