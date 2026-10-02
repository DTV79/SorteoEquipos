import Info from '../shared/Info'

export default function PasoParejas({ form, set, resumen, viabilidad }) {
  return (
<div className="teams-campos">
            <label>
              <span className="teams-label-info">
                Sistema de parejas
                <Info texto="Secreto: ambos equipos presentan sin ver al rival. Alterno: uno presenta y después el otro. Ganador anterior primero: el orden del siguiente partido depende del resultado anterior." />
              </span>
              <select value={form.sistema_eleccion_parejas} onChange={e=>set('sistema_eleccion_parejas',e.target.value)}>
                <option value="secreto">Secreto / simultáneo</option>
                <option value="alterno">Alterno</option>
                <option value="ganador_primero">Ganador anterior presenta primero</option>
              </select>
            </label>

            {form.sistema_eleccion_parejas !== 'secreto' && (
              <>
                <label>
                  Primer presentador
                  <select value={form.primer_presentador} onChange={e=>set('primer_presentador',e.target.value)}>
                    <option value="sorteo">Sorteo</option>
                    <option value="equipo_a">Equipo A</option>
                    <option value="equipo_b">Equipo B</option>
                  </select>
                </label>
                <label className="teams-check">
                  <input type="checkbox" checked={form.segundo_ve_pareja} onChange={e=>set('segundo_ve_pareja',e.target.checked)}/>
                  El segundo capitán ve la primera pareja
                  <Info texto="Si está activado, el equipo que presenta segundo conoce qué pareja ha presentado el primero antes de elegir la suya." />
                </label>
              </>
            )}

            <label>
              Plazo para presentar (horas)
              <input type="number" min="1" value={form.plazo_presentar_horas} onChange={e=>set('plazo_presentar_horas',e.target.value)}/>
            </label>
          </div>
  )
}
