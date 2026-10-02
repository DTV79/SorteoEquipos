import Info from '../shared/Info'

export default function PasoParticipacion({ form, set, resumen, viabilidad }) {
  return (
<div className="teams-campos">
            <label>
              <span className="teams-label-info">
                Repetir jugadores
                <Info texto="Controla si un mismo jugador puede disputar más de un partido de la serie. Con 'máximo X' puedes fijar el límite individual." />
              </span>
              <select value={form.repetir_jugadores} onChange={e=>set('repetir_jugadores',e.target.value)}>
                <option value="no">No</option>
                <option value="si">Sí</option>
                <option value="maximo">Sí, máximo X partidos</option>
              </select>
            </label>

            {form.repetir_jugadores === 'maximo' && (
              <label>
                Máximo por jugador
                <input type="number" min="1" value={form.max_partidos_jugador} onChange={e=>set('max_partidos_jugador',e.target.value)}/>
              </label>
            )}

            <div className="teams-checks">
              <label>
                <input type="checkbox" checked={form.repetir_pareja} onChange={e=>set('repetir_pareja',e.target.checked)}/>
                Permitir repetir pareja
              </label>
              <label>
                <input type="checkbox" checked={form.todos_antes_repetir} onChange={e=>set('todos_antes_repetir',e.target.checked)}/>
                Todos deben jugar antes de repetir
                <Info texto="Mientras haya jugadores del equipo que todavía no hayan disputado ningún partido, no se podrá volver a utilizar a uno que ya haya jugado." />
              </label>
            </div>
          </div>
  )
}
