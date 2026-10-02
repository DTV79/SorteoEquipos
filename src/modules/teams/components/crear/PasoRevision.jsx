export default function PasoRevision({ form, set, resumen, viabilidad }) {
  return (
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
  )
}
