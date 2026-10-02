export default function PanelManual({ a, b, ca, cb, asignaciones, elegibles, cerradas, asignar, asignadosA, asignadosB, objetivoPorEquipo, guardando, plantillaGuardada, guardarPlantilla }) {
  return (
<div className="teams-reparto">
          <div className="teams-reparto-cab">
            <div>
              <h3>Reparto manual</h3>
              <p>Asigna cada jugador a uno de los dos equipos. La designación de capitanes se resolverá según la regla configurada.</p>
            </div>
            <span>
              {asignadosA.size} / {objetivoPorEquipo || '—'} · {asignadosB.size} / {objetivoPorEquipo || '—'}
            </span>
          </div>

          <div className="teams-reparto-lista">
            {elegibles.map(j => {
              const id = j.id_jugador
              const esA = id === ca
              const esB = id === cb
              const lado = esA ? 'A' : esB ? 'B' : asignaciones[id] || ''

              return (
                <div className="teams-reparto-jugador" key={id}>
                  <b>{j.alias || j.nombre}</b>
                  <div>
                    <button
                      type="button"
                      className={lado === 'A' ? 'activo' : ''}
                      disabled={esB || cerradas}
                      onClick={()=>!esA&&asignar(id,lado==='A'?'':'A')}
                    >
                      {a}{esA ? ' · Capitán' : ''}
                    </button>
                    <button
                      type="button"
                      className={lado === 'B' ? 'activo' : ''}
                      disabled={esA || cerradas}
                      onClick={()=>!esB&&asignar(id,lado==='B'?'':'B')}
                    >
                      {b}{esB ? ' · Capitán' : ''}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="teams-reparto-acciones">
            <span>
              {elegibles.length - asignadosA.size - asignadosB.size} sin asignar
            </span>
            <button
              type="button"
              className="boton boton-principal"
              disabled={guardando || plantillaGuardada || cerradas}
              onClick={guardarPlantilla}
            >
              {guardando ? 'Guardando…' : plantillaGuardada ? 'Equipos guardados ✓' : 'Guardar equipos'}
            </button>
          </div>
        </div>
  )
}
