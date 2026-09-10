import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabaseCampeonato } from './lib/supabaseCampeonato'
import './CierreCampeonato.css'

const numero = (valor, decimales = 0) => Number(valor ?? 0).toLocaleString('es-ES', {
  minimumFractionDigits: decimales,
  maximumFractionDigits: decimales,
})

function Movimiento({ valor }) {
  const cambio = Number(valor ?? 0)
  if (!cambio) return <span className="movimiento neutro">—</span>
  return <span className={`movimiento ${cambio > 0 ? 'sube' : 'baja'}`}>{cambio > 0 ? '+' : ''}{numero(cambio, 1)}</span>
}

export default function CierreCampeonato({ codigo, onVolver, onResultados, onPanelPrincipal }) {
  const [datos, setDatos] = useState(null)
  const [vista, setVista] = useState('edicion')
  const [cargando, setCargando] = useState(true)
  const [procesando, setProcesando] = useState(false)
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [confirmarCierre, setConfirmarCierre] = useState(false)
  const [confirmarReapertura, setConfirmarReapertura] = useState(false)
  const [motivo, setMotivo] = useState('')

  const cargar = useCallback(async () => {
    setCargando(true)
    setError('')
    const { data, error: errorConsulta } = await supabaseCampeonato.rpc(
      'admin_resumen_historicos',
      { p_codigo: codigo }
    )
    if (errorConsulta || data?.ok !== true) {
      setError(errorConsulta?.message || data?.error || 'No se pudo cargar el cierre del campeonato.')
    } else {
      setDatos(data)
    }
    setCargando(false)
  }, [codigo])

  useEffect(() => { cargar() }, [cargar])

  const cerrado = datos?.cierre?.estado === 'cerrado' || datos?.campeonato?.estado === 'finalizado'
  const previa = datos?.previsualizacion ?? {}
  const rankingEdicion = datos?.ranking_edicion ?? []
  const estadisticasEdicion = datos?.estadisticas_edicion ?? []
  const rankingTotal = datos?.ranking_total ?? []
  const estadisticasGlobal = datos?.estadisticas_global ?? []
  const isp = datos?.isp ?? []

  const estadisticasPorJugador = useMemo(
    () => new Map(estadisticasEdicion.map((fila) => [fila.id_jugador, fila])),
    [estadisticasEdicion]
  )
  const globalPorJugador = useMemo(
    () => new Map(estadisticasGlobal.map((fila) => [fila.id_jugador, fila])),
    [estadisticasGlobal]
  )

  async function cerrarCampeonato() {
    setProcesando(true)
    setError('')
    setMensaje('')
    const { data, error: errorCierre } = await supabaseCampeonato.rpc(
      'admin_cerrar_campeonato',
      { p_codigo: codigo }
    )
    if (errorCierre || data?.ok !== true) {
      setError(errorCierre?.message || data?.error || 'No se pudo cerrar el campeonato.')
    } else {
      setMensaje(`Campeonato cerrado. Se guardó el histórico de ${data.jugadores_ranking ?? 0} jugadores y se recalculó el ISP.`)
      setConfirmarCierre(false)
      await cargar()
    }
    setProcesando(false)
  }

  async function reabrirCampeonato() {
    if (!motivo.trim()) {
      setError('Indica por qué necesitas reabrir el campeonato.')
      return
    }
    setProcesando(true)
    setError('')
    setMensaje('')
    const { data, error: errorReapertura } = await supabaseCampeonato.rpc(
      'admin_reabrir_campeonato',
      { p_codigo: codigo, p_motivo: motivo.trim() }
    )
    if (errorReapertura || data?.ok !== true) {
      setError(errorReapertura?.message || data?.error || 'No se pudo reabrir el campeonato.')
    } else {
      setMensaje('Campeonato reabierto. Ya puedes corregir los resultados necesarios.')
      setConfirmarReapertura(false)
      setMotivo('')
      await cargar()
    }
    setProcesando(false)
  }

  return (
    <main className="app app-admin app-campeonato">
      <section className="panel-admin panel-campeonato panel-cierre">
        <header className="cabecera-admin cabecera-campeonato">
          <div>
            <p className="etiqueta">CAMPEONATO</p>
            <h2>Cierre e históricos</h2>
            <p className="descripcion-admin">{codigo}</p>
          </div>
          <div className="acciones-cabecera-configuracion">
            <button type="button" className="boton boton-secundario" onClick={onResultados}>🎾 Partidos</button>
            <button type="button" className="boton boton-secundario" onClick={onVolver}>← Gestión</button>
            <button type="button" className="boton boton-secundario" onClick={onPanelPrincipal}>← Panel principal</button>
          </div>
        </header>

        {cargando && <p className="estado-cierre cargando">Cargando estadísticas e históricos…</p>}
        {error && <p className="estado-cierre error">{error}</p>}
        {mensaje && <p className="estado-cierre correcto">{mensaje}</p>}

        {!cargando && datos && (
          <>
            <section className={`resumen-cierre ${cerrado ? 'cerrado' : ''}`}>
              <div>
                <span className="estado-etiqueta">{cerrado ? '✅ CAMPEONATO CERRADO' : '🏁 PREPARACIÓN DEL CIERRE'}</span>
                <h3>{cerrado ? 'Históricos generados' : previa.ok ? 'Todo listo para cerrar' : 'Aún no se puede cerrar'}</h3>
                <p>{cerrado
                  ? `Versión de cierre ${datos.cierre?.version_cierre ?? 1}. El histórico y el ISP están guardados.`
                  : previa.ok
                    ? 'Todos los partidos y la final principal están correctamente terminados.'
                    : 'Revisa los elementos pendientes antes de generar los históricos.'}</p>
              </div>
              <div className="acciones-cierre">
                <button type="button" className="boton boton-secundario" disabled={procesando} onClick={cargar}>↻ Actualizar</button>
                {cerrado
                  ? <button type="button" className="boton boton-peligro" disabled={procesando} onClick={() => setConfirmarReapertura(true)}>Reabrir para corregir</button>
                  : <button type="button" className="boton boton-principal" disabled={!previa.ok || procesando} onClick={() => setConfirmarCierre(true)}>Cerrar campeonato</button>}
              </div>
            </section>

            <div className="comprobaciones-cierre">
              <div><small>Partidos jugados</small><strong>{previa.jugados ?? 0}/{previa.partidos ?? 0}</strong></div>
              <div className={Number(previa.pendientes) ? 'pendiente' : ''}><small>Pendientes</small><strong>{previa.pendientes ?? 0}</strong></div>
              <div className={previa.final_principal_jugada ? '' : 'pendiente'}><small>Final principal</small><strong>{previa.final_principal_jugada ? 'Jugado' : 'Pendiente'}</strong></div>
              <div className={Number(previa.partidos_sin_ganador) ? 'pendiente' : ''}><small>Sin ganador</small><strong>{previa.partidos_sin_ganador ?? 0}</strong></div>
            </div>

            <nav className="selector-historicos" aria-label="Datos históricos">
              <button type="button" className={vista === 'edicion' ? 'activo' : ''} onClick={() => setVista('edicion')}>Esta edición</button>
              <button type="button" className={vista === 'historico' ? 'activo' : ''} onClick={() => setVista('historico')}>Ranking histórico</button>
              <button type="button" className={vista === 'isp' ? 'activo' : ''} onClick={() => setVista('isp')}>ISP</button>
            </nav>

            {vista === 'edicion' && (
              <section className="bloque-historico">
                <div className="titulo-bloque-historico"><div><small>POR TORNEO</small><h3>Estadísticas de {codigo}</h3></div><span>{estadisticasEdicion.length} jugadores</span></div>
                {!cerrado && <p className="aviso-historico">Vista provisional. El ranking definitivo se creará al cerrar el campeonato.</p>}
                <div className="tabla-scroll"><table className="tabla-historicos"><thead><tr><th>Pos.</th><th>Jugador</th><th>Resultado</th><th>PJ</th><th>PG</th><th>PP</th><th>SF</th><th>SC</th><th>% vict.</th><th>Puntos edición</th></tr></thead><tbody>
                  {(cerrado && rankingEdicion.length ? rankingEdicion : estadisticasEdicion).map((fila, indice) => {
                    const estadistica = estadisticasPorJugador.get(fila.id_jugador) ?? fila
                    return <tr key={fila.id_jugador}><td>{fila.posicion_nueva ?? fila.posicion_final ?? indice + 1}</td><td><strong>{fila.jugador}</strong><small>{fila.equipo || fila.id_jugador}</small></td><td>{fila.resultado_final?.replaceAll('_', ' ') || '—'}</td><td>{estadistica.pj ?? 0}</td><td>{estadistica.pg ?? 0}</td><td>{estadistica.pp ?? 0}</td><td>{estadistica.sets_favor ?? fila.sets_ganados ?? 0}</td><td>{estadistica.sets_contra ?? fila.sets_perdidos ?? 0}</td><td>{numero(Number(estadistica.porcentaje_victorias ?? 0) * 100, 1)}%</td><td className="puntos-destacados">{cerrado ? numero(fila.puntos_edicion) : 'Pendiente'}</td></tr>
                  })}
                </tbody></table></div>
              </section>
            )}

            {vista === 'historico' && (
              <section className="bloque-historico">
                <div className="titulo-bloque-historico"><div><small>TODOS LOS TORNEOS</small><h3>Ranking Histórico</h3></div><span>{rankingTotal.length} jugadores</span></div>
                <div className="tabla-scroll"><table className="tabla-historicos"><thead><tr><th>Pos.</th><th>Jugador</th><th>Torneos</th><th>PJ</th><th>PG</th><th>PP</th><th>SF</th><th>SC</th><th>Puntos totales</th></tr></thead><tbody>
                  {rankingTotal.map((fila) => { const estadistica = globalPorJugador.get(fila.id_jugador) ?? fila; return <tr key={fila.id_jugador}><td><span className="posicion-ranking">{fila.posicion}</span></td><td><strong>{fila.jugador}</strong><small>{fila.id_jugador}</small></td><td>{fila.campeonatos ?? estadistica.campeonatos ?? 0}</td><td>{fila.pj ?? 0}</td><td>{fila.pg ?? 0}</td><td>{fila.pp ?? 0}</td><td>{fila.sets_ganados ?? estadistica.sets_favor ?? 0}</td><td>{fila.sets_perdidos ?? estadistica.sets_contra ?? 0}</td><td className="puntos-destacados">{numero(fila.puntos_totales)}</td></tr> })}
                </tbody></table></div>
              </section>
            )}

            {vista === 'isp' && (
              <section className="bloque-historico">
                <div className="titulo-bloque-historico"><div><small>NIVEL COMPETITIVO</small><h3>ISP actual</h3></div><span>{isp.length} jugadores</span></div>
                <p className="explicacion-isp">El ISP se recalcula con todos los partidos que computan de todos los campeonatos. Palas de Playa y sustitutos cedidos no alteran el índice.</p>
                <div className="tabla-scroll"><table className="tabla-historicos"><thead><tr><th>Pos.</th><th>Jugador</th><th>ISP</th><th>Último cambio</th><th>Partidos ISP</th><th>Máximo</th><th>Mínimo</th><th>Estado</th></tr></thead><tbody>
                  {isp.map((fila) => <tr key={fila.id_jugador}><td><span className="posicion-ranking">{fila.posicion}</span></td><td><strong>{fila.jugador}</strong><small>{fila.id_jugador}</small></td><td className="puntos-destacados">{numero(fila.isp_actual, 1)}</td><td><Movimiento valor={fila.ultima_variacion} /></td><td>{fila.partidos_isp}</td><td>{numero(fila.maximo_historico, 1)}</td><td>{numero(fila.minimo_historico, 1)}</td><td>{fila.provisional ? 'Provisional' : 'Consolidado'}</td></tr>)}
                </tbody></table></div>
              </section>
            )}
          </>
        )}
      </section>

      {confirmarCierre && <div className="modal-fondo" role="presentation" onMouseDown={() => !procesando && setConfirmarCierre(false)}><div className="modal-confirmacion modal-cierre" role="dialog" aria-modal="true" onMouseDown={(evento) => evento.stopPropagation()}><span className="icono-cierre">🏁</span><h3>¿Cerrar el campeonato?</h3><p>Se guardarán las estadísticas de esta edición, el Ranking Histórico y el nuevo ISP.</p><p className="nota-cierre">Después podrás reabrirlo si detectas un resultado incorrecto.</p><div className="modal-acciones"><button type="button" className="boton boton-secundario" disabled={procesando} onClick={() => setConfirmarCierre(false)}>Cancelar</button><button type="button" className="boton boton-principal" disabled={procesando} onClick={cerrarCampeonato}>{procesando ? 'Generando históricos…' : 'Sí, cerrar campeonato'}</button></div></div></div>}

      {confirmarReapertura && <div className="modal-fondo" role="presentation" onMouseDown={() => !procesando && setConfirmarReapertura(false)}><div className="modal-confirmacion modal-cierre" role="dialog" aria-modal="true" onMouseDown={(evento) => evento.stopPropagation()}><span className="icono-cierre peligro">↩</span><h3>Reabrir campeonato</h3><p>Indica el motivo. Quedará registrado en el historial de cambios.</p><textarea value={motivo} onChange={(evento) => setMotivo(evento.target.value)} placeholder="Ej.: resultado incorrecto en una semifinal" rows="4" /><div className="modal-acciones"><button type="button" className="boton boton-secundario" disabled={procesando} onClick={() => setConfirmarReapertura(false)}>Cancelar</button><button type="button" className="boton boton-peligro" disabled={procesando || !motivo.trim()} onClick={reabrirCampeonato}>{procesando ? 'Reabriendo…' : 'Reabrir para corregir'}</button></div></div></div>}
    </main>
  )
}
