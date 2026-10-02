export default function PanelSorteo({ elegibles, objetivoPorEquipo, sortear, guardando, cerradas, plantillaGuardada }) {
  return (
<div className="teams-reparto teams-sorteo-formacion">
          <div className="teams-reparto-cab">
            <div>
              <h3>Sorteo de equipos</h3>
              <p>
                Se mantendrá a cada capitán en su lado y el resto de los jugadores
                apuntados se repartirán aleatoriamente.
              </p>
            </div>
            <span>{elegibles.length} / {objetivoPorEquipo * 2 || '—'} jugadores</span>
          </div>

          <button
            type="button"
            className="boton boton-principal"
            onClick={sortear}
            disabled={guardando || cerradas}
          >
            🎲 {plantillaGuardada ? 'Repetir sorteo' : 'Sortear equipos'}
          </button>
        </div>
  )
}
