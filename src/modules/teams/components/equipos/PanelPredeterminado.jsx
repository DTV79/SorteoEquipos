export default function PanelPredeterminado({ a, b, ca, cb, asignaciones, elegibles, cerradas, asignar, objetivoPorEquipo, guardando, plantillaGuardada, guardarPlantilla }) {
  return (
<div className="teams-reparto">
          <div className="teams-reparto-cab">
            <div>
              <h3>Equipos predeterminados</h3>
              <p>
                La asignación puede venir de la convocatoria, pero el administrador
                siempre puede corregir o completar los equipos antes de cerrarlos.
              </p>
            </div>
            <span>
              {elegibles.filter(j=>asignaciones[j.id_jugador]==='A').length} / {objetivoPorEquipo || '—'} ·{' '}
              {elegibles.filter(j=>asignaciones[j.id_jugador]==='B').length} / {objetivoPorEquipo || '—'}
            </span>
          </div>

          <div className="teams-reparto-lista">
            {elegibles.map(j => {
              const id = j.id_jugador
              const lado = asignaciones[id] || ''
              const esCapA = id === ca
              const esCapB = id === cb

              return (
                <div className="teams-reparto-jugador" key={id}>
                  <b>{j.alias || j.nombre}</b>
                  <div>
                    <button
                      type="button"
                      className={lado === 'A' ? 'activo' : ''}
                      disabled={cerradas || esCapB}
                      onClick={() => !esCapA && asignar(id, lado === 'A' ? '' : 'A')}
                    >
                      {a}{esCapA ? ' · Capitán' : ''}
                    </button>
                    <button
                      type="button"
                      className={lado === 'B' ? 'activo' : ''}
                      disabled={cerradas || esCapA}
                      onClick={() => !esCapB && asignar(id, lado === 'B' ? '' : 'B')}
                    >
                      {b}{esCapB ? ' · Capitán' : ''}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="teams-reparto-acciones">
            <span>
              {elegibles.filter(j=>!asignaciones[j.id_jugador]).length} sin equipo
            </span>
            <button
              type="button"
              className="boton boton-principal"
              disabled={
                guardando ||
                plantillaGuardada ||
                cerradas ||
                !ca ||
                !cb ||
                elegibles.some(j=>!asignaciones[j.id_jugador])
              }
              onClick={guardarPlantilla}
            >
              {guardando
                ? 'Guardando…'
                : plantillaGuardada
                  ? 'Plantillas guardadas ✓'
                  : 'Confirmar plantillas'}
            </button>
          </div>
        </div>
  )
}
