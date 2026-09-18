import { useCallback, useEffect, useMemo, useState } from 'react'
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

const ETIQUETAS_ACCION = {
  CERRAR_CAMPEONATO: 'Campeonato cerrado',
  REABRIR_CAMPEONATO: 'Campeonato reabierto',
  BORRAR_FASE: 'Fase borrada',
  VACIAR_DATOS_DEPORTIVOS: 'Datos deportivos vaciados',
  CORREGIR_PARTIDO_HISTORICO: 'Partido histórico corregido',
  ELIMINAR_CAMPEONATO_DEFINITIVAMENTE: 'Campeonato eliminado',
  CREAR_CAMPEONATOS: 'Campeonato creado',
  MODIFICAR_CAMPEONATOS: 'Configuración modificada',
  CREAR_EQUIPOS: 'Equipo creado',
  MODIFICAR_EQUIPOS: 'Equipo modificado',
  ELIMINAR_EQUIPOS: 'Equipo eliminado',
  CREAR_FASES_CAMPEONATO: 'Fase creada',
  MODIFICAR_FASES_CAMPEONATO: 'Fase modificada',
  ELIMINAR_FASES_CAMPEONATO: 'Fase eliminada',
  CREAR_PARTIDOS: 'Partido creado',
  MODIFICAR_PARTIDOS: 'Partido modificado',
  ELIMINAR_PARTIDOS: 'Partido eliminado',
  CREAR_SETS_PARTIDO: 'Set guardado',
  MODIFICAR_SETS_PARTIDO: 'Set modificado',
  ELIMINAR_SETS_PARTIDO: 'Set eliminado',
  CREAR_PARTICIPANTES_PARTIDO: 'Participante añadido',
  MODIFICAR_PARTICIPANTES_PARTIDO: 'Participante modificado',
  ELIMINAR_PARTICIPANTES_PARTIDO: 'Participante eliminado',
}

const ETIQUETAS_CAMPO = {
  estado: 'Estado',
  nombre: 'Nombre',
  fecha_inicio: 'Fecha',
  horario: 'Horario',
  localidad: 'Lugar',
  configuracion: 'Configuración',
  codigo_grupo: 'Grupo',
  codigo_fase: 'Fase',
  codigo_ronda: 'Ronda',
  jornada: 'Jornada',
  orden: 'Orden',
  id_equipo_1: 'Equipo 1',
  id_equipo_2: 'Equipo 2',
  pista: 'Pista',
  juegos_equipo_1: 'Juegos equipo 1',
  juegos_equipo_2: 'Juegos equipo 2',
  finalizado: 'Finalizado',
  tipo_resolucion: 'Tipo de resolución',
  id_equipo_ganador_admin: 'Ganador',
  motivo_resolucion: 'Motivo',
  detalle_resolucion: 'Detalle',
  id_jugador_real: 'Jugador',
  tipo_sustitucion: 'Tipo de sustitución',
  computa_ranking_historico: 'Computa Ranking Histórico',
  computa_isp: 'Computa ISP',
}

function formatearValor(valor) {
  if (valor === null || valor === undefined || valor === '') return '—'
  if (typeof valor === 'boolean') return valor ? 'Sí' : 'No'
  if (typeof valor === 'object') return JSON.stringify(valor, null, 2)
  return String(valor)
}

function cambiosEvento(evento) {
  const antes = evento.datos_antes || {}
  const despues = evento.datos_despues || {}
  return [...new Set([...Object.keys(antes), ...Object.keys(despues)])]
    .filter((campo) => JSON.stringify(antes[campo]) !== JSON.stringify(despues[campo]))
    .map((campo) => ({
      campo,
      etiqueta: ETIQUETAS_CAMPO[campo] || campo.replaceAll('_', ' '),
      antes: antes[campo],
      despues: despues[campo],
    }))
}

function fechaHora(valor) {
  if (!valor) return ''
  return new Intl.DateTimeFormat('es-ES', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(valor))
}

