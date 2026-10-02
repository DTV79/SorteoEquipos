import Info from '../shared/Info'

export default function PasoPublicacion({ form, set, resumen, viabilidad }) {
  return (
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
  )
}
