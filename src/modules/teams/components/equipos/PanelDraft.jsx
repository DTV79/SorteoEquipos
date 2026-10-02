export default function PanelDraft({ a, b, ca, cb, asignaciones, elegibles, cerradas, elegirDraft, turnoDraft, guardando, plantillaGuardada, guardarDraft }) {
  return (
<div className="teams-reparto">
          <div className="teams-reparto-cab">
            <div>
              <h3>Draft de jugadores</h3>
              <p>Elige los jugadores por turnos. Los capitanes ya están incluidos en sus equipos.</p>
            </div>
            <span>Turno: <b>{turnoDraft() === 'A' ? a : b}</b></span>
          </div>

          <div className="teams-draft-tablero">
            <div>
              <h4>{a}</h4>
              {[ca,...Object.entries(asignaciones).filter(([,x])=>x==='A').map(([id])=>id)]
                .filter((x,i,v)=>x&&v.indexOf(x)===i)
                .map(id => {
                  const j=elegibles.find(x=>x.id_jugador===id)
                  return <span key={id}>{j?.alias||j?.nombre||id}{id===ca?' · Capitán':''}</span>
                })}
            </div>

            <div>
              <h4>{b}</h4>
              {[cb,...Object.entries(asignaciones).filter(([,x])=>x==='B').map(([id])=>id)]
                .filter((x,i,v)=>x&&v.indexOf(x)===i)
                .map(id => {
                  const j=elegibles.find(x=>x.id_jugador===id)
                  return <span key={id}>{j?.alias||j?.nombre||id}{id===cb?' · Capitán':''}</span>
                })}
            </div>
          </div>

          <h4>Jugadores disponibles</h4>
          <div className="teams-draft-disponibles">
            {elegibles
              .filter(j =>
                j.id_jugador !== ca &&
                j.id_jugador !== cb &&
                !asignaciones[j.id_jugador]
              )
              .map(j => (
                <button
                  type="button"
                  key={j.id_jugador}
                  disabled={cerradas}
                  onClick={()=>elegirDraft(j.id_jugador)}
                >
                  {j.alias || j.nombre}
                </button>
              ))}
          </div>

          <div className="teams-reparto-acciones">
            <span>
              {elegibles.filter(j =>
                j.id_jugador !== ca &&
                j.id_jugador !== cb &&
                !asignaciones[j.id_jugador]
              ).length} por elegir
            </span>

            <button
              type="button"
              className="boton boton-principal"
              disabled={
                guardando ||
                plantillaGuardada ||
                cerradas ||
                elegibles.filter(j =>
                  j.id_jugador !== ca &&
                  j.id_jugador !== cb &&
                  !asignaciones[j.id_jugador]
                ).length > 0
              }
              onClick={guardarDraft}
            >
              {guardando ? 'Guardando…' : plantillaGuardada ? 'Equipos guardados ✓' : 'Guardar equipos'}
            </button>
          </div>
        </div>
  )
}