export default function AuditoriaCampeonato({ codigo, onVolver, onResultados, onPanelPrincipal }) {
  const [datos, setDatos] = useState(null)
  const [historial, setHistorial] = useState({ total: 0, eventos: [] })
  const [vista, setVista] = useState('comprobaciones')
  const [filtro, setFiltro] = useState('')
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  const cargar = useCallback(async () => {
    setCargando(true)
    setError('')
    const [consultaAuditoria, consultaHistorial] = await Promise.all([
      supabaseCampeonato.rpc('admin_auditar_campeonato', { p_codigo: codigo }),
      supabaseCampeonato.rpc('admin_listar_auditoria_campeonato', {
        p_codigo: codigo,
        p_limite: 200,
      }),
    ])

    if (consultaAuditoria.error || consultaAuditoria.data?.ok !== true) {
      setError(consultaAuditoria.error?.message || consultaAuditoria.data?.error || 'No se pudo completar la auditoría.')
      setCargando(false)
      return
    }
    if (consultaHistorial.error || consultaHistorial.data?.ok !== true) {
      setError(consultaHistorial.error?.message || consultaHistorial.data?.error || 'No se pudo cargar el historial.')
      setCargando(false)
      return
    }

    setDatos(consultaAuditoria.data)
    setHistorial(consultaHistorial.data)
    setCargando(false)
  }, [codigo])

  useEffect(() => {
    cargar()
  }, [cargar])

  const resumen = datos?.resumen ?? {}
  const repetidos = datos?.repetidos ?? []
  const incidencias = datos?.incidencias ?? []
  const eventosFiltrados = useMemo(() => {
    const texto = filtro.trim().toLocaleLowerCase('es')
    if (!texto) return historial.eventos ?? []
    return (historial.eventos ?? []).filter((evento) => [
      ETIQUETAS_ACCION[evento.accion] || evento.accion,
      evento.entidad,
      evento.entidad_id,
      evento.usuario,
    ].some((valor) => String(valor || '').toLocaleLowerCase('es').includes(texto)))
  }, [filtro, historial.eventos])

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

        <div className="pestanas-auditoria" role="tablist" aria-label="Secciones de auditoría">
          <button type="button" className={vista === 'comprobaciones' ? 'activa' : ''} onClick={() => setVista('comprobaciones')}>
            ✓ Comprobaciones
            <span className={Number(resumen.incidencias) ? 'con-aviso' : ''}>{resumen.incidencias ?? 0}</span>
          </button>
          <button type="button" className={vista === 'historial' ? 'activa' : ''} onClick={() => setVista('historial')}>
            ◷ Historial
            <span>{historial.total ?? 0}</span>
          </button>
        </div>

        <p className="aviso-solo-lectura">🔒 Esta pantalla es de consulta. Analiza los datos y muestra los cambios, pero no modifica el campeonato.</p>

        {error && <p className="mensaje-partido error">{error}</p>}
        {cargando && <p className="estado-auditoria">Analizando el campeonato…</p>}

        {!cargando && !error && vista === 'comprobaciones' && (
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
              ) : incidencias.map((incidencia, indice) => (
                <article className={`incidencia-auditoria severidad-${incidencia.severidad || 'media'}`} key={`${incidencia.tipo}-${incidencia.id_partido}-${indice}`}>
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

        {!cargando && !error && vista === 'historial' && (
          <section className="bloque-auditoria historial-auditoria">
            <div className="cabecera-historial">
              <div>
                <p className="etiqueta">TRAZABILIDAD</p>
                <h3>Historial de cambios</h3>
                <small>Se muestran los últimos 200 registros.</small>
              </div>
              <input
                type="search"
                value={filtro}
                onChange={(evento) => setFiltro(evento.target.value)}
                placeholder="Buscar acción, partido, equipo…"
                aria-label="Buscar en el historial"
              />
            </div>

            {eventosFiltrados.length === 0 ? (
              <p className="sin-datos-auditoria">{filtro ? 'No hay cambios que coincidan con la búsqueda.' : 'Todavía no hay cambios registrados.'}</p>
            ) : (
              <div className="lista-historial">
                {eventosFiltrados.map((evento) => {
                  const cambios = cambiosEvento(evento)
                  return (
                    <details className="evento-auditoria" key={evento.id}>
                      <summary>
                        <div className="icono-evento">◷</div>
                        <div className="datos-evento">
                          <strong>{ETIQUETAS_ACCION[evento.accion] || evento.accion.replaceAll('_', ' ')}</strong>
                          <span>{[evento.entidad_id, evento.usuario].filter(Boolean).join(' · ')}</span>
                        </div>
                        <time dateTime={evento.creado_en}>{fechaHora(evento.creado_en)}</time>
                      </summary>
                      <div className="detalle-evento">
                        {cambios.length === 0 ? (
                          <p>No hay un desglose adicional disponible para esta acción.</p>
                        ) : cambios.map((cambio) => (
                          <div className="cambio-evento" key={cambio.campo}>
                            <b>{cambio.etiqueta}</b>
                            <div>
                              <span><small>Antes</small><code>{formatearValor(cambio.antes)}</code></span>
                              <i aria-hidden="true">→</i>
                              <span><small>Después</small><code>{formatearValor(cambio.despues)}</code></span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </details>
                  )
                })}
              </div>
            )}
          </section>
        )}
      </section>
    </main>
  )
}
