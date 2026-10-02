export default function PanelCapitanesVotacion({ votacion, cargar, guardando, aplicarVotacion }) {
  return (
<div className="teams-capitanes-votacion">
          <div className="teams-reparto-cab">
            <div>
              <h3>Elección de capitanes</h3>
              <p>Los jugadores votan desde Mi Zona. Los resultados son visibles para el administrador.</p>
            </div>
            <button
              type="button"
              className="boton boton-secundario"
              onClick={cargar}
              disabled={guardando}
            >
              Actualizar votos
            </button>
          </div>

          <div className="teams-votacion-grid">
            {(votacion?.equipos || []).map(eq => (
              <article key={eq.equipo_id}>
                <h4>{eq.nombre}</h4>
                <small>{eq.votos_emitidos} de {eq.votantes} votos emitidos</small>
                <div>
                  {(eq.resultados || []).map(r => (
                    <span key={r.id_jugador}>
                      <b>{r.nombre}</b>
                      <strong>{r.votos}</strong>
                    </span>
                  ))}
                </div>
              </article>
            ))}
          </div>

          <div className="teams-reparto-acciones">
            <span>Si hay empate, selecciona arriba los capitanes que correspondan y aplica el resultado.</span>
            <button
              type="button"
              className="boton boton-principal"
              onClick={aplicarVotacion}
              disabled={guardando}
            >
              Aplicar resultado de la votación
            </button>
          </div>
        </div>
  )
}
