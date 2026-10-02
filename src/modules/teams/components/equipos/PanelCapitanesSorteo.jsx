export default function PanelCapitanesSorteo({ ca, cb, guardando, volverASortearCapitanes }) {
  return (
<div className="teams-capitanes-panel">
          <div>
            <b>🎲 Capitanes por sorteo</b>
            <span>
              {ca && cb
                ? 'Ya hay capitanes asignados. Puedes repetir el sorteo antes de cerrar las plantillas.'
                : 'Al guardar los equipos se sorteará un capitán dentro de cada equipo.'}
            </span>
          </div>
          {ca && cb && (
            <button
              type="button"
              className="boton boton-secundario"
              onClick={volverASortearCapitanes}
              disabled={guardando}
            >
              Volver a sortear capitanes
            </button>
          )}
        </div>
  )
}
