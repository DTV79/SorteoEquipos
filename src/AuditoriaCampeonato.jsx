import { useCallback, useEffect, useState } from 'react'
import { supabaseCampeonato } from './lib/supabaseCampeonato'
import './AuditoriaCampeonato.css'

function etiquetaUbicacion(partido) {
  return [
    partido.fase,
    partido.grupo,
    partido.ronda,
    partido.jornada ? `Jornada ${partido.jornada}` : '',
  ].filter(Boolean).join(' · ')
}

export default function AuditoriaCampeonato({ codigo, onVolver, onResultados, onPanelPrincipal }) {
  const [datos, setDatos] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  const cargar = useCallback(async () => {
    setCargando(true)
    setError('')
    const { data, error: errorConsulta } = await supabaseCampeonato.rpc(
      'admin_auditar_campeonato',
      { p_codigo: codigo }
    )
    if (errorConsulta || data?.ok !== true) {
      setError(errorConsulta?.message || data?.error || 'No se pudo completar la auditoría.')
      setCargando(false)
      return
    }
    setDatos(data)
    setCargando(false)
  }, [codigo])

  useEffect(() => {
    cargar()
  }, [cargar])

  const resumen = datos?.resumen ?? {}
  const repetidos = datos?.repetidos ?? []
  const incidencias = datos?.incidencias ?? []

  return (
    <main className="app app-admin app-campeonato">
      <section className="panel-admin panel-campeonato panel-auditoria">
        <header className="cabecera-admin cabecera-campeonato">
          <div>
            <p className="etiqueta">CAMPEONATO</p>
            <h2>Auditoría del campeonato</h2>
            <p className="descripcion-admin">{codigo}</p>
          </div>
          <div className="acciones-cabecera-configuracion">
            <button type="button" className="boton boton-secundario" onClick={cargar} disabled={cargando}>↻ Actualizar</button>
            <button type="button" className="boton boton-secundario" onClick={onResultados}>🎾 Partidos</button>
            <button type="button" className="boton boton-secundario" onClick={onVolver}>← Gestión</button>
            <button type="button" className="boton boton-secundario" onClick={onPanelPrincipal}>← Panel principal</button>
          </div>
        </header>

        <p className="aviso-solo-lectura">🔒 Esta pantalla solo analiza los datos. No modifica partidos, resultados ni clasificaciones.</p>

        {error && <p className="mensaje-partido error">{error}</p>}
        {cargando && <p className="estado-auditoria">Analizando el campeonato…</p>}

        {!cargando && !error && (
          <>
            <div className="resumen-auditoria">
              <article><small>Partidos jugados</small><strong>{resumen.jugados ?? 0}/{resumen.partidos_totales ?? 0}</strong></article>
              <article><small>Enfrentamientos repetidos</small><strong>{resumen.enfrentamientos_repetidos ?? 0}</strong></article>
              <article><small>Repeticiones adicionales</small><strong>{resumen.repeticiones_adicionales ?? 0}</strong><span>{resumen.porcentaje_repeticiones ?? 0}% de los partidos</span></article>
              <article className={Number(resumen.incidencias) ? 'con-incidencias' : ''}><small>Incidencias</small><strong>{resumen.incidencias ?? 0}</strong></article>
            </div>

            <section className="bloque-auditoria">
              <div className="titulo-bloque-auditoria">
                <div><p className="etiqueta">REVISIÓN</p><h3>Avisos detectados</h3></div>
                <span>{incidencias.length}</span>
              </div>
              {incidencias.length === 0 ? (
                <p className="sin-datos-auditoria">No se han detectado incoherencias automáticas.</p>
              ) : incidencias.map((incidencia) => (
                <article className="incidencia-auditoria" key={`${incidencia.tipo}-${incidencia.id_partido}`}>
                  <div><strong>⚠️ {incidencia.titulo}</strong><span>{incidencia.id_partido}</span></div>
                  <p>{incidencia.detalle}</p>
                  <small>{[incidencia.fase, incidencia.ronda, incidencia.marcador].filter(Boolean).join(' · ')}</small>
                </article>
              ))}
            </section>

            <section className="bloque-auditoria">
              <div className="titulo-bloque-auditoria">
                <div><p className="etiqueta">REPETICIONES</p><h3>Enfrentamientos repetidos</h3></div>
                <span>{repetidos.length}</span>
              </div>
              {repetidos.length === 0 ? (
                <p className="sin-datos-auditoria">Ninguna pareja de equipos se ha enfrentado más de una vez.</p>
              ) : repetidos.map((cruce) => (
                <details className="repeticion-auditoria" key={`${cruce.equipo_a}-${cruce.equipo_b}`}>
                  <summary>
                    <div><strong>{cruce.equipo_a} <em>vs</em> {cruce.equipo_b}</strong><small>{cruce.cantidad} partidos</small></div>
                    {cruce.cambio_ganador && <span className="etiqueta-cambio">Cambió el ganador</span>}
                  </summary>
                  <div className="partidos-repeticion">
                    {(cruce.partidos ?? []).map((partido, indice) => (
                      <article key={partido.id_partido}>
                        <span className="numero-encuentro">{indice + 1}</span>
                        <div>
                          <strong>{partido.equipo_1} vs {partido.equipo_2}</strong>
                          <small>{etiquetaUbicacion(partido)}</small>
                          <span>Ganador: {partido.ganador || 'Sin calcular'}</span>
                        </div>
                        <b>{partido.marcador || 'Pendiente'}</b>
                      </article>
                    ))}
                  </div>
                </details>
              ))}
            </section>
          </>
        )}
      </section>
    </main>
  )
}
