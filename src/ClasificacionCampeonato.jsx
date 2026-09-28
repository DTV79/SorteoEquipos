import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabaseCampeonato } from './lib/supabaseCampeonato'
import './ClasificacionCampeonato.css'

function numero(valor) {
  const resultado = Number(valor)
  return Number.isFinite(resultado) ? resultado : 0
}

export default function ClasificacionCampeonato({ codigo, onVolver, onResultados, onPanelPrincipal }) {
  const [filas, setFilas] = useState([])
  const [sistema, setSistema] = useState('')
  const [hayRegrupos, setHayRegrupos] = useState(false)
  const [tipoCampeonato, setTipoCampeonato] = useState('')
  const [faseActiva, setFaseActiva] = useState('GR')
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  const cargar = useCallback(async () => {
    setCargando(true)
    setError('')

    const { data: datosConfiguracion, error: errorConfiguracion } = await supabaseCampeonato.rpc(
      'admin_obtener_configuracion',
      { p_codigo: codigo }
    )

    if (errorConfiguracion || datosConfiguracion?.ok !== true) {
      setError(errorConfiguracion?.message || datosConfiguracion?.error || 'No se pudo cargar la configuración del campeonato.')
      setCargando(false)
      return
    }

    const tipo = datosConfiguracion?.configuracion?.tipo_campeonato || ''
    const esChampions = tipo === 'Champions'
    const faseConsulta = esChampions ? 'CH' : faseActiva

    const { data, error: errorConsulta } = await supabaseCampeonato.rpc(
      'admin_listar_clasificaciones',
      { p_codigo: codigo, p_fase: faseConsulta }
    )

    if (errorConsulta || data?.ok !== true) {
      setError(errorConsulta?.message || data?.error || 'No se pudo cargar la clasificación.')
      setCargando(false)
      return
    }

    setTipoCampeonato(tipo)
    setFilas(data.clasificacion ?? [])
    setSistema(data.sistema_puntuacion ?? '')
    setHayRegrupos(esChampions ? false : Boolean(data.hay_regrupos))
    setCargando(false)
  }, [codigo, faseActiva])

  useEffect(() => {
    cargar()
  }, [cargar])

  const esChampions = tipoCampeonato === 'Champions'

  const grupos = useMemo(() => {
    const resultado = new Map()
    filas.forEach((fila) => {
      const clave = fila.codigo_grupo || 'SIN-GRUPO'
      if (!resultado.has(clave)) resultado.set(clave, [])
      resultado.get(clave).push(fila)
    })
    return [...resultado.entries()]
  }, [filas])

  return (
    <main className="app app-admin app-campeonato">
      <section className="panel-admin panel-campeonato panel-clasificacion">
        <header className="cabecera-admin cabecera-campeonato">
          <div>
            <p className="etiqueta">CAMPEONATO</p>
            <h2>Clasificaciones</h2>
            <p className="descripcion-admin">{codigo}</p>
          </div>
          <div className="acciones-cabecera-configuracion">
            <button type="button" className="boton boton-secundario" onClick={onResultados}>🎾 Partidos</button>
            <button type="button" className="boton boton-secundario" onClick={onVolver}>← Gestión</button>
            <button type="button" className="boton boton-secundario" onClick={onPanelPrincipal}>← Panel principal</button>
          </div>
        </header>

        {hayRegrupos && (
          <div className="selector-fase-clasificacion" role="group" aria-label="Fase de la clasificación">
            <button type="button" className={faseActiva === 'GR' ? 'activo' : ''} onClick={() => setFaseActiva('GR')}>Primera fase · Grupos</button>
            <button type="button" className={faseActiva === 'RG' ? 'activo' : ''} onClick={() => setFaseActiva('RG')}>Segunda fase · ReGrupos</button>
          </div>
        )}

        <section className="resumen-clasificacion">
          <div><strong>{esChampions ? 'Primera fase · Champions' : faseActiva === 'RG' ? 'Segunda fase · ReGrupos' : 'Primera fase · Grupos'}</strong><span>Se actualiza automáticamente al guardar o anular un resultado.</span></div>
          <div><small>Sistema de puntuación</small><b>{sistema || 'Sin definir'}</b></div>
          <button type="button" className="boton boton-secundario" disabled={cargando} onClick={cargar}>
            {cargando ? 'Actualizando…' : '↻ Actualizar'}
          </button>
        </section>

        {error && <p className="mensaje-login">Error: {error}</p>}
        {!cargando && !error && grupos.length === 0 && (
          <p className="estado tarjeta-partido-campeonato">{esChampions ? 'Todavía no hay clasificación Champions disponible.' : faseActiva === 'RG' ? 'Los ReGrupos todavía no se han generado.' : 'Todavía no hay equipos distribuidos en grupos.'}</p>
        )}

        <div className="lista-clasificaciones-grupos">
          {grupos.map(([codigoGrupo, equipos]) => (
            <section className="tarjeta-clasificacion-grupo" key={codigoGrupo}>
              <header>
                <div><small>{esChampions ? 'PRIMERA FASE' : faseActiva === 'RG' ? 'SEGUNDA FASE' : 'PRIMERA FASE'}</small><h3>{esChampions ? 'Champions' : (equipos[0]?.nombre_grupo || `Grupo ${codigoGrupo}`)}</h3></div>
                <span>{equipos.length} equipos</span>
              </header>
              <div className="tabla-clasificacion-scroll">
                <table className="tabla-clasificacion">
                  <thead><tr><th>Pos.</th><th>Equipo</th><th>PTS</th><th>PJ</th><th>PG</th><th>PP</th><th>SF</th><th>SC</th><th>DS</th><th>PF</th><th>PC</th><th>DP</th></tr></thead>
                  <tbody>
                    {equipos.map((equipo) => (
                      <tr key={equipo.id_equipo}>
                        <td><b className="posicion-clasificacion">{equipo.posicion}</b></td>
                        <td><strong>{equipo.equipo}</strong><small>{equipo.id_equipo}</small></td>
                        <td className="puntos-clasificacion">{numero(equipo.puntos)}</td>
                        <td>{numero(equipo.pj)}</td><td>{numero(equipo.pg)}</td><td>{numero(equipo.pp)}</td>
                        <td>{numero(equipo.sets_favor)}</td><td>{numero(equipo.sets_contra)}</td><td>{numero(equipo.dif_sets)}</td>
                        <td>{numero(equipo.juegos_favor)}</td><td>{numero(equipo.juegos_contra)}</td><td>{numero(equipo.dif_juegos)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="leyenda-clasificacion">PTS puntos · PJ jugados · PG ganados · PP perdidos · SF/SC sets · PF/PC puntos de juego · DS/DP diferencias</p>
            </section>
          ))}
        </div>
      </section>
    </main>
  )
}
