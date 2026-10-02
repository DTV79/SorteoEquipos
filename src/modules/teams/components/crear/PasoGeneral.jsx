import Info from '../shared/Info'

export default function PasoGeneral({ form, set, resumen, viabilidad }) {
  return (
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
  )
}
